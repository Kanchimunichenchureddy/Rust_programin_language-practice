import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import StatsCards from './components/StatsCards';
import WeeklyChart from './components/WeeklyChart';
import ActiveProjects from './components/ActiveProjects';
import TeamActivity from './components/TeamActivity';
import UpcomingDeadlines from './components/UpcomingDeadlines';
import AuthModal from './components/AuthModal';
import NewProjectModal from './components/NewProjectModal';
import useWebSocket from './hooks/useWebSocket';
import { createIpcService } from './services/ipc';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProjectsView from './pages/ProjectsView';
import ProjectDetailView from './pages/ProjectDetailView';
import TeamView from './pages/TeamView';
import CalendarView from './pages/CalendarView';
import ReportsView from './pages/ReportsView';
import './App.css';

/**
 * ProjectHub Dashboard — Main Application
 *
 * Architecture:
 * ┌───────────────────────────────────────────┐
 * │ App (root)                                │
 * │  ├─ useWebSocket (WebSocket connection)    │
 * │  ├─ ipcService (typed IPC commands)        │
 * │  │                                         │
 * │  └─ AuthProvider (receives ipc as prop)    │
 * │      └─ DashboardApp (uses ipc from props) │
 * │          ├─ AuthModal (login/register)      │
 * │          ├─ Sidebar + TopBar                │
 * │          ├─ Content switching by activeNav  │
 * │          └─ NewProjectModal (when triggered)│
 * └───────────────────────────────────────────┘
 */

const IPC_URL = 'ws://127.0.0.1:9001';

/**
 * Root App component.
 *
 * Creates the WebSocket connection and IPC service at the top level,
 * then passes them down to both the AuthProvider and DashboardApp.
 * This avoids the chicken-and-egg problem where AuthProvider needs
 * IPC but IPC depends on components inside AuthProvider.
 */
export default function App() {
  const ws = useWebSocket(IPC_URL);

  // Token is managed here AND synced with AuthContext
  const [storedToken, setStoredToken] = useState(() =>
    localStorage.getItem('projecthub_token')
  );

  // Create the IPC service once the WebSocket is available
  const ipc = useMemo(
    () => createIpcService(ws.send, () => storedToken),
    [ws.send, storedToken]
  );

  return (
    <AuthProvider ipc={ipc} token={storedToken} onTokenChange={setStoredToken} wsConnected={ws.connected}>
      <DashboardApp
        ipc={ipc}
        wsConnected={ws.connected}
        wsConnecting={ws.connecting}
        wsError={ws.error}
      />
    </AuthProvider>
  );
}

/**
 * DashboardApp — The main app content.
 *
 * Receives `ipc` and connection state from App, fetches dashboard data,
 * and renders the full UI with view switching. When not authenticated, shows AuthModal.
 */
function DashboardApp({ ipc, wsConnected, wsConnecting, wsError }) {
  const { user, token, logout, isAuthenticated } = useAuth();

  // ---- Dashboard Data State ----
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ---- Navigation State ----
  const [activeNav, setActiveNav] = useState('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showNewProject, setShowNewProject] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Listen for custom event to open new project modal from other views
  useEffect(() => {
    const handler = () => setShowNewProject(true);
    window.addEventListener('open-new-project', handler);
    return () => window.removeEventListener('open-new-project', handler);
  }, []);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  /** Fetch all dashboard data from the backend */
  const fetchDashboardData = useCallback(async () => {
    if (!wsConnected || !token) return;

    setLoading(true);
    setError(null);

    try {
      const [statsData, projectsData, activityData] = await Promise.all([
        ipc.getDashboardStats(),
        ipc.listProjects(),
        ipc.getActivity(),
      ]);

      setStats(statsData);
      setProjects(projectsData);
      setActivity(activityData);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wsConnected, token, ipc]);

  // Fetch data when connected and authenticated
  useEffect(() => {
    if (wsConnected && token && isAuthenticated) {
      fetchDashboardData();
    }
  }, [wsConnected, token, isAuthenticated, fetchDashboardData]);

  // Re-fetch every 30 seconds for live updates
  useEffect(() => {
    if (!wsConnected || !token || !isAuthenticated) return;
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [wsConnected, token, isAuthenticated, fetchDashboardData]);

  /** Handle project creation from NewProjectModal */
  const handleProjectCreated = useCallback(() => {
    // Refresh dashboard data to include the new project
    fetchDashboardData();
  }, [fetchDashboardData]);

  /** Handle Export button */
  const handleExport = useCallback(async () => {
    if (!wsConnected || !token) return;

    try {
      // Fetch fresh data for export
      const [statsData, projectsData, activityData] = await Promise.all([
        ipc.getDashboardStats(),
        ipc.listProjects(),
        ipc.getActivity(),
      ]);

      // Build export content
      const exportData = {
        exported_at: new Date().toISOString(),
        stats: statsData,
        projects: projectsData,
        activity: activityData,
      };

      // Create and download a JSON file
      const blob = new Blob(
        [JSON.stringify(exportData, null, 2)],
        { type: 'application/json' }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `projecthub-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      setError('Export failed. Please try again.');
    }
  }, [wsConnected, token, ipc]);

  const formatDate = (date) => {
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  /** Handle selecting a project to view details */
  const handleSelectProject = useCallback((projectId) => {
    setSelectedProjectId(projectId);
    setActiveNav('project-detail');
  }, []);

  /** Handle going back from project detail */
  const handleBackFromProject = useCallback(() => {
    setSelectedProjectId(null);
    setActiveNav('projects');
  }, []);

  /** Handle navigation change — clear project selection when switching views */
  const handleNavChange = useCallback((nav) => {
    setActiveNav(nav);
    setSelectedProjectId(null);
  }, []);

  /** Render the active view based on navigation state */
  const renderActiveView = () => {
    switch (activeNav) {
      case 'projects':
        return (
          <ProjectsView
            ipc={ipc}
            token={token}
            wsConnected={wsConnected}
            onSelectProject={handleSelectProject}
          />
        );
      case 'project-detail':
        return selectedProjectId ? (
          <ProjectDetailView
            ipc={ipc}
            token={token}
            wsConnected={wsConnected}
            projectId={selectedProjectId}
            onBack={handleBackFromProject}
            onUpdate={fetchDashboardData}
          />
        ) : null;
      case 'team':
        return (
          <TeamView
            ipc={ipc}
            token={token}
            wsConnected={wsConnected}
            user={user}
          />
        );
      case 'calendar':
        return (
          <CalendarView
            ipc={ipc}
            token={token}
            wsConnected={wsConnected}
          />
        );
      case 'reports':
        return (
          <ReportsView
            ipc={ipc}
            token={token}
            wsConnected={wsConnected}
          />
        );
      case 'dashboard':
      default:
        return (
          <section className="dashboard-content">
            {/* Greeting Section */}
            <div className="greeting-section">
              <div className="greeting-text">
                <div className="greeting-date">{formatDate(currentTime)}</div>
                <h1 className="greeting-heading">
                  {getGreeting()}, <span className="serif italic">{user?.name || 'User'}</span>.
                </h1>
                <p className="greeting-subtitle">
                  {loading
                    ? 'Loading your workspace data…'
                    : error
                    ? 'Could not load data. The server may be unavailable.'
                    : `${stats?.total_projects || 0} projects active. ${stats?.total_tasks || 0} tasks across your workspace.`}
                </p>
              </div>
              <div className="greeting-actions">
                <button
                  className="btn-ghost border-line bg-white"
                  onClick={handleExport}
                >
                  Export
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setShowNewProject(true)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  New project
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <StatsCards stats={stats} loading={loading} />

            {/* Chart + Projects Row */}
            <div className="grid-3col">
              <div className="chart-span-2">
                <WeeklyChart />
              </div>
              <div>
                <ActiveProjects
                  projects={projects}
                  loading={loading}
                />
              </div>
            </div>

            {/* Activity + Deadlines Row */}
            <div className="grid-3col">
              <div className="activity-span-2">
                <TeamActivity
                  activities={activity}
                  loading={loading}
                />
              </div>
              <div>
                <UpcomingDeadlines />
              </div>
            </div>

            {/* Footer */}
            <footer className="dashboard-footer">
              <span>© ProjectHub · Crafted for teams that ship.</span>
              <div className="footer-links">
                <a href="#">Changelog</a>
                <a href="#">Shortcuts</a>
                <a href="#">
                  Status ·{' '}
                  <span className={`${wsConnected ? 'status-ok' : 'status-warn'}`}>
                    {wsConnected ? 'All systems normal' : 'Connecting…'}
                  </span>
                </a>
              </div>
            </footer>
          </section>
        );
    }
  };

  return (
    <div className="app-layout noise-bg">
      {/* Auth Modal — shown when not authenticated */}
      <AuthModal />

      {/* New Project Modal */}
      {showNewProject && (
        <NewProjectModal
          ipc={ipc}
          onClose={() => setShowNewProject(false)}
          onCreated={handleProjectCreated}
          onNavigate={setActiveNav}
        />
      )}

      {/* Connection status banner */}
      {!wsConnected && wsConnecting && (
        <div className="connection-banner connecting">
          Connecting to server…
        </div>
      )}
      {wsError && (
        <div className="connection-banner error">
          Failed to connect to backend. Is the server running?
        </div>
      )}

      <Sidebar
        activeNav={activeNav === 'project-detail' ? 'projects' : activeNav}
        onNavChange={handleNavChange}
        user={user}
        onLogout={logout}
        projectCount={projects.length}
      />

      <main className="main-area">
        <TopBar
          user={user}
          connected={wsConnected}
        />

        {/* Render the view for the active navigation */}
        {renderActiveView()}
      </main>
    </div>
  );
}
