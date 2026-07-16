import React from 'react';
import './UpcomingDeadlines.css';

/**
 * UpcomingDeadlines — List of upcoming events for the next 7 days.
 *
 * Features:
 * - Date display with month/day/weekday
 * - Event title, time, and attendees (or details)
 * - Accent highlight for urgent deadlines
 * - "Open calendar" button at bottom
 */

const DEADLINES = [
  {
    id: 1,
    month: 'Nov',
    day: '14',
    weekday: 'Thu',
    title: 'Sprint 23 review',
    time: '10:00 AM · 8 attendees',
    urgent: false,
    attendees: [
      { initials: 'EM', color: '#1f4d3a' },
      { initials: 'TP', color: '#0891b2' },
      { initials: 'RS', color: '#7c3aed' },
    ],
  },
  {
    id: 2,
    month: 'Nov',
    day: '15',
    weekday: 'Fri',
    title: 'Q4 strategy sign-off',
    time: 'Hard deadline · Legal review pending',
    urgent: true,
  },
  {
    id: 3,
    month: 'Nov',
    day: '18',
    weekday: 'Mon',
    title: 'Mobile v3 → App Store',
    time: 'Submission window opens 9 AM',
    urgent: false,
  },
  {
    id: 4,
    month: 'Nov',
    day: '22',
    weekday: 'Fri',
    title: 'Atlas v2 stakeholder demo',
    time: 'Exec team · Boardroom 4',
    urgent: false,
  },
];

export default function UpcomingDeadlines() {
  return (
    <div className="deadlines-card card">
      <div className="deadlines-header">
        <h2 className="deadlines-title">Upcoming</h2>
        <p className="deadlines-subtitle">Next 7 days</p>
      </div>

      <ul className="deadlines-list">
        {DEADLINES.map((event) => (
          <li key={event.id} className="deadline-item">
            {/* Date block */}
            <div className="deadline-date">
              <div className={`deadline-month ${event.urgent ? 'urgent-text' : ''}`}>
                {event.month}
              </div>
              <div className={`deadline-day ${event.urgent ? 'urgent-text' : ''}`}>
                {event.day}
              </div>
              <div className="deadline-weekday">{event.weekday}</div>
            </div>

            {/* Event details */}
            <div
              className={`deadline-details ${event.urgent ? 'deadline-urgent-border' : ''}`}
            >
              <div className="deadline-event-title">{event.title}</div>
              <div className="deadline-event-time">{event.time}</div>
              {event.attendees && (
                <div className="avatar-stack deadline-attendees">
                  {event.attendees.map((attendee, idx) => (
                    <div
                      key={idx}
                      className="avatar"
                      style={{
                        background: attendee.color,
                        width: 24,
                        height: 24,
                        fontSize: 9,
                      }}
                    >
                      {attendee.initials}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <button className="btn-ghost border-line bg-white calendar-btn">
        Open calendar
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12h14M13 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}
