//! Colors for the terminal interface. Grays and tints are mixed from the terminal's own
//! foreground and background, so they sit naturally on any theme, around a calm blue accent.

use ratatui::style::{Color, Modifier, Style};
use std::env;
use terminal_colorsaurus::{QueryOptions, color_palette};

type Rgb = [u8; 3];

/// Foreground and background assumed when the terminal does not report its colors.
const DARK: (Rgb, Rgb) = ([0xd4, 0xd7, 0xdc], [0x12, 0x14, 0x18]);

pub struct Theme {
    /// Secondary text and key labels.
    pub muted: Style,
    /// Line numbers, rules, and Markdown syntax.
    pub faint: Style,
    /// Focus, the cursor, headings, and list markers.
    pub accent: Style,
    /// Comment text and commented-range markers.
    pub note: Style,
    /// A comment being written, before it is recorded.
    pub draft: Style,
    pub code: Style,
    pub error: Style,
    pub added: Style,
    pub deleted: Style,
    // Row tints. Each sets its own text color, so a wrong guess about the
    // terminal background cannot make the row unreadable.
    pub added_row: Style,
    pub deleted_row: Style,
    /// Changed words within added and deleted rows.
    pub added_words: Style,
    pub deleted_words: Style,
    pub cursor_row: Style,
    pub selection: Style,
}

impl Theme {
    /// Asks the terminal for its colors and assumes a dark one when it does not answer.
    /// `NO_COLOR` keeps only text attributes.
    pub fn detect() -> Self {
        if env::var_os("NO_COLOR").is_some_and(|value| !value.is_empty()) {
            return Self::monochrome();
        }
        let (fg, bg) = color_palette(QueryOptions::default()).map_or(DARK, |palette| {
            let rgb = |color: terminal_colorsaurus::Color| {
                let (r, g, b) = color.scale_to_8bit();
                [r, g, b]
            };
            (rgb(palette.foreground), rgb(palette.background))
        });
        let truecolor = env::var("COLORTERM").is_ok_and(|v| v == "truecolor" || v == "24bit");
        Self::new(fg, bg, truecolor)
    }

    pub fn new(fg: Rgb, bg: Rgb, truecolor: bool) -> Self {
        let [accent, note, green, red] = if luminance(bg) > luminance(fg) {
            [
                [0x2f, 0x6d, 0xb3],
                [0x3b, 0x6a, 0xa5],
                [0x2e, 0x7d, 0x4f],
                [0xb4, 0x42, 0x4f],
            ]
        } else {
            [
                [0x7f, 0xb0, 0xe8],
                [0xa9, 0xc9, 0xf0],
                [0x8c, 0xc5, 0xa0],
                [0xe5, 0x94, 0x9f],
            ]
        };
        let color = |[r, g, b]: Rgb| {
            if truecolor {
                Color::Rgb(r, g, b)
            } else {
                indexed([r, g, b])
            }
        };
        let fg_style = |rgb| Style::new().fg(color(rgb));
        let tint = |hue, amount| Style::new().fg(color(fg)).bg(color(mix(bg, hue, amount)));
        // Grays lean toward the accent so secondary text stays in the blue family.
        let gray = |amount| fg_style(mix(mix(fg, bg, amount), accent, 0.12));
        Self {
            muted: gray(0.45),
            faint: gray(0.68),
            accent: fg_style(accent),
            note: fg_style(note).add_modifier(Modifier::ITALIC),
            draft: fg_style(mix(note, bg, 0.45)).add_modifier(Modifier::ITALIC),
            // A desaturated slate, so code reads apart from prose without competing with comments.
            code: gray(0.3),
            error: fg_style(red),
            added: fg_style(green),
            deleted: fg_style(red),
            added_row: tint(green, 0.12),
            deleted_row: tint(red, 0.12),
            added_words: tint(green, 0.3),
            deleted_words: tint(red, 0.3),
            cursor_row: tint(accent, 0.07),
            selection: tint(accent, 0.22),
        }
    }

    fn monochrome() -> Self {
        let dim = Style::new().add_modifier(Modifier::DIM);
        let bold = Style::new().add_modifier(Modifier::BOLD);
        Self {
            muted: dim,
            faint: dim,
            accent: bold,
            note: Style::new().add_modifier(Modifier::ITALIC),
            draft: Style::new().add_modifier(Modifier::ITALIC | Modifier::DIM),
            code: Style::new(),
            error: bold,
            added: bold,
            deleted: bold,
            added_row: Style::new(),
            deleted_row: Style::new(),
            added_words: Style::new().add_modifier(Modifier::UNDERLINED),
            deleted_words: Style::new().add_modifier(Modifier::UNDERLINED),
            cursor_row: Style::new(),
            selection: Style::new().add_modifier(Modifier::REVERSED),
        }
    }
}

/// `a` moved toward `b` by `amount` (0 to 1).
fn mix(a: Rgb, b: Rgb, amount: f32) -> Rgb {
    [0, 1, 2]
        .map(|i| (f32::from(a[i]) + (f32::from(b[i]) - f32::from(a[i])) * amount).round() as u8)
}

fn luminance([r, g, b]: Rgb) -> u32 {
    299 * u32::from(r) + 587 * u32::from(g) + 114 * u32::from(b)
}

/// The nearest xterm 256-color entry: the 6×6×6 cube from 16 or the gray ramp from 232.
fn indexed(rgb: Rgb) -> Color {
    const LEVELS: [u8; 6] = [0, 95, 135, 175, 215, 255];
    let distance = |other: Rgb| {
        (0..3)
            .map(|i| (i32::from(rgb[i]) - i32::from(other[i])).pow(2))
            .sum::<i32>()
    };
    let level = |value: u8| {
        (0..6)
            .min_by_key(|&i| (i32::from(LEVELS[i]) - i32::from(value)).abs())
            .unwrap_or(0)
    };
    let cube = rgb.map(level);
    let average = rgb.iter().map(|&v| u16::from(v)).sum::<u16>() / 3;
    let gray = (average.saturating_sub(3) / 10).min(23) as u8;
    let gray_value = 8 + 10 * gray;
    if distance(cube.map(|i| LEVELS[i])) <= distance([gray_value; 3]) {
        Color::Indexed(16 + 36 * cube[0] as u8 + 6 * cube[1] as u8 + cube[2] as u8)
    } else {
        Color::Indexed(232 + gray)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn colors_map_to_the_nearest_256_color_entry() {
        assert_eq!(indexed([0, 0, 0]), Color::Indexed(16));
        assert_eq!(indexed([0x5f, 0x87, 0xaf]), Color::Indexed(67));
        assert_eq!(indexed([0x80, 0x80, 0x80]), Color::Indexed(244));
    }

    #[test]
    fn light_backgrounds_get_a_darker_accent() {
        let dark = Theme::new(DARK.0, DARK.1, true);
        let light = Theme::new([0x24, 0x29, 0x2f], [0xff, 0xff, 0xff], true);
        assert_eq!(dark.accent.fg, Some(Color::Rgb(0x7f, 0xb0, 0xe8)));
        assert_eq!(light.accent.fg, Some(Color::Rgb(0x2f, 0x6d, 0xb3)));
    }
}
