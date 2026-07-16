use serde::Deserialize;
use serde_json::Value;
use uuid::Uuid;

use crate::errors::AppError;
use crate::handlers::AppState;
use crate::models::User;

/// Payload for register command.
#[derive(Deserialize)]
struct RegisterPayload {
    email: String,
    password: String,
    name: String,
}

/// Payload for login command.
#[derive(Deserialize)]
struct LoginPayload {
    email: String,
    password: String,
}

/// Handle user registration.
///
/// # Flow
/// 1. Validate input fields
/// 2. Create user in database (password is hashed in the model)
/// 3. Return the public user profile
pub async fn handle_register(state: &AppState, payload: Value) -> Result<Value, AppError> {
    let input: RegisterPayload = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid register payload: {}", e))
    })?;

    let user = User::create(&state.pool, &input.email, &input.password, &input.name).await?;

    Ok(serde_json::to_value(user).unwrap())
}

/// Handle user login.
///
/// # Flow
/// 1. Find user by email
/// 2. Verify password against stored bcrypt hash
/// 3. Generate a random session token
/// 4. Store the session (token → user_id)
/// 5. Return token + user info to frontend
///
/// # Why generate a token instead of returning the user ID?
/// The token is a secret that proves authentication. The frontend sends it
/// with every subsequent request. An attacker can't guess user IDs to
/// impersonate someone.
pub async fn handle_login(
    state: &AppState,
    payload: Value,
    _req_id: String,
) -> Result<Value, AppError> {
    let input: LoginPayload = serde_json::from_value(payload).map_err(|e| {
        AppError::Validation(format!("Invalid login payload: {}", e))
    })?;

    // Find user — if not found, return a generic "invalid credentials" error
    // to avoid leaking information about which emails are registered.
    let user = match User::find_by_email(&state.pool, &input.email).await {
        Ok(u) => u,
        Err(_) => {
            return Err(AppError::Auth("Invalid email or password".into()));
        }
    };

    // Verify password against the stored bcrypt hash
    let valid = bcrypt::verify(&input.password, &user.password_hash)?;
    if !valid {
        return Err(AppError::Auth("Invalid email or password".into()));
    }

    // Generate a unique session token using UUID v4 (random)
    let token = Uuid::new_v4().to_string();

    // Store the session in the shared in-memory HashMap.
    // The scoped block ensures the write lock is released quickly.
    {
        let mut sessions = state.sessions.write().await;
        sessions.insert(token.clone(), user.id);
    }

    // Log the login activity (non-critical — ignore errors)
    User::log_activity(
        &state.pool,
        user.id,
        None,
        "user.login",
        &serde_json::json!({}),
    )
    .await
    .ok();

    // Return token + user info (never expose password_hash!)
    let response = serde_json::json!({
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "created_at": user.created_at,
        }
    });

    Ok(response)
}

/// Handle logout — remove the session token.
pub async fn handle_logout(state: &AppState, token: String) -> Result<Value, AppError> {
    let mut sessions = state.sessions.write().await;
    sessions.remove(&token);

    Ok(serde_json::json!({ "message": "Logged out successfully" }))
}

/// Get the currently authenticated user's profile.
pub async fn handle_me(state: &AppState, user_id: i32) -> Result<Value, AppError> {
    let user = User::find_by_id(&state.pool, user_id).await?;
    Ok(serde_json::to_value(user).unwrap())
}
