use anyhow::{Result, ensure};
use clap::Parser;
use review::{
    git::{self, Head},
    http,
    session::Session,
    tui,
};
use std::{io::IsTerminal, path::PathBuf};

#[derive(Parser)]
#[command(
    version,
    about = "Review local text files and Git changes; save portable JSON feedback"
)]
struct Cli {
    /// Text or Markdown files (Git pathspecs with --diff)
    #[arg(required_unless_present_any = ["diff", "reopen"])]
    files: Vec<PathBuf>,
    /// Serve the bundled browser interface on loopback
    #[arg(long, conflicts_with = "tui")]
    browser: bool,
    /// Use the terminal interface (the default in an interactive terminal)
    #[arg(long)]
    tui: bool,
    /// Reopen reviewed snapshots and comments from saved feedback
    #[arg(long, value_name = "FEEDBACK", conflicts_with_all = ["diff", "files"])]
    reopen: Option<PathBuf>,
    /// Authorize revision inspection below this directory when reopening feedback
    #[arg(long, value_name = "DIR", requires = "reopen")]
    root: Option<PathBuf>,
    /// Feedback filename; an existing file is preserved by saving to a numbered name
    #[arg(
        short,
        long,
        value_name = "FILE",
        default_value = "review-feedback.json"
    )]
    output: PathBuf,
    /// Review Git changes (HEAD against the working tree by default)
    #[arg(long)]
    diff: bool,
    /// Compare the base with the index
    #[arg(long, requires = "diff", conflicts_with = "head")]
    staged: bool,
    /// Git base revision
    #[arg(long, value_name = "REV", requires = "diff", default_value = "HEAD")]
    base: String,
    /// Compare the base with this revision instead of the working tree
    #[arg(long, value_name = "REV", requires = "diff")]
    head: Option<String>,
    /// Git repository directory
    #[arg(long, value_name = "DIR", requires = "diff", default_value = ".")]
    repo: PathBuf,
    /// Browser port; 0 chooses a free port
    #[arg(long, requires = "browser", default_value_t = 0)]
    port: u16,
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    ensure!(
        cli.browser || (std::io::stdin().is_terminal() && std::io::stdout().is_terminal()),
        "No interactive terminal. Use --browser for explicit browser mode, or run in a terminal."
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
