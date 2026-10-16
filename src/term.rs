//! Lines printed around the interfaces: the browser banner and the exit line.
//! Labels and values share one column; keys read as in the TUI's key line.

use crate::files;
use clap::builder::styling::{AnsiColor, Style};
use std::{env, io::IsTerminal, path::Path};

/// Cells the label column takes, gap included.
const LABEL: usize = 11;
/// Cells between key hints, as in the TUI.
const KEY_GAP: &str = "    ";

/// Whether stdout takes styles: a terminal, without `NO_COLOR` or `TERM=dumb`.
fn styled() -> bool {
    std::io::stdout().is_terminal()
        && env::var_os("NO_COLOR").is_none_or(|v| v.is_empty())
        && env::var_os("TERM").is_none_or(|t| t != "dumb")
}

fn paint(style: Style, text: &str) -> String {
    if styled() {
        format!("{style}{text}{style:#}")
    } else {
        text.into()
    }
}

fn dim(text: &str) -> String {
    paint(Style::new().dimmed(), text)
}

/// A dim `label` in the label column, then `value`.
pub fn row(label: &str, value: &str) -> String {
    format!("  {}{value}", dim(&format!("{label:<LABEL$}")))
}

pub fn link(url: &str) -> String {
    paint(AnsiColor::Blue.on_default(), url)
}

/// Key hints, key first: `enter open in browser    ctrl+c stop`.
pub fn keys(pairs: &[(&str, &str)]) -> String {
    let hints: Vec<_> = pairs
        .iter()
        .map(|(key, what)| format!("{} {}", paint(Style::new().bold(), key), dim(what)))
        .collect();
    format!("  {}", hints.join(KEY_GAP))
}

/// `path` as people read it, with control characters made visible.
pub fn path(path: &Path) -> String {
    files::display(path).replace(char::is_control, "\u{FFFD}")
}

/// Names the feedback to hand to an agent when the review ends.
pub fn print_saved(saved: &Path) {
    println!("{}", row("Saved to", &path(saved)));
}
