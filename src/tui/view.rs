//! Draws the terminal review screen: a header with the open files, the content column with its
//! lines wrapped and comment cards hanging beneath them, a drawer for the comment list, the
//! keys, or the quit prompt, and the key line.
//! Blue belongs to the review layer (comments, selection, cursor, focus); content stays neutral.

use super::{
    app::{App, Focus, Prompt, Row, View},
    text::{clean, cleaned, fit, fit_start, hanging_indent, pad, text_width, wrap, wrap_line},
    theme::Theme,
};
use crate::{
    diff::DiffKind,
    feedback::{Side, Target, lines},
    files, markdown,
    session::DiskStatus,
};
use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::{Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, Padding, Paragraph},
};
use std::{collections::HashSet, mem, ops::Range};
use unicode_segmentation::UnicodeSegmentation;

/// Most lines of a comment card. The comment chosen in the list or being written shows up to
/// half the content area.
const NOTE_LINES: usize = 6;
/// Widest comment text in a card, in cells, for comfortable reading.
const NOTE_WIDTH: usize = 76;
/// Most lines in the comments drawer.
const LISTED: usize = 10;
/// What a comment being written shows before it has text.
const PLACEHOLDER: &str = "What should change here?";

/// The key reference, one column per group. The last group becomes a line of its own where
/// its column does not fit.
const KEYS: [(&str, &[(&str, &str)]); 4] = [
    (
        "Move",
        &[("j k", "line"), ("space", "page"), ("g G", "top, bottom")],
    ),
    (
        "Comment",
        &[
            ("v", "select lines"),
            ("c", "comment"),
            ("esc", "clear, cancel"),
            ("a", "all comments"),
            ("enter", "go to comment"),
            ("e d", "edit, delete"),
        ],
    ),
    (
        "View",
        &[
            ("[ ]", "previous, next file"),
            ("b", "diff, old, new"),
            ("o n", "context on old, new"),
            ("r", "changes on disk"),
        ],
    ),
    (
        "Feedback",
        &[
            ("enter", "record comment"),
            ("s", "save"),
            ("q", "quit"),
            ("?", "close"),
        ],
    ),
];
/// Cells between key columns, and between hints on one line.
const KEY_GAP: usize = 4;
/// Cells at least between the hints and the status on the key line.
const STATUS_GAP: usize = 3;

/// What the drawer above the key line shows.
enum Drawer {
    Comments,
    Keys,
    Quit,
}

pub fn render(frame: &mut Frame, app: &mut App, theme: &Theme) {
    let area = frame.area();
    let drawer = drawer(app);
    let drawer_height = drawer
        .as_ref()
        .map_or(0, |drawer| drawer_height(app, drawer, area));
    let [header, rule, content, drawer_area, footer] = Layout::vertical([
        Constraint::Length(1),
        Constraint::Length(1),
        Constraint::Min(1),
        Constraint::Length(drawer_height),
        Constraint::Length(1),
    ])
    .areas(area);
    render_header(frame, [header, rule], app, theme);
    render_content(frame, content, app, theme);
    match drawer {
        Some(Drawer::Comments) => render_comments(frame, drawer_area, app, theme),
        Some(Drawer::Keys) => render_keys(frame, drawer_area, app, theme),
        Some(Drawer::Quit) => render_quit(frame, drawer_area, theme),
        None => {}
    }
    render_footer(frame, footer, app, theme);
}

fn drawer(app: &App) -> Option<Drawer> {
    match &app.prompt {
        // A comment is written in its card, where it will land.
        Some(Prompt::Draft(_)) => None,
        Some(Prompt::ConfirmQuit) => Some(Drawer::Quit),
        Some(Prompt::ConfirmDelete) => Some(Drawer::Comments),
        None if app.help => Some(Drawer::Keys),
        None if app.focus == Focus::Comments => Some(Drawer::Comments),
        None => None,
    }
}

/// Lines a drawer takes: its titled rule, its content, and a blank line above the key line.
fn drawer_height(app: &App, drawer: &Drawer, area: Rect) -> u16 {
    let inner = match drawer {
        Drawer::Comments => listing(app).len().clamp(1, LISTED),
        Drawer::Keys => {
            let grid = KeyGrid::new(drawer_width(area));
            // The grid, the feedback line when it is not a column, and the save destination.
            grid.height() + usize::from(grid.groups < KEYS.len()) + 1
        }
        Drawer::Quit => 3,
    };
    cells(inner + 2)
}

/// A drawer's surface, its title set into the rule along its top.
fn drawer_block(title: &str, count: Option<usize>, style: Style, theme: &Theme) -> Block<'static> {
    let mut spans = vec![
        Span::styled("─ ", theme.faint),
        Span::styled(title.to_string(), style.add_modifier(Modifier::BOLD)),
    ];
    if let Some(count) = count {
        spans.push(Span::styled(format!("  {count}"), theme.muted));
    }
    spans.push(Span::raw(" "));
    Block::new()
        .borders(Borders::TOP)
        .border_style(theme.faint)
        .style(theme.surface)
        .title(Line::from(spans))
        .padding(Padding::new(1, 1, 0, 1))
}

/// Cells for text in a drawer: the screen less the drawer's padding.
fn drawer_width(screen: Rect) -> usize {
    usize::from(screen.width).saturating_sub(2)
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
    let available =
        usize::from(area.width).saturating_sub(spans_width(&spans) + spans_width(&right) + 2);
    let mut labels = labels;
    // A path too long for the header keeps its end, where the file name is.
    let overflow = if files.len() > 1 { TAB_OVERFLOW } else { 0 };
    let room = available.saturating_sub(overflow + counts[app.file].len());
    labels[app.file] = fit_start(&labels[app.file], room);
    let widths: Vec<usize> = labels
        .iter()
        .zip(&counts)
        .map(|(label, count)| text_width(label) + count.len())
        .collect();
    let (first, end) = tab_window(&widths, app.file, available);
    if first > 0 {
        spans.push(Span::styled(format!("+{first}   "), theme.faint));
    }
    let mut underline = 0..0;
    for (i, label) in labels.iter().enumerate().take(end).skip(first) {
        if i > first {
            spans.push(Span::raw("   "));
        }
        if i == app.file {
            let x = spans_width(&spans);
            underline = x.saturating_sub(1)..x + widths[i] + 1;
            spans.push(bold(label.clone()));
        } else {
            spans.push(Span::styled(label.clone(), theme.muted));
        }
        spans.push(Span::styled(counts[i].clone(), theme.note));
    }
    if end < labels.len() {
        spans.push(Span::styled(
            format!("   +{}", labels.len() - end),
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

/// Room in the header for the "+n" counts of tabs out of view on either side.
const TAB_OVERFLOW: usize = 12;

/// The range of tabs to show around `current` within `available` cells.
fn tab_window(widths: &[usize], current: usize, available: usize) -> (usize, usize) {
    let cost = |i: usize| widths[i] + 3;
    let (mut first, mut end, mut used) = (current, current + 1, cost(current));
    loop {
        let mut grew = false;
        if end < widths.len() && used + cost(end) + TAB_OVERFLOW <= available {
            used += cost(end);
            end += 1;
            grew = true;
        }
        if first > 0 && used + cost(first - 1) + TAB_OVERFLOW <= available {
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
        spans.push(Span::raw("  "));
        spans.extend(key_spans(&[("r", "view")], theme));
    }
    if app.view == View::Disk {
        spans.push(Span::styled(
            "changes on disk",
            theme.accent.add_modifier(Modifier::BOLD),
        ));
        spans.push(Span::styled("  read-only", theme.muted));
    } else if file.is_diff() {
        if !spans.is_empty() {
            spans.push(Span::raw("    "));
        }
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

    /// Cells for content text in a column `width` cells wide.
    fn room(&self, width: usize) -> usize {
        width.saturating_sub(self.text()).max(1)
    }
}

/// How a comment card is drawn.
#[derive(Clone, Copy, PartialEq, Eq)]
enum Note {
    Plain,
    /// Chosen in the comments list.
    Chosen,
    /// Being written: a new comment where it will land, or a comment being edited.
    Writing,
}

/// The rows a comment card shows: byte ranges of its text, how many rows it leaves out, and
/// the cursor's row and column while the comment is written.
struct Card {
    rows: Vec<Range<usize>>,
    hidden: usize,
    cursor: Option<(usize, usize)>,
}

impl Card {
    /// `body` in rows of `width` cells. A long comment shows its first [`NOTE_LINES`] rows, or
    /// `open` rows when chosen; one being written shows the `open` rows around the cursor at
    /// byte `cursor`.
    fn new(body: &str, note: Note, cursor: usize, width: usize, open: usize) -> Self {
        let mut rows = wrap(body, width);
        if note == Note::Writing {
            // A cursor where one row wraps into the next shows at the start of the next.
            let row = rows.iter().rposition(|r| r.start <= cursor).unwrap_or(0);
            let column = text_width(&body[rows[row].start..cursor]);
            let top = row.saturating_sub(open - 1);
            rows.truncate(top + open);
            rows.drain(..top);
            return Self {
                rows,
                hidden: 0,
                cursor: Some((row - top, column)),
            };
        }
        let most = if note == Note::Chosen {
            open
        } else {
            NOTE_LINES
        };
        let hidden = if rows.len() > most {
            rows.len() - (most - 1)
        } else {
            0
        };
        rows.truncate(rows.len() - hidden);
        Self {
            rows,
            hidden,
            cursor: None,
        }
    }

    fn height(&self) -> usize {
        self.rows.len() + usize::from(self.hidden > 0)
    }
}

fn render_content(frame: &mut Frame, area: Rect, app: &mut App, theme: &Theme) {
    if area.width < 2 || area.height == 0 {
        return;
    }
    let gutter = Gutter::of(app);
    let height = usize::from(area.height);
    // ponytail: neither wrapped lines nor comments count when deciding to scroll, so a short
    // file that only they make overflow the screen gets no overview rail.
    let rail = app.rows.len() > height;
    let text_area = Rect {
        width: area.width - u16::from(rail),
        ..area
    };
    let width = usize::from(text_area.width);
    let room = gutter.room(width);
    // Comment text shares the content's text column; its card pads it by a cell either side.
    let card_width = room.saturating_sub(1).clamp(1, NOTE_WIDTH);
    let open = (height / 2).max(3);
    if let Some(Prompt::Draft(draft)) = &mut app.prompt {
        // Up and Down in a draft follow the rows of its card.
        draft.editor.width = Some(card_width);
    }
    let file_id = &app.current_file().id;
    let draft = match &app.prompt {
        Some(Prompt::Draft(draft)) => Some(draft),
        _ => None,
    };
    let (from, to) = app.selection();
    let adding = draft.is_some_and(|d| d.editing().is_none());
    // On disk, the reviewed text is the old side of the diff against the revision, so its
    // comments hang beside what changed; comments on a Git diff's old side have no place there.
    let disk = app.view == View::Disk;
    let here = |side: Side| if disk { Side::Old } else { side };
    let comments: Vec<_> = app
        .session
        .comments()
        .iter()
        .enumerate()
        .filter(|(_, c)| &c.target.file_id == file_id && !(disk && c.target.side == Side::Old))
        .collect();
    // The comments hanging beneath row `i`, with the text they show.
    let notes_at = |i: usize| {
        let lines = app.rows[i].lines;
        let mut notes: Vec<(&str, Note)> = comments
            .iter()
            .filter(|(_, c)| lines.contains(&Some((here(c.target.side), c.target.end_line))))
            .map(|(index, c)| match draft {
                Some(d) if d.editing() == Some(c.id.as_str()) => (d.editor.text(), Note::Writing),
                _ if app.focus == Focus::Comments && *index == app.comment => {
                    (c.body.as_str(), Note::Chosen)
                }
                _ => (c.body.as_str(), Note::Plain),
            })
            .collect();
        if adding && i == to {
            notes.push((draft.map_or("", |d| d.editor.text()), Note::Writing));
        }
        notes
    };
    let cursor = draft.map_or(0, |d| d.editor.cursor());
    let card = |body: &str, note| Card::new(body, note, cursor, card_width, open);
    // Lines row `i` takes with its cards, its text in at most `max` lines, and the lines among
    // them that must show: the caret of a comment written there, or the card chosen in the list.
    let block = |i: usize, max: usize| {
        let mut lines = row_height(&app.rows[i], room, max);
        let mut focus = None;
        for (body, note) in notes_at(i) {
            let card = card(body, note);
            focus = focus.or(match note {
                Note::Writing => card.cursor.map(|(row, _)| lines + row..lines + row + 1),
                Note::Chosen => Some(lines..lines + card.height()),
                Note::Plain => None,
            });
            lines += card.height();
        }
        (lines, focus)
    };

    // The cursor row and what hangs beneath it stay in view: its comments and, while writing,
    // the rows down to the draft. Taller than the screen, they show in part, scrolled within
    // by the keys or to keep the caret or the chosen card in view.
    let below = if adding {
        to.max(app.cursor)
    } else {
        app.cursor
    };
    let (mut span, mut focus) = (0, None);
    for i in app.cursor..=below {
        let (lines, at) = block(i, usize::MAX);
        focus = focus.or(at.map(|r| span + r.start..span + r.end));
        span += lines;
    }
    let room_within = span.saturating_sub(height);
    let mut top = app.top.min(app.cursor);
    let mut skip = 0;
    if room_within > 0 {
        top = app.cursor;
        skip = if app.within.0 == app.cursor {
            app.within.1
        } else {
            0
        };
        if let Some(focus) = focus {
            // All of it when it fits, otherwise its start.
            let lowest = focus.end.saturating_sub(height).min(focus.start);
            skip = skip.clamp(lowest, focus.start);
        }
        skip = skip.min(room_within);
    } else {
        let (mut used, mut first) = (span, app.cursor);
        while first > top {
            let (above, _) = block(first - 1, height);
            if used + above > height {
                top = first;
                break;
            }
            used += above;
            first -= 1;
        }
    }

    let selecting = app.anchor.is_some() || adding;
    let covers = |t: &Target, row: &Row| {
        row.lines
            .iter()
            .flatten()
            .any(|&(side, n)| side == here(t.side) && (t.start_line..=t.end_line).contains(&n))
    };
    // While the list is open, the chosen comment's lines show as selected.
    let chosen = comments
        .iter()
        .find(|(index, _)| app.focus == Focus::Comments && *index == app.comment)
        .map(|(_, c)| &c.target);
    let edited = draft
        .and_then(|d| d.editing())
        .and_then(|id| comments.iter().find(|(_, c)| c.id == id))
        .map(|(_, c)| &c.target);
    let mut lines: Vec<Line> = Vec::with_capacity(skip + height);
    // Where the cursor of a comment being written is, as a column and a line.
    let mut caret = None;
    let mut last = top;
    for (i, row) in app.rows.iter().enumerate().skip(top) {
        if lines.len() >= skip + height {
            break;
        }
        last = i;
        let selected =
            (selecting && (from..=to).contains(&i)) || chosen.is_some_and(|t| covers(t, row));
        // A draft's range shows its rail before the comment is recorded.
        let open =
            (adding && selected) || [chosen, edited].iter().flatten().any(|t| covers(t, row));
        let commented = open || comments.iter().any(|(_, c)| covers(&c.target, row));
        let state = RowState {
            // While the list has the keys, only its chosen comment is marked.
            cursor: i == app.cursor && app.focus == Focus::Content,
            selected,
            commented,
            open,
        };
        lines.extend(row_lines(row, &state, &gutter, width, skip + height, theme));
        let notes = notes_at(i);
        for (n, &(body, note)) in notes.iter().enumerate() {
            let card = card(body, note);
            if let Some((row, column)) = card.cursor {
                caret = (lines.len() + row)
                    .checked_sub(skip)
                    .map(|y| (gutter.text() + column, y));
            }
            let last = n + 1 == notes.len();
            lines.extend(card_lines(
                body, &card, note, &gutter, card_width, last, theme,
            ));
        }
    }
    lines.drain(..skip.min(lines.len()));
    if lines.len() < height {
        let end = Line::from(vec![
            Span::raw(" ".repeat(gutter.text())),
            Span::styled("── end", theme.faint),
        ]);
        lines.push(end);
    }
    for (line, y) in lines.into_iter().zip(area.top()..area.bottom()) {
        // Lines render one by one so row tints span the full width.
        frame.render_widget(
            line,
            Rect {
                y,
                height: 1,
                ..text_area
            },
        );
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
            .map(|(_, c)| (here(c.target.side), c.target.end_line))
            .collect();
        for (i, row) in app.rows.iter().enumerate() {
            if row.lines.iter().flatten().any(|line| ends.contains(line)) {
                frame.buffer_mut().set_string(x, y_of(i), "▐", theme.thread);
            }
        }
    }
    if let Some((x, y)) = caret.filter(|&(_, y)| y < height) {
        let x = text_area.x + cells(x.min(width - 1));
        frame.set_cursor_position((x, area.y + cells(y)));
    }
    app.top = top;
    app.within = (app.cursor, skip);
    app.within_room = room_within;
}

struct RowState {
    cursor: bool,
    selected: bool,
    commented: bool,
    /// Its rail leads to the comment chosen in the list or being written.
    open: bool,
}

/// Cells that the wrapped lines of `row` indent by, at most half of `room`.
fn hang(row: &Row, room: usize) -> usize {
    hanging_indent(&row.text).min(room / 2)
}

/// Lines `row` takes with `room` cells for its text, at most `max`.
fn row_height(row: &Row, room: usize, max: usize) -> usize {
    if row.kind == Some(DiffKind::Hunk) {
        1
    } else {
        wrap_line(&row.text, room, hang(row, room), max).len()
    }
}

/// The lines of one content row in a column `width` cells wide, at most `max`: the gutter and
/// the text, wrapped between words, its later lines indented under the first.
fn row_lines(
    row: &Row,
    state: &RowState,
    gutter: &Gutter,
    width: usize,
    max: usize,
    theme: &Theme,
) -> Vec<Line<'static>> {
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
        let rest = width.saturating_sub(2 + lead + text_width(&label));
        let rule = format!("{}{label}{}", "─".repeat(lead), "─".repeat(rest));
        return vec![Line::from(vec![bar, Span::styled(rule, theme.faint)]).style(base)];
    }
    let message = match row.kind {
        Some(DiffKind::Note) => Some(theme.faint.add_modifier(Modifier::ITALIC)),
        None if row.lines == [None, None] => Some(theme.muted.add_modifier(Modifier::ITALIC)),
        _ => None,
    };
    let room = gutter.room(width);
    let indent = hang(row, room);
    let wrapped = wrap_line(&row.text, room, indent, max);
    wrapped
        .into_iter()
        .enumerate()
        .map(|(n, range)| {
            let first = n == 0;
            let number = |line: Option<(Side, usize)>| {
                let n = line.filter(|_| first).map(|(_, n)| n.to_string());
                Span::styled(
                    format!("{:>1$}", n.unwrap_or_default(), gutter.digits),
                    number_style,
                )
            };
            let mut spans = vec![bar.clone(), number(row.lines[0])];
            if gutter.diff {
                spans.extend([Span::raw(" "), number(row.lines[1])]);
            }
            // A light line in the cell's middle, so the rail runs straight into its comment's
            // thread.
            let marker = if state.commented { "│" } else { " " };
            let thread = if state.open {
                theme.open_thread
            } else {
                theme.thread
            };
            spans.extend([Span::raw(" "), Span::styled(marker, thread)]);
            spans.push(match row.kind {
                Some(DiffKind::Add) if first => Span::styled("+", theme.added),
                Some(DiffKind::Delete) if first => Span::styled("-", theme.deleted),
                _ => Span::raw(" "),
            });
            let lead = gutter.text() - spans_width(&spans) + if first { 0 } else { indent };
            spans.push(Span::raw(" ".repeat(lead)));
            match message {
                Some(style) => spans.push(Span::styled(clean(&row.text[range]), style)),
                None => spans.extend(styled_text(row, range, changed, theme)),
            }
            Line::from(spans).style(base)
        })
        .collect()
}

/// The text of `range` in a row, cut at its Markdown marks and changed words and cleaned for
/// the terminal.
fn styled_text(
    row: &Row,
    range: Range<usize>,
    changed: Style,
    theme: &Theme,
) -> Vec<Span<'static>> {
    // Marks and changes are sorted and disjoint, so one pass finds each character's own.
    let (mut marks, mut changes) = (row.marks.iter().peekable(), row.changes.iter().peekable());
    let (mut spans, mut run, mut run_style) = (Vec::new(), String::new(), Style::new());
    for (i, grapheme) in row.text[range.clone()].grapheme_indices(true) {
        let at = range.start + i;
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
    spans
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

/// A comment card hanging on a thread from the marker column, its text on the content's text
/// column. `last` when no other card hangs beneath it from the same line.
fn card_lines(
    body: &str,
    card: &Card,
    note: Note,
    gutter: &Gutter,
    width: usize,
    last: bool,
    theme: &Theme,
) -> Vec<Line<'static>> {
    let (surface, thread) = match note {
        Note::Plain => (theme.card, theme.thread),
        Note::Chosen | Note::Writing => (theme.open_card, theme.open_thread),
    };
    let line = |first: bool, text: String, style: Style| {
        let (joint, rule) = match (first, last) {
            (true, true) => ("╰", "─"),
            (true, false) => ("├", "─"),
            (false, true) => (" ", " "),
            (false, false) => ("│", " "),
        };
        let rule = rule.repeat(gutter.text() - gutter.marker() - 2);
        let fill = width.saturating_sub(text_width(&text));
        Line::from(vec![
            Span::raw(" ".repeat(gutter.marker())),
            Span::styled(format!("{joint}{rule}"), thread),
            Span::styled(" ", surface),
            Span::styled(text, surface.patch(style)),
            Span::styled(" ".repeat(fill + 1), surface),
        ])
    };
    let mut lines: Vec<_> = if note == Note::Writing && body.is_empty() {
        vec![line(true, fit(PLACEHOLDER, width), theme.faint)]
    } else {
        card.rows
            .iter()
            .enumerate()
            .map(|(n, range)| line(n == 0, clean(&body[range.clone()]), theme.note))
            .collect()
    };
    if card.hidden > 0 {
        let more = fit(&format!("… {} more lines", card.hidden), width);
        lines.push(line(false, more, theme.muted));
    }
    lines
}

fn bold(text: String) -> Span<'static> {
    Span::styled(text, Style::new().add_modifier(Modifier::BOLD))
}

/// One line of the comments drawer.
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
    let block = if matches!(app.prompt, Some(Prompt::ConfirmDelete)) {
        drawer_block("Delete this comment?", None, theme.error, theme)
    } else {
        drawer_block("Comments", Some(comments.len()), theme.accent, theme)
    };
    let inner = block.inner(area);
    frame.render_widget(block, area);
    if comments.is_empty() {
        let hint = Line::from(vec![
            Span::styled("No comments yet. Select lines with ", theme.muted),
            key("v"),
            Span::styled(", then press ", theme.muted),
            key("c"),
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
    // Comments start on the document's text column, with their lines right-aligned before
    // them, unless a wide place needs more room. The chosen comment's band spans the drawer,
    // like the cursor's the content, with the cursor's bar.
    let text = Gutter::of(app).text().max(place_width + 3);
    let body_width = usize::from(area.width).saturating_sub(text + 1);
    let visible = usize::from(inner.height).max(1);
    let at = listed
        .iter()
        .position(|l| matches!(l, Listed::Comment(i) if *i == app.comment))
        .unwrap_or(0);
    // Keep the selected comment in view, with its file heading when it fits.
    let first = at.saturating_sub(visible - 1);
    for (line, y) in listed[first..].iter().zip(inner.top()..inner.bottom()) {
        let line = match *line {
            Listed::File(i) => {
                Line::from(vec![Span::raw(" "), bold(clean(&comments[i].target.path))])
            }
            Listed::Comment(i) => {
                let chosen = i == app.comment;
                let (bar, place, base) = if chosen {
                    (
                        "▌",
                        theme.accent.add_modifier(Modifier::BOLD),
                        theme.selection,
                    )
                } else {
                    (" ", theme.faint, Style::new())
                };
                let body = clean(&comments[i].body.replace('\n', " ↵ "));
                let indent = " ".repeat(text - 3 - text_width(&places[i]));
                Line::from(vec![
                    Span::styled(bar, theme.accent),
                    Span::styled(format!("{indent}{}", places[i]), place),
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
                ..area
            },
        );
    }
}

fn render_keys(frame: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    let block = drawer_block("Keys", None, theme.accent, theme);
    let inner = block.inner(area);
    frame.render_widget(block, area);
    let room = usize::from(inner.width);
    let grid = KeyGrid::new(room);
    let mut lines = Vec::new();
    // Each group is a column of keys and labels; columns share left edges from row to row.
    for row in KEYS[..grid.groups].chunks(grid.columns) {
        let gap = |j: usize| if j + 1 < row.len() { KEY_GAP } else { 0 };
        lines.push(Line::from(
            row.iter()
                .enumerate()
                .map(|(j, (name, _))| {
                    let (key, label) = grid.widths[j];
                    bold(pad(name, key + 1 + label + gap(j)))
                })
                .collect::<Vec<_>>(),
        ));
        for n in 0..rows_of(row) {
            let mut spans = Vec::new();
            for (j, (_, pairs)) in row.iter().enumerate() {
                let (key_width, label) = grid.widths[j];
                let (k, l) = pairs.get(n).copied().unwrap_or(("", ""));
                spans.push(key(&pad(k, key_width + 1)));
                spans.push(Span::styled(pad(l, label + gap(j)), theme.muted));
            }
            lines.push(Line::from(spans));
        }
        lines.push(Line::default());
    }
    if grid.groups < KEYS.len() {
        lines.push(Line::from(key_spans(KEYS[KEYS.len() - 1].1, theme)));
    }
    let output = clean(&files::display(app.session.output()));
    let label = "Saves to  ";
    lines.push(Line::from(vec![
        Span::styled(label, theme.muted),
        Span::raw(fit_start(&output, room.saturating_sub(label.len()))),
    ]));
    frame.render_widget(Paragraph::new(lines), inner);
}

/// The key groups laid out as rows of side-by-side columns.
struct KeyGrid {
    /// Groups side by side.
    columns: usize,
    /// Groups in the grid; a last group left alone in a row takes a line of its own instead.
    groups: usize,
    /// The widest key and label of each column, in cells.
    widths: Vec<(usize, usize)>,
}

impl KeyGrid {
    /// The most columns that fit in `width` cells.
    fn new(width: usize) -> Self {
        let grid = |columns: usize| {
            let groups = if columns > 1 && KEYS.len() % columns == 1 {
                KEYS.len() - 1
            } else {
                KEYS.len()
            };
            let widths = (0..columns)
                .map(|j| {
                    let column = (j..groups).step_by(columns).map(|g| KEYS[g].1);
                    column
                        .map(key_widths)
                        .fold((0, 0), |(k, l), (key, label)| (k.max(key), l.max(label)))
                })
                .collect();
            Self {
                columns,
                groups,
                widths,
            }
        };
        (1..=KEYS.len())
            .rev()
            .map(grid)
            .find(|grid| grid.width() <= width)
            .unwrap_or_else(|| grid(1))
    }

    fn width(&self) -> usize {
        let text: usize = self.widths.iter().map(|(key, label)| key + 1 + label).sum();
        text + KEY_GAP * (self.columns - 1)
    }

    /// Lines the grid takes, each row of columns followed by a blank line.
    fn height(&self) -> usize {
        KEYS[..self.groups]
            .chunks(self.columns)
            .map(|row| 2 + rows_of(row))
            .sum()
    }
}

/// A key group's widest key and widest label, in cells.
fn key_widths(pairs: &[(&str, &str)]) -> (usize, usize) {
    let key = pairs.iter().map(|(k, _)| text_width(k)).max();
    let label = pairs.iter().map(|(_, l)| text_width(l)).max();
    (key.unwrap_or(0), label.unwrap_or(0))
}

/// Rows of the longest group in a row of columns.
fn rows_of(groups: &[(&str, &[(&str, &str)])]) -> usize {
    groups
        .iter()
        .map(|(_, pairs)| pairs.len())
        .max()
        .unwrap_or(0)
}

fn render_quit(frame: &mut Frame, area: Rect, theme: &Theme) {
    let block = drawer_block("Unsaved feedback", None, theme.accent, theme);
    let keys = [
        ("s", "save and quit"),
        ("d", "discard"),
        ("esc", "keep reviewing"),
    ];
    let lines = vec![
        Line::styled("Comments changed since the last save.", theme.muted),
        Line::default(),
        Line::from(key_spans(&keys, theme)),
    ];
    frame.render_widget(Paragraph::new(lines).block(block), area);
}

fn render_footer(frame: &mut Frame, area: Rect, app: &App, theme: &Theme) {
    frame.buffer_mut().set_style(area, theme.surface);
    let count = app.session.comments().len();
    let count = Span::styled(
        match count {
            0 => "no comments".into(),
            1 => "1 comment".into(),
            n => format!("{n} comments"),
        },
        theme.muted,
    );
    // The status from most to least detailed: the cursor position goes first, then the
    // saved file's name, when the hints need the room.
    let state: Vec<Vec<Span>> = if app.session.is_dirty() {
        vec![vec![
            Span::styled("   ● ", theme.accent),
            Span::raw("unsaved"),
        ]]
    } else if let Some(saved) = app.session.last_saved() {
        let name = saved
            .file_name()
            .map(|n| n.to_string_lossy())
            .unwrap_or_default();
        let saved = |text: String| {
            vec![
                Span::styled("   ✓ ", theme.accent),
                Span::styled(text, theme.muted),
            ]
        };
        vec![
            saved(format!("saved to {}", clean(&name))),
            saved("saved".into()),
        ]
    } else {
        vec![Vec::new()]
    };
    let status = |position: Option<Span<'static>>, state: &[Span<'static>]| {
        let mut spans: Vec<Span> = position.into_iter().collect();
        spans.push(count.clone());
        spans.extend(state.iter().cloned());
        spans.push(Span::raw(" "));
        spans
    };
    let mut choices: Vec<_> = position(app)
        .map(|place| {
            status(
                Some(Span::styled(format!("{place}   "), theme.faint)),
                &state[0],
            )
        })
        .into_iter()
        .collect();
    choices.extend(state.iter().map(|state| status(None, state)));
    // Cells left of `right`, less the leading space and a gap before it.
    let room = |right: &[Span]| {
        usize::from(area.width).saturating_sub(1 + STATUS_GAP + spans_width(right))
    };
    let (left, right) = match &app.notice {
        Some(notice) => {
            let (mark, style) = if notice.error {
                ("✕ ", theme.error)
            } else {
                ("› ", theme.accent)
            };
            let text = clean(&notice.text);
            // A notice says what just happened, so it keeps its room over the status.
            let need = text_width(mark) + text_width(&text);
            let right = choices
                .into_iter()
                .find(|right| need <= room(right))
                .unwrap_or_default();
            let text = fit(&text, room(&right).saturating_sub(text_width(mark)));
            let text_style = if notice.error {
                theme.error
            } else {
                Style::new()
            };
            (
                vec![Span::styled(mark, style), Span::styled(text, text_style)],
                right,
            )
        }
        None => {
            let pairs = hints(app);
            // The most detailed status that leaves room for every hint; otherwise the
            // shortest, with as many hints as fit. On the narrowest screens the last hint,
            // the way out, takes the place of the status.
            let right = match choices
                .iter()
                .position(|right| pairs_width(&pairs) <= room(right))
            {
                Some(i) => choices.swap_remove(i),
                None => {
                    let shortest = choices.pop().unwrap_or_default();
                    let last = &pairs[pairs.len().saturating_sub(1)..];
                    if pairs_width(last) <= room(&shortest) {
                        shortest
                    } else {
                        Vec::new()
                    }
                }
            };
            (key_spans(&fit_hints(&pairs, room(&right)), theme), right)
        }
    };
    let mut line = vec![Span::raw(" ")];
    line.extend(left);
    render_split(frame, area, line, right);
}

/// The cursor's line and how many lines its text has, as `5/21`, or `new 5/40` in a Git
/// change. Rows without a line, such as hunk labels, have none, and so does the content
/// while the comments list has the keys.
fn position(app: &App) -> Option<String> {
    let row = app
        .rows
        .get(app.cursor)
        .filter(|_| app.focus == Focus::Content)?;
    let (side, line) = row
        .target
        .or_else(|| row.lines.iter().rev().flatten().next().copied())?;
    let place = match side {
        Side::Source => line.to_string(),
        side => format!("{side} {line}"),
    };
    // The disk side of a revision is no snapshot, so its length is unknown here.
    let total = (app.view != View::Disk)
        .then(|| app.current_file().snapshot(side))
        .flatten()
        .map(|snapshot| lines(&snapshot.text).len());
    Some(match total {
        Some(total) => format!("{place}/{total}"),
        None => place,
    })
}

/// As many hints as fit in `room` cells, in order, always keeping the last one: it is the
/// way out of what the user is doing, or into the key list.
fn fit_hints<'a>(pairs: &[(&'a str, &'a str)], room: usize) -> Vec<(&'a str, &'a str)> {
    let Some((last, rest)) = pairs.split_last() else {
        return Vec::new();
    };
    let mut shown: Vec<_> = rest.to_vec();
    while !shown.is_empty() && pairs_width(&[shown.as_slice(), &[*last]].concat()) > room {
        shown.pop();
    }
    shown.push(*last);
    if pairs_width(&shown) > room {
        shown.clear();
    }
    shown
}

/// The most useful keys for what the user is doing now.
fn hints(app: &App) -> Vec<(&'static str, &'static str)> {
    match &app.prompt {
        Some(Prompt::Draft(_)) => {
            return vec![
                ("enter", "record"),
                ("shift/alt+enter", "new line"),
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
            vec![("a", "close")]
        } else {
            vec![
                ("j k", "choose"),
                ("enter", "go to"),
                ("e", "edit"),
                ("d", "delete"),
                ("a", "close"),
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
    keys.extend([("a", "all comments"), ("s", "save"), ("?", "keys")]);
    keys
}

fn key(text: &str) -> Span<'static> {
    bold(text.to_string())
}

/// Keys and their labels on one line.
fn key_spans(pairs: &[(&str, &str)], theme: &Theme) -> Vec<Span<'static>> {
    let mut spans = Vec::new();
    for (i, (name, label)) in pairs.iter().enumerate() {
        if i > 0 {
            spans.push(Span::raw(" ".repeat(KEY_GAP)));
        }
        spans.push(key(name));
        spans.push(Span::styled(format!(" {label}"), theme.muted));
    }
    spans
}

/// Cells that `pairs` take on one line.
fn pairs_width(pairs: &[(&str, &str)]) -> usize {
    let text: usize = pairs
        .iter()
        .map(|(key, label)| text_width(key) + 1 + text_width(label))
        .sum();
    text + KEY_GAP * pairs.len().saturating_sub(1)
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

fn spans_width(spans: &[Span]) -> usize {
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
            crossterm::event::{KeyCode, KeyEvent},
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
                app.handle_key(KeyEvent::from(KeyCode::Enter));
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
    fn styled_text_styles_each_range() {
        let theme = Theme::new([200; 3], [20; 3], true);
        let row = Row {
            text: "a **b**\tc".into(),
            kind: None,
            lines: [Some((Side::Source, 1)), None],
            target: None,
            marks: vec![(2..4, markdown::SYNTAX), (4..5, markdown::STRONG)],
            changes: vec![2..4, 4..7],
        };
        let shown = |range| {
            let spans = styled_text(&row, range, Style::new(), &theme);
            spans
                .iter()
                .map(|s| s.content.to_string())
                .collect::<Vec<_>>()
        };
        assert_eq!(shown(0..9), strings(&["a ", "**", "b", "**    c"]));
        assert_eq!(shown(3..7), strings(&["*", "b", "**"]));
        let spans = styled_text(&row, 0..9, Style::new(), &theme);
        assert_eq!(spans[2].style, markdown_style(markdown::STRONG, &theme));
        // A changed combining accent highlights the letter it sits on.
        let accent = Row {
            text: "cafe\u{301}".into(),
            marks: Vec::new(),
            changes: vec![4..5, 5..6],
            ..row
        };
        let bold = Style::new().add_modifier(Modifier::BOLD);
        let spans = styled_text(&accent, 0..6, bold, &theme);
        let spans: Vec<_> = spans
            .iter()
            .map(|s| (s.content.as_ref(), s.style))
            .collect();
        assert_eq!(spans, [("caf", Style::new()), ("e\u{301}", bold)]);
    }

    #[test]
    fn long_lines_wrap_beneath_their_first_row() {
        use crate::session::Session;
        let dir = tempfile::tempdir().unwrap();
        let item = "- every word of this list item stays readable on a narrow screen";
        std::fs::write(dir.path().join("a.md"), format!("{item}\nnext\n")).unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        let screen = screen_text(&mut app, 40, 12);
        let content = &screen[2..];
        let words: Vec<&str> = content
            .iter()
            .take_while(|l| !l.contains("next"))
            .flat_map(|l| l[l.char_indices().nth(8).unwrap().0..].split_whitespace())
            .collect();
        assert_eq!(words.join(" "), item, "{screen:#?}");
        // Wrapped rows have no line number and hang beneath the item's text.
        let wrapped: Vec<char> = content[1].chars().collect();
        assert!(wrapped[1..10].iter().all(|&c| c == ' '), "{screen:#?}");
        assert_ne!(wrapped[10], ' ', "{screen:#?}");
        assert!(content.iter().any(|l| l.trim_start().starts_with("2 ")));
    }

    #[test]
    fn a_line_taller_than_the_screen_scrolls_to_its_end() {
        use crate::session::Session;
        use ratatui::crossterm::event::{KeyCode, KeyEvent};
        let dir = tempfile::tempdir().unwrap();
        let long: String = (1..=120).map(|n| format!("word{n} ")).collect();
        std::fs::write(dir.path().join("a.md"), format!("{long}\nnext\n")).unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        let shows = |app: &mut App, text: &str| {
            screen_text(app, 40, 12)
                .iter()
                .any(|l| l.split_whitespace().any(|w| w == text))
        };
        assert!(shows(&mut app, "word1") && !shows(&mut app, "word120"));
        // Down scrolls through the line before it moves on, then up shows its end again.
        let mut presses = 0;
        while !shows(&mut app, "word120") {
            app.handle_key(KeyEvent::from(KeyCode::Char('j')));
            presses += 1;
            assert!(presses < 200 && app.cursor == 0, "{presses} presses");
        }
        assert!(!shows(&mut app, "word1"));
        app.handle_key(KeyEvent::from(KeyCode::Char('j')));
        assert_eq!(app.cursor, 1);
        app.handle_key(KeyEvent::from(KeyCode::Char('k')));
        assert_eq!(app.cursor, 0);
        assert!(shows(&mut app, "word120") && !shows(&mut app, "word1"));
    }

    #[test]
    fn the_top_and_other_files_start_at_the_beginning_of_a_tall_line() {
        use crate::session::Session;
        use ratatui::crossterm::event::{KeyCode, KeyEvent};
        let dir = tempfile::tempdir().unwrap();
        let tall = |name: &str| (1..=120).map(|n| format!("{name}{n} ")).collect::<String>();
        std::fs::write(dir.path().join("a.md"), format!("{}\nnext\n", tall("a"))).unwrap();
        std::fs::write(dir.path().join("b.md"), format!("{}\nnext\n", tall("b"))).unwrap();
        let paths = [dir.path().join("a.md"), dir.path().join("b.md")];
        let session = Session::open(&paths, dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        let shows = |app: &mut App, text: &str| {
            screen_text(app, 40, 12)
                .iter()
                .any(|l| l.split_whitespace().any(|w| w == text))
        };
        let press = |app: &mut App, c: char, times: usize| {
            for _ in 0..times {
                app.handle_key(KeyEvent::from(KeyCode::Char(c)));
                screen_text(app, 40, 12);
            }
        };
        screen_text(&mut app, 40, 12);
        press(&mut app, 'j', 3);
        assert_eq!(app.cursor, 0);
        assert!(!shows(&mut app, "a1"));
        // Another file opens at its first word.
        press(&mut app, ']', 1);
        assert!(
            shows(&mut app, "b1"),
            "{:#?}",
            screen_text(&mut app, 40, 12)
        );
        // The top shows the first line from its start, from anywhere below it.
        press(&mut app, 'j', 200);
        assert_eq!(app.cursor, 1);
        press(&mut app, 'g', 1);
        assert!(
            shows(&mut app, "b1"),
            "{:#?}",
            screen_text(&mut app, 40, 12)
        );
    }

    #[test]
    fn moving_past_either_end_keeps_a_tall_line_where_it_is() {
        use crate::session::Session;
        use ratatui::crossterm::event::{KeyCode, KeyEvent};
        let dir = tempfile::tempdir().unwrap();
        let long: String = (1..=120).map(|n| format!("word{n} ")).collect();
        std::fs::write(dir.path().join("a.md"), format!("{long}\n")).unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        let shows = |app: &mut App, text: &str| {
            screen_text(app, 40, 12)
                .iter()
                .any(|l| l.split_whitespace().any(|w| w == text))
        };
        let press = |app: &mut App, c: char| {
            app.handle_key(KeyEvent::from(KeyCode::Char(c)));
            screen_text(app, 40, 12);
        };
        screen_text(&mut app, 40, 12);
        press(&mut app, 'k');
        assert!(shows(&mut app, "word1"), "up at the start stays there");
        press(&mut app, 'G');
        assert!(shows(&mut app, "word120"), "the bottom is the line's end");
        press(&mut app, 'j');
        assert!(shows(&mut app, "word120"), "down at the end stays there");
        press(&mut app, 'g');
        assert!(shows(&mut app, "word1"), "the top is the line's start");
    }

    #[test]
    fn the_chosen_comment_shows_beneath_a_tall_line() {
        use crate::session::Session;
        use ratatui::crossterm::event::{KeyCode, KeyEvent};
        let dir = tempfile::tempdir().unwrap();
        let long: String = (1..=120).map(|n| format!("word{n} ")).collect();
        std::fs::write(dir.path().join("a.md"), format!("{long}\nnext\n")).unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        app.handle_key(KeyEvent::from(KeyCode::Char('c')));
        app.paste("Chosen card");
        app.handle_key(KeyEvent::from(KeyCode::Enter));
        for code in [KeyCode::Char('g'), KeyCode::Char('a')] {
            app.handle_key(KeyEvent::from(code));
        }
        let screen = screen_text(&mut app, 40, 16);
        // The card shows in the content, above the drawer's own line for it.
        let card = screen.iter().position(|l| l.contains("╰─ Chosen card"));
        let drawer = screen.iter().position(|l| l.contains("Comments"));
        assert!(card.is_some_and(|c| Some(c) < drawer), "{screen:#?}");
    }

    #[test]
    fn the_caret_stays_in_view_beneath_tall_comments() {
        use crate::session::Session;
        use ratatui::{
            Terminal,
            backend::TestBackend,
            crossterm::event::{KeyCode, KeyEvent, KeyModifiers},
        };
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.md"), "one\ntwo\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        app.handle_key(KeyEvent::from(KeyCode::Char('c')));
        app.paste("1\n2\n3\n4\n5\n6");
        app.handle_key(KeyEvent::from(KeyCode::Enter));
        app.handle_key(KeyEvent::from(KeyCode::Char('c')));
        app.paste("a\nb\nc");
        app.handle_key(KeyEvent::new(KeyCode::Enter, KeyModifiers::ALT));
        app.paste("last");
        let theme = Theme::new([200; 3], [20; 3], true);
        let mut terminal = Terminal::new(TestBackend::new(60, 12)).unwrap();
        terminal
            .draw(|frame| render(frame, &mut app, &theme))
            .unwrap();
        let cursor = terminal.get_cursor_position().unwrap();
        let buffer = terminal.backend().buffer();
        let line: String = (0..60).map(|x| buffer[(x, cursor.y)].symbol()).collect();
        // The content spans lines 2 to 10, between the header and the key line.
        assert!((2..11).contains(&cursor.y), "{cursor:?}");
        assert!(line.contains("last"), "{line:?}");
    }

    #[test]
    fn a_comment_is_written_in_its_card_beneath_its_lines() {
        use crate::session::Session;
        use ratatui::{
            Terminal,
            backend::TestBackend,
            crossterm::event::{KeyCode, KeyEvent},
        };
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.md"), "one\ntwo\nthree\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        let theme = Theme::new([200; 3], [20; 3], true);
        let mut terminal = Terminal::new(TestBackend::new(60, 12)).unwrap();
        let mut draw = |app: &mut App| {
            terminal.draw(|frame| render(frame, app, &theme)).unwrap();
            let buffer = terminal.backend().buffer().clone();
            let lines: Vec<String> = (0..12)
                .map(|y| (0..60).map(|x| buffer[(x, y)].symbol()).collect())
                .collect();
            // The thread's corner and the rail above it join as one line: same color and
            // weight, as a bold corner comes from another font and misses the rail.
            let y = lines.iter().position(|l| l.contains("╰─")).unwrap() as u16;
            let x = lines[usize::from(y)]
                .chars()
                .position(|c| c == '╰')
                .unwrap() as u16;
            let (corner, rail) = (&buffer[(x, y)], &buffer[(x, y - 1)]);
            assert_eq!((rail.symbol(), rail.fg), ("│", corner.fg), "{lines:#?}");
            assert!(!(corner.modifier | rail.modifier).contains(Modifier::BOLD));
            (lines, terminal.get_cursor_position().unwrap())
        };
        for code in [KeyCode::Char('v'), KeyCode::Char('j'), KeyCode::Char('c')] {
            app.handle_key(KeyEvent::from(code));
        }
        let (lines, cursor) = draw(&mut app);
        // The card hangs beneath the selection, the cursor where its text starts.
        let card = lines.iter().position(|l| l.contains(PLACEHOLDER)).unwrap();
        assert!(lines[card - 1].contains("two") && lines[card + 1].contains("three"));
        assert_eq!((cursor.x, cursor.y), (8, card as u16), "{lines:#?}");
        app.paste("Say why");
        let (lines, cursor) = draw(&mut app);
        assert!(lines[card].contains("╰─ Say why"), "{lines:#?}");
        assert_eq!((cursor.x, cursor.y), (15, card as u16));
        // Recorded, it stays where it was written, and chosen in the list too.
        app.handle_key(KeyEvent::from(KeyCode::Enter));
        let (lines, _) = draw(&mut app);
        assert!(lines[card].contains("╰─ Say why"), "{lines:#?}");
        app.handle_key(KeyEvent::from(KeyCode::Char('a')));
        let (lines, _) = draw(&mut app);
        assert!(lines[card].contains("╰─ Say why"), "{lines:#?}");
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
            // Written text takes a second Esc to discard.
            cursor(&mut app, KeyCode::Esc);
            cursor(&mut app, KeyCode::Esc);
        }
    }

    #[test]
    fn comments_beneath_the_cursor_stay_in_view() {
        use crate::session::Session;
        use ratatui::{
            Terminal,
            backend::TestBackend,
            crossterm::event::{KeyCode, KeyEvent},
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
            lines
                .iter()
                .any(|l| (l.contains('╰') || l.contains('├')) && l.contains(text))
        };
        for code in [KeyCode::Char('G'), KeyCode::Char('c')] {
            app.handle_key(KeyEvent::from(code));
        }
        app.paste("first thought");
        app.handle_key(KeyEvent::from(KeyCode::Enter));
        assert!(threads(&screen(&mut app), "first thought"));
        app.handle_key(KeyEvent::from(KeyCode::Char('c')));
        app.paste("second thought");
        let lines = screen(&mut app);
        assert!(threads(&lines, "first thought"), "{lines:#?}");
        assert!(threads(&lines, "second thought"), "{lines:#?}");
    }

    #[test]
    fn notices_keep_their_text_on_narrow_screens() {
        use super::super::app::Notice;
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

    /// Lines of the screen drawn at `width` by `height`.
    fn screen_text(app: &mut App, width: u16, height: u16) -> Vec<String> {
        use ratatui::{Terminal, backend::TestBackend};
        let theme = Theme::new([200; 3], [20; 3], true);
        let mut terminal = Terminal::new(TestBackend::new(width, height)).unwrap();
        terminal.draw(|frame| render(frame, app, &theme)).unwrap();
        let buffer = terminal.backend().buffer();
        (0..height)
            .map(|y| (0..width).map(|x| buffer[(x, y)].symbol()).collect())
            .collect()
    }

    #[test]
    fn the_key_line_shows_whole_hints_apart_from_the_status() {
        use crate::session::Session;
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.md"), "text\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        let labels = ["select", "comment", "all", "comments", "save", "keys"];
        for width in 20..=100 {
            let footer = screen_text(&mut app, width, 8).pop().unwrap();
            let footer = footer.trim();
            // Every word is a whole label or status word, and the status stays apart.
            for word in footer.split_whitespace() {
                let known =
                    word.len() == 1 || labels.contains(&word) || ["no", "1/1"].contains(&word);
                assert!(known, "{width} cells: {footer:?}");
            }
            // Only on the narrowest screens does the way into the key list take the place
            // of the status.
            assert!(
                footer.ends_with("no comments") || footer == "? keys",
                "{width} cells: {footer:?}"
            );
            // The way into the key list stays.
            assert!(
                width < 30 || footer.starts_with("? keys") || footer.contains("    ? keys"),
                "{width} cells: {footer:?}"
            );
            assert!(!footer.contains("keys1/1"), "{width} cells: {footer:?}");
        }
        // With room, every hint and the cursor position show.
        let wide = screen_text(&mut app, 100, 8).pop().unwrap();
        assert!(
            wide.contains("? keys") && wide.contains("1/1   no comments"),
            "{wide:?}"
        );
    }

    #[test]
    fn the_position_names_the_line_and_its_side() {
        use crate::{
            feedback::{Feedback, ReviewFile, Snapshot},
            session::Session,
        };
        use ratatui::crossterm::event::{KeyCode, KeyEvent};
        let file = ReviewFile::new(
            "note.txt".into(),
            vec![
                Snapshot::new(Side::Old, "base", "context\nold\n".into()),
                Snapshot::new(Side::New, "working tree", "context\nnew\n".into()),
            ],
        );
        let dir = tempfile::tempdir().unwrap();
        let feedback = Feedback::new(std::path::Path::new("/"), vec![file]);
        let session = Session::new(feedback, None, dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        // Rows: hunk label, context line 1, deleted old line 2, added new line 2.
        let footer = |app: &mut App| screen_text(app, 120, 10).pop().unwrap();
        assert!(footer(&mut app).contains("new 1/2   no comments"));
        app.handle_key(KeyEvent::from(KeyCode::Char('j')));
        assert!(footer(&mut app).contains("old 2/2   no comments"));
        app.handle_key(KeyEvent::from(KeyCode::Char('g')));
        assert!(footer(&mut app).trim_end().ends_with("no comments"));
        assert!(!footer(&mut app).contains('/'), "a hunk label has no line");
    }

    #[test]
    fn changes_on_disk_show_the_comments_beside_them() {
        use crate::session::Session;
        use ratatui::crossterm::event::{KeyCode, KeyEvent};
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("a.md");
        std::fs::write(&path, "keep\nold step\nkeep\n").unwrap();
        let session =
            Session::open(std::slice::from_ref(&path), dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        app.handle_key(KeyEvent::from(KeyCode::Char('j')));
        app.handle_key(KeyEvent::from(KeyCode::Char('c')));
        app.paste("Rename this step");
        app.handle_key(KeyEvent::from(KeyCode::Enter));
        // The agent rewrites the line; the comment hangs beneath the line it replaced.
        std::fs::write(&path, "keep\nnew step\nkeep\n").unwrap();
        app.handle_key(KeyEvent::from(KeyCode::Char('r')));
        let screen = screen_text(&mut app, 80, 12);
        let at = |text: &str| screen.iter().position(|l| l.contains(text));
        let (old, note, new) = (at("old step"), at("Rename this step"), at("new step"));
        assert!(old < note && note < new, "{screen:#?}");
    }

    #[test]
    fn the_way_out_outlasts_the_status() {
        use crate::session::Session;
        use ratatui::crossterm::event::{KeyCode, KeyEvent};
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.md"), "text\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        // Unsaved feedback makes the status long; a draft's last hint is the way out.
        app.handle_key(KeyEvent::from(KeyCode::Char('c')));
        app.paste("recorded");
        app.handle_key(KeyEvent::from(KeyCode::Enter));
        app.handle_key(KeyEvent::from(KeyCode::Char('x')));
        app.handle_key(KeyEvent::from(KeyCode::Char('c')));
        for width in 14..=40 {
            let footer = screen_text(&mut app, width, 12).pop().unwrap();
            assert!(footer.contains("esc cancel"), "{width} cells: {footer:?}");
        }
    }

    #[test]
    fn the_key_reference_shows_every_key_on_a_standard_terminal() {
        use crate::session::Session;
        use ratatui::crossterm::event::{KeyCode, KeyEvent};
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("a.md"), "text\n").unwrap();
        let session =
            Session::open(&[dir.path().join("a.md")], dir.path().join("out.json")).unwrap();
        let mut app = App::new(session);
        app.handle_key(KeyEvent::from(KeyCode::Char('?')));
        for width in [60, 80, 120] {
            let screen = screen_text(&mut app, width, 30).join("\n");
            for (_, pairs) in KEYS {
                for (key, label) in pairs {
                    assert!(screen.contains(label), "{width}: {label}\n{screen}");
                    assert!(screen.contains(key), "{width}: {key}\n{screen}");
                }
            }
            assert!(screen.contains("out.json"), "{screen}");
        }
        let shape = |width| {
            let grid = KeyGrid::new(width);
            (grid.columns, grid.groups)
        };
        // Three columns and a feedback line on 80 columns; aligned pairs on 60; one row on 120.
        assert_eq!([shape(76), shape(56), shape(116)], [(3, 3), (2, 4), (4, 4)]);
    }

    fn strings(texts: &[&str]) -> Vec<String> {
        texts.iter().map(|t| t.to_string()).collect()
    }
}
