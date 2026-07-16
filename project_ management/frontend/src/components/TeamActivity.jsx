import React from 'react';
import './TeamActivity.css';

/**
 * TeamActivity — Live activity timeline showing team member updates.
 *
 * Accepts `activities` data and `loading` state as props.
 * Falls back to a simple loading state when data is being fetched.
 * Shows an empty state when there's no activity yet.
 */

function ActivitySkeleton() {
  return (
    <li className="timeline-item">
      <span className="timeline-dot skeleton-dot" />
      <div className="timeline-content">
        <div className="timeline-avatar-row">
          <div className="skeleton-line skeleton-avatar" />
          <div className="timeline-text" style={{ flex: 1 }}>
            <div className="skeleton-line skeleton-action" />
            <div className="skeleton-line skeleton-context" />
          </div>
        </div>
      </div>
    </li>
  );
}

export default function TeamActivity({ activities = [], loading }) {
  return (
    <div className="activity-card card">
      <div className="activity-header">
        <div>
          <h2 className="activity-title">Team activity</h2>
          <p className="activity-subtitle">
            {loading ? 'Loading…' : 'Updates from your workspace'}
          </p>
        </div>
        <div className="live-indicator">
          <span className={`live-dot ${activities.length > 0 ? 'pulse-dot' : ''}`} />
          {activities.length > 0 ? 'Live' : 'No activity'}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <ol className="timeline">
          <ActivitySkeleton />
          <ActivitySkeleton />
          <ActivitySkeleton />
        </ol>
      )}

      {/* Empty */}
      {!loading && activities.length === 0 && (
        <div className="activity-empty">
          <p>No activity yet. Start by creating a project or task.</p>
        </div>
      )}

      {/* Timeline */}
      {!loading && activities.length > 0 && (
        <ol className="timeline">
          {activities.map((entry) => {
            // Generate avatar color from user_id (deterministic)
            const avatarColors = ['#1f4d3a', '#0891b2', '#7c3aed', '#b45309', '#db2777', '#059669'];
            const colorIdx = entry.user_id % avatarColors.length;

            // Determine dot color based on action type
            const dotColor =
              entry.action === 'task.created'
                ? '#0ea5e9'
                : entry.action === 'task.updated' || entry.action === 'task.deleted'
                ? '#f59e0b'
                : entry.action === 'project.created'
                ? 'var(--accent)'
                : entry.action?.startsWith('user.')
                ? '#10b981'
                : '#7c3aed';

            // Format relative time
            const timeAgo = formatRelativeTime(entry.created_at);

            // Format action text
            const actionText = formatAction(entry.action, entry.details);

            return (
              <li key={entry.id} className="timeline-item">
                <span
                  className="timeline-dot"
                  style={{ backgroundColor: dotColor }}
                />
                <div className="timeline-content">
                  <div className="timeline-avatar-row">
                    <div
                      className="avatar"
                      style={{
                        background: avatarColors[colorIdx],
                        width: 28,
                        height: 28,
                      }}
                    >
                      {getInitials(entry.user_name)}
                    </div>
                    <div className="timeline-text">
                      <p className="timeline-action">
                        <strong>{entry.user_name}</strong> {actionText}
                      </p>
                      <p className="timeline-context">
                        {timeAgo}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/** Get initials from a name string */
function getInitials(name) {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/** Format the action into readable text */
function formatAction(action, details) {
  if (!action) return 'performed an action';

  switch (action) {
    case 'project.created':
      return `created project "${details?.name || 'Untitled'}"`;
    case 'project.updated':
      return `updated "${details?.name || 'project'}"`;
    case 'project.deleted':
      return 'deleted a project';
    case 'task.created':
      return `created task "${details?.title || 'Untitled'}"`;
    case 'task.updated':
      return `updated task "${details?.title || ''}" to ${details?.status || 'unknown'}`;
    case 'task.deleted':
      return `deleted task "${details?.title || ''}"`;
    case 'user.login':
      return 'logged in';
    case 'user.registered':
      return 'joined ProjectHub';
    default:
      return action.replace(/[._]/g, ' ');
  }
}

/** Format ISO date string to relative time */
function formatRelativeTime(dateStr) {
  if (!dateStr) return '';

  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = Math.floor((now - date) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} day ago`;
  return new Date(dateStr).toLocaleDateString();
}
