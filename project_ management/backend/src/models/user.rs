use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::MySqlPool;

use crate::errors::AppError;

/// Represents a user in the system.
///
/// # Ownership & Memory
/// `String` fields own their heap-allocated data. When a `User` is returned
/// from a function, ownership of the entire struct (and its heap data) is
/// transferred to the caller. No copies are made — Rust moves the pointer.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub id: i32,
    pub email: String,
    #[serde(skip_serializing)] // Never send password hash to frontend!
    pub password_hash: String,
    pub name: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// The subset of User fields safe to send to the frontend.
#[derive(Debug, Serialize)]
pub struct UserPublic {
    pub id: i32,
    pub email: String,
    pub name: String,
    pub role: String,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserPublic {
    fn from(user: User) -> Self {
        Self {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            created_at: user.created_at,
        }
    }
}

impl User {
    /// Create a new user in the database.
    ///
    /// # Why hash the password?
    /// Never store plain-text passwords! If the database is ever breached,
    /// hashed passwords are (theoretically) infeasible to reverse.
    /// bcrypt automatically salts each hash.
    pub async fn create(
        pool: &MySqlPool,
        email: &str,
        password: &str,
        name: &str,
    ) -> Result<UserPublic, AppError> {
        // Validate input
        if email.is_empty() || password.is_empty() || name.is_empty() {
            return Err(AppError::Validation(
                "Email, password, and name are required".into(),
            ));
        }

        // Hash the password using bcrypt with cost factor 12
        // (higher cost = slower to crack, slower to verify)
        let password_hash = bcrypt::hash(password, 12)?;

        // Validate email format (basic check)
        if !email.contains('@') || !email.contains('.') {
            return Err(AppError::Validation("Please enter a valid email address".into()));
        }

        // Validate password minimum length
        if password.len() < 6 {
            return Err(AppError::Validation(
                "Password must be at least 6 characters".into(),
            ));
        }

        // Perform INSERT using query! (not query_as! — INSERT doesn't return rows)
        let insert_result = sqlx::query!(
            "INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)",
            email,
            password_hash,
            name,
        )
        .execute(pool)
        .await;

        match insert_result {
            Ok(_) => {
                // Fetch the newly created user to get back the auto-generated ID and timestamps
                let user = sqlx::query_as!(
                    User,
                    "SELECT id, email, password_hash, name, role, created_at, updated_at
                     FROM users WHERE email = ?",
                    email
                )
                .fetch_one(pool)
                .await?;

                // Log the activity
                Self::log_activity(pool, user.id, None, "user.registered", &serde_json::json!({}))
                    .await
                    .ok(); // Non-critical if logging fails

                Ok(user.into())
            }
            Err(sqlx::Error::Database(db_err)) => {
                // MySQL error 1062 (SQLSTATE "23000") = duplicate entry
                // DatabaseError::code() returns the SQLSTATE, not the MySQL error number,
                // so we check the error message for "Duplicate entry" as a reliable indicator.
                if db_err.to_string().contains("Duplicate entry") {
                    Err(AppError::Conflict(
                        "A user with this email already exists".into(),
                    ))
                } else {
                    Err(AppError::Database(db_err.to_string()))
                }
            }
            Err(e) => Err(AppError::Database(e.to_string())),
        }
    }

    /// Find a user by email. Used during login.
    pub async fn find_by_email(pool: &MySqlPool, email: &str) -> Result<User, AppError> {
        let user = sqlx::query_as!(
            User,
            "SELECT id, email, password_hash, name, role, created_at, updated_at
             FROM users WHERE email = ?",
            email
        )
        .fetch_one(pool)
        .await?;

        Ok(user)
    }

    /// Find a user by ID.
    pub async fn find_by_id(pool: &MySqlPool, user_id: i32) -> Result<UserPublic, AppError> {
        let user = sqlx::query_as!(
            User,
            "SELECT id, email, password_hash, name, role, created_at, updated_at
             FROM users WHERE id = ?",
            user_id
        )
        .fetch_one(pool)
        .await?;

        Ok(user.into())
    }

    /// Log an activity entry for the activity feed.
    pub async fn log_activity(
        pool: &MySqlPool,
        user_id: i32,
        project_id: Option<i32>,
        action: &str,
        details: &serde_json::Value,
    ) -> Result<(), AppError> {
        sqlx::query(
            "INSERT INTO activity_log (user_id, project_id, action, details) VALUES (?, ?, ?, ?)",
        )
        .bind(user_id)
        .bind(project_id)
        .bind(action)
        .bind(details)
        .execute(pool)
        .await?;

        Ok(())
    }
}
