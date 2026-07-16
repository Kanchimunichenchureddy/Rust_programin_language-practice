use serde::{Deserialize, Serialize};
use serde_json::Value;

// ============================================
// IPC Protocol — Messages between Frontend & Backend
//
// Flow:
//   1. Frontend sends a Request  (WebSocket text frame)
//   2. Backend processes it
//   3. Backend sends a Response  (WebSocket text frame)
//
// Request format:
//   { "cmd": "projects.list", "req_id": "abc-123", "payload": { ... } }
//
// Response format (success):
//   { "req_id": "abc-123", "type": "ok", "data": { ... } }
//
// Response format (error):
//   { "req_id": "abc-123", "type": "error", "error": { "code": "...", "message": "..." } }
// ============================================

/// A request sent from the frontend to the backend.
#[derive(Debug, Deserialize)]
pub struct IpcRequest {
    /// The command to execute, e.g. "auth.login", "projects.create"
    pub cmd: String,

    /// Unique request ID for correlating responses.
    /// The frontend generates this so it knows which response matches which request.
    #[serde(rename = "req_id")]
    pub req_id: String,

    /// Optional payload — varies per command.
    #[serde(default)]
    pub payload: Value,

    /// Optional authentication token (set after login).
    #[serde(default)]
    pub token: Option<String>,
}

/// A response sent from the backend to the frontend.
#[derive(Debug, Serialize)]
pub struct IpcResponse {
    /// Echoes back the request_id so the frontend can match responses.
    #[serde(rename = "req_id")]
    pub req_id: String,

    /// "ok" for success, "error" for failure.
    #[serde(rename = "type")]
    pub response_type: String,

    /// Payload data (present on success).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<Value>,

    /// Error details (present on failure).
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<IpcErrorPayload>,
}

/// Error payload returned to the frontend.
#[derive(Debug, Serialize)]
pub struct IpcErrorPayload {
    pub code: String,
    pub message: String,
}

impl IpcResponse {
    /// Create a success response.
    pub fn ok(req_id: impl Into<String>, data: Value) -> Self {
        Self {
            req_id: req_id.into(),
            response_type: "ok".into(),
            data: Some(data),
            error: None,
        }
    }

    /// Create an error response from our AppError type.
    pub fn error(req_id: impl Into<String>, err: &crate::errors::AppError) -> Self {
        Self {
            req_id: req_id.into(),
            response_type: "error".into(),
            data: None,
            error: Some(IpcErrorPayload {
                code: err.code().into(),
                message: err.message().into(),
            }),
        }
    }
}
