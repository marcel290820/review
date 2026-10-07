use axum::{
    Router,
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use review::{
    http::{self, AppState},
    session::Session,
};
use serde_json::{Value, json};
use std::{
    fs,
    sync::{Arc, Mutex},
};
use tower::ServiceExt;

const HOST: &str = "127.0.0.1:3210";
const TOKEN: &str = "test-session";

fn app() -> (tempfile::TempDir, Router) {
    let dir = tempfile::tempdir().unwrap();
    fs::write(dir.path().join("note.md"), "alpha 🦀\nbeta\n").unwrap();
    let session = Session::open(
        &[dir.path().join("note.md")],
        dir.path().join("feedback.json"),
    )
    .unwrap();
    let router = http::router(AppState {
        session: Arc::new(Mutex::new(session)),
        token: TOKEN.into(),
        authority: HOST.into(),
    });
    (dir, router)
}

async fn call(app: &Router, method: &str, path: &str, body: Value) -> (StatusCode, Value) {
    let request = Request::builder()
        .method(method)
        .uri(path)
        .header("host", HOST)
        .header("authorization", format!("Bearer {TOKEN}"))
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap();
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = to_bytes(response.into_body(), 1 << 22).await.unwrap();
    let value = serde_json::from_slice(&bytes)
        .unwrap_or_else(|_| json!({ "error": String::from_utf8_lossy(&bytes) }));
    (status, value)
}

#[tokio::test]
async fn comments_round_trip_and_bad_targets_or_paths_are_rejected() {
    let (dir, app) = app();
    let (status, content) = call(&app, "GET", "/api/content", json!({})).await;
    assert_eq!(status, StatusCode::OK);
    let file = &content["files"][0];
    assert!(file["diff"].is_null());
    assert!(content["markdown"][0]["html"].is_string());
    assert!(content["markdown"][0]["marks"].is_array());
    let (_, state) = call(&app, "GET", "/api/state", json!({})).await;
    assert_eq!(state["dirty"], false);

    let snapshot = &file["snapshots"][0];
    let target = json!({
        "file_id": file["id"],
        "snapshot_id": snapshot["id"],
        "start_byte": 0,
        "end_byte": 10,
        "body": "request",
    });
    let mut outside = target.clone();
    outside["end_byte"] = 999.into();
    let mut inside_character = target.clone();
    inside_character["end_byte"] = 7.into();
    for bad in [outside, inside_character] {
        let (status, _) = call(&app, "POST", "/api/comments", bad).await;
        assert_eq!(status, StatusCode::BAD_REQUEST);
    }

    let (status, state) = call(&app, "POST", "/api/comments", target).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(state["dirty"], true);
    assert_eq!(state["comments"][0]["target"]["quote"], "alpha 🦀");
    let id = state["comments"][0]["id"].as_str().unwrap().to_owned();
    let (status, _) = call(
        &app,
        "PUT",
        &format!("/api/comments/{id}"),
        json!({ "body": "updated" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);

    // Saving takes no input: the destination stays the CLI-configured output.
    let (status, state) = call(
        &app,
        "POST",
        "/api/save",
        json!({ "path": "../unselected" }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(state["dirty"], false);
    assert!(!dir.path().join("../unselected").exists());
    let saved = Session::reopen(
        &dir.path().join("feedback.json"),
        None,
        dir.path().join("next.json"),
    )
    .unwrap();
    assert_eq!(saved.comments()[0].body, "updated");

    let (status, state) = call(&app, "DELETE", &format!("/api/comments/{id}"), json!({})).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(state["comments"], json!([]));
    let (status, _) = call(&app, "DELETE", &format!("/api/comments/{id}"), json!({})).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);

    let (status, state) = call(&app, "POST", "/api/refresh", json!({})).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(state["disk"][0]["status"], "unchanged");
    let (status, _) = call(&app, "GET", "/api/file?path=/etc/passwd", json!({})).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn access_is_scoped_to_the_loopback_session_with_strict_headers() {
    let (_dir, app) = app();
    let bearer = format!("Bearer {TOKEN}");
    for (path, host, authorization, origin, expected) in [
        ("/api/state", HOST, "", "", StatusCode::UNAUTHORIZED),
        (
            "/api/state",
            HOST,
            "Bearer wrong",
            "",
            StatusCode::UNAUTHORIZED,
        ),
        (
            "/api/state",
            "evil.invalid:3210",
            bearer.as_str(),
            "",
            StatusCode::FORBIDDEN,
        ),
        (
            "/api/state",
            HOST,
            bearer.as_str(),
            "https://evil.invalid",
            StatusCode::FORBIDDEN,
        ),
        (
            "/api/state",
            HOST,
            bearer.as_str(),
            "http://127.0.0.1:3210",
            StatusCode::OK,
        ),
        ("/app.js", HOST, "", "", StatusCode::OK),
        ("/", HOST, "", "", StatusCode::OK),
        ("/../../VISION.md", HOST, "", "", StatusCode::NOT_FOUND),
    ] {
        let mut request = Request::builder().uri(path).header("host", host);
        if !authorization.is_empty() {
            request = request.header("authorization", authorization);
        }
        if !origin.is_empty() {
            request = request.header("origin", origin);
        }
        let response = app
            .clone()
            .oneshot(request.body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), expected, "{path} {host} {origin}");
        assert_eq!(response.headers()["cache-control"], "no-store");
        let policy = response.headers()["content-security-policy"]
            .to_str()
            .unwrap();
        assert!(policy.contains("default-src 'none'"));
    }

    let cross_site = Request::builder()
        .uri("/api/state")
        .header("host", HOST)
        .header("authorization", &bearer)
        .header("sec-fetch-site", "cross-site")
        .body(Body::empty())
        .unwrap();
    let response = app.clone().oneshot(cross_site).await.unwrap();
    assert_eq!(response.status(), StatusCode::FORBIDDEN);

    let oversized = json!({ "body": "x".repeat(70_000) });
    let (status, _) = call(&app, "POST", "/api/comments", oversized).await;
    assert_eq!(status, StatusCode::PAYLOAD_TOO_LARGE);
}
