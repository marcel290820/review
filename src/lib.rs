//! Review local text files and Git changes, and save portable JSON feedback.
//!
//! [`feedback`] defines the saved format and its coordinate convention, [`session`]
//! holds one review in memory, and [`tui`] and [`http`] are the two interfaces.

pub mod diff;
pub mod feedback;
pub mod files;
pub mod git;
pub mod http;
pub mod markdown;
pub mod session;
pub mod tui;
