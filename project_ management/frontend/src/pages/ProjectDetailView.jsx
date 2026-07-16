import React, { useState, useEffect, useCallback } from 'react';
import NewTaskModal from '../components/NewTaskModal';

const STATUS_OPTIONS = ['active', 'review', 'done'];
const TASK_STATUS_OPTIONS = ['todo', 'in_progress', 'review', 'done'];

export default function ProjectDetailView({ ipc, token, wsConnected, projectId, onBack, onUpdate }) {
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit mode state
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editColor, setEditColor] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // New task modal
  const [showNewTask, setShowNewTask] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!wsConnected || !token) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ipc.getProject(projectId);
      setProject(data.project);
      setTasks(data.tasks || []);
      // Init edit fields
      setEditName(data.project.name);
      setEditDescription(data.project.description || '');
      setEditStatus(data.project.status);
      setEditColor(data.project.color);
      setEditDueDate(data.project.due_date || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [wsConnected, token, ipc, projectId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleSave = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      const updated = await ipc.updateProject(projectId, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
        color: editColor,
        due_date: editDueDate || null,
      });
      setProject(updated);
      setEditing(false);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await ipc.deleteProject(projectId);
      onBack?.();
      onUpdate?.();
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      await ipc.updateTask(taskId, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to update task status:', err);
    }
  };

  const handleTaskDelete = async (taskId) => {
    try {
      await ipc.deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      fetchProject(); // Refresh for updated counts
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleTaskCreated = (task) => {
    setTasks((prev) => [task, ...prev]);
    fetchProject(); // Refresh for updated counts
  };

  const PRESET_COLORS = [
    '#ff5a1f', '#0891b2', '#7c3aed', '#059669',
    '#b45309', '#db2777', '#0284c7', '#1f4d3a',
  ];

  if (loading) {
    return (
      <section className="dashboard-content">
        <div className="greeting-section">
          <div className="greeting-text">
            <h1 className="greeting-heading" style={{ fontSize: '1.5rem' }}>Loading project…</h1>
          </div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="dashboard-content">
        <div className="connection-banner error" style={{ position: 'static', borderRadius: 8, marginBottom: 16 }}>
          {error}
        </div>
        <button className="btn-ghost border-line bg-white" onClick={onBack}>← Back to projects</button>
      </section>
    );
  }

  if (!project) return null;

  const doneCount = tasks.filter((t) => t.status === 'done').length;
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const statusLabel = project.status === 'active' ? 'In progress'
    : project.status === 'review' ? 'In review'
    : 'Done';

  return (
    <section className="dashboard-content">
      {/* Back link */}
      <button
        className="btn-ghost"
        onClick={onBack}
        style={{ marginBottom: 16, padding: '4px 8px' }}
      >
        ← Back to projects
      </button>

      {/* Project header area */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        {!editing ? (
          <>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span
                    style={{
                      width: 12, height: 12, borderRadius: '50%',
                      background: project.color || 'var(--accent)', flexShrink: 0,
                    }}
                  />
                  <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                    {project.name}
                  </h1>
                  <span className={`chip ${
                    project.status === 'active' ? 'chip-info' :
                    project.status === 'review' ? 'chip-warning' : 'chip-success'
                  }`} style={{ marginLeft: 8 }}>
                    {statusLabel}
                  </span>
                </div>
                <p style={{ color: 'var(--ink-2)', fontSize: '0.875rem', lineHeight: 1.6 }}>
                  {project.description || 'No description'}
                </p>
                <div style={{ display: 'flex', gap: 24, marginTop: 12, fontSize: '0.8125rem', color: 'var(--ink-3)' }}>
                  <span>{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
                  {project.due_date && (
                    <span>Due {new Date(project.due_date).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', year: 'numeric'
                    })}</span>
                  )}
                  <span>{progress}% complete</span>
                </div>
                {/* Progress bar */}
                <div className="progress-track" style={{ marginTop: 12, maxWidth: 400 }}>
                  <div className="progress-bar" style={{
                    width: `${progress}%`,
                    background: progress > 60
                      ? 'linear-gradient(90deg, #1f4d3a, #10b981)'
                      : progress > 30
                      ? 'linear-gradient(90deg, #ff5a1f, #fbbf24)'
                      : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                  }} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button className="btn-ghost border-line bg-white" onClick={() => setEditing(true)}>
                  Edit project
                </button>
                {!confirmDelete ? (
                  <button className="btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => setConfirmDelete(true)}>
                    Delete
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--danger)' }}>Confirm?</span>
                    <button className="btn-ghost" style={{ color: 'var(--danger)', fontWeight: 600 }} onClick={handleDelete} disabled={deleting}>
                      {deleting ? '…' : 'Yes, delete'}
                    </button>
                    <button className="btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Edit mode */
          <div style={{ maxWidth: 480 }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 16 }}>Edit project</h2>
            {error && <div className="auth-error" style={{ marginBottom: 12 }}>{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="auth-field">
                <label>Project name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>
              <div className="auth-field">
                <label>Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  style={{
                    fontFamily: 'inherit', padding: '10px 12px',
                    border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
                    fontSize: '13px', resize: 'vertical', width: '100%',
                  }}
                />
              </div>
              <div className="auth-field">
                <label>Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  style={{
                    fontFamily: 'inherit', padding: '10px 12px',
                    border: '1px solid var(--line)', borderRadius: 'var(--radius-md)',
                    fontSize: '13px', width: '100%',
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="auth-field">
                <label>Color</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c} type="button" onClick={() => setEditColor(c)}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c,
                        border: editColor === c ? '3px solid var(--ink)' : '3px solid transparent',
                        cursor: 'pointer', transform: editColor === c ? 'scale(1.15)' : 'scale(1)',
                        transition: 'transform 150ms ease',
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="auth-field">
                <label>Due date</label>
                <input type="date" value={editDueDate} onChange={(e) => setEditDueDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                <button className="btn-ghost border-line bg-white" onClick={() => setEditing(false)} disabled={saving}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tasks section */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Tasks</h2>
            <p style={{ color: 'var(--ink-2)', fontSize: '0.8125rem', marginTop: 2 }}>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''} · {doneCount} done
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowNewTask(true)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New task
          </button>
        </div>

        {showNewTask && (
          <NewTaskModal
            ipc={ipc}
            projectId={projectId}
            onClose={() => setShowNewTask(false)}
            onCreated={handleTaskCreated}
          />
        )}

        {tasks.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: 'var(--ink-3)' }}>
            <p>No tasks yet. Create the first task to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TASK_STATUS_OPTIONS.map((statusGroup) => {
              const groupTasks = tasks.filter((t) => t.status === statusGroup);
              if (groupTasks.length === 0) return null;
              return (
                <div key={statusGroup}>
                  <div style={{
                    fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                    letterSpacing: '0.08em', color: 'var(--ink-3)', marginBottom: 8, marginTop: 8,
                  }}>
                    {statusGroup === 'todo' ? 'To do' :
                     statusGroup === 'in_progress' ? 'In progress' :
                     statusGroup === 'review' ? 'In review' : 'Done'}
                  </div>
                  {groupTasks.map((task) => {
                    const priorityColors = {
                      urgent: { bg: '#fef2f2', dot: '#dc2626' },
                      high: { bg: '#fffbeb', dot: '#f59e0b' },
                      medium: { bg: '#f0f9ff', dot: '#0891b2' },
                      low: { bg: '#f9fafb', dot: '#6b7280' },
                    };
                    const pc = priorityColors[task.priority] || priorityColors.medium;
                    return (
                      <div
                        key={task.id}
                        className="row-hover"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12,
                          padding: '10px 12px', borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--line)', marginBottom: 4,
                        }}
                      >
                        {/* Status selector */}
                        <select
                          value={task.status}
                          onChange={(e) => handleTaskStatusChange(task.id, e.target.value)}
                          style={{
                            border: 'none', background: 'transparent',
                            fontSize: '11px', color: 'var(--ink-3)',
                            cursor: 'pointer', fontFamily: 'inherit',
                            padding: '2px 4px', borderRadius: 4,
                          }}
                        >
                          {TASK_STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{s.replace('_', ' ')}</option>
                          ))}
                        </select>

                        {/* Priority dot */}
                        <span style={{
                          width: 8, height: 8, borderRadius: '50%',
                          background: pc.dot, flexShrink: 0,
                        }} />

                        {/* Title */}
                        <span style={{ flex: 1, fontSize: '0.875rem', fontWeight: 500 }}>
                          {task.title}
                        </span>

                        {/* Due date */}
                        {task.due_date && (
                          <span style={{
                            fontSize: '0.75rem', color: 'var(--ink-3)', whiteSpace: 'nowrap',
                          }}>
                            {new Date(task.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        )}

                        {/* Priority label */}
                        <span className="chip" style={{
                          fontSize: '10px', padding: '2px 8px',
                          background: pc.bg, borderColor: pc.dot,
                          color: pc.dot,
                        }}>
                          {task.priority}
                        </span>

                        {/* Delete */}
                        <button
                          onClick={() => handleTaskDelete(task.id)}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            color: 'var(--ink-3)', fontSize: '14px', padding: '2px 6px',
                            borderRadius: 4,
                          }}
                          title="Delete task"
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
