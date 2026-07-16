// ============================================
// ProjectHub Backend — IPC Server Entry Point
//
// This is the main async entry point for the Rust backend.
// It:
//   1. Loads environment variables from .env
//   2. Initializes logging
//   3. Connects to MySQL via a connection pool
//   4. Runs database migrations
//   5. Starts a WebSocket server on localhost
//   6. For each connection, spawns an async handler
// ============================================

mod config;
mod database;
mod errors;
mod handlers;
mod ipc;
mod models;

use std::sync::Arc;
use futures_util::{SinkExt, StreamExt};
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use tracing::{error, info, warn};

use crate::config::Config;
use crate::handlers::AppState;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // ---- 1. Load .env file ----
    // dotenvy looks for a .env file in the current directory and loads it
    // into environment variables. This keeps secrets out of the codebase.
    dotenvy::dotenv().ok();

    // ---- 2. Initialize logging ----
    // tracing-subscriber formats structured logs. RUST_LOG env var controls
    // verbosity (e.g., "info", "debug", "projecthub_backend=debug").
    tracing_subscriber::fmt()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    // ---- 3. Load configuration ----
    let config = Config::from_env();
    info!("Starting ProjectHub backend");

    // ---- 4. Connect to MySQL ----
    let pool = database::create_pool(&config.database_url).await?;

    // ---- 5. Run migrations ----
    database::run_migrations(&pool).await?;

    // ---- 6. Create shared application state ----
    // AppState holds the connection pool and session store.
    // It's wrapped in Arc so multiple async tasks can share it.
    let state = Arc::new(AppState::new(pool));

    // ---- 7. Start WebSocket IPC server ----
    let addr = config.ipc_addr();
    let listener = TcpListener::bind(&addr).await?;
    info!("IPC server listening on ws://{}", addr);

    // ---- 8. Accept connections ----
    // Each incoming TCP connection is accepted and upgraded to a WebSocket.
    // A new async task is spawned per connection for concurrency.
    while let Ok((stream, peer_addr)) = listener.accept().await {
        info!("New connection from: {}", peer_addr);

        let state = state.clone();
        tokio::spawn(async move {
            if let Err(e) = handle_connection(stream, state).await {
                error!("Connection error from {}: {}", peer_addr, e);
            }
        });
    }

    Ok(())
}

/// Handle a single WebSocket connection.
///
/// # How IPC works
/// 1. Upgrade TCP stream to WebSocket
/// 2. Loop: read text messages from the frontend
/// 3. Deserialize each message into an IpcRequest
/// 4. Dispatch to the appropriate handler
/// 5. Serialize the response and send it back
///
/// # Async
/// This function is `async` because WebSocket read/write and database
/// queries are all non-blocking I/O operations. Tokio's async runtime
/// lets us handle hundreds of connections with very few OS threads.
async fn handle_connection(
    stream: tokio::net::TcpStream,
    state: Arc<AppState>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Upgrade the TCP stream to a WebSocket connection
    let ws_stream = accept_async(stream).await?;
    let (mut write, mut read) = ws_stream.split();

    // The `while let` loop reads messages one at a time.
    // `StreamExt::next()` returns `None` when the connection closes.
    while let Some(msg) = read.next().await {
        let msg = match msg {
            Ok(m) => m,
            Err(e) => {
                warn!("WebSocket read error: {}", e);
                break;
            }
        };

        // We only handle text messages. Binary messages are ignored.
        if let Ok(text) = msg.to_text() {
            // Parse the JSON into an IpcRequest
            let request: ipc::IpcRequest = match serde_json::from_str(text) {
                Ok(req) => req,
                Err(e) => {
                    let error_response = ipc::IpcResponse::error(
                        "unknown",
                        &errors::AppError::Validation(format!("Invalid JSON: {}", e)),
                    );
                    let json = serde_json::to_string(&error_response)?;
                    // Ignore send errors — the connection may have closed
                    let _ = write.send(json.into()).await;
                    continue;
                }
            };

            // Dispatch the request to the appropriate handler
            let response = handlers::dispatch(&state, request).await;

            // Serialize and send the response
            let json = serde_json::to_string(&response)?;
            if let Err(e) = write.send(json.into()).await {
                warn!("Failed to send response: {}", e);
                break;
            }
        }
    }

    info!("Connection closed");
    Ok(())
}
