import React from 'react';
import './Sidebar.css';

/**
 * Sidebar — Main navigation for ProjectHub.
 *
 * Now accepts `user`, `onLogout`, and `projectCount` props
 * so the sidebar shows real data from the backend instead of hardcoded values.
 */
const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'projects',
    label: 'Projects',
    icon: (
      <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      </svg>
    ),
  },
  {
    id: 'team',
    label: 'Team',
    icon: (
      <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="9" cy="8" r="3.5" />
        <path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5" />
        <circle cx="17" cy="7" r="2.5" />
        <path d="M15 14.5c2.5-.3 5 1 5.5 4" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    label: 'Calendar',
    icon: (
      <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M3 10h18M8 3v4M16 3v4" />
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: (
      <svg className="sidebar-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path d="M4 19V5M4 19h16M8 15V9M12 15v-4M16 15V7" />
      </svg>
    ),
  },
];

export default function Sidebar({ activeNav, onNavChange, user, onLogout, projectCount }) {
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : '??';

  return (
    <aside className="sidebar">
      {/* Logo / Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5a1f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20 L12 4 L20 20 Z" />
          </svg>
        </div>
        <div className="brand-text">
          <div className="brand-name">ProjectHub</div>
          <div className="brand-version">Project OS · v0.1</div>
        </div>
      </div>

      {/* Workspace Navigation */}
      <div className="sidebar-section-label">Workspace</div>
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            className={`nav-item ${activeNav === item.id ? 'active' : ''}`}
            onClick={() => onNavChange(item.id)}
            aria-current={activeNav === item.id ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.id === 'projects' && projectCount !== undefined && (
              <span className="nav-item-count">{projectCount}</span>
            )}
          </button>
        ))}
      </nav>

      {/* Pinned Projects */}
      <div className="sidebar-section-label">Pinned</div>
      <nav className="sidebar-nav">
        <div className="nav-item" style={{ cursor: 'default', opacity: 0.5 }}>
          <span className="pin-dot" style={{ backgroundColor: 'var(--accent)' }} />
          <span>No pinned projects</span>
        </div>
      </nav>

      {/* User Profile Card */}
      <div className="sidebar-profile-card">
        <div className="profile-row">
          <div className="profile-avatar">{initials}</div>
          <div className="profile-info">
            <div className="profile-name">{user?.name || 'User'}</div>
            <div className="profile-role">{user?.email || 'Not logged in'}</div>
          </div>
        </div>
        <div className="profile-plan">
          <span className="plan-label">Pro workspace</span>
          <button className="plan-upgrade" onClick={onLogout} title="Logout">
            Logout →
          </button>
        </div>
      </div>
    </aside>
  );
}
