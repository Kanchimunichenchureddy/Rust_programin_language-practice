import React, { useState } from 'react';

/**
 * NewProjectModal — A modal form for creating a new project.
 *
 * Props:
 *   ipc: IPC service instance
 *   onClose: Callback when modal closes
 *   onCreated: Callback with the newly created project
 *   onNavigate: Callback to navigate to projects view
 */
export default function NewProjectModal({ ipc, onClose, onCreated, onNavigate }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#ff5a1f');
  const [dueDate, setDueDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const PRESET_COLORS = [
    '#ff5a1f', '#0891b2', '#7c3aed', '#059669',
    '#b45309', '#db2777', '#0284c7', '#1f4d3a',
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        description: description.trim() || null,
        color,
        due_date: dueDate || null,
      };
      const project = await ipc.createProject(data);
      onCreated?.(project);
      onNavigate?.('projects');
      onClose?.();
    } catch (err) {
      setError(err.message || 'Failed to create project');
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
        {/* Header */}
        <div className="auth-logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ff5a1f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20 L12 4 L20 20 Z" />
          </svg>
          <span>New project</span>
        </div>

        <h2 className="auth-title">Create a new project</h2>
        <p className="auth-subtitle">Set up a workspace to organize your tasks.</p>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="np-name">Project name *</label>
            <input
              id="np-name"
              type="text"
              placeholder="e.g., Mobile App Redesign"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="auth-field">
            <label htmlFor="np-desc">Description</label>
            <textarea
              id="np-desc"
              placeholder="Brief overview of the project..."
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

          {/* Color picker */}
          <div className="auth-field">
            <label>Project color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: c,
                    border: color === c ? '3px solid var(--ink)' : '3px solid transparent',
                    cursor: 'pointer',
                    transition: 'transform 150ms ease, border-color 150ms ease',
                    transform: color === c ? 'scale(1.15)' : 'scale(1)',
                  }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className="auth-field">
            <label htmlFor="np-due">Due date</label>
            <input
              id="np-due"
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
              {loading ? 'Creating…' : 'Create project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
