import React, { useState, useEffect, useRef } from 'react';
import './TopBar.css';

/**
 * TopBar — Sticky header with breadcrumb, search, and action icons.
 *
 * Now accepts `user` and `connected` props so it shows real user data
 * and connection state instead of hardcoded values.
 */
export default function TopBar({ user, connected }) {
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef(null);
  const [unreadNotifications] = useState(true);

  // Get user initials
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : '??';

  // Handle ⌘K / Ctrl+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        {/* Connection indicator */}
        <div
          className={`connection-indicator ${connected ? 'connected' : 'disconnected'}`}
          title={connected ? 'Connected to server' : 'Disconnected'}
        />

        {/* Breadcrumb */}
        <nav className="breadcrumb">
          <span>Workspace</span>
          <span className="breadcrumb-sep">/</span>
          <span className="breadcrumb-current">Dashboard</span>
        </nav>

        {/* Search */}
        <div className={`search-container ${searchFocused ? 'focused' : ''}`}>
          <svg
            className="search-icon"
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={searchRef}
            type="text"
            className="search-input"
            placeholder="Search projects, people, tasks…"
            aria-label="Search projects, people, tasks"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          <span className="search-kbd">⌘K</span>
        </div>

        {/* Actions */}
        <div className="topbar-actions">
          {/* Notifications */}
          <button className="icon-btn" title="Notifications" aria-label="View notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z" />
              <path d="M10 21a2 2 0 0 0 4 0" />
            </svg>
            {unreadNotifications && <span className="notification-dot pulse-dot" />}
          </button>

          {/* Settings */}
          <button className="icon-btn" title="Settings" aria-label="Open settings">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
            </svg>
          </button>

          {/* User Avatar */}
          <div className="user-avatar" title={user?.name || 'Profile'}>
            {initials}
          </div>
        </div>
      </div>
    </header>
  );
}
