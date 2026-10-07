//! Loopback HTTP adapter for the browser interface: bundled assets and a small JSON API.

use crate::{
    diff::DiffRow,
    feedback::{Comment, ReviewFile, new_id},
    markdown,
    session::{DiskState, Session},
};
use anyhow::Result;
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, Request, State},
    http::{HeaderMap, HeaderValue, StatusCode, header::CONTENT_TYPE},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{MethodRouter, get, post, put},
};
use serde::{Deserialize, Serialize};
use std::{
    net::Ipv4Addr,
    sync::{Arc, Mutex, MutexGuard},
    time::{Duration, Instant},
};

/// Largest accepted request body.
const MAX_REQUEST: usize = 64 << 10;
/// A second Ctrl+C within this window discards unsaved feedback.
const DISCARD_WINDOW: Duration = Duration::from_secs(3);

const SECURITY_HEADERS: [(&str, &str); 5] = [
    (
        "content-security-policy",
        "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; \
         img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
    ),
    ("referrer-policy", "no-referrer"),
    ("x-content-type-options", "nosniff"),
    ("x-frame-options", "DENY"),
    ("cache-control", "no-store"),
];

#[derive(Clone)]
pub struct AppState {
    pub session: Arc<Mutex<Session>>,
    /// Required as a bearer token on every API request.
    pub token: String,
    /// The `host:port` the server listens on; requests must name it.
    pub authority: String,
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route(
            "/",
            asset(
                "text/html; charset=utf-8",
                include_str!("../frontend/index.html"),
            ),
        )
        .route(
            "/app.js",
            asset(
                "text/javascript; charset=utf-8",
                include_str!("../frontend/dist/app.js"),
            ),
        )
        .route(
            "/app.css",
            asset(
                "text/css; charset=utf-8",
                include_str!("../frontend/dist/app.css"),
            ),
        )
        .route("/api/content", get(content))
        .route("/api/state", get(review_state))
        .route("/api/refresh", post(refresh))
        .route("/api/comments", post(add_comment))
        .route(
            "/api/comments/{id}",
            put(edit_comment).delete(delete_comment),
        )
        .route("/api/save", post(save))
        .layer(DefaultBodyLimit::max(MAX_REQUEST))
        .layer(middleware::from_fn_with_state(state.clone(), guard))
        .with_state(state)
}

/// Serves the browser interface until Ctrl+C. Unsaved feedback needs a second Ctrl+C.
pub async fn serve(session: Session, port: u16) -> Result<()> {
    let listener = tokio::net::TcpListener::bind((Ipv4Addr::LOCALHOST, port)).await?;
    let authority = listener.local_addr()?.to_string();
    let token = new_id();
    println!("Review: http://{authority}/#token={token}");
    println!(
        "Feedback destination: {} (numbered saves preserve existing files)",
        session.output().display()
    );
    println!("Open the URL in a browser. Save feedback before stopping this process with Ctrl+C.");
    let session = Arc::new(Mutex::new(session));
    let app = router(AppState {
        session: session.clone(),
        token,
        authority,
    });
    axum::serve(listener, app)
        .with_graceful_shutdown(stop_requested(session.clone()))
        .await?;
    if is_dirty(&session) {
        eprintln!("Discarded unsaved feedback.");
    }
    Ok(())
}

async fn stop_requested(session: Arc<Mutex<Session>>) {
    let mut warned: Option<Instant> = None;
    loop {
        if let Err(e) = tokio::signal::ctrl_c().await {
            eprintln!("Cannot listen for Ctrl+C: {e}");
            return std::future::pending().await;
        }
        if !is_dirty(&session) || warned.is_some_and(|at| at.elapsed() < DISCARD_WINDOW) {
            return;
        }
        eprintln!(
            "Unsaved feedback. Save in the browser, then stop again. \
             Press Ctrl+C again within 3 seconds to discard it."
        );
        warned = Some(Instant::now());
    }
}

fn is_dirty(session: &Mutex<Session>) -> bool {
    session.lock().is_ok_and(|s| s.is_dirty())
}

fn asset(content_type: &'static str, body: &'static str) -> MethodRouter<AppState> {
    get(move || async move { ([(CONTENT_TYPE, content_type)], body) })
}

/// Admits only same-origin requests naming this loopback server, requires the session
/// token for the API, and adds security headers to every response.
async fn guard(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let headers = request.headers();
    let mut response = if !is_same_origin(headers, &state.authority) {
        ApiError(
            StatusCode::FORBIDDEN,
            "Only this loopback review session may access the application".into(),
        )
        .into_response()
    } else if request.uri().path().starts_with("/api/")
        && header(headers, "authorization") != Some(format!("Bearer {}", state.token).as_str())
    {
        ApiError(
            StatusCode::UNAUTHORIZED,
            "Missing or invalid review session token".into(),
        )
        .into_response()
    } else {
        next.run(request).await
    };
    for (name, value) in SECURITY_HEADERS {
        response
            .headers_mut()
            .insert(name, HeaderValue::from_static(value));
    }
    response
}

fn is_same_origin(headers: &HeaderMap, authority: &str) -> bool {
    header(headers, "host") == Some(authority)
        && header(headers, "origin").is_none_or(|o| o == format!("http://{authority}"))
        && header(headers, "sec-fetch-site") != Some("cross-site")
}

fn header<'a>(headers: &'a HeaderMap, name: &str) -> Option<&'a str> {
    headers.get(name).and_then(|value| value.to_str().ok())
}

struct ApiError(StatusCode, String);

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        (self.0, Json(serde_json::json!({ "error": self.1 }))).into_response()
    }
}

type ApiResult = Result<Response, ApiError>;

fn lock(state: &AppState) -> Result<MutexGuard<'_, Session>, ApiError> {
    state.session.lock().map_err(|_| {
        ApiError(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Review state unavailable".into(),
        )
    })
}

/// Applies `change` to the session and responds with the resulting review state;
/// a failed change responds with `status` and the error.
fn apply(
    state: &AppState,
    status: StatusCode,
    change: impl FnOnce(&mut Session) -> Result<()>,
) -> ApiResult {
    let mut session = lock(state)?;
    change(&mut session).map_err(|e| ApiError(status, format!("{e:#}")))?;
    Ok(Json(ReviewState::of(&session)).into_response())
}

/// Reviewed content, fixed for the session; the browser fetches it once.
#[derive(Serialize)]
struct Content<'a> {
    files: Vec<FileContent<'a>>,
    previews: Vec<Preview>,
}

#[derive(Serialize)]
struct FileContent<'a> {
    #[serde(flatten)]
    file: &'a ReviewFile,
    diff: Option<&'a [DiffRow]>,
}

#[derive(Serialize)]
struct Preview {
    snapshot_id: String,
    html: String,
}

/// Mutable review state, returned by every other API call.
#[derive(Serialize)]
struct ReviewState<'a> {
    comments: &'a [Comment],
    disk: Vec<&'a DiskState>,
    dirty: bool,
    output: String,
    last_saved: Option<String>,
}

impl<'a> ReviewState<'a> {
    fn of(session: &'a Session) -> Self {
        Self {
            comments: session.comments(),
            disk: session.disk_states().collect(),
            dirty: session.is_dirty(),
            output: session.output().display().to_string(),
            last_saved: session.last_saved().map(|p| p.display().to_string()),
        }
    }
}

async fn content(State(state): State<AppState>) -> ApiResult {
    let session = lock(&state)?;
    let files = session
        .files()
        .iter()
        .enumerate()
        .map(|(i, file)| FileContent {
            file,
            diff: session.diff(i),
        })
        .collect();
    let previews = session
        .files()
        .iter()
        .filter(|f| markdown::is_markdown(&f.path))
        .flat_map(|f| &f.snapshots)
        .map(|s| Preview {
            snapshot_id: s.id.clone(),
            html: markdown::html(&s.text),
        })
        .collect();
    Ok(Json(Content { files, previews }).into_response())
}

async fn review_state(State(state): State<AppState>) -> ApiResult {
    Ok(Json(ReviewState::of(&*lock(&state)?)).into_response())
}

async fn refresh(State(state): State<AppState>) -> ApiResult {
    apply(&state, StatusCode::INTERNAL_SERVER_ERROR, |session| {
        session.refresh();
        Ok(())
    })
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct NewComment {
    file_id: String,
    snapshot_id: String,
    start_byte: usize,
    end_byte: usize,
    body: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CommentEdit {
    body: String,
}

// Tabs share one session without conflict checks: the last recorded edit wins.
async fn add_comment(State(state): State<AppState>, Json(input): Json<NewComment>) -> ApiResult {
    apply(&state, StatusCode::BAD_REQUEST, |session| {
        let bytes = input.start_byte..input.end_byte;
        session
            .add_comment(&input.file_id, &input.snapshot_id, bytes, input.body)
            .map(drop)
    })
}

async fn edit_comment(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(input): Json<CommentEdit>,
) -> ApiResult {
    apply(&state, StatusCode::BAD_REQUEST, |session| {
        session.edit_comment(&id, input.body)
    })
}

async fn delete_comment(State(state): State<AppState>, Path(id): Path<String>) -> ApiResult {
    apply(&state, StatusCode::BAD_REQUEST, |session| {
        session.delete_comment(&id)
    })
}

/// Saves to the CLI-configured destination; the request cannot choose a path.
async fn save(State(state): State<AppState>) -> ApiResult {
    apply(&state, StatusCode::CONFLICT, |session| {
        session.save().map(drop)
    })
}
