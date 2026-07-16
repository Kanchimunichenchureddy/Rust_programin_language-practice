pub mod auth;
pub mod calendar;
pub mod dashboard;
pub mod members;
pub mod projects;
pub mod tasks;

use serde_json::Value;
use sqlx::MySqlPool;

use crate::errors::AppError;
use crate::ipc::{IpcRequest, IpcResponse};

/// Session store: maps user_id to their auth token.
/// In production, you'd use JWT or a Redis session store.
/// For this learning project, an in-memory HashMap is clear and simple.
pub struct AppState {
    pub pool: MySqlPool,
    pub sessions: tokio::sync::RwLock<std::collections::HashMap<String, i32>>,
    // token -> user_id
}

impl AppState {
    pub fn new(pool: MySqlPool) -> Self {
        Self {
            pool,
            sessions: tokio::sync::RwLock::new(std::collections::HashMap::new()),
        }
    }

    /// Get the user_id from a session token.
    pub async fn get_user_id(&self, token: &str) -> Option<i32> {
        let sessions = self.sessions.read().await;
        sessions.get(token).copied()
    }
}

/// Dispatch an incoming IPC request to the appropriate handler.
///
/// # How routing works
/// The `cmd` field (e.g., "auth.login", "projects.list") is matched against
/// known command patterns. Each handler function receives the parsed payload
/// and returns a JSON response.
pub async fn dispatch(
    state: &AppState,
    request: IpcRequest,
) -> IpcResponse {
    let req_id = request.req_id.clone();

    // Commands that DON'T require authentication
    let requires_auth = !matches!(
        request.cmd.as_str(),
        "auth.register" | "auth.login"
    );

    // For authenticated commands, extract the user_id from the session token
    let current_user = if requires_auth {
        match &request.token {
            Some(token) => match state.get_user_id(token).await {
                Some(uid) => Some(uid),
                None => {
                    return IpcResponse::error(
                        req_id,
                        &AppError::Auth("Not authenticated. Please login first.".into()),
                    );
                }
            },
            None => {
                return IpcResponse::error(
                    req_id,
                    &AppError::Auth("Authentication token required.".into()),
                );
            }
        }
    } else {
        None
    };

    let result: Result<Value, AppError> = match request.cmd.as_str() {
        // --- Auth ---
        "auth.register" => {
            let payload = request.payload;
            auth::handle_register(state, payload).await
        }
        "auth.login" => {
            let payload = request.payload;
            auth::handle_login(state, payload, req_id.clone()).await
        }
        "auth.me" => {
            auth::handle_me(state, current_user.unwrap()).await
        }
        "auth.logout" => {
            let token = request.token.unwrap_or_default();
            auth::handle_logout(state, token).await
        }

        // --- Dashboard ---
        "dashboard.stats" => {
            dashboard::handle_stats(state, current_user.unwrap()).await
        }
        "dashboard.activity" => {
            dashboard::handle_activity(state, current_user.unwrap()).await
        }

        // --- Projects ---
        "projects.list" => {
            projects::handle_list(state, current_user.unwrap()).await
        }
        "projects.get" => {
            let payload = request.payload;
            projects::handle_get(state, current_user.unwrap(), payload).await
        }
        "projects.create" => {
            let payload = request.payload;
            projects::handle_create(state, current_user.unwrap(), payload).await
        }
        "projects.update" => {
            let payload = request.payload;
            projects::handle_update(state, current_user.unwrap(), payload).await
        }
        "projects.delete" => {
            let payload = request.payload;
            projects::handle_delete(state, current_user.unwrap(), payload).await
        }

        // --- Members ---
        "members.list" => {
            members::handle_list(state, current_user.unwrap()).await
        }
        "members.invite" => {
            let payload = request.payload;
            members::handle_invite(state, current_user.unwrap(), payload).await
        }
        "members.remove" => {
            let payload = request.payload;
            members::handle_remove(state, current_user.unwrap(), payload).await
        }
        "members.stats" => {
            members::handle_team_stats(state, current_user.unwrap()).await
        }

        // --- Calendar ---
        "dashboard.calendar" => {
            calendar::handle_calendar(state, current_user.unwrap()).await
        }

        // --- Tasks ---
        "tasks.list" => {
            let payload = request.payload;
            tasks::handle_list(state, current_user.unwrap(), payload).await
        }
        "tasks.get" => {
            let payload = request.payload;
            tasks::handle_get(state, current_user.unwrap(), payload).await
        }
        "tasks.create" => {
            let payload = request.payload;
            tasks::handle_create(state, current_user.unwrap(), payload).await
        }
        "tasks.update" => {
            let payload = request.payload;
            tasks::handle_update(state, current_user.unwrap(), payload).await
        }
        "tasks.delete" => {
            let payload = request.payload;
            tasks::handle_delete(state, current_user.unwrap(), payload).await
        }

        // --- Unknown ---
        _ => Err(AppError::Validation(format!(
            "Unknown command: '{}'",
            request.cmd
        ))),
    };

    match result {
        Ok(data) => IpcResponse::ok(req_id, data),
        Err(err) => IpcResponse::error(req_id, &err),
    }
}
