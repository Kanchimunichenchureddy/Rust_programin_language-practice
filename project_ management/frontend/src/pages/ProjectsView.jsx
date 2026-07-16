import React, { useState, useEffect, useCallback } from 'react';
import ActiveProjects from '../components/ActiveProjects';

/**
 * ProjectsView — Full projects management page.
 *
 * Shows all projects with ability to create, view, and manage them.
 */
export default function ProjectsView({ ipc, token, wsConnected, onSelectProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchProjects = useCallback(async () => {
    if (!wsConnected || !token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ipc.listProjects();
      setProjects(data);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wsConnected, token, ipc]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Refresh every 30s
  useEffect(() => {
    if (!wsConnected || !token) return;
    const interval = setInterval(fetchProjects, 30000);
    return () => clearInterval(interval);
  }, [wsConnected, token, fetchProjects]);

  return (
    <section className="dashboard-content">
      <div className="greeting-section">
        <div className="greeting-text">
          <h1 className="greeting-heading" style={{ fontSize: '2rem' }}>
            Projects
          </h1>
          <p className="greeting-subtitle">
            {loading
              ? 'Loading projects…'
              : error
              ? 'Could not load projects.'
              : `${projects.length} project${projects.length !== 1 ? 's' : ''} in your workspace`}
          </p>
        </div>
        <div className="greeting-actions">
          <button className="btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('open-new-project'))}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New project
          </button>
        </div>
      </div>

      {error && (
        <div className="connection-banner error" style={{ position: 'static', marginBottom: 24, borderRadius: 8 }}>
          {error}
        </div>
      )}

      <ActiveProjects projects={projects} loading={loading} />

      {/* Clickable project list with navigation */}
      {!loading && projects.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>All projects</h3>
          </div>
          {projects.map((project, idx) => (
            <div
              key={project.id}
              onClick={() => onSelectProject?.(project.id)}
              className="row-hover"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px',
                borderBottom: idx < projects.length - 1 ? '1px solid var(--line)' : 'none',
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: project.color || 'var(--accent)', flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{project.name}</div>
                <div style={{ color: 'var(--ink-3)', fontSize: '0.75rem', marginTop: 2 }}>
                  {project.total_tasks || 0} tasks · {project.task_counts?.find(t => t.status === 'done')?.count || 0} done
                </div>
              </div>
              <span className={`chip ${project.status === 'active' ? 'chip-info' : project.status === 'review' ? 'chip-warning' : 'chip-success'}`} style={{ fontSize: '10px' }}>
                {project.status}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--ink-3)' }}>
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
