import React, { useState } from 'react';
import './ActiveProjects.css';

/**
 * ActiveProjects — Filterable list of projects from the backend.
 *
 * Accepts `projects` data and `loading` state as props.
 * Shows skeleton loaders while data is being fetched.
 * Handles empty state when no projects exist.
 */

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'In progress' },
  { id: 'review', label: 'Review' },
];

function ProjectSkeleton() {
  return (
    <li className="project-row">
      <div className="project-row-header">
        <div className="skeleton-line skeleton-name" />
        <div className="skeleton-line skeleton-chip" />
      </div>
      <div className="skeleton-line skeleton-meta" />
      <div className="progress-track">
        <div className="progress-bar skeleton-progress" style={{ width: '0%' }} />
      </div>
      <div className="project-footer">
        <div className="skeleton-line skeleton-avatars" />
        <div className="skeleton-line skeleton-date" />
      </div>
    </li>
  );
}

export default function ActiveProjects({ projects = [], loading }) {
  const [activeFilter, setActiveFilter] = useState('all');

  const filteredProjects =
    activeFilter === 'all'
      ? projects
      : projects.filter((p) => p.status === activeFilter);

  return (
    <div className="projects-panel card">
      <div className="projects-header">
        <div>
          <h2 className="projects-title">Active projects</h2>
          <p className="projects-subtitle">
            {loading ? 'Loading…' : `${filteredProjects.length} of ${projects.length} shown`}
          </p>
        </div>
        <button className="projects-view-all">View all →</button>
      </div>

      {/* Filter tabs */}
      <div className="projects-filters">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            className={`proj-filter-btn btn-ghost ${activeFilter === filter.id ? 'active' : ''}`}
            onClick={() => setActiveFilter(filter.id)}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading && (
        <ul className="projects-list">
          <ProjectSkeleton />
          <ProjectSkeleton />
          <ProjectSkeleton />
        </ul>
      )}

      {/* Empty state */}
      {!loading && projects.length === 0 && (
        <div className="projects-empty">
          <p>No projects yet. Create your first project to get started.</p>
        </div>
      )}

      {/* Empty filter result */}
      {!loading && projects.length > 0 && filteredProjects.length === 0 && (
        <div className="projects-empty">
          <p>No projects match this filter.</p>
        </div>
      )}

      {/* Project list */}
      {!loading && filteredProjects.length > 0 && (
        <ul className="projects-list">
          {filteredProjects.map((project) => {
            const totalTasks = project.total_tasks || 0;
            const doneCount = project.task_counts?.find((t) => t.status === 'done')?.count || 0;
            const progress = totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0;

            // Map to chip variants
            const chipVariant =
              project.status === 'active'
                ? { label: 'In progress', chipClass: 'chip-info' }
                : project.status === 'review'
                ? { label: 'In review', chipClass: 'chip-warning' }
                : { label: 'Done', chipClass: 'chip-success' };

            return (
              <li key={project.id} className="project-row row-hover">
                <div className="project-row-header">
                  <div className="project-name-row">
                    <span
                      className="project-status-dot"
                      style={{
                        backgroundColor: project.color || 'var(--accent)',
                      }}
                    />
                    <span className="project-name">{project.name}</span>
                  </div>
                  <span className={`chip ${chipVariant.chipClass}`}>
                    {chipVariant.label}
                  </span>
                </div>

                <div className="project-meta">
                  <span className="project-team">
                    {totalTasks} task{totalTasks !== 1 ? 's' : ''} ·{' '}
                    {totalTasks - doneCount} remaining
                  </span>
                  <span className="project-progress-pct">{progress}%</span>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-bar"
                    style={{
                      width: `${progress}%`,
                      background: progress > 60
                        ? 'linear-gradient(90deg, #1f4d3a, #10b981)'
                        : progress > 30
                        ? 'linear-gradient(90deg, #ff5a1f, #fbbf24)'
                        : 'linear-gradient(90deg, #0284c7, #38bdf8)',
                    }}
                  />
                </div>

                <div className="project-footer">
                  <span className="project-team">
                    {project.description
                      ? project.description.substring(0, 40)
                      : 'No description'}
                  </span>
                  <span className="project-due">
                    {project.due_date
                      ? `Due ${new Date(project.due_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}`
                      : 'No due date'}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
