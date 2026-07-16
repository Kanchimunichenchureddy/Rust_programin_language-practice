use serde_json::Value;
use sqlx::MySqlPool;

use crate::errors::AppError;
use crate::handlers::AppState;

/// Handle the dashboard.stats command.
///
/// Returns aggregate statistics for the dashboard:
/// - Total projects (owned + member)
/// - Projects by status
/// - Total tasks across all visible projects
/// - Tasks by status
/// - Recent activity
pub async fn handle_stats(state: &AppState, user_id: i32) -> Result<Value, AppError> {
    let pool = &state.pool;

    // Get all project IDs visible to this user (owned + member)
    let project_ids = crate::models::Project::get_user_project_ids(pool, user_id).await?;

    // If no projects at all, return empty stats
    if project_ids.is_empty() {
        return Ok(serde_json::json!({
            "total_projects": 0,
            "projects_by_status": [],
            "total_tasks": 0,
            "tasks_by_status": [],
            "recent_activity": [],
        }));
    }

    let placeholders: Vec<String> = project_ids.iter().map(|_| "?".to_string()).collect();
    let in_clause = placeholders.join(",");

    // Get total project count (all visible projects)
    let total_projects = project_ids.len() as i64;

    // Count projects by status
    let status_query = format!(
        "SELECT status, COUNT(*) as `count` FROM projects WHERE id IN ({}) GROUP BY status",
        in_clause
    );
    let mut q = sqlx::query_as::<_, StatusCount>(&status_query);
    for pid in &project_ids {
        q = q.bind(*pid);
    }
    let projects_by_status: Vec<StatusCount> = q.fetch_all(pool).await?;

    // Total tasks across all visible projects
    let task_count_query = format!(
        "SELECT COUNT(*) FROM tasks WHERE project_id IN ({})",
        in_clause
    );
    let mut q = sqlx::query_scalar::<_, i64>(&task_count_query);
    for pid in &project_ids {
        q = q.bind(*pid);
    }
    let total_tasks: i64 = q.fetch_optional(pool).await?.unwrap_or(0);

    // Tasks by status
    let task_status_query = format!(
        "SELECT status, COUNT(*) as `count` FROM tasks WHERE project_id IN ({}) GROUP BY status",
        in_clause
    );
    let mut q = sqlx::query_as::<_, StatusCount>(&task_status_query);
    for pid in &project_ids {
        q = q.bind(*pid);
    }
    let tasks_by_status: Vec<StatusCount> = q.fetch_all(pool).await?;

    // Get recent activity
    let recent_activity = get_recent_activity(pool, user_id, 5).await?;

    Ok(serde_json::json!({
        "total_projects": total_projects,
        "projects_by_status": projects_by_status,
        "total_tasks": total_tasks,
        "tasks_by_status": tasks_by_status,
        "recent_activity": recent_activity,
    }))
}

/// Handle the dashboard.activity command.
pub async fn handle_activity(state: &AppState, user_id: i32) -> Result<Value, AppError> {
    let activity = get_recent_activity(&state.pool, user_id, 20).await?;
    Ok(serde_json::json!(activity))
}

/// Fetch recent activity entries.
///
/// Uses dynamic IN clauses with the user's visible project IDs
/// (both owned and member projects).
async fn get_recent_activity(
    pool: &MySqlPool,
    user_id: i32,
    limit: i32,
) -> Result<Vec<ActivityEntry>, AppError> {
    // --- Step 1: Get user's visible project IDs ---
    let project_ids = crate::models::Project::get_user_project_ids(pool, user_id).await?;

    // --- Step 2: Get activity entries ---
    let entries = if project_ids.is_empty() {
        // No projects — just filter by user_id
        sqlx::query_as::<_, ActivityRow>(
            "SELECT id, user_id, project_id, action, details, CAST(created_at AS CHAR) AS created_at_str
             FROM activity_log
             WHERE user_id = ?
             ORDER BY created_at DESC",
        )
        .bind(user_id)
        .fetch_all(pool)
        .await?
    } else {
        // Build IN clause from project IDs
        let placeholders: Vec<String> = project_ids.iter().map(|_| "?".to_string()).collect();
        let in_clause = placeholders.join(",");

        let query_str = format!(
            "SELECT id, user_id, project_id, action, details, CAST(created_at AS CHAR) AS created_at_str
             FROM activity_log
             WHERE project_id IN ({}) OR user_id = ?
             ORDER BY created_at DESC",
            in_clause
        );

        let mut query = sqlx::query_as::<_, ActivityRow>(&query_str);
        for pid in &project_ids {
            query = query.bind(*pid);
        }
        query = query.bind(user_id);
        query.fetch_all(pool).await?
    };

    // --- Step 3: Get user name ---
    let user_name: String = sqlx::query_scalar::<_, String>(
        "SELECT name FROM users WHERE id = ?",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .unwrap_or_else(|| "Unknown".to_string());

    // --- Step 4: Apply limit in Rust and build ActivityEntry ---
    let entries: Vec<ActivityEntry> = entries
        .into_iter()
        .take(limit as usize)
        .map(|row| {
            ActivityEntry {
                id: row.id,
                user_id: row.user_id,
                user_name: user_name.clone(),
                project_id: row.project_id,
                action: row.action,
                details: row.details,
                created_at: row.created_at_str,
            }
        })
        .collect();

    Ok(entries)
}

// ---- Helper Types ----

/// Row type for activity_log entries (no JOIN, no aliases — simple and predictable).
#[derive(sqlx::FromRow)]
struct ActivityRow {
    id: i32,
    user_id: i32,
    project_id: Option<i32>,
    action: String,
    details: Option<serde_json::Value>,
    created_at_str: String,
}

/// Used by sqlx to map grouped COUNT results.
#[derive(sqlx::FromRow, serde::Serialize)]
struct StatusCount {
    status: String,
    #[sqlx(rename = "count")]
    count: i64,
}

#[derive(serde::Serialize)]
struct ActivityEntry {
    id: i32,
    user_id: i32,
    user_name: String,
    project_id: Option<i32>,
    action: String,
    details: Option<serde_json::Value>,
    created_at: String,
}
