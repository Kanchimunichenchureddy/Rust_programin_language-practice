use sqlx::mysql::MySqlPoolOptions;
use sqlx::MySqlPool;
use tracing::info;

/// Create a MySQL connection pool from the database URL.
///
/// # Why connection pooling
/// Opening a new database connection for every request is slow and wasteful.
/// A pool keeps a reusable set of connections alive, handing them out on demand.
/// This dramatically improves performance under load.
pub async fn create_pool(database_url: &str) -> Result<MySqlPool, sqlx::Error> {
    let pool = MySqlPoolOptions::new()
        .max_connections(10)          // Allow up to 10 concurrent connections
        .min_connections(2)           // Keep at least 2 ready at all times
        .acquire_timeout(std::time::Duration::from_secs(5)) // Fail fast if DB is down
        .connect(database_url)
        .await?;

    info!("Connected to MySQL database");
    Ok(pool)
}

/// Run SQL migration files to set up the database schema.
///
/// # Why not an ORM migration tool?
/// Raw SQL migrations are explicit, version-controlled, and database-portable.
/// They teach you exactly what's happening at the schema level.
pub async fn run_migrations(pool: &MySqlPool) -> Result<(), sqlx::Error> {
    let migration_sql = include_str!("../../migrations/001_initial.sql");

    // Split by semicolons to run each statement individually.
    // SQLx's execute() handles one statement at a time.
    for statement in migration_sql.split(';') {
        let trimmed = statement.trim();
        if trimmed.is_empty() {
            continue;
        }
        sqlx::query(trimmed).execute(pool).await?;
    }

    info!("Database migrations applied successfully");
    Ok(())
}
