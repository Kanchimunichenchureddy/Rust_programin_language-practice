import React from 'react';
import './StatsCards.css';

/**
 * StatsCards — 4-column metrics grid showing key dashboard stats.
 *
 * Accepts `stats` data from the backend via the IPC layer.
 * Shows loading skeletons when data is being fetched.
 */

function StatSkeleton() {
  return (
    <div className="stat-card card stat-loading">
      <div className="stat-header">
        <div className="skeleton-line skeleton-label" />
        <div className="skeleton-box" />
      </div>
      <div className="skeleton-line skeleton-value" />
      <div className="skeleton-line skeleton-subtitle" />
    </div>
  );
}

function StatCard({ label, value, suffix, change, progress, colors, subtitle, icon }) {
  return (
    <div className="stat-card card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        <div className="stat-icon-box">{icon}</div>
      </div>

      <div className="stat-value-row">
        <span className="stat-value">
          {value}
          {suffix && <span className="stat-suffix">{suffix}</span>}
        </span>
      </div>

      {change && (
        <div className="stat-change">
          <span className={change.positive ? 'change-positive' : 'change-negative'}>
            {typeof change === 'string' ? change : change.text}
          </span>
        </div>
      )}

      {progress !== undefined && (
        <div className="stat-progress">
          <div className="progress-track">
            <div
              className="progress-bar"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${colors?.[0] || '#1f4d3a'}, ${colors?.[1] || '#10b981'})`,
              }}
            />
          </div>
        </div>
      )}

      {subtitle && (
        <div className="stat-subtitle">{subtitle}</div>
      )}
    </div>
  );
}

export default function StatsCards({ stats, loading }) {
  // Loading state — show 4 skeletons
  if (loading || !stats) {
    return (
      <div className="stats-grid">
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
        <StatSkeleton />
      </div>
    );
  }

  // Build cards from real data
  const cards = [
    {
      id: 'active-projects',
      label: 'Active projects',
      value: String(stats.total_projects || 0),
      change: { text: 'Across all statuses', positive: true },
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      ),
    },
    {
      id: 'tasks-total',
      label: 'Total tasks',
      value: String(stats.total_tasks || 0),
      change: { text: 'Across all projects', positive: true },
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      ),
    },
    {
      id: 'tasks-done',
      label: 'Tasks completed',
      value: (() => {
        const done = stats.tasks_by_status?.find((s) => s.status === 'done');
        return String(done?.count || 0);
      })(),
      progress: stats.total_tasks > 0
        ? Math.round(
            ((stats.tasks_by_status?.find((s) => s.status === 'done')?.count || 0) /
              stats.total_tasks) *
              100
          )
        : 0,
      colors: ['#1f4d3a', '#10b981'],
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      ),
    },
    {
      id: 'projects-active',
      label: 'In progress',
      value: String(stats.projects_by_status?.find((s) => s.status === 'active')?.count || 0),
      subtitle: 'Projects currently active',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8Z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((card) => (
        <StatCard key={card.id} {...card} />
      ))}
    </div>
  );
}
