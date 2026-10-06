//! Terminal interface: draws the review and turns key presses into review actions.

mod app;
mod editor;
mod view;

use crate::session::Session;
use anyhow::Result;
use app::App;
use ratatui::{
    DefaultTerminal,
    crossterm::{
        event::{self, DisableBracketedPaste, EnableBracketedPaste, Event, KeyEventKind},
        execute,
    },
};
use std::{
    io,
    time::{Duration, Instant},
};

const POLL_INTERVAL: Duration = Duration::from_millis(100);
const REFRESH_INTERVAL: Duration = Duration::from_secs(2);

pub fn run(session: Session) -> Result<()> {
    let mut app = App::new(session);
    let mut terminal = ratatui::try_init()?;
    let restore = RestoreTerminal;
    execute!(io::stdout(), EnableBracketedPaste)?;
    let result = event_loop(&mut terminal, &mut app);
    drop(restore);
    result?;
    if let Some(path) = app.session.last_saved() {
        println!("Feedback: {}", view::clean(&path.display().to_string()));
    }
    Ok(())
}

fn event_loop(terminal: &mut DefaultTerminal, app: &mut App) -> Result<()> {
    let mut refreshed = Instant::now();
    while !app.quit {
        terminal.draw(|frame| view::render(frame, app))?;
        if refreshed.elapsed() >= REFRESH_INTERVAL {
            app.refresh();
            refreshed = Instant::now();
        }
        if event::poll(POLL_INTERVAL)? {
            match event::read()? {
                Event::Key(key) if key.kind != KeyEventKind::Release => app.handle_key(key),
                Event::Paste(text) => app.paste(&text),
                _ => {}
            }
        }
    }
    Ok(())
}

/// Restores the terminal when the interface ends, including after an error.
struct RestoreTerminal;

impl Drop for RestoreTerminal {
    fn drop(&mut self) {
        if let Err(e) = execute!(io::stdout(), DisableBracketedPaste) {
            eprintln!("Cannot disable bracketed paste: {e}");
        }
        ratatui::restore();
    }
}
