use std::fmt;

/// Unified error type for the entire backend.
///
/// # Why we need this
/// Different parts of the app produce different errors:
/// - SQLx returns `sqlx::Error`
/// - bcrypt returns `bcrypt::Error`
/// - Our own validation logic needs custom errors
///
/// `AppError` wraps them all into one type so the IPC handler can
/// always return the same JSON error shape to the frontend.
#[derive(Debug)]
pub enum AppError {
    /// Database query / connection errors
    Database(String),

    /// Authentication failures (wrong password, not logged in)
    Auth(String),

    /// Validation errors (missing fields, bad format)
    Validation(String),

    /// Resource not found
    NotFound(String),

    /// Conflict (e.g., duplicate email)
    Conflict(String),

    /// Internal unexpected errors
    Internal(String),
}

impl AppError {
    /// Machine-readable error code for the frontend to switch on.
    pub fn code(&self) -> &'static str {
        match self {
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::Auth(_) => "AUTH_ERROR",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::Conflict(_) => "CONFLICT",
            AppError::Internal(_) => "INTERNAL_ERROR",
        }
    }

    /// Human-readable message for the frontend to display.
    pub fn message(&self) -> &str {
        match self {
            AppError::Database(msg) => msg,
            AppError::Auth(msg) => msg,
            AppError::Validation(msg) => msg,
            AppError::NotFound(msg) => msg,
            AppError::Conflict(msg) => msg,
            AppError::Internal(msg) => msg,
        }
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "[{}] {}", self.code(), self.message())
    }
}

// Convert SQLx errors into our unified type automatically
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        match &err {
            sqlx::Error::RowNotFound => AppError::NotFound("Resource not found".into()),
            _ => AppError::Database(err.to_string()),
        }
    }
}

// Convert bcrypt errors
impl From<bcrypt::BcryptError> for AppError {
    fn from(err: bcrypt::BcryptError) -> Self {
        AppError::Internal(err.to_string())
    }
}
