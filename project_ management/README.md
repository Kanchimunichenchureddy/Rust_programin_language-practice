# 📊 ProjectHub — Project Management Dashboard

A full-stack project management dashboard with a **Rust** WebSocket backend and a **React** frontend. Manage projects, tasks, and team activity in real-time.

![Architecture](https://img.shields.io/badge/Architecture-Rust%20%2B%20React-blue)
![Database](https://img.shields.io/badge/Database-MySQL-orange)
![WebSocket](https://img.shields.io/badge/IPC-WebSocket-brightgreen)

---

## ✨ Features

- **Dashboard Analytics** — Stats cards, weekly throughput chart, active project list, team activity timeline
- **Project Management** — Full CRUD for projects with status tracking (active, review, done)
- **Task Management** — Full CRUD for tasks with statuses (todo, in_progress, review, done) and priority levels
- **Authentication** — User registration and login with bcrypt password hashing and session tokens
- **Activity Feed** — Live timeline of user actions across the workspace
- **Responsive Design** — Works on desktop and tablet with a polished, modern UI

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 6, Vanilla CSS with design tokens |
| **Backend** | Rust, Tokio (async runtime), tokio-tungstenite (WebSocket) |
| **Database** | MySQL 8+ with sqlx ORM |
| **Auth** | bcrypt password hashing, UUID session tokens |
| **IPC Protocol** | WebSocket JSON messaging (`req_id`-based request/response) |

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

| Tool | Version | Check Command |
|---|---|---|
| **MySQL** | 8+ | `mysql --version` |
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **Rust** | 1.75+ | `rustc --version` |
| **Cargo** | 1.75+ | `cargo --version` |

---

## 🚀 Quick Start

### 1. Clone & Enter the Project

```bash
cd project_management
```

### 2. Set Up the Database

**Option A: Create a new database**

```bash
mysql -u root -p
```

```sql
CREATE DATABASE projecthub;
EXIT;
```

**Option B: Use an existing database** (skip this step if `projecthub` already exists)

### 3. Configure Environment

The backend reads configuration from `backend/.env`. Create it if it doesn't exist:

```bash
cat > backend/.env << EOF
DATABASE_URL=mysql://root:your_password@127.0.0.1/projecthub
IPC_HOST=127.0.0.1
IPC_PORT=9001
RUST_LOG=info
EOF
```

Replace `your_password` with your MySQL root password.

### 4. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 5. Start the Backend Server

```bash
cd backend
cargo run
```

> The first compilation downloads dependencies and builds the Rust binary. This may take a few minutes.

You should see:

```
INFO  projecthub_backend: IPC server listening on ws://127.0.0.1:9001
```

Keep this terminal running.

### 6. Start the Frontend Dev Server

In a **new terminal**:

```bash
cd frontend
npm run dev
```

This runs the Vite dev server (configured in `vite.config.js`). You should see:

```
VITE v6.4.3  ready in 94 ms
➜  Local:   http://127.0.0.1:5173/
```

> **Note:** The app loads Inter and Instrument Serif fonts from Google Fonts CDN, so an internet connection is required for the correct typography.

### 7. Open the App

Visit **[http://127.0.0.1:5173](http://127.0.0.1:5173)** in your browser.

You'll see the **login/register modal**. Create an account to get started!

### Alternative: Preview the Production Build

A pre-built version of the frontend already exists at `frontend/dist/`. To serve it without the dev server:

```bash
cd frontend
npm run preview
```

> Note: The production build only serves the UI. The backend server is still required for authentication and data.

---

## 🗄️ Database Schema

The app uses 5 tables managed by `backend/migrations/001_initial.sql`:

```mermaid
erDiagram
    users ||--o{ projects : owns
    users ||--o{ activity_log : logs
    projects ||--o{ tasks : contains
    projects ||--o{ project_members : has
    users ||--o{ project_members : "is member of"
    tasks ||--o| users : assigned
```

| Table | Purpose |
|---|---|
| `users` | User accounts with bcrypt-hashed passwords |
| `projects` | Projects with name, description, status, color, due date |
| `tasks` | Tasks with title, status, priority, assignee, due date |
| `project_members` | Many-to-many relationship between users and projects |
| `activity_log` | Timestamped activity entries for the dashboard feed |

---

## 📁 Project Structure

```
project_management/
├── README.md
├── frontend/                    # React + Vite app
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx             # Entry point
│       ├── App.jsx              # Root component with WebSocket setup
│       ├── App.css              # Layout & skeleton styles
│       ├── styles/
│       │   └── design-tokens.css # CSS variables, reset, utilities
│       ├── context/
│       │   └── AuthContext.jsx  # Auth state management
│       ├── hooks/
│       │   └── useWebSocket.js  # WebSocket hook with auto-reconnect
│       ├── services/
│       │   └── ipc.js           # Typed IPC service wrapper
│       └── components/
│           ├── Sidebar.jsx      # Navigation sidebar
│           ├── TopBar.jsx       # Search bar & breadcrumb
│           ├── StatsCards.jsx   # 4-column metrics grid
│           ├── WeeklyChart.jsx  # SVG throughput chart
│           ├── ActiveProjects.jsx # Filterable project list
│           ├── TeamActivity.jsx # Activity timeline
│           ├── UpcomingDeadlines.jsx # Calendar events
│           └── AuthModal.jsx    # Login/register modal
│
└── backend/                     # Rust WebSocket server
    ├── Cargo.toml
    ├── .env                     # Environment configuration
    ├── migrations/
    │   └── 001_initial.sql      # Database schema
    └── src/
        ├── main.rs              # Server entry point
        ├── config.rs            # Environment config
        ├── database/
        │   ├── mod.rs
        │   └── pool.rs          # MySQL connection pool & migrations
        ├── errors/
        │   ├── mod.rs
        │   └── app_error.rs     # Unified error types
        ├── models/
        │   ├── mod.rs
        │   ├── user.rs          # User CRUD + activity logging
        │   ├── project.rs       # Project CRUD
        │   └── task.rs          # Task CRUD + status counts
        ├── handlers/
        │   ├── mod.rs           # Request dispatch & AppState
        │   ├── auth.rs          # Register, login, logout, me
        │   ├── dashboard.rs     # Stats & activity feed
        │   ├── projects.rs      # Project list/get/create/update/delete
        │   └── tasks.rs         # Task list/get/create/update/delete
        └── ipc/
            └── mod.rs           # WebSocket IPC protocol types
```

---

## 🔌 IPC Protocol

Frontend and backend communicate over **WebSocket** at `ws://127.0.0.1:9001` using JSON messages.

### Request Format

```json
{
  "cmd": "auth.login",
  "req_id": "req_1_1234567890",
  "payload": {
    "email": "user@example.com",
    "password": "secret123"
  },
  "token": "optional-auth-token"
}
```

### Success Response

```json
{
  "req_id": "req_1_1234567890",
  "type": "ok",
  "data": { ... }
}
```

### Error Response

```json
{
  "req_id": "req_1_1234567890",
  "type": "error",
  "error": {
    "code": "AUTH_ERROR",
    "message": "Invalid email or password"
  }
}
```

### Available Commands

| Category | Command | Description |
|---|---|---|
| **Auth** | `auth.register` | Create a new account |
| | `auth.login` | Login and get a session token |
| | `auth.logout` | Invalidate the session token |
| | `auth.me` | Get the current user's profile |
| **Dashboard** | `dashboard.stats` | Get aggregate project/task statistics |
| | `dashboard.activity` | Get the recent activity feed |
| **Projects** | `projects.list` | List all user's projects |
| | `projects.get` | Get a project by ID |
| | `projects.create` | Create a new project |
| | `projects.update` | Update an existing project |
| | `projects.delete` | Delete a project |
| **Tasks** | `tasks.list` | List tasks (optionally filtered by project) |
| | `tasks.get` | Get a task by ID |
| | `tasks.create` | Create a new task |
| | `tasks.update` | Update a task |
| | `tasks.delete` | Delete a task |

---

## 🛠️ Development

### Running in Development Mode

```bash
# Terminal 1 — Backend
cd backend && cargo run

# Terminal 2 — Frontend
cd frontend && npm run dev
```

The Vite dev server supports **Hot Module Replacement (HMR)** — changes to React components appear instantly.

The Rust backend auto-reloads only after a manual `cargo run` restart. For automatic recompilation, install [cargo-watch](https://crates.io/crates/cargo-watch):

```bash
cargo install cargo-watch
cd backend && cargo watch -x run
```

### Environment Variables

| Variable | Default | Required | Description |
|---|---|---|---|
| `DATABASE_URL` | — | ✅ | MySQL connection string |
| `IPC_HOST` | `127.0.0.1` | ❌ | WebSocket server bind address |
| `IPC_PORT` | `9001` | ❌ | WebSocket server port |
| `RUST_LOG` | `info` | ❌ | Logging verbosity (debug, info, warn, error) |

### Common Issues

**"Access denied for user"**
→ Check your MySQL credentials in `backend/.env` and ensure MySQL is running.

**"Address already in use"**
→ Another process is using port 9001 or 5173. Stop the other process or change the port in `.env` or `vite.config.js`.

**"Not connected to backend"**
→ Ensure the Rust backend is running before opening the frontend. The frontend will auto-reconnect when the backend starts.

**Fonts not loading correctly**
→ The app loads Inter and Instrument Serif from Google Fonts CDN. An internet connection is needed, or the browser will fall back to system fonts.

---

## 📝 License

This project is for educational purposes.

---

## 🙌 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -am 'Add my feature'`
4. Push: `git push origin feature/my-feature`
5. Open a Pull Request
