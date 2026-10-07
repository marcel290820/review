//! Draws the terminal review screen: a header with the open files, the content column with
//! comments beneath their lines, one card for the current interaction, and a key line.
//! Blue belongs to the review layer (comments, selection, cursor, focus); content stays neutral.

use super::{
    app::{App, Draft, Focus, Notice, Prompt, Row, View},
    markdown,
    text::{clean, cleaned, fit, grapheme_width, pad, text_width, wrap},
    theme::Theme,
};
use crate::{diff::DiffKind, feedback::Side, session::DiskStatus};
use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Padding, Paragraph},
};
use std::{collections::HashSet, mem};
use unicode_segmentation::UnicodeSegmentation;

/// Most lines of a comment shown beneath its target.
const NOTE_LINES: usize = 6;
/// Widest comment line beneath a target, in cells, for comfortable reading.
const NOTE_WIDTH: usize = 76;
/// Most lines in the comments card.
const LISTED: usize = 10;
/// Width of the `› ` prompt in front of comment text.
const PROMPT: usize = 2;

/// The key reference, one column per group.
const KEYS: [(&str, &[(&str, &str)]); 4] = [
    (
        "move",
        &[
            ("j k", "line"),
            ("pgup pgdn", "page"),
            ("g G", "top, bottom"),
            ("h l", "scroll sideways"),
        ],
    ),
    (
        "comment",
        &[
            ("v", "select lines"),
            ("c", "comment"),
            ("tab", "all comments"),
            ("enter", "go to comment"),
            ("e", "edit"),
            ("d", "delete"),
        ],
    ),
    (
        "view",
        &[
            ("[ ]", "previous, next file"),
            ("b", "diff, old, new"),
            ("o n", "comment context on old, new"),
            ("r", "show changes on disk"),
        ],
    ),
    ("feedback", &[("s", "save"), ("q", "quit"), ("?", "close")]),
];

/// The interaction shown in the card above the key line.
enum Card<'a> {
    Composer(&'a Draft),
    Comments,
    Keys,
    Quit,
}

pub fn render(frame: &mut Frame, app: &mut App, theme: &Theme) {
    let area = frame.area();
    // Up and Down in a draft follow the rows it wraps into.
    if let Some(Prompt::Draft(draft)) = &mut app.prompt {
        draft.editor.width = Some(composer_width(area));
    }
    let card_height = card(app).map_or(0, |card| card_height(app, &card, area));
    let [header, rule, content, card_area, footer] = Layout::vertical([
        Constraint::Length(1),
        Constraint::Length(1),
        Constraint::Min(1),
        Constraint::Length(card_height),
        Constraint::Length(1),
    ])
    .areas(area);
    render_header(frame, [header, rule], app, theme);
    render_content(frame, content, app, theme);
    if let Some(card) = card(app) {
        let inset = Rect {
            x: card_area.x + 1,
            width: card_area.width.saturating_sub(2),
            ..card_area
        };
        match card {
            Card::Composer(draft) => render_composer(frame, inset, app, draft, theme),
            Card::Comments => render_comments(frame, inset, app, theme),
            Card::Keys => render_keys(frame, inset, app, theme),
            Card::Quit => render_quit(frame, inset, theme),
        }
    }
    render_footer(frame, footer, app, theme);
}

fn card(app: &App) -> Option<Card<'_>> {
    match &app.prompt {
        Some(Prompt::Draft(draft)) => Some(Card::Composer(draft)),
        Some(Prompt::ConfirmQuit) => Some(Card::Quit),
        Some(Prompt::ConfirmDelete) => Some(Card::Comments),
        None if app.help => Some(Card::Keys),
        None if app.focus == Focus::Comments => Some(Card::Comments),
        None => None,
    }
}

fn card_height(app: &App, card: &Card, area: Rect) -> u16 {
    let inner = match card {
        Card::Composer(draft) => {
            let most = usize::from(area.height / 3).max(3);
            wrap(draft.editor.text(), composer_width(area))
                .len()
                .min(most)
        }
        Card::Comments => listing(app).len().clamp(1, LISTED),
        Card::Keys => KEYS.iter().map(|(_, pairs)| pairs.len()).max().unwrap_or(0) + 2,
        Card::Quit => 3,
    };
    cells(inner + 2)
}

fn render_header(frame: &mut Frame, [area, rule]: [Rect; 2], app: &App, theme: &Theme) {
    let files = app.session.files();
    let right = header_status(app, theme);
    let mut spans = vec![
        Span::styled(" ◆ ", theme.accent),
        Span::styled("review", theme.muted),
        Span::raw("   "),
    ];
    let labels: Vec<String> = files.iter().map(|f| clean(&f.path)).collect();
    // Each tab shows how many comments its file has.
    let counts: Vec<String> = files
        .iter()
        .map(|f| {
            let n = app
                .session
                .comments()
                .iter()
                .filter(|c| c.target.file_id == f.id)
                .count();
            if n == 0 {
                String::new()
            } else {
                format!(" {n}")
            }
        })
        .collect();
    let widths: Vec<usize> = labels
        .iter()
        .zip(&counts)
        .map(|(label, count)| text_width(label) + count.len())
        .collect();
    let available = usize::from(area.width).saturating_sub(width(&spans) + width(&right) + 2);
    let (first, end) = tab_window(&widths, app.file, available);
    if first > 0 {
        spans.push(Span::styled(format!("‹ {first}   "), theme.faint));
    }
    let mut underline = 0..0;
    for (i, label) in labels.iter().enumerate().take(end).skip(first) {
        if i > first {
            spans.push(Span::raw("   "));
        }
        if i == app.file {
            let x = width(&spans);
            underline = x.saturating_sub(1)..x + widths[i] + 1;
            spans.push(bold(label.clone()));
        } else {
            spans.push(Span::styled(label.clone(), theme.muted));
        }
        spans.push(Span::styled(
            counts[i].clone(),
            theme.note.remove_modifier(Modifier::ITALIC),
        ));
    }
    if end < labels.len() {
        spans.push(Span::styled(
            format!("   {} ›", labels.len() - end),
            theme.faint,
        ));
    }
    render_split(frame, area, spans, right);

    // A hairline across the screen, heavier and in the accent under the current file.
    let total = usize::from(rule.width).saturating_sub(1);
    let line = Line::from(vec![
        Span::raw(" "),
        Span::styled("─".repeat(underline.start.saturating_sub(1)), theme.faint),
        Span::styled("━".repeat(underline.len()), theme.accent),
        Span::styled("─".repeat(total.saturating_sub(underline.end)), theme.faint),
    ]);
    frame.render_widget(line, rule);
}

/// The range of tabs to show around `current` within `available` cells.
fn tab_window(widths: &[usize], current: usize, available: usize) -> (usize, usize) {
    // Room for the "‹ n" and "n ›" overflow counts.
    const OVERFLOW: usize = 12;
    let cost = |i: usize| widths[i] + 3;
    let (mut first, mut end, mut used) = (current, current + 1, cost(current));
    loop {
        let mut grew = false;
        if end < widths.len() && used + cost(end) + OVERFLOW <= available {
            used += cost(end);
            end += 1;
            grew = true;
        }
        if first > 0 && used + cost(first - 1) + OVERFLOW <= available {
            used += cost(first - 1);
            first -= 1;
            grew = true;
        }
        if !grew {
            return (first, end);
        }
    }
}

/// Disk changes and, for Git changes, which side is shown.
fn header_status(app: &App, theme: &Theme) -> Vec<Span<'static>> {
    let file = app.current_file();
    let mut spans = Vec::new();
    let disk = app.session.disk(app.file).status;
    let disk_style = match disk {
        DiskStatus::Changed => Some(theme.accent),
        DiskStatus::Missing | DiskStatus::Unavailable => Some(theme.error),
        DiskStatus::Detached | DiskStatus::Unchanged => None,
    };
    if let Some(style) = disk_style.filter(|_| app.view != View::Disk) {
        spans.push(Span::styled(format!("● {} on disk", disk.label()), style));
        spans.push(Span::styled("  r   ", theme.muted));
    }
    if app.view == View::Disk {
        spans.push(Span::styled("disk revision", theme.accent));
        spans.push(Span::styled("  read-only", theme.muted));
    } else if file.is_diff() {
        let views = std::iter::once(View::Main)
            .chain(file.snapshots.iter().map(|s| View::Snapshot(s.side)));
        for (i, view) in views.enumerate() {
            let name = match view {
                View::Snapshot(side) => side.to_string(),
                _ => "diff".into(),
            };
            if i > 0 {
                spans.push(Span::raw("  "));
            }
            let style = if view == app.view {
                theme.accent.add_modifier(Modifier::BOLD)
            } else {
                theme.faint
            };
            spans.push(Span::styled(name, style));
        }
    }
    spans.push(Span::raw(" "));
    spans
}

/// Where the gutter's columns are for the current view.
struct Gutter {
    diff: bool,
    digits: usize,
}

impl Gutter {
    fn of(app: &App) -> Self {
        let last = app
            .rows
            .iter()
            .flat_map(|r| r.lines.iter().flatten())
            .map(|&(_, n)| n)
            .max();
        Self {
            diff: app.diff_layout(),
            digits: last.unwrap_or(0).to_string().len().max(3),
        }
    }

    /// The column of the commented-range marker, where comment threads start.
    fn marker(&self) -> usize {
        if self.diff {
            2 * self.digits + 3
        } else {
            self.digits + 2
        }
    }

    /// The column where content text starts, which comment text shares. Diff rows leave
    /// a gap after the `+`/`-` sign so it never touches the content.
    fn text(&self) -> usize {
        self.marker() + if self.diff { 4 } else { 3 }
    }

    /// The thread a comment hangs from, reaching from the marker to the text column.
    fn thread(&self) -> String {
        format!("╰{} ", "─".repeat(self.text() - self.marker() - 2))
    }
}

/// How a comment beneath a row is drawn.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Note {
    Plain,
    /// Selected in the comments list, or being edited.
    Chosen,
    /// A draft that is not recorded yet, shown where it will land.
    Draft,
}

fn render_content(frame: &mut Frame, area: Rect, app: &mut App, theme: &Theme) {
    if area.width < 2 || area.height == 0 {
        return;
    }
    let gutter = Gutter::of(app);
    let file_id = &app.current_file().id;
    let draft = match &app.prompt {
        Some(Prompt::Draft(draft)) => Some(draft),
        _ => None,
    };
    let (from, to) = app.selection();
    let adding = draft.is_some_and(|d| d.editing().is_none());
    // Comments stay with their reviewed snapshots, so a disk revision shows none.
    let comments: Vec<_> = if app.view == View::Disk {
        Vec::new()
    } else {
        app.session
            .comments()
            .iter()
            .enumerate()
            .filter(|(_, c)| &c.target.file_id == file_id)
            .collect()
    };
    let height = usize::from(area.height);
    // ponytail: comments are not counted when deciding to scroll, so a short file whose
    // comments overflow the screen gets no overview rail.
    let rail = app.rows.len() > height;
    let text_area = Rect {
        width: area.width - u16::from(rail),
        ..area
    };
    let note_width = usize::from(text_area.width)
        .saturating_sub(gutter.text())
        .min(NOTE_WIDTH);
    // The comments hanging beneath row `i`, with the text they show.
    let notes_at = |i: usize| {
        let lines = app.rows[i].lines;
        let mut notes: Vec<(&str, Note)> = comments
            .iter()
            .filter(|(_, c)| lines.contains(&Some((c.target.side, c.target.end_line))))
            .map(|(index, c)| match draft {
                Some(d) if d.editing() == Some(c.id.as_str()) => (d.editor.text(), Note::Chosen),
                _ if app.focus == Focus::Comments && *index == app.comment => {
                    (c.body.as_str(), Note::Chosen)
                }
                _ => (c.body.as_str(), Note::Plain),
            })
            .collect();
        if adding && i == to {
            notes.push((draft.map_or("", |d| d.editor.text()), Note::Draft));
        }
        notes
    };
    let height_of = |i: usize| {
        1 + notes_at(i)
            .iter()
            .map(|(body, _)| wrap(body, note_width).len().min(NOTE_LINES))
            .sum::<usize>()
    };

    // Scroll so the cursor row and what hangs beneath it are visible: its comments and,
    // while writing, the draft after the selection. Comments beneath rows take extra lines.
    let mut top = app.top.min(app.cursor);
    let below = if adding {
        to.max(app.cursor)
    } else {
        app.cursor
    };
    let (mut used, mut first) = (0, app.cursor);
    for i in app.cursor..=below {
        used += height_of(i);
        if used >= height {
            break;
        }
    }
    while first > top {
        let above = height_of(first - 1);
        if used + above > height {
            top = first;
            break;
        }
        used += above;
        first -= 1;
    }

    let selecting = app.anchor.is_some() || adding;
    // Each line with whether its text runs past the right edge.
    let mut lines: Vec<(Line, bool)> = Vec::with_capacity(height);
    let mut last = top;
    for (i, row) in app.rows.iter().enumerate().skip(top) {
        if lines.len() >= height {
            break;
        }
        last = i;
        let selected = selecting && (from..=to).contains(&i);
        // A draft's range shows its rail before the comment is recorded.
        let commented = (adding && selected)
            || comments.iter().any(|(_, c)| {
                let t = &c.target;
                row.lines
                    .iter()
                    .flatten()
                    .any(|&(side, n)| side == t.side && (t.start_line..=t.end_line).contains(&n))
            });
        let state = RowState {
            cursor: i == app.cursor,
            selected,
            commented,
        };
        lines.push(row_line(
            row,
            &state,
            &gutter,
            app.scroll_x,
            text_area.width,
            theme,
        ));
        for (body, note) in notes_at(i) {
            let notes = note_lines(body, note_width, &gutter, note, theme);
            lines.extend(notes.into_iter().map(|line| (line, false)));
        }
    }
    if lines.len() < height {
        let end = Line::from(vec![
            Span::raw(" ".repeat(gutter.text())),
            Span::styled("── end", theme.faint),
        ]);
        lines.push((end, false));
    }
    for ((line, overflow), y) in lines.into_iter().zip(area.top()..area.bottom()) {
        // Lines render one by one so row tints span the full width.
        frame.render_widget(
            line,
            Rect {
                y,
                height: 1,
                ..text_area
            },
        );
        if overflow {
            frame
                .buffer_mut()
                .set_string(text_area.right() - 1, y, "›", theme.faint);
        }
    }
    if rail {
        // An overview of the whole view: the visible part, and where comments end.
        let x = area.right() - 1;
        let y_of = |row: usize| area.y + cells(row * height / app.rows.len());
        for y in y_of(top)..=y_of(last) {
            frame.buffer_mut().set_string(x, y, "│", theme.faint);
        }
        let ends: HashSet<_> = comments
            .iter()
            .map(|(_, c)| (c.target.side, c.target.end_line))
            .collect();
        for (i, row) in app.rows.iter().enumerate() {
            if row.lines.iter().flatten().any(|line| ends.contains(line)) {
                let tick = theme.note.remove_modifier(Modifier::ITALIC);
                frame.buffer_mut().set_string(x, y_of(i), "▐", tick);
            }
        }
    }
    app.top = top;
}

struct RowState {
    cursor: bool,
    selected: bool,
    commented: bool,
}

/// One content row and whether its text is wider than the area.
fn row_line(
    row: &Row,
    state: &RowState,
    gutter: &Gutter,
    scroll_x: usize,
    area_width: u16,
    theme: &Theme,
) -> (Line<'static>, bool) {
    let (base, changed) = match row.kind {
        _ if state.selected => (theme.selection, Style::new()),
        Some(DiffKind::Add) => (theme.added_row, theme.added_words),
        Some(DiffKind::Delete) => (theme.deleted_row, theme.deleted_words),
        _ if state.cursor => (theme.cursor_row, Style::new()),
        _ => (Style::new(), Style::new()),
    };
    let number_style = if state.cursor {
        theme.accent.add_modifier(Modifier::BOLD)
    } else if state.selected {
        theme.muted
    } else {
        theme.faint
    };
    let number = |line: Option<(Side, usize)>| {
        let n = line.map(|(_, n)| n.to_string()).unwrap_or_default();
        Span::styled(format!("{n:>0$}", gutter.digits), number_style)
    };
    let bar = Span::styled(
        if state.cursor || state.selected {
            "▌"
        } else {
            " "
        },
        theme.accent,
    );
    if row.kind == Some(DiffKind::Hunk) {
        // A quiet rule that names the lines the hunk covers.
        let lead = gutter.text() - 2;
        let label = format!(" {} ", clean(&row.text));
        let rest = usize::from(area_width).saturating_sub(2 + lead + text_width(&label));
        let rule = format!("{}{label}{}", "─".repeat(lead), "─".repeat(rest));
        return (
            Line::from(vec![bar, Span::styled(rule, theme.faint)]).style(base),
            false,
        );
    }
    let mut spans = vec![bar, number(row.lines[0])];
    if gutter.diff {
        spans.extend([Span::raw(" "), number(row.lines[1])]);
    }
    let marker = if state.commented { "▎" } else { " " };
    spans.extend([
        Span::raw(" "),
        Span::styled(marker, theme.note.remove_modifier(Modifier::ITALIC)),
    ]);
    spans.push(match row.kind {
        Some(DiffKind::Add) => Span::styled("+", theme.added),
        Some(DiffKind::Delete) => Span::styled("-", theme.deleted),
        _ => Span::raw(" "),
    });
    spans.push(Span::raw(" ".repeat(gutter.text() - width(&spans))));
    let text = match row.kind {
        Some(DiffKind::Note) => vec![Span::styled(
            clean(&row.text),
            theme.faint.add_modifier(Modifier::ITALIC),
        )],
        None if row.lines == [None, None] => vec![Span::styled(
            clean(&row.text),
            theme.muted.add_modifier(Modifier::ITALIC),
        )],
        _ => {
            let room = usize::from(area_width).saturating_sub(gutter.text());
            let (text, overflow) = styled_text(row, changed, scroll_x, room, theme);
            spans.extend(text);
            return (Line::from(spans).style(base), overflow);
        }
    };
    let overflow = gutter.text() + width(&text) > usize::from(area_width);
    spans.extend(text);
    (Line::from(spans).style(base), overflow)
}

/// A row's text cut at its Markdown marks and changed words, cleaned for the terminal,
/// without its first `skip` cells and only as much as fits in `room` cells, and
/// whether more text follows. Long lines cost only what is shown.
fn styled_text(
    row: &Row,
    changed: Style,
    mut skip: usize,
    mut room: usize,
    theme: &Theme,
) -> (Vec<Span<'static>>, bool) {
    // Marks and changes are sorted and disjoint, so one pass finds each character's own.
    let (mut marks, mut changes) = (row.marks.iter().peekable(), row.changes.iter().peekable());
    let (mut spans, mut run, mut run_style) = (Vec::new(), String::new(), Style::new());
    let mut more = false;
    for (at, grapheme) in row.text.grapheme_indices(true) {
        let w = grapheme_width(grapheme);
        if skip > 0 {
            skip = skip.saturating_sub(w);
            continue;
        }
        if w > room {
            more = true;
            break;
        }
        room -= w;
        while marks.next_if(|(r, _)| r.end <= at).is_some() {}
        while changes.next_if(|r| r.end <= at).is_some() {}
        let flags = marks
            .peek()
            .filter(|(r, _)| r.start <= at)
            .map_or(0, |(_, flags)| *flags);
        let mut style = markdown_style(flags, theme);
        // Whole characters are styled, so a changed accent marks the letter it sits on.
        if changes
            .peek()
            .is_some_and(|r| r.start < at + grapheme.len())
        {
            style = style.patch(changed);
        }
        if style != run_style && !run.is_empty() {
            spans.push(Span::styled(mem::take(&mut run), run_style));
        }
        run_style = style;
        run.extend(grapheme.chars().flat_map(cleaned));
    }
    if !run.is_empty() {
        spans.push(Span::styled(run, run_style));
    }
    (spans, more)
}

/// Markdown in neutral weights: structure through bold, italic, and quiet syntax.
fn markdown_style(flags: u16, theme: &Theme) -> Style {
    let has = |flag| flags & flag != 0;
    let mut style = Style::new();
    if has(markdown::QUOTE) {
        style = style.patch(theme.muted).add_modifier(Modifier::ITALIC);
    }
    if has(markdown::CODE) {
        style = style.patch(theme.code);
    }
    if has(markdown::SYNTAX) {
        style = style.patch(theme.faint);
    }
    for (flag, modifier) in [
        (markdown::HEADING, Modifier::BOLD),
        (markdown::STRONG, Modifier::BOLD),
        (markdown::EMPHASIS, Modifier::ITALIC),
        (markdown::STRIKE, Modifier::CROSSED_OUT),
        (markdown::LINK, Modifier::UNDERLINED),
    ] {
        if has(flag) {
            style = style.add_modifier(modifier);
        }
    }
    style
}

/// A comment hanging beneath its target on a thread from the marker column.
fn note_lines(
    body: &str,
    width: usize,
    gutter: &Gutter,
    note: Note,
    theme: &Theme,
) -> Vec<Line<'static>> {
    let (thread, text) = match note {
        Note::Plain => (theme.note.remove_modifier(Modifier::ITALIC), theme.note),
        Note::Chosen => (
            theme.accent.add_modifier(Modifier::BOLD),
            theme.accent.add_modifier(Modifier::ITALIC),
        ),
        Note::Draft => (theme.draft.remove_modifier(Modifier::ITALIC), theme.draft),
    };
    let body = if body.is_empty() { "…" } else { body };
    let mut wrapped = wrap(body, width);
    // A long comment shows its first lines and how many more it has.
    let hidden = if wrapped.len() > NOTE_LINES {
        wrapped.len() - (NOTE_LINES - 1)
    } else {
        0
    };
    wrapped.truncate(wrapped.len() - hidden);
    let mut lines: Vec<_> = wrapped
        .into_iter()
        .enumerate()
        .map(|(i, range)| {
            let lead = if i == 0 {
                Span::styled(
                    format!("{}{}", " ".repeat(gutter.marker()), gutter.thread()),
                    thread,
                )
            } else {
                Span::raw(" ".repeat(gutter.text()))
            };
            Line::from(vec![lead, Span::styled(clean(&body[range]), text)])
        })
        .collect();
    if hidden > 0 {
        lines.push(Line::from(vec![
            Span::raw(" ".repeat(gutter.text())),
            Span::styled(format!("… {hidden} more lines"), theme.muted),
        ]));
    }
    lines
}

/// A card between two rules, its title set into the top one.
fn card_block(title: String, style: Style) -> Block<'static> {
    Block::new()
        .borders(Borders::TOP | Borders::BOTTOM)
        .border_style(style)
        .title(Span::styled(
            format!(" {title} "),
            style.add_modifier(Modifier::BOLD),
        ))
        .padding(Padding::horizontal(1))
}

fn bold(text: String) -> Span<'static> {
    Span::styled(text, Style::new().add_modifier(Modifier::BOLD))
}

fn render_composer(frame: &mut Frame, area: Rect, app: &App, draft: &Draft, theme: &Theme) {
    let block = card_block(composer_title(app, draft), theme.accent);
    let inner = block.inner(area);
    frame.render_widget(block, area);
    if inner.is_empty() {
        return;
    }
    let text = draft.editor.text();
    let lines = wrap(text, composer_width(frame.area()));
    let cursor = draft.editor.cursor();
    let row = lines
        .iter()
        .rposition(|line| line.start <= cursor)
        .unwrap_or(0);
    let column = text_width(&text[lines[row].start..cursor]);
    let top = row.saturating_sub(usize::from(inner.height) - 1);
    let prompt = |i: usize| {
        if i == 0 {
            Span::styled("› ", theme.accent.add_modifier(Modifier::BOLD))
        } else {
            Span::raw("  ")
        }
    };
    let shown: Vec<_> = if text.is_empty() {
        vec![Line::from(vec![
            prompt(0),
            Span::styled("What should change here?", theme.faint),
        ])]
    } else {
        lines
            .iter()
            .enumerate()
            .skip(top)
            .map(|(i, range)| Line::from(vec![prompt(i), Span::raw(clean(&text[range.clone()]))]))
            .collect()
    };
    frame.render_widget(Paragraph::new(shown), inner);
    let x = (usize::from(inner.x) + PROMPT + column).min(usize::from(inner.right()) - 1);
    frame.set_cursor_position((cells(x), inner.y + cells(row - top)));
}

/// Cells per row of draft text: the screen less the card's inset, padding, and prompt, and
/// a cell where the cursor shows after a full row.
fn composer_width(screen: Rect) -> usize {
    usize::from(screen.width).saturating_sub(5 + PROMPT)
}

/// The file and lines a draft comments on, as `path:start-end`.
fn composer_title(app: &App, draft: &Draft) -> String {
    if let Some(id) = draft.editing() {
        return match app.session.comments().iter().find(|c| c.id == id) {
            Some(c) => {
                let t = &c.target;
                format!(
                    "Edit {}",
                    location(&t.path, t.side, t.start_line, t.end_line)
                )
            }
            None => "Edit comment".into(),
        };
    }
    let (first, last) = app.selection();
    match (app.rows[first].target, app.rows[last].target) {
        (Some((side, start)), Some((_, end))) => {
            location(&app.current_file().path, side, start, end)
        }
        _ => "Comment".into(),
    }
}

/// `path:start-end`, the form editors and agents read, with the diff side when there is one.
fn location(path: &str, side: Side, start: usize, end: usize) -> String {
    let lines = if start == end {
        start.to_string()
    } else {
        format!("{start}-{end}")
    };
    match side {
        Side::Source => format!("{}:{lines}", clean(path)),
        side => format!("{}:{lines} ({side})", clean(path)),
    }
}

/// One line of the comments card.
enum Listed {
    File(usize),
    Comment(usize),
}

/// Comments grouped under their files, in reading order.
fn listing(app: &App) -> Vec<Listed> {
    let comments = app.session.comments();
    let mut lines = Vec::new();
    let mut file = None;
    for i in app.comment_order() {
        let id = &comments[i].target.file_id;
        if file != Some(id) {
            file = Some(id);
            lines.push(Listed::File(i));
        }
        lines.push(Listed::Comment(i));
    }
    lines
}

fn render_comments(frame: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let comments = app.session.comments();
    let deleting = matches!(app.prompt, Some(Prompt::ConfirmDelete));
    let block = if deleting {
        card_block("Delete this comment?".into(), theme.error)
    } else {
        card_block("Comments".into(), theme.accent)
    };
    let inner = block.inner(area);
    frame.render_widget(block, area);
    if comments.is_empty() {
        let hint = Line::from(vec![
            Span::styled("No comments yet. Select lines with ", theme.muted),
            Span::raw("v"),
            Span::styled(", then press ", theme.muted),
            Span::raw("c"),
            Span::styled(".", theme.muted),
        ]);
        frame.render_widget(hint, inner);
        return;
    }
    let listed = listing(app);
    let places: Vec<String> = comments
        .iter()
        .map(|c| {
            let t = &c.target;
            let lines = if t.start_line == t.end_line {
                t.start_line.to_string()
            } else {
                format!("{}-{}", t.start_line, t.end_line)
            };
            match t.side {
                Side::Source => lines,
                side => format!("{side} {lines}"),
            }
        })
        .collect();
    let place_width = places.iter().map(|p| text_width(p)).max().unwrap_or(0);
    let visible = usize::from(inner.height).max(1);
    let at = listed
        .iter()
        .position(|l| matches!(l, Listed::Comment(i) if *i == app.comment))
        .unwrap_or(0);
    // Keep the selected comment in view, with its file heading when it fits.
    let first = at.saturating_sub(visible - 1);
    let body_width = usize::from(inner.width).saturating_sub(4 + place_width + 2);
    for (line, y) in listed[first..].iter().zip(inner.top()..inner.bottom()) {
        let line = match *line {
            Listed::File(i) => Line::styled(clean(&comments[i].target.path), theme.muted),
            Listed::Comment(i) => {
                let chosen = i == app.comment;
                let (marker, place, base) = if chosen {
                    ("› ", Style::new(), theme.selection)
                } else {
                    ("  ", theme.faint, Style::new())
                };
                let body = clean(&comments[i].body.replace('\n', " ↵ "));
                Line::from(vec![
                    Span::styled(format!("  {marker}"), theme.accent),
                    Span::styled(pad(&places[i], place_width), place),
                    Span::raw("  "),
                    Span::raw(fit(&body, body_width)),
                ])
                .style(base)
            }
        };
        frame.render_widget(
            line,
            Rect {
                y,
                height: 1,
                ..inner
            },
        );
    }
}

fn render_keys(frame: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let block = card_block("Keys".into(), theme.accent);
    // Each group is a column with its keys, then its labels, on shared left edges.
    let columns: Vec<(usize, usize)> = KEYS
        .iter()
        .map(|(_, pairs)| {
            let key = pairs.iter().map(|(k, _)| text_width(k)).max();
            let label = pairs.iter().map(|(_, l)| text_width(l)).max();
            (key.unwrap_or(0), label.unwrap_or(0))
        })
        .collect();
    let rows = KEYS.iter().map(|(_, pairs)| pairs.len()).max().unwrap_or(0);
    let mut lines = Vec::with_capacity(rows + 3);
    lines.push(Line::from(
        KEYS.iter()
            .zip(&columns)
            .flat_map(|((group, _), (key, label))| {
                [Span::styled(pad(group, key + label + 5), theme.muted)]
            })
            .collect::<Vec<_>>(),
    ));
    for row in 0..rows {
        let mut spans = Vec::new();
        for ((_, pairs), &(key, label)) in KEYS.iter().zip(&columns) {
            let (k, l) = pairs.get(row).copied().unwrap_or(("", ""));
            spans.push(Span::raw(pad(k, key + 1)));
            spans.push(Span::styled(pad(l, label + 4), theme.muted));
        }
        lines.push(Line::from(spans));
    }
    lines.push(Line::from(vec![
        Span::styled("saves to  ", theme.muted),
        Span::raw(clean(&app.session.output().display().to_string())),
    ]));
    frame.render_widget(Paragraph::new(lines).block(block), area);
}

fn render_quit(frame: &mut Frame, area: Rect, theme: &Theme) {
    let block = card_block("Unsaved feedback".into(), theme.accent);
    let lines = vec![
        Line::styled("Comments changed since the last save.", theme.muted),
        Line::default(),
        Line::from(key_spans(
            &[
                ("s", "save and quit"),
                ("d", "discard"),
                ("esc", "keep reviewing"),
            ],
            theme,
        )),
    ];
    frame.render_widget(Paragraph::new(lines).block(block), area);
}

fn render_footer(frame: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let mut left = vec![Span::raw(" ")];
    match &app.notice {
        Some(Notice { text, error: true }) => {
            left.extend([
                Span::styled("✕ ", theme.error),
                Span::styled(clean(text), theme.error),
            ]);
        }
        Some(Notice { text, .. }) => {
            left.extend([Span::styled("› ", theme.accent), Span::raw(clean(text))]);
        }
        None => left.extend(key_spans(&hints(app), theme)),
    }
    let count = app.session.comments().len();
    let mut right = vec![
        Span::styled(
            format!("{}/{}   ", app.cursor + 1, app.rows.len()),
            theme.faint,
        ),
        Span::styled(
            match count {
                0 => "no comments".into(),
                1 => "1 comment".into(),
                n => format!("{n} comments"),
            },
            theme.muted,
        ),
    ];
    if app.session.is_dirty() {
        right.extend([Span::styled("   ● ", theme.accent), Span::raw("unsaved")]);
    } else if let Some(saved) = app.session.last_saved() {
        let name = saved
            .file_name()
            .map(|n| n.to_string_lossy())
            .unwrap_or_default();
        right.extend([
            Span::styled("   ✓ ", theme.accent),
            Span::styled(format!("saved to {}", clean(&name)), theme.muted),
        ]);
    }
    right.push(Span::raw(" "));
    // A notice says what just happened, so it keeps its room over the status.
    if app.notice.is_some() && width(&left) + width(&right) > usize::from(area.width) {
        right.clear();
    }
    render_split(frame, area, left, right);
}

/// The most useful keys for what the user is doing now.
fn hints(app: &App) -> Vec<(&'static str, &'static str)> {
    match &app.prompt {
        Some(Prompt::Draft(_)) => {
            return vec![
                ("ctrl+s", "record"),
                ("enter", "newline"),
                ("esc", "cancel"),
            ];
        }
        Some(Prompt::ConfirmDelete) => return vec![("y", "delete"), ("esc", "cancel")],
        Some(Prompt::ConfirmQuit) => return Vec::new(),
        None => {}
    }
    if app.help {
        return vec![("?", "close")];
    }
    if app.focus == Focus::Comments {
        return if app.session.comments().is_empty() {
            vec![("tab", "back")]
        } else {
            vec![
                ("enter", "go to"),
                ("e", "edit"),
                ("d", "delete"),
                ("tab", "back"),
            ]
        };
    }
    if app.view == View::Disk {
        return vec![("r", "back to review"), ("[ ]", "files"), ("?", "keys")];
    }
    if app.anchor.is_some() {
        return vec![("c", "comment on selection"), ("esc", "clear")];
    }
    let mut keys = vec![("v", "select"), ("c", "comment")];
    if app.current_file().is_diff() {
        keys.push(("b", "view"));
    }
    keys.extend([("tab", "comments"), ("s", "save"), ("?", "keys")]);
    keys
}

fn key_spans(pairs: &[(&str, &str)], theme: &Theme) -> Vec<Span<'static>> {
    pairs
        .iter()
        .flat_map(|(key, label)| {
            [
                Span::raw(key.to_string()),
                Span::styled(format!(" {label}    "), theme.muted),
            ]
        })
        .collect()
}

/// Draws `left` and right-aligned `right` on one line; `right` wins when space runs out.
fn render_split(
    frame: &mut Frame,
    area: Rect,
    left: Vec<Span<'static>>,
    right: Vec<Span<'static>>,
) {
    let right = Line::from(right);
    let [left_area, right_area] =
        Layout::horizontal([Constraint::Min(0), Constraint::Length(cells(right.width()))])
            .areas(area);
    frame.render_widget(Line::from(left), left_area);
    frame.render_widget(right, right_area);
}

fn width(spans: &[Span]) -> usize {
    spans.iter().map(Span::width).sum()
}

fn cells(n: usize) -> u16 {
    u16::try_from(n).unwrap_or(u16::MAX)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn every_state_draws_at_any_terminal_size() {
        use crate::session::Session;
        use ratatui::{
            Terminal,
            backend::TestBackend,
            crossterm::event::{KeyCode, KeyEvent, KeyModifiers},
        };
        let dir = tempfile::tempdir().unwrap();
        let text: String = (1..=40).map(|n| format!("- line **{n}**\n")).collect();
        std::fs::write(dir.path().join("a.md"), text).unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        let theme = Theme::new([200; 3], [20; 3], true);
        let press = |app: &mut App, keys: &str| {
            for c in keys.chars() {
                app.handle_key(KeyEvent::from(match c {
                    '\t' => KeyCode::Tab,
                    c => KeyCode::Char(c),
                }));
            }
        };
        press(&mut app, "jjvjc");
        app.paste("a comment long enough to wrap in narrow terminals");
        // Draft, recorded comment with the list open, and the key reference.
        let states = ["", "\x13", "\t", "\t?"];
        for keys in states {
            if keys == "\x13" {
                app.handle_key(KeyEvent::new(KeyCode::Char('s'), KeyModifiers::CONTROL));
            } else {
                press(&mut app, keys);
            }
            for (w, h) in [(1, 1), (2, 3), (12, 5), (40, 8), (110, 30)] {
                let mut terminal = Terminal::new(TestBackend::new(w, h)).unwrap();
                terminal
                    .draw(|frame| render(frame, &mut app, &theme))
                    .unwrap();
            }
        }
    }

    #[test]
    fn styled_text_shows_only_what_fits() {
        let theme = Theme::new([200; 3], [20; 3], true);
        let row = Row {
            text: "a **b**\tc".into(),
            kind: None,
            lines: [Some((Side::Source, 1)), None],
            target: None,
            marks: vec![(2..4, markdown::SYNTAX), (4..5, markdown::STRONG)],
            changes: vec![2..4, 4..7],
        };
        let shown = |skip, room| {
            let (spans, more) = styled_text(&row, Style::new(), skip, room, &theme);
            let text: Vec<String> = spans.iter().map(|s| s.content.to_string()).collect();
            (text, more)
        };
        assert_eq!(
            shown(0, 20),
            (strings(&["a ", "**", "b", "**    c"]), false)
        );
        assert_eq!(shown(3, 4), (strings(&["*", "b", "**"]), true));
        let (spans, _) = styled_text(&row, Style::new(), 0, 20, &theme);
        assert_eq!(spans[2].style, markdown_style(markdown::STRONG, &theme));
        // An emoji sequence takes the two cells the terminal gives it.
        let emoji = Row {
            text: "👨‍👩‍👧 ok".into(),
            marks: Vec::new(),
            changes: Vec::new(),
            ..row
        };
        let (spans, more) = styled_text(&emoji, Style::new(), 0, 5, &theme);
        assert_eq!((spans[0].content.as_ref(), more), ("👨‍👩‍👧 ok", false));
        // A changed combining accent highlights the letter it sits on.
        let accent = Row {
            text: "cafe\u{301}".into(),
            changes: vec![4..5, 5..6],
            ..emoji
        };
        let bold = Style::new().add_modifier(Modifier::BOLD);
        let (spans, _) = styled_text(&accent, bold, 0, 10, &theme);
        let spans: Vec<_> = spans
            .iter()
            .map(|s| (s.content.as_ref(), s.style))
            .collect();
        assert_eq!(spans, [("caf", Style::new()), ("e\u{301}", bold)]);
    }

    #[test]
    fn the_draft_cursor_shows_every_position() {
        use crate::session::Session;
        use ratatui::{
            Terminal,
            backend::TestBackend,
            crossterm::event::{KeyCode, KeyEvent},
        };
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.md"), "text\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        let theme = Theme::new([200; 3], [20; 3], true);
        let mut terminal = Terminal::new(TestBackend::new(12, 16)).unwrap();
        let mut cursor = |app: &mut App, code| {
            app.handle_key(KeyEvent::from(code));
            terminal.draw(|frame| render(frame, app, &theme)).unwrap();
            terminal.get_cursor_position().unwrap()
        };
        for n in 1..=12 {
            cursor(&mut app, KeyCode::Char('c'));
            app.paste(&"abcde fghijk"[..n]);
            let end = cursor(&mut app, KeyCode::End);
            let before = cursor(&mut app, KeyCode::Left);
            assert_ne!(end, before, "{n} characters");
            cursor(&mut app, KeyCode::Esc);
        }
    }

    #[test]
    fn comments_beneath_the_cursor_stay_in_view() {
        use crate::session::Session;
        use ratatui::{
            Terminal,
            backend::TestBackend,
            crossterm::event::{KeyCode, KeyEvent, KeyModifiers},
        };
        let dir = tempfile::tempdir().unwrap();
        let text: String = (1..=40).map(|n| format!("line {n}\n")).collect();
        std::fs::write(dir.path().join("a.md"), text).unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        let theme = Theme::new([200; 3], [20; 3], true);
        let screen = |app: &mut App| {
            let mut terminal = Terminal::new(TestBackend::new(60, 12)).unwrap();
            terminal.draw(|frame| render(frame, app, &theme)).unwrap();
            let buffer = terminal.backend().buffer().clone();
            (0..12)
                .map(|y| (0..60).map(|x| buffer[(x, y)].symbol()).collect::<String>())
                .collect::<Vec<_>>()
        };
        let threads = |lines: &[String], text: &str| {
            lines.iter().any(|l| l.contains('╰') && l.contains(text))
        };
        for code in [KeyCode::Char('G'), KeyCode::Char('c')] {
            app.handle_key(KeyEvent::from(code));
        }
        app.paste("first thought");
        app.handle_key(KeyEvent::new(KeyCode::Char('s'), KeyModifiers::CONTROL));
        assert!(threads(&screen(&mut app), "first thought"));
        app.handle_key(KeyEvent::from(KeyCode::Char('c')));
        app.paste("second thought");
        let lines = screen(&mut app);
        assert!(threads(&lines, "first thought"), "{lines:#?}");
        assert!(threads(&lines, "second thought"), "{lines:#?}");
    }

    #[test]
    fn notices_keep_their_text_on_narrow_screens() {
        use crate::session::Session;
        use ratatui::{Terminal, backend::TestBackend};
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.md"), "text\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        app.notice = Some(Notice {
            text: "Cannot save feedback".into(),
            error: true,
        });
        let theme = Theme::new([200; 3], [20; 3], true);
        let mut terminal = Terminal::new(TestBackend::new(32, 8)).unwrap();
        terminal
            .draw(|frame| render(frame, &mut app, &theme))
            .unwrap();
        let buffer = terminal.backend().buffer();
        let footer: String = (0..32).map(|x| buffer[(x, 7)].symbol()).collect();
        assert!(footer.contains("Cannot save feedback"), "{footer}");
    }

    fn strings(texts: &[&str]) -> Vec<String> {
        texts.iter().map(|t| t.to_string()).collect()
    }
}
