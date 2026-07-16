import React, { useState, useEffect, useCallback } from 'react';

/**
 * TeamView — Real team management page with member listing,
 * invite form, and team statistics.
 */
export default function TeamView({ ipc, token, wsConnected, user }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [teamStats, setTeamStats] = useState(null);

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteProjectId, setInviteProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState(null);
  const [showInvite, setShowInvite] = useState(false);

  const fetchTeam = useCallback(async () => {
    if (!wsConnected || !token) return;
    setLoading(true);
    setError(null);
    try {
      const [membersData, statsData, projectsData] = await Promise.all([
        ipc.listMembers(),
        ipc.getTeamStats(),
        ipc.listProjects(),
      ]);
      setMembers(membersData || []);
      setTeamStats(statsData);
      setProjects(projectsData || []);
    } catch (err) {
      console.error('Failed to fetch team data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wsConnected, token, ipc]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !inviteProjectId) return;

    setInviting(true);
    setInviteResult(null);
    try {
      const result = await ipc.inviteMember(Number(inviteProjectId), inviteEmail.trim());
      setInviteResult({ type: 'success', message: result.message });
      setInviteEmail('');
      // Refresh team data
      fetchTeam();
    } catch (err) {
      setInviteResult({ type: 'error', message: err.message || 'Failed to invite member' });
    } finally {
      setInviting(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!confirm('Remove this member from all shared projects?')) return;
    try {
      // Remove from first project (since UI only shows by member, remove from first shared)
      if (projects.length > 0) {
        await ipc.removeMember(projects[0].id, memberId);
        fetchTeam();
      }
    } catch (err) {
      console.error('Failed to remove member:', err);
    }
  };

  const initials = (name) =>
    name?.split(' ').map((n) => n[0]).join('').toUpperCase().substring(0, 2) || '??';

  const avatarColors = ['#1f4d3a', '#0891b2', '#7c3aed', '#b45309', '#db2777', '#059669', '#0284c7', '#dc2626'];

  return (
    <section className="dashboard-content">
      <div className="greeting-section" style={{ marginBottom: 32 }}>
        <div className="greeting-text">
          <h1 className="greeting-heading" style={{ fontSize: '2rem' }}>
            Team
          </h1>
          <p className="greeting-subtitle">
            {loading
              ? 'Loading team data…'
              : error
              ? 'Could not load team data.'
              : `${members.length} team member${members.length !== 1 ? 's' : ''} across your workspace`}
          </p>
        </div>
        <div className="greeting-actions">
          <button className="btn-primary" onClick={() => setShowInvite(!showInvite)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="23" y1="11" x2="17" y2="11" />
              <line x1="20" y1="8" x2="20" y2="14" />
            </svg>
            Invite member
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="connection-banner error" style={{ position: 'static', marginBottom: 20, borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* Invite form */}
      {showInvite && (
        <div className="card" style={{ padding: 20, marginBottom: 24 }}>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: 12 }}>Invite a team member</h3>
          {inviteResult && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, marginBottom: 12, fontSize: '0.8125rem',
              background: inviteResult.type === 'success' ? '#ecfdf5' : '#fef2f2',
              color: inviteResult.type === 'success' ? '#065f46' : '#b91c1c',
              border: `1px solid ${inviteResult.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            }}>
              {inviteResult.message}
            </div>
          )}
          <form onSubmit={handleInvite} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="auth-field" style={{ flex: '1 1 220px', marginBottom: 0 }}>
              <label htmlFor="invite-email">Email address</label>
              <input
                id="invite-email"
                type="email"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
              />
            </div>
            <div className="auth-field" style={{ flex: '1 1 180px', marginBottom: 0 }}>
              <label htmlFor="invite-project">Add to project</label>
              <select
                id="invite-project"
                value={inviteProjectId}
                onChange={(e) => setInviteProjectId(e.target.value)}
                disabled={inviting || projects.length === 0}
                style={{
                  fontFamily: 'inherit', padding: '10px 12px',
                  border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
                  fontSize: '13px', width: '100%',
                }}
              >
                <option value="">Select project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={inviting || !inviteEmail || !inviteProjectId}>
              {inviting ? 'Sending…' : 'Send invite'}
            </button>
          </form>
        </div>
      )}

      {/* Team stats row */}
      {teamStats && !loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginBottom: 4 }}>Team members</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{teamStats.total_members || 1}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginBottom: 4 }}>Projects owned</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{teamStats.owned_projects || 0}</div>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-3)', marginBottom: 4 }}>Collaborators</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.03em' }}>{teamStats.team_members || 0}</div>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="card" style={{ padding: 32 }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0' }}>
              <div className="skeleton-line skeleton-avatar" style={{ width: 36, height: 36, borderRadius: '50%' }} />
              <div style={{ flex: 1 }}>
                <div className="skeleton-line" style={{ width: 140, height: 12 }} />
                <div className="skeleton-line" style={{ width: 180, height: 10 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member list */}
      {!loading && members.length === 0 && (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--ink-3)" strokeWidth="1.5" style={{ marginBottom: 16 }}>
            <circle cx="9" cy="8" r="3.5" />
            <path d="M2.5 20c.5-3.5 3-5.5 6.5-5.5s6 2 6.5 5.5" />
          </svg>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 8 }}>No team members yet</h3>
          <p style={{ color: 'var(--ink-2)', fontSize: '0.875rem' }}>
            Invite colleagues to collaborate on your projects.
          </p>
        </div>
      )}

      {!loading && members.length > 0 && (
        <div className="card">
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600 }}>All members</h3>
          </div>
          {members.map((member, idx) => (
            <div
              key={member.id}
              className="row-hover"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 20px',
                borderBottom: idx < members.length - 1 ? '1px solid var(--line)' : 'none',
              }}
            >
              <div
                className="avatar"
                style={{
                  background: avatarColors[member.id % avatarColors.length],
                  width: 36, height: 36, fontSize: 12,
                }}
              >
                {initials(member.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{member.name}</div>
                <div style={{ color: 'var(--ink-3)', fontSize: '0.8125rem' }}>{member.email}</div>
              </div>
              <span className="chip" style={{ fontSize: '10px', textTransform: 'capitalize' }}>
                {member.role || 'member'}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
