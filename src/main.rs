use anyhow::{Result, ensure};
use clap::Parser;
use review::{core::Session, git, http, tui};
use std::{io::IsTerminal, path::PathBuf};

#[derive(Parser)]
#[command(
    version,
    about = "Review local text files and Git changes; save portable JSON feedback"
)]
struct Args {
    /// Text or Markdown files (Git path filters with --diff)
    files: Vec<PathBuf>,
    /// Serve the bundled browser interface on loopback
    #[arg(long, conflicts_with = "tui")]
    browser: bool,
    /// Explicitly choose the terminal interface
    #[arg(long, conflicts_with = "browser")]
    tui: bool,
    /// Reopen reviewed snapshots and comments from JSON
    #[arg(long, conflicts_with_all = ["diff", "files"])]
    reopen: Option<PathBuf>,
    /// Authorize revision inspection below this root when reopening feedback
    #[arg(long, requires = "reopen")]
    root: Option<PathBuf>,
    /// Feedback filename; existing files are preserved with numbered saves
    #[arg(short, long)]
    output: Option<PathBuf>,
    /// Review unified Git changes (HEAD against the working tree by default)
    #[arg(long)]
    diff: bool,
    /// Review the index against the base revision
    #[arg(long, requires = "diff", conflicts_with = "head")]
    staged: bool,
    /// Git base commit or branch
    #[arg(long, requires = "diff")]
    base: Option<String>,
    /// Compare two Git commits instead of the working tree
    #[arg(long, requires = "diff")]
    head: Option<String>,
    /// Git repository directory
    #[arg(long, requires = "diff", default_value = ".")]
    repo: PathBuf,
    /// Browser port; 0 chooses a free port
    #[arg(long, requires = "browser", default_value_t = 0)]
    port: u16,
}

#[tokio::main]
async fn main() -> Result<()> {
    let args = Args::parse();
    ensure!(
        args.browser || (std::io::stdin().is_terminal() && std::io::stdout().is_terminal()),
        "No interactive terminal. Use --browser for explicit browser mode, or run in a terminal."
    );
    let output = args
        .output
        .unwrap_or_else(|| PathBuf::from("review-feedback.json"));
    let session = if let Some(path) = &args.reopen {
        Session::reopen(path, args.root, output)?
    } else if args.diff {
        git::open(
            &args.repo,
            args.base.as_deref().unwrap_or("HEAD"),
            args.head.as_deref(),
            args.staged,
            &args.files,
            output,
        )?
    } else {
        Session::open(&args.files, output)?
    };
    if args.browser {
        http::serve(session, args.port).await
    } else {
        tui::run(session)
    }
}
