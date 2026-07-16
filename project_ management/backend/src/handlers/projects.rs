use serde::Deserialize;
use serde_json::Value;

use crate::errors::AppError;
use crate::handlers::AppState;
use crate::models::{Project, Task};

/// Payload for fetching a single project.
#[derive(Deserialize)]
struct GetProjectPayload {
    project_id: i32,
}

/// Payload for project CRUD commands.
#[derive(Deserialize)]
struct ProjectIdPayload {
    project_id: i32,
}

/// List all projects for the current user.
pub async fn handle_list(state: &AppState, user_id: i32) -> Result<Value, AppError> {
    let projects = Project::list(&state.pool, user_id).await?;

    // Attach task counts to each project
    let mut result = Vec::new();
    for project in &projects {
        let counts = Task::count_by_status(&state.pool, project.id).await.unwrap_or_default();
        let total_tasks: i64 = counts.iter().map(|c| c.count).sum();

        result.push(serde_json::json!({
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "owner_id": project.owner_id,
            "color": project.color,
            "due_date": project.due_date,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "task_counts": counts,
            "total_tasks": total_tasks,
        }));
    }

    Ok(serde_json::json!(result))
}

/// Get a single project by ID.
pub async fn handle_get(
    state: &AppState,
    user_id: i32,
    payload: Value,
) -> Result<Value, AppError> {
    let input: GetProjectPayload = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid payload: {}", e))
    })?;

    let project = Project::get_by_id(&state.pool, input.project_id, user_id).await?;

    // Also fetch the associated tasks
    let tasks = Task::list(&state.pool, Some(project.id)).await?;
    let counts = Task::count_by_status(&state.pool, project.id).await.unwrap_or_default();

    Ok(serde_json::json!({
        "project": {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "owner_id": project.owner_id,
            "color": project.color,
            "due_date": project.due_date,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
        },
        "tasks": tasks,
        "task_counts": counts,
    }))
}

/// Create a new project.
pub async fn handle_create(
    state: &AppState,
    user_id: i32,
    payload: Value,
) -> Result<Value, AppError> {
    let input: crate::models::project::CreateProjectInput =
        serde_json::from_value(payload).map_err(|e| {
            AppError::Validation(format!("Invalid project data: {}", e))
        })?;

    let project = Project::create(&state.pool, input, user_id).await?;

    Ok(serde_json::to_value(project).unwrap())
}

/// Update an existing project.
pub async fn handle_update(
    state: &AppState,
    user_id: i32,
    payload: Value,
) -> Result<Value, AppError> {
    #[derive(Deserialize)]
    struct UpdateProjectPayload {
        project_id: i32,
        #[serde(flatten)]
        data: crate::models::project::UpdateProjectInput,
    }

    let input: UpdateProjectPayload = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid update payload: {}", e))
    })?;

    let project = Project::update(&state.pool, input.project_id, user_id, input.data).await?;

    Ok(serde_json::to_value(project).unwrap())
}

/// Delete a project.
pub async fn handle_delete(
    state: &AppState,
    user_id: i32,
    payload: Value,
) -> Result<Value, AppError> {
    let input: ProjectIdPayload = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid payload: {}", e))
    })?;

    Project::delete(&state.pool, input.project_id, user_id).await?;

    Ok(serde_json::json!({ "message": "Project deleted successfully" }))
}
