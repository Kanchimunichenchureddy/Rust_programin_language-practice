import React, { useState, useEffect, useCallback } from 'react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * CalendarView — An interactive monthly calendar showing
 * project deadlines and task due dates from the backend.
 */
export default function CalendarView({ ipc, token, wsConnected }) {
  const [events, setEvents] = useState(null);
  const [loading, setLoading] = useState(true);
  const [today] = useState(new Date());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);

  const fetchCalendar = useCallback(async () => {
    if (!wsConnected || !token) return;
    setLoading(true);
    try {
      const data = await ipc.getCalendar();
      setEvents(data);
    } catch (err) {
      console.error('Failed to fetch calendar:', err);
    } finally {
      setLoading(false);
    }
  }, [wsConnected, token, ipc]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthDays = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays = [];
  // Previous month's trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: prevMonthDays - i, other: true });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ day: i, other: false });
  }
  // Next month's leading days
  const remaining = 42 - calendarDays.length;
  for (let i = 1; i <= remaining; i++) {
    calendarDays.push({ day: i, other: true });
  }

  // Find events for a given day
  const getEventsForDay = (day) => {
    if (!events) return [];
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const result = [];

    if (events.projects) {
      events.projects.forEach((p) => {
        if (p.due_date === dateStr) result.push({ ...p, dateStr });
      });
    }
    if (events.tasks) {
      events.tasks.forEach((t) => {
        if (t.due_date === dateStr) result.push({ ...t, dateStr });
      });
    }
    return result;
  };

  const isToday = (day) =>
    !loading && day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();

  const navigateMonth = (delta) => {
    let newMonth = viewMonth + delta;
    let newYear = viewYear;
    if (newMonth < 0) { newMonth = 11; newYear--; }
    if (newMonth > 11) { newMonth = 0; newYear++; }
    setViewMonth(newMonth);
    setViewYear(newYear);
    setSelectedDay(null);
  };

  return (
    <section className="dashboard-content">
      <div className="greeting-section" style={{ marginBottom: 32 }}>
        <div className="greeting-text">
          <h1 className="greeting-heading" style={{ fontSize: '2rem' }}>Calendar</h1>
          <p className="greeting-subtitle">
            {loading
              ? 'Loading deadlines…'
              : events
              ? `${(events.projects?.length || 0) + (events.tasks?.length || 0)} upcoming deadlines`
              : 'View project deadlines and task due dates.'}
          </p>
        </div>
        <div className="greeting-actions">
          <button className="btn-ghost border-line bg-white" onClick={() => {
            setViewMonth(today.getMonth());
            setViewYear(today.getFullYear());
          }}>
            Today
          </button>
          <button className="btn-ghost" onClick={() => navigateMonth(-1)}>←</button>
          <button className="btn-ghost" onClick={() => navigateMonth(1)}>→</button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="card" style={{ padding: 24 }}>
        {/* Month/Year header */}
        <div style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 20, textAlign: 'center' }}>
          {MONTHS[viewMonth]} {viewYear}
        </div>

        {/* Day names */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2, marginBottom: 8,
        }}>
          {DAYS.map((d) => (
            <div key={d} style={{
              textAlign: 'center', fontSize: '11px', fontWeight: 600,
              color: 'var(--ink-3)', padding: '6px 0', textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 2,
        }}>
          {calendarDays.map((cell, idx) => {
            const dayEvents = getEventsForDay(cell.day);
            const todayClass = isToday(cell.day);
            const selected = selectedDay === cell.day && !cell.other;
            const hasOverdue = dayEvents.some((e) => e.is_overdue);
            const isPast = !cell.other && new Date(viewYear, viewMonth, cell.day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

            return (
              <div
                key={idx}
                onClick={() => !cell.other && setSelectedDay(cell.day)}
                style={{
                  minHeight: 90,
                  padding: 6,
                  background: selected ? 'var(--bg-2)' : todayClass ? '#fffbeb' : 'transparent',
                  border: selected ? '2px solid var(--ink)' : todayClass ? '2px solid var(--accent)' : '1px solid var(--line)',
                  borderRadius: 'var(--radius-sm)',
                  cursor: cell.other ? 'default' : 'pointer',
                  opacity: cell.other ? 0.35 : isPast ? 0.6 : 1,
                  transition: 'all 150ms ease',
                  position: 'relative',
                }}
              >
                <div style={{
                  fontSize: '0.8125rem', fontWeight: todayClass || selected ? 700 : 500,
                  color: todayClass ? 'var(--accent)' : selected ? 'var(--ink)' : 'var(--ink-2)',
                  marginBottom: 4,
                }}>
                  {cell.day}
                </div>

                {/* Event dots/items */}
                {dayEvents.slice(0, 3).map((evt, i) => (
                  <div
                    key={i}
                    title={`${evt.type === 'project' ? '📁' : '📋'} ${evt.name || evt.title}`}
                    style={{
                      fontSize: '10px', padding: '1px 4px', marginBottom: 2,
                      borderRadius: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      background: evt.is_overdue ? '#fef2f2' : evt.type === 'project' ? '#f0fdf4' : '#f0f9ff',
                      color: evt.is_overdue ? '#dc2626' : 'var(--ink-2)',
                      border: evt.is_overdue ? '1px solid #fecaca' : '1px solid transparent',
                    }}
                  >
                    {evt.type === 'project' ? '📁 ' : '📋 '}
                    {evt.name || evt.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div style={{ fontSize: '9px', color: 'var(--ink-3)', paddingLeft: 4 }}>
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      {selectedDay && (
        <div className="card" style={{ marginTop: 24, padding: 24 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 4 }}>
            Events for {MONTHS[viewMonth]} {selectedDay}, {viewYear}
          </h3>
          <p style={{ color: 'var(--ink-3)', fontSize: '0.8125rem', marginBottom: 16 }}>
            {isToday(selectedDay) && '(Today)'}
          </p>

          {(() => {
            const dayEvents = getEventsForDay(selectedDay);
            if (dayEvents.length === 0) {
              return (
                <div style={{ color: 'var(--ink-3)', fontSize: '0.875rem', padding: 16, textAlign: 'center' }}>
                  No deadlines or tasks due on this day.
                </div>
              );
            }
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {dayEvents.map((evt, i) => (
                  <div
                    key={i}
                    className="row-hover"
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 14px', borderRadius: 'var(--radius-md)',
                      border: evt.is_overdue ? '1px solid #fecaca' : '1px solid var(--line)',
                      background: evt.is_overdue ? '#fef2f2' : 'transparent',
                    }}
                  >
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: evt.type === 'project'
                        ? (evt.color || 'var(--accent)')
                        : (evt.project_color || 'var(--accent-2)'),
                      flexShrink: 0,
                    }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {evt.name || evt.title}
                      </div>
                      <div style={{ color: 'var(--ink-3)', fontSize: '0.75rem' }}>
                        {evt.type === 'project' ? 'Project deadline' : `Task · ${evt.project_name}`}
                        {evt.is_overdue && ' · Overdue!'}
                      </div>
                    </div>
                    <span className="chip" style={{
                      fontSize: '10px',
                      background: evt.priority === 'urgent' ? '#fef2f2'
                        : evt.priority === 'high' ? '#fffbeb'
                        : evt.status === 'active' ? '#f0fdf4' : '#f0f9ff',
                      borderColor: evt.priority === 'urgent' ? '#dc2626'
                        : evt.priority === 'high' ? '#f59e0b'
                        : 'transparent',
                      color: evt.priority === 'urgent' ? '#dc2626'
                        : evt.priority === 'high' ? '#b45309'
                        : 'var(--ink-3)',
                    }}>
                      {evt.type === 'project' ? evt.status : evt.priority}
                    </span>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </section>
  );
}
