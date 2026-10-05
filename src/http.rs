use crate::core::{Session, View};
use anyhow::Result;
use axum::{
    Json, Router,
    extract::{DefaultBodyLimit, Path, Request, State},
    http::{HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use serde::Deserialize;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct AppState {
    pub session: Arc<Mutex<Session>>,
    pub token: String,
    pub authority: String,
}
type ApiResult = std::result::Result<Json<View>, (StatusCode, Json<serde_json::Value>)>;
fn error(status: StatusCode, message: impl ToString) -> (StatusCode, Json<serde_json::Value>) {
    (
        status,
        Json(serde_json::json!({ "error": message.to_string() })),
    )
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
        .route("/api/state", get(state_view))
        .route("/api/refresh", post(state_view))
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

async fn state_view(State(state): State<AppState>) -> ApiResult {
    let mut s = state.session.lock().map_err(|_| {
        error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Review state unavailable",
        )
    })?;
    s.refresh();
    Ok(Json(s.view()))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Add {
    file_id: String,
    snapshot_id: String,
    start_byte: usize,
    end_byte: usize,
    body: String,
    expected_revision: u64,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Edit {
    body: String,
    expected_revision: u64,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Version {
    expected_revision: u64,
}
fn current(
    s: &Session,
    expected: u64,
) -> std::result::Result<(), (StatusCode, Json<serde_json::Value>)> {
    if s.revision == expected {
        Ok(())
    } else {
        Err(error(
            StatusCode::CONFLICT,
            "Feedback changed in another tab. Refresh and retry; your draft is still here.",
        ))
    }
}
async fn add(State(state): State<AppState>, Json(input): Json<Add>) -> ApiResult {
    let mut s = state.session.lock().map_err(|_| {
        error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Review state unavailable",
        )
    })?;
    current(&s, input.expected_revision)?;
    s.add(
        &input.file_id,
        &input.snapshot_id,
        input.start_byte,
        input.end_byte,
        input.body,
    )
    .map_err(|e| error(StatusCode::BAD_REQUEST, e))?;
    Ok(Json(s.view()))
}
async fn edit(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(input): Json<Edit>,
) -> ApiResult {
    let mut s = state.session.lock().map_err(|_| {
        error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Review state unavailable",
        )
    })?;
    current(&s, input.expected_revision)?;
    s.edit(&id, input.body)
        .map_err(|e| error(StatusCode::BAD_REQUEST, e))?;
    Ok(Json(s.view()))
}
async fn delete(
    State(state): State<AppState>,
    Path(id): Path<String>,
    Json(input): Json<Version>,
) -> ApiResult {
    let mut s = state.session.lock().map_err(|_| {
        error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Review state unavailable",
        )
    })?;
    current(&s, input.expected_revision)?;
    s.delete(&id)
        .map_err(|e| error(StatusCode::BAD_REQUEST, e))?;
    Ok(Json(s.view()))
}
async fn save(State(state): State<AppState>, Json(input): Json<Version>) -> ApiResult {
    let mut s = state.session.lock().map_err(|_| {
        error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Review state unavailable",
        )
    })?;
    current(&s, input.expected_revision)?;
    s.refresh();
    s.save().map_err(|e| error(StatusCode::CONFLICT, e))?;
    Ok(Json(s.view()))
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
    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            let mut warned = None;
            loop {
                if tokio::signal::ctrl_c().await.is_err() { break; }
                let unsaved = shutdown_session.lock().is_ok_and(|s| s.dirty && s.revision > 0);
                if !unsaved || warned.is_some_and(|time: std::time::Instant| time.elapsed() < std::time::Duration::from_secs(3)) { break; }
                eprintln!("Unsaved feedback. Save in the browser, then stop again. Press Ctrl+C again within 3 seconds to discard it.");
                warned = Some(std::time::Instant::now());
            }
        })
        .await?;
    if session.lock().is_ok_and(|s| s.dirty && s.revision > 0) {
        eprintln!("Discarded unsaved feedback.");
    }
    Ok(())
}
