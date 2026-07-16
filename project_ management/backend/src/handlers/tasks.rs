use serde::Deserialize;
use serde_json::Value;

use crate::errors::AppError;
use crate::handlers::AppState;
use crate::models::{Project, Task};

/// List tasks, optionally filtered by project_id.
///
/// Access control:
/// - If `project_id` is provided, the user must have access to that project.
/// - If `project_id` is NOT provided, returns tasks from ALL projects the user can see.
pub async fn handle_list(
    state: &AppState,
    user_id: i32,
    payload: Value,
) -> Result<Value, AppError> {
    let project_id = payload.get("project_id").and_then(|v| v.as_i64()).map(|v| v as i32);

    let tasks = if let Some(pid) = project_id {
        // Verify user has access to this project
        let _ = Project::get_by_id(&state.pool, pid, user_id).await?;
        Task::list(&state.pool, Some(pid)).await?
    } else {
        // No project_id — only return tasks from projects the user can see
        let project_ids = Project::get_user_project_ids(&state.pool, user_id).await?;
        if project_ids.is_empty() {
            return Ok(serde_json::json!([]));
        }
        Task::list_for_projects(&state.pool, &project_ids).await?
    };

    Ok(serde_json::to_value(tasks).unwrap())
}

/// Get a single task by ID.
///
/// Access control: user must have access to the task's parent project.
pub async fn handle_get(
    state: &AppState,
    user_id: i32,
    payload: Value,
) -> Result<Value, AppError> {
    #[derive(Deserialize)]
    struct GetTaskPayload {
        task_id: i32,
    }

    let input: GetTaskPayload = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid payload: {}", e))
    })?;

    let task = Task::get_by_id(&state.pool, input.task_id).await?;

    // Verify user has access to the task's parent project
    let _ = Project::get_by_id(&state.pool, task.project_id, user_id).await?;

    Ok(serde_json::to_value(task).unwrap())
}

/// Create a new task.
pub async fn handle_create(
    state: &AppState,
    user_id: i32,
    payload: Value,
) -> Result<Value, AppError> {
    let input: crate::models::task::CreateTaskInput = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid task data: {}", e))
    })?;

    // Verify user has access to the target project
    let _ = Project::get_by_id(&state.pool, input.project_id, user_id).await?;

    let task = Task::create(&state.pool, input, user_id).await?;
    Ok(serde_json::to_value(task).unwrap())
}

/// Update an existing task.
///
/// Access control: user must have access to the task's parent project.
pub async fn handle_update(
    state: &AppState,
    user_id: i32,
    payload: Value,
) -> Result<Value, AppError> {
    #[derive(Deserialize)]
    struct UpdateTaskPayload {
        task_id: i32,
        #[serde(flatten)]
        data: crate::models::task::UpdateTaskInput,
    }

    let input: UpdateTaskPayload = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid update payload: {}", e))
    })?;

    // First verify the task exists and user has access to its project
    let task = Task::get_by_id(&state.pool, input.task_id).await?;
    let _ = Project::get_by_id(&state.pool, task.project_id, user_id).await?;

    let updated = Task::update(&state.pool, input.task_id, user_id, input.data).await?;
    Ok(serde_json::to_value(updated).unwrap())
}

/// Delete a task.
///
/// Access control: user must have access to the task's parent project.
pub async fn handle_delete(
    state: &AppState,
    user_id: i32,
    payload: Value,
) -> Result<Value, AppError> {
    #[derive(Deserialize)]
    struct DeleteTaskPayload {
        task_id: i32,
    }

    let input: DeleteTaskPayload = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid payload: {}", e))
    })?;

    // First verify the task exists and user has access to its project
    let task = Task::get_by_id(&state.pool, input.task_id).await?;
    let _ = Project::get_by_id(&state.pool, task.project_id, user_id).await?;

    Task::delete(&state.pool, input.task_id, user_id).await?;
    Ok(serde_json::json!({ "message": "Task deleted successfully" }))
}
