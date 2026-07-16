use std::env;

/// Server configuration loaded from environment variables.
///
/// # Why this exists
/// Hardcoding credentials (database URL, ports, etc.) is a security risk and
/// makes the app non-portable. This module centralizes all config so it can
/// be mocked during testing and changed without recompiling.
#[derive(Debug, Clone)]
pub struct Config {
    /// MySQL connection string, e.g. mysql://user:pass@host/db
    pub database_url: String,

    /// IP address the IPC server binds to. 127.0.0.1 = local-only (safe for IPC).
    pub ipc_host: String,

    /// Port the WebSocket IPC server listens on.
    pub ipc_port: u16,
}

impl Config {
    /// Build a Config from environment variables with sensible defaults.
    ///
    /// # Panics
    /// Panics if `DATABASE_URL` is not set — the app cannot start without a database.
    pub fn from_env() -> Self {
        Self {
            database_url: env::var("DATABASE_URL")
                .expect("DATABASE_URL must be set in .env or environment"),

            ipc_host: env::var("IPC_HOST").unwrap_or_else(|_| "127.0.0.1".to_string()),

            ipc_port: env::var("IPC_PORT")
                .unwrap_or_else(|_| "9001".to_string())
                .parse()
                .expect("IPC_PORT must be a valid u16"),
        }
    }

    /// The full address string for the IPC server (e.g., "127.0.0.1:9001").
    pub fn ipc_addr(&self) -> String {
        format!("{}:{}", self.ipc_host, self.ipc_port)
    }
}
