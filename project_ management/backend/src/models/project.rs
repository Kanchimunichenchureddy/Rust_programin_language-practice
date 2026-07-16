use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::MySqlPool;

use crate::errors::AppError;

/// Represents a project in the system.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Project {
    pub id: i32,
    pub name: String,
    pub description: Option<String>,
    pub status: String,
    pub owner_id: i32,
    pub color: String,
    pub due_date: Option<NaiveDate>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Input for creating a new project.
#[derive(Debug, Deserialize)]
pub struct CreateProjectInput {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
    pub due_date: Option<String>, // ISO date string from frontend
}

/// Input for updating an existing project.
#[derive(Debug, Deserialize)]
pub struct UpdateProjectInput {
    pub name: Option<String>,
    pub description: Option<String>,
    pub status: Option<String>,
    pub color: Option<String>,
    pub due_date: Option<String>,
}

impl Project {
    /// List all projects visible to the user — both owned and member projects.
    pub async fn list(pool: &MySqlPool, user_id: i32) -> Result<Vec<Project>, AppError> {
        let projects = sqlx::query_as!(
            Project,
            "SELECT id, name, description, status, owner_id, color, due_date, created_at, updated_at
             FROM projects
             WHERE owner_id = ? OR id IN (SELECT project_id FROM project_members WHERE user_id = ?)
             ORDER BY created_at DESC",
            user_id,
            user_id,
        )
        .fetch_all(pool)
        .await?;

        Ok(projects)
    }

    /// Get a single project by ID.
    ///
    /// Accessible by both the owner AND any user listed in `project_members`.
    /// For owner-only operations (update/delete), callers must additionally
    /// verify `project.owner_id == user_id` after this returns.
    pub async fn get_by_id(pool: &MySqlPool, project_id: i32, user_id: i32) -> Result<Project, AppError> {
        let project = sqlx::query_as!(
            Project,
            "SELECT id, name, description, status, owner_id, color, due_date, created_at, updated_at
             FROM projects
             WHERE id = ? AND (owner_id = ? OR id IN (SELECT project_id FROM project_members WHERE user_id = ?))",
            project_id,
            user_id,
            user_id,
        )
        .fetch_one(pool)
        .await?;

        Ok(project)
    }

    /// Create a new project.
    pub async fn create(
        pool: &MySqlPool,
        input: CreateProjectInput,
        owner_id: i32,
    ) -> Result<Project, AppError> {
        if input.name.trim().is_empty() {
            return Err(AppError::Validation("Project name is required".into()));
        }

        let color = input.color.unwrap_or_else(|| "#ff5a1f".to_string());
        let due_date = parse_optional_date(input.due_date.as_deref());

        let result = sqlx::query_as!(
            Project,
            "INSERT INTO projects (name, description, status, owner_id, color, due_date)
             VALUES (?, ?, 'active', ?, ?, ?)",
            input.name.trim(),
            input.description,
            owner_id,
            color,
            due_date,
        )
        .execute(pool)
        .await?;

        // Fetch back the full record with auto-generated fields
        let project = sqlx::query_as!(
            Project,
            "SELECT id, name, description, status, owner_id, color, due_date, created_at, updated_at
             FROM projects WHERE id = ?",
            result.last_insert_id()
        )
        .fetch_one(pool)
        .await?;

        // Add the owner to project_members so member-based queries find this project
        sqlx::query("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'owner')")
            .bind(project.id)
            .bind(owner_id)
            .execute(pool)
            .await
            .ok();

        // Log activity
        crate::models::user::User::log_activity(
            pool, owner_id, Some(project.id), "project.created",
            &serde_json::json!({ "name": project.name }),
        )
        .await
        .ok();

        Ok(project)
    }

    /// Update an existing project. Only owner can update.
    pub async fn update(
        pool: &MySqlPool,
        project_id: i32,
        user_id: i32,
        input: UpdateProjectInput,
    ) -> Result<Project, AppError> {
        // Verify the project exists and user has access (owner or member)
        let project = Self::get_by_id(pool, project_id, user_id).await?;
        // Only the owner can update project details
        if project.owner_id != user_id {
            return Err(AppError::Auth("Only the project owner can update this project".into()));
        }

        // Build dynamic UPDATE — only set fields that are provided
        if let Some(name) = &input.name {
            if name.trim().is_empty() {
                return Err(AppError::Validation("Project name cannot be empty".into()));
            }
            sqlx::query("UPDATE projects SET name = ? WHERE id = ?")
                .bind(name.trim())
                .bind(project_id)
                .execute(pool)
                .await?;
        }

        if let Some(desc) = &input.description {
            sqlx::query("UPDATE projects SET description = ? WHERE id = ?")
                .bind(desc)
                .bind(project_id)
                .execute(pool)
                .await?;
        }

        if let Some(status) = &input.status {
            sqlx::query("UPDATE projects SET status = ? WHERE id = ?")
                .bind(status)
                .bind(project_id)
                .execute(pool)
                .await?;
        }

        if let Some(color) = &input.color {
            sqlx::query("UPDATE projects SET color = ? WHERE id = ?")
                .bind(color)
                .bind(project_id)
                .execute(pool)
                .await?;
        }

        if let Some(date_str) = &input.due_date {
            let date = parse_optional_date(Some(date_str));
            sqlx::query("UPDATE projects SET due_date = ? WHERE id = ?")
                .bind(date)
                .bind(project_id)
                .execute(pool)
                .await?;
        }

        // Fetch updated project
        let updated = Self::get_by_id(pool, project_id, user_id).await?;

        crate::models::user::User::log_activity(
            pool, user_id, Some(project_id), "project.updated",
            &serde_json::json!({ "name": updated.name }),
        )
        .await
        .ok();

        Ok(updated)
    }

    /// Delete a project and its associated tasks (CASCADE). Only owner can delete.
    pub async fn delete(
        pool: &MySqlPool,
        project_id: i32,
        user_id: i32,
    ) -> Result<(), AppError> {
        let project = Self::get_by_id(pool, project_id, user_id).await?;
        // Only the owner can delete
        if project.owner_id != user_id {
            return Err(AppError::Auth("Only the project owner can delete this project".into()));
        }

        sqlx::query("DELETE FROM projects WHERE id = ? AND owner_id = ?")
            .bind(project_id)
            .bind(user_id)
            .execute(pool)
            .await?;

        crate::models::user::User::log_activity(
            pool, user_id, None, "project.deleted",
            &serde_json::json!({ "project_id": project_id }),
        )
        .await
        .ok();

        Ok(())
    }

    /// Get all project IDs accessible by a user (owned + member).
    /// Useful for dashboard queries that need to filter across both.
    pub async fn get_user_project_ids(pool: &MySqlPool, user_id: i32) -> Result<Vec<i32>, AppError> {
        let rows: Vec<(i32,)> = sqlx::query_as::<_, (i32,)>(    
            "SELECT id FROM projects WHERE owner_id = ?
             UNION
             SELECT project_id FROM project_members WHERE user_id = ?"
        )
        .bind(user_id)
        .bind(user_id)
        .fetch_all(pool)
        .await?;

        Ok(rows.into_iter().map(|(id,)| id).collect())
    }
}

/// Parse an optional ISO date string into a NaiveDate.
fn parse_optional_date(date_str: Option<&str>) -> Option<NaiveDate> {
    date_str.and_then(|s| {
        if s.is_empty() {
            None
        } else {
            chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
        }
    })
}
