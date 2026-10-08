#!/bin/sh
# Project check: frontend typecheck, tests, and bundle; Rust format, lint, and tests;
# and the real-terminal PTY suite. Expects `npm ci` in frontend/ and cargo on PATH.
# REVIEW_BROWSER_TESTS=1 also drives Chromium (`npx playwright install chromium`).
set -eu
cd "$(dirname "$0")/.."

(cd frontend && npm run check && npm test && npm run build)
cargo fmt --all -- --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
# Git hooks export GIT_DIR and GIT_INDEX_FILE; Git reads must ignore them.
GIT_DIR=/nonexistent GIT_INDEX_FILE=/nonexistent cargo test --locked --test git
cargo build --locked
binary="${CARGO_TARGET_DIR:-$PWD/target}/debug/review"
REVIEW_BIN="$binary" python3 tests/tui_smoke.py
if [ "${REVIEW_BROWSER_TESTS:-0}" = 1 ]; then
	(cd frontend && REVIEW_BIN="$binary" npm run test:browser)
fi
