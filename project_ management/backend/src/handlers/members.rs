use serde::Deserialize;
use serde_json::Value;

use crate::errors::AppError;
use crate::handlers::AppState;

/// List all team members — users who share projects with the current user.
///
/// Returns a deduplicated list of users (with project role info) who are
/// either project owners themselves or members of projects the user owns.
pub async fn handle_list(state: &AppState, user_id: i32) -> Result<Value, AppError> {
    let pool = &state.pool;

    // Get users who own projects alongside this user (co-owners on the same projects?)
    // Actually for simplicity: get all members of ALL projects where this user has a relationship.
    // This includes projects they own AND projects they're a member of.

    // Step 1: Get IDs of projects owned by or shared with this user
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
        return Ok(serde_json::json!([]));
    }

    let ids: Vec<i32> = project_ids.into_iter().map(|(id,)| id).collect();

    // Step 2: Build dynamic IN clause
    let placeholders: Vec<String> = ids.iter().map(|_| "?".to_string()).collect();
    let in_clause = placeholders.join(",");

    // Step 3: Get the creator of each project + members
    let query_str = format!(
        "SELECT DISTINCT u.id, u.email, u.name, u.role, CAST(u.created_at AS CHAR) AS created_at_str
         FROM users u
         LEFT JOIN projects p ON u.id = p.owner_id AND p.id IN ({})
         LEFT JOIN project_members pm ON u.id = pm.user_id AND pm.project_id IN ({})
         WHERE (p.id IS NOT NULL OR pm.project_id IS NOT NULL)
         AND u.id != ?",
        in_clause, in_clause
    );

    let mut query = sqlx::query_as::<_, MemberRow>(&query_str);
    for pid in &ids {
        query = query.bind(*pid);
    }
    for pid in &ids {
        query = query.bind(*pid);
    }
    query = query.bind(user_id); // Exclude self
    let rows = query.fetch_all(pool).await?;

    // Step 4: For each member, find which projects they're associated with
    let members: Vec<Value> = rows
        .into_iter()
        .map(|row| {
            serde_json::json!({
                "id": row.id,
                "email": row.email,
                "name": row.name,
                "role": row.role,
                "created_at": row.created_at_str,
            })
        })
        .collect();

    Ok(serde_json::json!(members))
}

/// Invite a user to a project by email.
pub async fn handle_invite(state: &AppState, user_id: i32, payload: Value) -> Result<Value, AppError> {
    #[derive(Deserialize)]
    struct InvitePayload {
        project_id: i32,
        email: String,
    }

    let input: InvitePayload = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid invite payload: {}", e))
    })?;

    let pool = &state.pool;

    // Verify the inviting user owns the project
    let _ = crate::models::Project::get_by_id(pool, input.project_id, user_id).await?;

    // Find the user by email
    let invited_user = crate::models::User::find_by_email(pool, &input.email).await.map_err(|_| {
        AppError::NotFound(format!("No user found with email '{}'", input.email))
    })?;

    // Check if already a member
    let existing: Option<(i32,)> = sqlx::query_as::<_, (i32,)>(
        "SELECT 1 FROM project_members WHERE project_id = ? AND user_id = ?",
    )
    .bind(input.project_id)
    .bind(invited_user.id)
    .fetch_optional(pool)
    .await?;

    if existing.is_some() {
        return Err(AppError::Conflict(
            format!("User '{}' is already a member of this project", input.email),
        ));
    }

    // Add to project_members
    sqlx::query("INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, 'member')")
        .bind(input.project_id)
        .bind(invited_user.id)
        .execute(pool)
        .await?;

    // Log activity
    crate::models::user::User::log_activity(
        pool,
        user_id,
        Some(input.project_id),
        "member.invited",
        &serde_json::json!({ "email": input.email, "name": invited_user.name }),
    )
    .await
    .ok();

    Ok(serde_json::json!({
        "message": format!("Invited '{}' to the project", invited_user.name),
        "user": {
            "id": invited_user.id,
            "email": invited_user.email,
            "name": invited_user.name,
            "role": invited_user.role,
        }
    }))
}

/// Remove a member from a project.
pub async fn handle_remove(state: &AppState, user_id: i32, payload: Value) -> Result<Value, AppError> {
    #[derive(Deserialize)]
    struct RemovePayload {
        project_id: i32,
        member_id: i32,
    }

    let input: RemovePayload = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid remove payload: {}", e))
    })?;

    let pool = &state.pool;

    // Verify the requesting user owns the project
    let _ = crate::models::Project::get_by_id(pool, input.project_id, user_id).await?;

    // Don't allow removing yourself (use leave instead)
    if input.member_id == user_id {
        return Err(AppError::Validation("Cannot remove yourself. Use the leave endpoint instead.".into()));
    }

    sqlx::query("DELETE FROM project_members WHERE project_id = ? AND user_id = ?")
        .bind(input.project_id)
        .bind(input.member_id)
        .execute(pool)
        .await?;

    crate::models::user::User::log_activity(
        pool,
        user_id,
        Some(input.project_id),
        "member.removed",
        &serde_json::json!({ "member_id": input.member_id }),
    )
    .await
    .ok();

    Ok(serde_json::json!({ "message": "Member removed successfully" }))
}

/// Get team stats for the dashboard.
pub async fn handle_team_stats(state: &AppState, user_id: i32) -> Result<Value, AppError> {
    let pool = &state.pool;

    // Get projects owned by user
    let owned_count: i64 = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM projects WHERE owner_id = ?",
    )
    .bind(user_id)
    .fetch_optional(pool)
    .await?
    .unwrap_or(0);

    // Get total distinct members across all user's projects (excluding self)
    let member_count: i64 =
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(DISTINCT pm.user_id)
             FROM project_members pm
             JOIN projects p ON pm.project_id = p.id
             WHERE p.owner_id = ? AND pm.user_id != ?",
        )
        .bind(user_id)
        .bind(user_id)
        .fetch_optional(pool)
        .await?
        .unwrap_or(0);

    Ok(serde_json::json!({
        "owned_projects": owned_count,
        "team_members": member_count,
        "total_members": owned_count + member_count,
    }))
}

#[derive(sqlx::FromRow)]
struct MemberRow {
    id: i32,
    email: String,
    name: String,
    role: String,
    created_at_str: String,
}
