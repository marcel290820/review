//! Draws the terminal review screen.

use super::app::{App, Draft, Focus, Prompt, View};
use crate::{diff::DiffKind, feedback::Side};
use ratatui::{
    Frame,
    layout::{Constraint, Layout, Rect},
    style::{Color, Modifier, Style},
    text::Line,
    widgets::{Block, List, ListItem, ListState, Paragraph},
};

const KEYS: &str = "j/k move · PgUp/PgDn · h/l scroll · [/] files · b sides · o/n diff target · r revisions · s save · q quit";

pub fn render(frame: &mut Frame, app: &mut App) {
    let draft_height = if matches!(app.prompt, Some(Prompt::Draft(_))) {
        8
    } else {
        3
    };
    let [header, body, footer] = Layout::vertical([
        Constraint::Length(3),
        Constraint::Min(3),
        Constraint::Length(draft_height),
    ])
    .areas(frame.area());
    let [content, comments] =
        Layout::horizontal([Constraint::Percentage(68), Constraint::Percentage(32)]).areas(body);
    render_header(frame, header, app);
    render_content(frame, content, app);
    render_comments(frame, comments, app);
    match &app.prompt {
        Some(Prompt::Draft(draft)) => render_draft(frame, footer, app, draft),
        _ => render_status(frame, footer, app),
    }
}

/// Makes text safe to print in a terminal: tabs become spaces and other control
/// characters a replacement mark, so content cannot emit escape sequences.
pub fn clean(text: &str) -> String {
    let mut cleaned = String::with_capacity(text.len());
    for c in text.chars() {
        match c {
            '\t' => cleaned.push_str("    "),
            c if c.is_control() => cleaned.push('\u{FFFD}'),
            c => cleaned.push(c),
        }
    }
    cleaned
}

fn render_header(frame: &mut Frame, area: Rect, app: &App) {
    let file = app.current_file();
    let view = match app.view {
        View::Main if file.is_diff() => "unified diff",
        View::Main | View::Snapshot(Side::Source) => "reviewed source",
        View::Snapshot(Side::Old) => "old source",
        View::Snapshot(Side::New) => "new source",
        View::Disk => "disk revision (read-only)",
    };
    let saved = if app.session.is_dirty() {
        "unsaved"
    } else if app.session.last_saved().is_some() {
        "saved"
    } else {
        "no comments yet"
    };
    let lines = vec![
        Line::from(format!(
            "Review · {} · {}/{} · {view} · {}",
            clean(&file.path),
            app.file + 1,
            app.session.files().len(),
            app.session.disk(app.file).status.label()
        )),
        Line::from(format!(
            "Save: {} · {saved}",
            clean(&app.session.output().display().to_string())
        )),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

fn render_content(frame: &mut Frame, area: Rect, app: &mut App) {
    // Build only the visible rows: a snapshot can have tens of thousands of lines.
    let height = usize::from(area.height.saturating_sub(2)).max(1);
    if app.cursor < app.top {
        app.top = app.cursor;
    } else if app.cursor >= app.top + height {
        app.top = app.cursor + 1 - height;
    }
    let (first, last) = app.selection();
    let end = (app.top + height).min(app.rows.len());
    let items: Vec<_> = (app.top..end)
        .map(|i| {
            let row = &app.rows[i];
            let color = match row.kind {
                Some(DiffKind::Add) => Color::Green,
                Some(DiffKind::Delete) => Color::Red,
                Some(DiffKind::Hunk) => Color::Cyan,
                _ => Color::Reset,
            };
            let text: String = clean(&row.text).chars().skip(app.scroll_x).collect();
            let selected = app.anchor.is_some() && (first..=last).contains(&i);
            ListItem::new(Line::styled(text, Style::new().fg(color))).style(if selected {
                Style::new().bg(Color::DarkGray)
            } else {
                Style::new()
            })
        })
        .collect();
    let title = match app.focus {
        Focus::Content => "Content · v select · c comment",
        Focus::Comments => "Content",
    };
    let list = List::new(items)
        .block(Block::bordered().title(title))
        .highlight_style(Style::new().add_modifier(Modifier::REVERSED));
    let mut state = ListState::default().with_selected(Some(app.cursor - app.top));
    frame.render_stateful_widget(list, area, &mut state);
}

fn render_comments(frame: &mut Frame, area: Rect, app: &App) {
    let comments = app.session.comments();
    let items = comments.iter().map(|c| {
        let t = &c.target;
        ListItem::new(vec![
            Line::from(format!(
                "{} {} L{}–{}",
                clean(&t.path),
                t.side,
                t.start_line,
                t.end_line
            )),
            Line::from(clean(&c.body.replace('\n', " ↵ "))),
        ])
    });
    let highlight = match app.focus {
        Focus::Comments => Color::Blue,
        Focus::Content => Color::DarkGray,
    };
    let list = List::new(items)
        .block(Block::bordered().title("Comments · Tab · Enter revisit · e edit · d delete"))
        .highlight_style(Style::new().bg(highlight));
    let mut state =
        ListState::default().with_selected((!comments.is_empty()).then_some(app.comment));
    frame.render_stateful_widget(list, area, &mut state);
}

fn render_status(frame: &mut Frame, area: Rect, app: &App) {
    // A confirmation replaces the key help, keeping room for a failure message.
    let (first, second) = match app.prompt {
        Some(Prompt::ConfirmQuit) => (
            "Unsaved feedback. s save and quit · d discard · Esc cancel",
            app.message.as_str(),
        ),
        Some(Prompt::ConfirmDelete) => (
            "Delete this comment? y delete · Esc cancel",
            app.message.as_str(),
        ),
        _ => (app.message.as_str(), KEYS),
    };
    let lines = vec![
        Line::from(clean(first)),
        Line::from(clean(second)),
        Line::from(clean(&app.session.disk(app.file).message)),
    ];
    frame.render_widget(Paragraph::new(lines), area);
}

fn render_draft(frame: &mut Frame, area: Rect, app: &App, draft: &Draft) {
    let [message, editor] =
        Layout::vertical([Constraint::Length(1), Constraint::Min(1)]).areas(area);
    frame.render_widget(Paragraph::new(clean(&app.message)), message);
    let block = Block::bordered().title("Comment · Ctrl+S record · Enter newline · Esc cancel");
    let inner = block.inner(editor);
    frame.render_widget(block, editor);
    // Scroll so the cursor stays inside the box.
    let (row, before_cursor) = draft.editor.cursor_line();
    let column = Line::from(clean(before_cursor)).width();
    let top = row.saturating_sub(usize::from(inner.height).saturating_sub(1));
    let left = column.saturating_sub(usize::from(inner.width).saturating_sub(1));
    let lines: Vec<_> = draft
        .editor
        .text()
        .split('\n')
        .map(|line| Line::from(clean(line)))
        .collect();
    frame.render_widget(
        Paragraph::new(lines).scroll((cells(top), cells(left))),
        inner,
    );
    if !inner.is_empty() {
        frame.set_cursor_position((inner.x + cells(column - left), inner.y + cells(row - top)));
    }
}

fn cells(n: usize) -> u16 {
    u16::try_from(n).unwrap_or(u16::MAX)
}
