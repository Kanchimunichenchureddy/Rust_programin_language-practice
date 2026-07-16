import React, { useState, useEffect, useCallback } from 'react';

/**
 * ReportsView — Real analytics dashboard showing project and task statistics,
 * status distributions, and completion metrics.
 */
export default function ReportsView({ ipc, token, wsConnected }) {
  const [stats, setStats] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    if (!wsConnected || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [statsData, projectsData] = await Promise.all([
        ipc.getDashboardStats(),
        ipc.listProjects(),
      ]);
      setStats(statsData);
      setProjects(projectsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wsConnected, token, ipc]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Calculate aggregated metrics
  const totalProjects = stats?.total_projects || 0;
  const totalTasks = stats?.total_tasks || 0;

  const projectsByStatus = {};
  (stats?.projects_by_status || []).forEach((s) => {
    projectsByStatus[s.status] = s.count;
  });

  const tasksByStatus = {};
  (stats?.tasks_by_status || []).forEach((s) => {
    tasksByStatus[s.status] = s.count;
  });

  const doneTasks = tasksByStatus['done'] || 0;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const activeProjects = projectsByStatus['active'] || 0;
  const reviewProjects = projectsByStatus['review'] || 0;
  const doneProjects = projectsByStatus['done'] || 0;

  const STAT_CARDS = [
    { label: 'Total projects', value: totalProjects, icon: '📁', color: '#1f4d3a' },
    { label: 'Total tasks', value: totalTasks, icon: '📋', color: '#0891b2' },
    { label: 'Completed tasks', value: doneTasks, icon: '✅', color: '#059669' },
    { label: 'Completion rate', value: `${completionRate}%`, icon: '📊', color: '#7c3aed' },
    { label: 'Active projects', value: activeProjects, icon: '🚀', color: '#ff5a1f' },
    { label: 'In review', value: reviewProjects, icon: '🔍', color: '#b45309' },
  ];

  return (
    <section className="dashboard-content">
      <div className="greeting-section" style={{ marginBottom: 32 }}>
        <div className="greeting-text">
          <h1 className="greeting-heading" style={{ fontSize: '2rem' }}>Reports</h1>
          <p className="greeting-subtitle">
            {loading
              ? 'Generating reports…'
              : error
              ? 'Could not load report data.'
              : `${totalProjects} projects · ${totalTasks} tasks · ${completionRate}% completion`}
          </p>
        </div>
        <div className="greeting-actions">
          <button className="btn-ghost border-line bg-white" onClick={() => fetchReports()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 6 }}>
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="connection-banner error" style={{ position: 'static', marginBottom: 20, borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="card" style={{ padding: 20 }}>
              <div className="skeleton-line" style={{ width: 80, height: 10 }} />
              <div className="skeleton-line" style={{ width: 60, height: 28, marginTop: 8 }} />
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      {!loading && !error && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
            {STAT_CARDS.map((card) => (
              <div key={card.label} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--ink-3)', fontWeight: 500 }}>{card.label}</span>
                  <span style={{ fontSize: '1.25rem' }}>{card.icon}</span>
                </div>
                <div style={{
                  fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em',
                  color: card.color,
                }}>
                  {card.value}
                </div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            {/* Project status distribution */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 16 }}>Projects by status</h3>
              {totalProjects === 0 ? (
                <div style={{ color: 'var(--ink-3)', fontSize: '0.8125rem', textAlign: 'center', padding: 20 }}>
                  No projects yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'Active', count: activeProjects, color: '#ff5a1f' },
                    { label: 'Review', count: reviewProjects, color: '#f59e0b' },
                    { label: 'Done', count: doneProjects, color: '#10b981' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--ink-2)' }}>{item.label}</span>
                        <span style={{ fontWeight: 600 }}>{item.count}</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${totalProjects > 0 ? (item.count / totalProjects) * 100 : 0}%`,
                            background: item.color,
                            transition: 'width 800ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Task status distribution */}
            <div className="card" style={{ padding: 24 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 16 }}>Tasks by status</h3>
              {totalTasks === 0 ? (
                <div style={{ color: 'var(--ink-3)', fontSize: '0.8125rem', textAlign: 'center', padding: 20 }}>
                  No tasks yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { label: 'To do', count: tasksByStatus['todo'] || 0, color: '#6b7280' },
                    { label: 'In progress', count: tasksByStatus['in_progress'] || 0, color: '#0891b2' },
                    { label: 'Review', count: tasksByStatus['review'] || 0, color: '#f59e0b' },
                    { label: 'Done', count: doneTasks, color: '#10b981' },
                  ].map((item) => (
                    <div key={item.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8125rem' }}>
                        <span style={{ color: 'var(--ink-2)' }}>{item.label}</span>
                        <span style={{ fontWeight: 600 }}>{item.count}</span>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${totalTasks > 0 ? (item.count / totalTasks) * 100 : 0}%`,
                            background: item.color,
                            transition: 'width 800ms cubic-bezier(0.2, 0.8, 0.2, 1)',
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Completion Rate */}
          <div className="card" style={{ padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 600 }}>Overall completion</h3>
              <span style={{
                fontSize: '1.5rem', fontWeight: 700,
                color: completionRate > 60 ? '#10b981' : completionRate > 30 ? '#f59e0b' : '#dc2626',
              }}>
                {completionRate}%
              </span>
            </div>
            <div className="progress-track" style={{ height: 12 }}>
              <div
                className="progress-bar"
                style={{
                  width: `${completionRate}%`,
                  background: completionRate > 60
                    ? 'linear-gradient(90deg, #1f4d3a, #10b981)'
                    : completionRate > 30
                    ? 'linear-gradient(90deg, #ff5a1f, #fbbf24)'
                    : 'linear-gradient(90deg, #dc2626, #f87171)',
                  height: 12,
                  transition: 'width 1s cubic-bezier(0.2, 0.8, 0.2, 1)',
                }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: '0.75rem', color: 'var(--ink-3)' }}>
              <span>{doneTasks} tasks completed</span>
              <span>{totalTasks - doneTasks} remaining</span>
            </div>
          </div>

          {/* Project list with stats */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 16 }}>Project breakdown</h3>
            {projects.length === 0 ? (
              <div style={{ color: 'var(--ink-3)', fontSize: '0.8125rem', textAlign: 'center', padding: 20 }}>
                No projects yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {projects.map((project) => {
                  const pDone = project.task_counts?.find((t) => t.status === 'done')?.count || 0;
                  const pTotal = project.total_tasks || 0;
                  const pProgress = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;

                  return (
                    <div key={project.id}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            background: project.color || 'var(--accent)',
                          }} />
                          <span style={{ fontWeight: 500, fontSize: '0.875rem' }}>{project.name}</span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--ink-3)' }}>
                          <span>{pTotal} tasks</span>
                          <span>{pDone} done</span>
                          <span style={{ fontWeight: 600, color: pProgress > 60 ? '#10b981' : pProgress > 30 ? '#f59e0b' : 'var(--ink)' }}>
                            {pProgress}%
                          </span>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div
                          className="progress-bar"
                          style={{
                            width: `${pProgress}%`,
                            background: project.color || 'var(--accent)',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
