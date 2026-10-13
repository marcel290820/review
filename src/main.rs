use anyhow::{Result, ensure};
use clap::{
    Parser,
    builder::{StyledStr, styling::Styles},
    error::ErrorKind,
};
use review::{
    git::{self, Head},
    http,
    session::Session,
    tui,
};
use std::{io::IsTerminal, path::PathBuf, process::ExitCode};

#[derive(Parser)]
#[command(
    version,
    about = "Review local files and Git changes; save the feedback as JSON for your agent",
    override_usage = "review [OPTIONS] <FILES>...\n       \
                      review --diff [OPTIONS] [PATHSPECS]...\n       \
                      review --reopen <FEEDBACK> [OPTIONS]",
    after_help = examples()
)]
struct Cli {
    /// Text or Markdown files, or Git pathspecs with --diff
    #[arg(required_unless_present_any = ["diff", "reopen"])]
    files: Vec<PathBuf>,
    /// Where to save feedback
    #[arg(
        short,
        long,
        value_name = "FILE",
        default_value = "review-feedback.json"
    )]
    output: PathBuf,
    /// Review in the browser instead of the terminal
    #[arg(long, conflicts_with = "tui")]
    browser: bool,
    /// Review in the terminal, the default when there is one
    #[arg(long)]
    tui: bool,
    /// Browser port; 0 picks a free one
    #[arg(long, requires = "browser", default_value_t = 0)]
    port: u16,
    /// Review Git changes: HEAD against the working tree
    #[arg(long, help_heading = "Git")]
    diff: bool,
    /// Compare the base with the index
    #[arg(long, requires = "diff", conflicts_with = "head", help_heading = "Git")]
    staged: bool,
    /// Revision to compare from
    #[arg(
        long,
        value_name = "REV",
        requires = "diff",
        default_value = "HEAD",
        help_heading = "Git"
    )]
    base: String,
    /// Revision to compare to, instead of the working tree
    #[arg(long, value_name = "REV", requires = "diff", help_heading = "Git")]
    head: Option<String>,
    /// Repository directory
    #[arg(
        long,
        value_name = "DIR",
        requires = "diff",
        default_value = ".",
        help_heading = "Git"
    )]
    repo: PathBuf,
    /// Reopen saved feedback with its comments
    #[arg(
        long,
        value_name = "FEEDBACK",
        conflicts_with_all = ["diff", "files"],
        help_heading = "Saved feedback"
    )]
    reopen: Option<PathBuf>,
    /// Show what changed on disk below this directory
    #[arg(
        long,
        value_name = "DIR",
        requires = "reopen",
        help_heading = "Saved feedback"
    )]
    root: Option<PathBuf>,
}

/// Common invocations, under a heading styled like clap's own.
fn examples() -> StyledStr {
    let styles = Styles::default();
    let heading = styles.get_header();
    let examples = [
        ("review plan.md", "Review a file in the terminal"),
        (
            "review --browser plan.md notes.md",
            "Review files in the browser",
        ),
        (
            "review --diff --base main",
            "Review your branch against main",
        ),
        (
            "review --reopen review-feedback.json",
            "Look at saved feedback again",
        ),
    ];
    let mut text = format!("{heading}Examples:{heading:#}\n");
    for (command, what) in examples {
        text.push_str(&format!("  {command:<38}{what}\n"));
    }
    text.into()
}

fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            // One line in clap's style, causes included, like a usage error.
            let printed = clap::Error::raw(ErrorKind::Io, format!("{e:#}\n")).print();
            if printed.is_err() {
                eprintln!("error: {e:#}");
            }
            ExitCode::FAILURE
        }
    }
}

fn run() -> Result<()> {
    let cli = Cli::parse();
    ensure!(
        cli.browser || (std::io::stdin().is_terminal() && std::io::stdout().is_terminal()),
        "No interactive terminal. Run in a terminal, or use --browser."
    );
    let session = if let Some(feedback) = &cli.reopen {
        Session::reopen(feedback, cli.root, cli.output)?
    } else if cli.diff {
        let head = match cli.head {
            Some(revision) => Head::Commit(revision),
            None if cli.staged => Head::Index,
            None => Head::WorkTree,
        };
        git::open(&cli.repo, &cli.base, &head, &cli.files, cli.output)?
    } else {
        Session::open(&cli.files, cli.output)?
    };
    if cli.browser {
        tokio::runtime::Runtime::new()?.block_on(http::serve(session, cli.port))
    } else {
        tui::run(session)
    }
}
