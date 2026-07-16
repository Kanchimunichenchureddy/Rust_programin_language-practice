use serde_json::Value;
use sqlx::MySqlPool;

use crate::errors::AppError;
use crate::handlers::AppState;

/// Handle the dashboard.calendar command.
///
/// Returns upcoming deadlines for the next 30 days across all
/// of the user's projects and their tasks.
pub async fn handle_calendar(state: &AppState, user_id: i32) -> Result<Value, AppError> {
    let pool = &state.pool;

    // Get project IDs the user owns or is a member of
    let project_ids: Vec<(i32,)> = sqlx::query_as::<_, (i32,)>(
        "SELECT id FROM projects WHERE owner_id = ?
         UNION
         SELECT project_id FROM project_members WHERE user_id = ?",
    )
    .bind(user_id)
    .bind(user_id)
    .fetch_all(pool)
    .await?;

    if project_ids.is_empty() {
        return Ok(serde_json::json!({
            "projects": [],
            "tasks": [],
            "today": chrono::Utc::now().date_naive().to_string(),
        }));
    }

    let ids: Vec<i32> = project_ids.into_iter().map(|(id,)| id).collect();

    // Fetch project deadlines (due_date in the future or overdue)
    let project_deadlines = get_project_deadlines(pool, &ids).await?;

    // Fetch task deadlines
    let task_deadlines = get_task_deadlines(pool, &ids).await?;

    Ok(serde_json::json!({
        "projects": project_deadlines,
        "tasks": task_deadlines,
        "today": chrono::Utc::now().date_naive().to_string(),
    }))
}

async fn get_project_deadlines(pool: &MySqlPool, project_ids: &[i32]) -> Result<Vec<Value>, AppError> {
    if project_ids.is_empty() {
        return Ok(vec![]);
    }

    let placeholders: Vec<String> = project_ids.iter().map(|_| "?".to_string()).collect();
    let in_clause = placeholders.join(",");

    let query_str = format!(
        "SELECT id, name, description, status, color, due_date
         FROM projects
         WHERE id IN ({}) AND due_date IS NOT NULL
         ORDER BY due_date ASC",
        in_clause
    );

    let mut query = sqlx::query_as::<_, CalendarProjectRow>(&query_str);
    for pid in project_ids {
        query = query.bind(*pid);
    }

    let rows = query.fetch_all(pool).await?;
    let today = chrono::Utc::now().date_naive();

    let result: Vec<Value> = rows
        .into_iter()
        .map(|row| {
            let is_overdue = row.due_date < Some(today);
            serde_json::json!({
                "id": row.id,
                "name": row.name,
                "description": row.description,
                "status": row.status,
                "color": row.color,
                "due_date": row.due_date.map(|d| d.to_string()),
                "type": "project",
                "is_overdue": is_overdue,
                "is_today": row.due_date == Some(today),
                "days_until": row.due_date.map(|d| (d - today).num_days()),
            })
        })
        .collect();

    Ok(result)
}

async fn get_task_deadlines(pool: &MySqlPool, project_ids: &[i32]) -> Result<Vec<Value>, AppError> {
    if project_ids.is_empty() {
        return Ok(vec![]);
    }

    let placeholders: Vec<String> = project_ids.iter().map(|_| "?".to_string()).collect();
    let in_clause = placeholders.join(",");

    let query_str = format!(
        "SELECT t.id, t.project_id, t.title, t.status, t.priority, t.assignee_id, t.due_date,
                p.name as project_name, p.color as project_color
         FROM tasks t
         JOIN projects p ON t.project_id = p.id
         WHERE t.project_id IN ({}) AND t.due_date IS NOT NULL AND t.status != 'done'
         ORDER BY t.due_date ASC",
        in_clause
    );

    let mut query = sqlx::query_as::<_, CalendarTaskRow>(&query_str);
    for pid in project_ids {
        query = query.bind(*pid);
    }

    let rows = query.fetch_all(pool).await?;
    let today = chrono::Utc::now().date_naive();

    let result: Vec<Value> = rows
        .into_iter()
        .map(|row| {
            let is_overdue = row.due_date < Some(today);
            serde_json::json!({
                "id": row.id,
                "project_id": row.project_id,
                "title": row.title,
                "status": row.status,
                "priority": row.priority,
                "assignee_id": row.assignee_id,
                "due_date": row.due_date.map(|d| d.to_string()),
                "project_name": row.project_name,
                "project_color": row.project_color,
                "type": "task",
                "is_overdue": is_overdue,
                "is_today": row.due_date == Some(today),
                "days_until": row.due_date.map(|d| (d - today).num_days()),
            })
        })
        .collect();

    Ok(result)
}

#[derive(sqlx::FromRow)]
struct CalendarProjectRow {
    id: i32,
    name: String,
    description: Option<String>,
    status: String,
    color: String,
    due_date: Option<chrono::NaiveDate>,
}

#[derive(sqlx::FromRow)]
struct CalendarTaskRow {
    id: i32,
    project_id: i32,
    title: String,
    status: String,
    priority: String,
    assignee_id: Option<i32>,
    due_date: Option<chrono::NaiveDate>,
    project_name: String,
    project_color: String,
}
