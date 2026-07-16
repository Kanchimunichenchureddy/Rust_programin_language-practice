use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::MySqlPool;

use crate::errors::AppError;

/// Represents a task within a project.
#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Task {
    pub id: i32,
    pub project_id: i32,
    pub title: String,
    pub description: Option<String>,
    pub status: String,
    pub assignee_id: Option<i32>,
    pub priority: String,
    pub due_date: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Input for creating a new task.
#[derive(Debug, Deserialize)]
pub struct CreateTaskInput {
    pub project_id: i32,
    pub title: String,
    pub description: Option<String>,
    pub assignee_id: Option<i32>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
}

/// Input for updating a task.
#[derive(Debug, Deserialize)]
pub struct UpdateTaskInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub assignee_id: Option<i32>,
    pub priority: Option<String>,
    pub due_date: Option<String>,
}

/// Represents the count of tasks grouped by status.
/// Used for dashboard statistics.
#[derive(Debug, Serialize)]
pub struct TaskStatusCount {
    pub status: String,
    pub count: i64,
}

impl Task {
    /// List tasks, optionally filtered by project.
    pub async fn list(
        pool: &MySqlPool,
        project_id: Option<i32>,
    ) -> Result<Vec<Task>, AppError> {
        let tasks = if let Some(pid) = project_id {
            sqlx::query_as!(
                Task,
                "SELECT id, project_id, title, description, status, assignee_id, priority, due_date, created_at, updated_at
                 FROM tasks WHERE project_id = ?
                 ORDER BY created_at DESC",
                pid
            )
            .fetch_all(pool)
            .await?
        } else {
            sqlx::query_as!(
                Task,
                "SELECT id, project_id, title, description, status, assignee_id, priority, due_date, created_at, updated_at
                 FROM tasks
                 ORDER BY created_at DESC"
            )
            .fetch_all(pool)
            .await?
        };

        Ok(tasks)
    }

    /// Get a single task by ID.
    pub async fn get_by_id(pool: &MySqlPool, task_id: i32) -> Result<Task, AppError> {
        let task = sqlx::query_as!(
            Task,
            "SELECT id, project_id, title, description, status, assignee_id, priority, due_date, created_at, updated_at
             FROM tasks WHERE id = ?",
            task_id
        )
        .fetch_one(pool)
        .await?;

        Ok(task)
    }

    /// Create a new task.
    pub async fn create(
        pool: &MySqlPool,
        input: CreateTaskInput,
        user_id: i32,
    ) -> Result<Task, AppError> {
        if input.title.trim().is_empty() {
            return Err(AppError::Validation("Task title is required".into()));
        }

        let priority = input.priority.unwrap_or_else(|| "medium".to_string());
        let due_date = parse_optional_date(input.due_date.as_deref());

        let result = sqlx::query_as!(
            Task,
            "INSERT INTO tasks (project_id, title, description, status, assignee_id, priority, due_date)
             VALUES (?, ?, ?, 'todo', ?, ?, ?)",
            input.project_id,
            input.title.trim(),
            input.description,
            input.assignee_id,
            priority,
            due_date,
        )
        .execute(pool)
        .await?;

        let task = sqlx::query_as!(
            Task,
            "SELECT id, project_id, title, description, status, assignee_id, priority, due_date, created_at, updated_at
             FROM tasks WHERE id = ?",
            result.last_insert_id()
        )
        .fetch_one(pool)
        .await?;

        crate::models::user::User::log_activity(
            pool, user_id, Some(input.project_id), "task.created",
            &serde_json::json!({ "title": task.title, "task_id": task.id }),
        )
        .await
        .ok();

        Ok(task)
    }

    /// Update an existing task.
    pub async fn update(
        pool: &MySqlPool,
        task_id: i32,
        user_id: i32,
        input: UpdateTaskInput,
    ) -> Result<Task, AppError> {
        let _ = Self::get_by_id(pool, task_id).await?;

        if let Some(title) = &input.title {
            if title.trim().is_empty() {
                return Err(AppError::Validation("Task title cannot be empty".into()));
            }
            sqlx::query("UPDATE tasks SET title = ? WHERE id = ?")
                .bind(title.trim())
                .bind(task_id)
                .execute(pool)
                .await?;
        }

        if let Some(desc) = &input.description {
            sqlx::query("UPDATE tasks SET description = ? WHERE id = ?")
                .bind(desc)
                .bind(task_id)
                .execute(pool)
                .await?;
        }

        if let Some(status) = &input.status {
            let valid_statuses = ["todo", "in_progress", "review", "done"];
            if !valid_statuses.contains(&status.as_str()) {
                return Err(AppError::Validation(format!(
                    "Invalid status '{}'. Must be one of: {:?}",
                    status, valid_statuses
                )));
            }
            sqlx::query("UPDATE tasks SET status = ? WHERE id = ?")
                .bind(status)
                .bind(task_id)
                .execute(pool)
                .await?;
        }

        if input.assignee_id.is_some() {
            sqlx::query("UPDATE tasks SET assignee_id = ? WHERE id = ?")
                .bind(input.assignee_id)
                .bind(task_id)
                .execute(pool)
                .await?;
        }

        if let Some(priority) = &input.priority {
            sqlx::query("UPDATE tasks SET priority = ? WHERE id = ?")
                .bind(priority)
                .bind(task_id)
                .execute(pool)
                .await?;
        }

        if let Some(date_str) = &input.due_date {
            let date = parse_optional_date(Some(date_str));
            sqlx::query("UPDATE tasks SET due_date = ? WHERE id = ?")
                .bind(date)
                .bind(task_id)
                .execute(pool)
                .await?;
        }

        let task = Self::get_by_id(pool, task_id).await?;

        crate::models::user::User::log_activity(
            pool, user_id, Some(task.project_id), "task.updated",
            &serde_json::json!({ "title": task.title, "task_id": task.id, "status": task.status }),
        )
        .await
        .ok();

        Ok(task)
    }

    /// Delete a task.
    pub async fn delete(pool: &MySqlPool, task_id: i32, user_id: i32) -> Result<(), AppError> {
        let task = Self::get_by_id(pool, task_id).await?;

        sqlx::query("DELETE FROM tasks WHERE id = ?")
            .bind(task_id)
            .execute(pool)
            .await?;

        // Log activity with the actual user who performed the deletion,
        // not the task's assignee (which may be None).
        crate::models::user::User::log_activity(
            pool, user_id, Some(task.project_id), "task.deleted",
            &serde_json::json!({ "title": task.title, "task_id": task.id }),
        )
        .await
        .ok();

        Ok(())
    }

    /// Get task counts grouped by status for dashboard stats.
    pub async fn count_by_status(pool: &MySqlPool, project_id: i32) -> Result<Vec<TaskStatusCount>, AppError> {
        let counts = sqlx::query_as!(
            TaskStatusCount,
            "SELECT status, COUNT(*) as count FROM tasks WHERE project_id = ? GROUP BY status",
            project_id
        )
        .fetch_all(pool)
        .await?;

        Ok(counts)
    }

    /// List tasks belonging to a set of project IDs (access-controlled version).
    /// Used when no single project_id is specified — only returns tasks from
    /// projects the user has access to.
    pub async fn list_for_projects(
        pool: &MySqlPool,
        project_ids: &[i32],
    ) -> Result<Vec<Task>, AppError> {
        if project_ids.is_empty() {
            return Ok(vec![]);
        }

        let placeholders: Vec<String> = project_ids.iter().map(|_| "?".to_string()).collect();
        let in_clause = placeholders.join(",");

        let query_str = format!(
            "SELECT id, project_id, title, description, status, assignee_id, priority, due_date, created_at, updated_at
             FROM tasks
             WHERE project_id IN ({})
             ORDER BY created_at DESC",
            in_clause
        );

        let mut query = sqlx::query_as::<_, Task>(&query_str);
        for pid in project_ids {
            query = query.bind(*pid);
        }

        let tasks = query.fetch_all(pool).await?;
        Ok(tasks)
    }
}

fn parse_optional_date(date_str: Option<&str>) -> Option<NaiveDate> {
    date_str.and_then(|s| {
        if s.is_empty() {
            None
        } else {
            chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
        }
    })
}
