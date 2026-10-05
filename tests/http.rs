use axum::{
    body::{Body, to_bytes},
    http::{Request, StatusCode},
};
use review::{
    core::Session,
    http::{self, AppState},
};
use std::{
    fs,
    sync::{Arc, Mutex},
};
use tower::ServiceExt;

fn setup() -> (tempfile::TempDir, axum::Router) {
    let dir = tempfile::tempdir().unwrap();
    fs::write(dir.path().join("note.md"), "alpha 🦀\nbeta\n").unwrap();
    let s = Session::open(
        &[dir.path().join("note.md")],
        dir.path().join("feedback.json"),
    )
    .unwrap();
    let app = http::router(AppState {
        session: Arc::new(Mutex::new(s)),
        token: "test-session".into(),
        authority: "127.0.0.1:3210".into(),
    });
    (dir, app)
}
async fn call(
    app: &axum::Router,
    method: &str,
    path: &str,
    value: serde_json::Value,
) -> (StatusCode, serde_json::Value) {
    let response = app
        .clone()
        .oneshot(
            Request::builder()
                .method(method)
                .uri(path)
                .header("host", "127.0.0.1:3210")
                .header("authorization", "Bearer test-session")
                .header("content-type", "application/json")
                .body(Body::from(value.to_string()))
                .unwrap(),
        )
        .await
        .unwrap();
    let status = response.status();
    let bytes = to_bytes(response.into_body(), 1 << 22).await.unwrap();
    (
        status,
        serde_json::from_slice(&bytes)
            .unwrap_or_else(|_| serde_json::json!({"error":String::from_utf8_lossy(&bytes)})),
    )
}
#[tokio::test]
async fn http_roundtrip_rejects_bad_targets_stale_edits_and_browser_path_injection() {
    let (dir, app) = setup();
    let (status, state) = call(&app, "GET", "/api/state", serde_json::json!({})).await;
    assert_eq!(status, StatusCode::OK);
    let f = &state["feedback"]["files"][0];
    let s = &f["snapshots"][0];
    let target = serde_json::json!({"file_id":f["id"],"snapshot_id":s["id"],"start_byte":0,"end_byte":10,"body":"request","expected_revision":0});
    let mut bad = target.clone();
    bad["end_byte"] = 999.into();
    assert_eq!(
        call(&app, "POST", "/api/comments", bad).await.0,
        StatusCode::BAD_REQUEST
    );
    let (status, state) = call(&app, "POST", "/api/comments", target).await;
    assert_eq!(status, StatusCode::OK);
    let id = state["feedback"]["comments"][0]["id"].as_str().unwrap();
    assert_eq!(
        call(
            &app,
            "PUT",
            &format!("/api/comments/{id}"),
            serde_json::json!({"body":"stale","expected_revision":0})
        )
        .await
        .0,
        StatusCode::CONFLICT
    );
    assert_eq!(
        call(
            &app,
            "PUT",
            &format!("/api/comments/{id}"),
            serde_json::json!({"body":"updated","expected_revision":1})
        )
        .await
        .0,
        StatusCode::OK
    );
    assert_eq!(
        call(
            &app,
            "POST",
            "/api/save",
            serde_json::json!({"expected_revision":2,"path":"../unselected"})
        )
        .await
        .0,
        StatusCode::UNPROCESSABLE_ENTITY
    );
    assert_eq!(
        call(
            &app,
            "POST",
            "/api/save",
            serde_json::json!({"expected_revision":2})
        )
        .await
        .0,
        StatusCode::OK
    );
    let reopened = Session::reopen(
        &dir.path().join("feedback.json"),
        None,
        dir.path().join("next.json"),
    )
    .unwrap();
    assert_eq!(reopened.feedback.comments[0].body, "updated");
    assert_eq!(
        call(
            &app,
            "DELETE",
            &format!("/api/comments/{id}"),
            serde_json::json!({"expected_revision":2})
        )
        .await
        .0,
        StatusCode::OK
    );
    assert_eq!(
        call(
            &app,
            "GET",
            "/api/file?path=/etc/passwd",
            serde_json::json!({})
        )
        .await
        .0,
        StatusCode::NOT_FOUND
    );
}

#[tokio::test]
async fn access_is_loopback_session_scoped_and_assets_have_strict_headers() {
    let (_dir, app) = setup();
    for (path, host, auth, origin, expected) in [
        (
            "/api/state",
            "127.0.0.1:3210",
            "",
            "",
            StatusCode::UNAUTHORIZED,
        ),
        (
            "/api/state",
            "evil.invalid:3210",
            "Bearer test-session",
            "",
            StatusCode::FORBIDDEN,
        ),
        (
            "/api/state",
            "127.0.0.1:3210",
            "Bearer test-session",
            "https://evil.invalid",
            StatusCode::FORBIDDEN,
        ),
        ("/app.js", "127.0.0.1:3210", "", "", StatusCode::OK),
        (
            "/../../VISION.md",
            "127.0.0.1:3210",
            "",
            "",
            StatusCode::NOT_FOUND,
        ),
    ] {
        let mut request = Request::builder().uri(path).header("host", host);
        if !auth.is_empty() {
            request = request.header("authorization", auth);
        }
        if !origin.is_empty() {
            request = request.header("origin", origin);
        }
        let response = app
            .clone()
            .oneshot(request.body(Body::empty()).unwrap())
            .await
            .unwrap();
        assert_eq!(response.status(), expected);
        assert_eq!(response.headers()["cache-control"], "no-store");
        assert!(
            response.headers()["content-security-policy"]
                .to_str()
                .unwrap()
                .contains("default-src 'none'")
        );
    }
    let oversized = serde_json::json!({"body":"x".repeat(70000)});
    assert_eq!(
        call(&app, "POST", "/api/comments", oversized).await.0,
        StatusCode::PAYLOAD_TOO_LARGE
    );
}
