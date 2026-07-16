-- ============================================
-- ProjectHub — Initial Database Schema
-- ============================================
-- We use IF NOT EXISTS so migrations are idempotent
-- (safe to run multiple times).

CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name        VARCHAR(255) NOT NULL,
    role        VARCHAR(50) NOT NULL DEFAULT 'member',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email)
);

CREATE TABLE IF NOT EXISTS projects (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    status      ENUM('active', 'review', 'done') NOT NULL DEFAULT 'active',
    owner_id    INT NOT NULL,
    color       VARCHAR(7) NOT NULL DEFAULT '#ff5a1f',
    due_date    DATE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_projects_owner (owner_id),
    INDEX idx_projects_status (status)
);

CREATE TABLE IF NOT EXISTS tasks (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    project_id  INT NOT NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    status      ENUM('todo', 'in_progress', 'review', 'done') NOT NULL DEFAULT 'todo',
    assignee_id INT,
    priority    ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium',
    due_date    DATE,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tasks_project (project_id),
    INDEX idx_tasks_assignee (assignee_id),
    INDEX idx_tasks_status (status)
);

CREATE TABLE IF NOT EXISTS project_members (
    project_id  INT NOT NULL,
    user_id     INT NOT NULL,
    role        ENUM('owner', 'member') NOT NULL DEFAULT 'member',
    PRIMARY KEY (project_id, user_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_log (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    user_id     INT NOT NULL,
    project_id  INT,
    action      VARCHAR(255) NOT NULL,
    details     JSON,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    INDEX idx_activity_user (user_id),
    INDEX idx_activity_created (created_at)
);
