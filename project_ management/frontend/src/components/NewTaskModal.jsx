import React, { useState } from 'react';

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

export default function NewTaskModal({ ipc, projectId, onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Task title is required');
      return;
    }

    setLoading(true);
    try {
      const data = {
        project_id: projectId,
        title: title.trim(),
        description: description.trim() || null,
        priority,
        due_date: dueDate || null,
      };
      const task = await ipc.createTask(data);
      onCreated?.(task);
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div
        className="auth-modal card"
        style={{ maxWidth: 480 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="auth-logo">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5a1f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <span>New task</span>
        </div>

        <h2 className="auth-title">Create a new task</h2>
        <p className="auth-subtitle">Add a task to the current project.</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="nt-title">Task title *</label>
            <input
              id="nt-title"
              type="text"
              placeholder="e.g., Design login screen"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="nt-desc">Description</label>
            <textarea
              id="nt-desc"
              placeholder="Add details about this task..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={3}
              style={{
                resize: 'vertical',
                fontFamily: 'inherit',
                padding: '10px 12px',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius-md)',
                fontSize: '13px',
                lineHeight: '1.5',
                width: '100%',
              }}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="nt-priority">Priority</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={`chip ${priority === p ? '' : 'btn-ghost'}`}
                  style={{
                    cursor: 'pointer',
                    background: priority === p
                      ? p === 'urgent' ? '#dc2626'
                        : p === 'high' ? '#f59e0b'
                        : p === 'medium' ? '#0891b2'
                        : '#6b7280'
                      : 'transparent',
                    color: priority === p ? '#fff' : 'var(--ink-2)',
                    borderColor: priority === p ? 'transparent' : 'var(--line)',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    padding: '6px 12px',
                    textTransform: 'capitalize',
                  }}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="nt-due">Due date</label>
            <input
              id="nt-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              className="btn-ghost border-line bg-white"
              onClick={onClose}
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {loading ? 'Creating…' : 'Create task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
