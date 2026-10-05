use crate::core::{Comment, DiffRow, DiskState, ReviewFile, Session};
use anyhow::Result;
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, Request, State},
    http::{HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::{Deserialize, Serialize};
use std::{
    sync::{Arc, Mutex, MutexGuard},
    time::{Duration, Instant},
};

#[derive(Clone)]
pub struct AppState {
    pub session: Arc<Mutex<Session>>,
    pub token: String,
    pub authority: String,
}
type ApiError = (StatusCode, Json<serde_json::Value>);
type ApiResult = std::result::Result<Response, ApiError>;
fn error(status: StatusCode, message: impl ToString) -> ApiError {
    (
        status,
        Json(serde_json::json!({ "error": message.to_string() })),
    )
}
fn lock(state: &AppState) -> std::result::Result<MutexGuard<'_, Session>, ApiError> {
    state.session.lock().map_err(|_| {
        error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Review state unavailable",
        )
    })
}

/// Reviewed content, fixed for the session; the browser fetches it once.
#[derive(Serialize)]
struct Content<'a> {
    files: Vec<FileView<'a>>,
    previews: Vec<Preview>,
}
#[derive(Serialize)]
struct FileView<'a> {
    #[serde(flatten)]
    file: &'a ReviewFile,
    diff: Option<&'a [DiffRow]>,
}
#[derive(Serialize)]
struct Preview {
    snapshot_id: String,
    html: String,
}
/// Mutable review state returned by every other API call.
#[derive(Serialize)]
struct StateView<'a> {
    comments: &'a [Comment],
    disk: &'a [DiskState],
    dirty: bool,
    output: String,
    last_saved: Option<String>,
}
fn view(s: &Session) -> Response {
    Json(StateView {
        comments: &s.feedback.comments,
        disk: &s.disk,
        dirty: s.dirty,
        output: s.output.display().to_string(),
        last_saved: s.last_saved.as_ref().map(|p| p.display().to_string()),
    })
    .into_response()
}

async fn guard(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let headers = request.headers();
    let host = headers.get("host").and_then(|h| h.to_str().ok());
    let origin = headers.get("origin").and_then(|h| h.to_str().ok());
    let cross_site = headers
        .get("sec-fetch-site")
        .is_some_and(|h| h == "cross-site");
    let authorized = headers
        .get("authorization")
        .and_then(|h| h.to_str().ok())
        .is_some_and(|h| h == format!("Bearer {}", state.token));
    let mut response = if host != Some(state.authority.as_str())
        || origin.is_some_and(|o| o != format!("http://{}", state.authority))
        || cross_site
    {
        error(
            StatusCode::FORBIDDEN,
            "Only this loopback review session may access the application",
        )
        .into_response()
    } else if request.uri().path().starts_with("/api/") && !authorized {
        error(
            StatusCode::UNAUTHORIZED,
            "Missing or invalid review session token",
        )
        .into_response()
    } else {
        next.run(request).await
    };
    for (key, value) in [
        (
            "content-security-policy",
            "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
        ),
        ("referrer-policy", "no-referrer"),
        ("x-content-type-options", "nosniff"),
        ("x-frame-options", "DENY"),
        ("cache-control", "no-store"),
    ] {
        response
            .headers_mut()
            .insert(key, HeaderValue::from_static(value));
    }
    response
}

pub fn router(state: AppState) -> Router {
    Router::new()
        .route(
            "/",
            get(|| async {
                (
                    [("content-type", "text/html; charset=utf-8")],
                    include_str!("../frontend/index.html"),
                )
            }),
        )
        .route(
            "/app.js",
            get(|| async {
                (
                    [("content-type", "text/javascript; charset=utf-8")],
                    include_str!("../frontend/dist/app.js"),
                )
            }),
        )
        .route(
            "/app.css",
            get(|| async {
                (
                    [("content-type", "text/css; charset=utf-8")],
                    include_str!("../frontend/dist/app.css"),
                )
            }),
        )
        .route("/api/content", get(content))
        .route("/api/state", get(state_view))
        .route("/api/refresh", post(refresh))
        .route("/api/comments", post(add))
        .route(
            "/api/comments/{id}",
            axum::routing::put(edit).delete(delete),
        )
        .route("/api/save", post(save))
        .layer(DefaultBodyLimit::max(64 * 1024))
        .layer(middleware::from_fn_with_state(state.clone(), guard))
        .with_state(state)
}

async fn content(State(state): State<AppState>) -> ApiResult {
    let s = lock(&state)?;
    let files = s
        .feedback
        .files
        .iter()
        .zip(&s.diffs)
        .map(|(file, diff)| FileView {
            file,
            diff: file.is_diff().then_some(diff.as_slice()),
        })
        .collect();
    let previews = s
        .feedback
        .files
        .iter()
        .filter(|f| f.path.ends_with(".md") || f.path.ends_with(".markdown"))
        .flat_map(|f| &f.snapshots)
        .map(|s| Preview {
            snapshot_id: s.id.clone(),
            html: markdown(&s.text),
        })
        .collect();
    Ok(Json(Content { files, previews }).into_response())
}
async fn state_view(State(state): State<AppState>) -> ApiResult {
    Ok(view(&*lock(&state)?))
}
async fn refresh(State(state): State<AppState>) -> ApiResult {
    let mut s = lock(&state)?;
    s.refresh();
    Ok(view(&s))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Add {
    file_id: String,
    snapshot_id: String,
    start_byte: usize,
    end_byte: usize,
    body: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Edit {
    body: String,
}
// Tabs share one session without conflict checks: the last recorded edit wins.
async fn add(State(state): State<AppState>, Json(input): Json<Add>) -> ApiResult {
    let mut s = lock(&state)?;
    s.add(
        &input.file_id,
        &input.snapshot_id,
        input.start_byte,
        input.end_byte,
        input.body,
    )
    .map_err(|e| error(StatusCode::BAD_REQUEST, e))?;
    Ok(view(&s))
}
async fn edit(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(input): Json<Edit>,
) -> ApiResult {
    let mut s = lock(&state)?;
    s.edit(&id, input.body)
        .map_err(|e| error(StatusCode::BAD_REQUEST, e))?;
    Ok(view(&s))
}
async fn delete(State(state): State<AppState>, Path(id): Path<String>) -> ApiResult {
    let mut s = lock(&state)?;
    s.delete(&id)
        .map_err(|e| error(StatusCode::BAD_REQUEST, e))?;
    Ok(view(&s))
}
async fn save(State(state): State<AppState>) -> ApiResult {
    let mut s = lock(&state)?;
    s.save().map_err(|e| error(StatusCode::CONFLICT, e))?;
    Ok(view(&s))
}

/// Renders Markdown without raw HTML, links, or images.
pub fn markdown(text: &str) -> String {
    use pulldown_cmark::{Event, Parser, Tag, TagEnd, html};
    let events = Parser::new(text).filter_map(|e| match e {
        Event::Html(s) | Event::InlineHtml(s) => Some(Event::Text(s)),
        Event::Start(Tag::Link { .. } | Tag::Image { .. })
        | Event::End(TagEnd::Link | TagEnd::Image) => None,
        other => Some(other),
    });
    let mut result = String::new();
    html::push_html(&mut result, events);
    result
}

pub async fn serve(session: Session, port: u16) -> Result<()> {
    let listener = tokio::net::TcpListener::bind((std::net::Ipv4Addr::LOCALHOST, port)).await?;
    let authority = listener.local_addr()?.to_string();
    let token = crate::core::id();
    println!("Review: http://{authority}/#token={token}");
    println!(
        "Feedback destination: {} (numbered saves preserve existing files)",
        session.output.display()
    );
    println!("Open the URL in a browser. Save feedback before stopping this process with Ctrl+C.");
    let session = Arc::new(Mutex::new(session));
    let app = router(AppState {
        session: session.clone(),
        token,
        authority,
    });
    let shutdown_session = session.clone();
    let unsaved = |s: &Arc<Mutex<Session>>| s.lock().is_ok_and(|s| s.dirty && s.edits > 0);
    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            let mut warned: Option<Instant> = None;
            while tokio::signal::ctrl_c().await.is_ok() {
                let repeated = warned.is_some_and(|t| t.elapsed() < Duration::from_secs(3));
                if !unsaved(&shutdown_session) || repeated {
                    break;
                }
                eprintln!(
                    "Unsaved feedback. Save in the browser, then stop again. Press Ctrl+C again within 3 seconds to discard it."
                );
                warned = Some(Instant::now());
            }
        })
        .await?;
    if unsaved(&session) {
        eprintln!("Discarded unsaved feedback.");
    }
    Ok(())
}
