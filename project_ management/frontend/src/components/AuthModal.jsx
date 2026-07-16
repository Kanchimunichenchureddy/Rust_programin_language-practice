import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './AuthModal.css';

/**
 * AuthModal — A centered modal with login and register tabs.
 *
 * Shows when the user is not authenticated.
 * Handles:
 * - Tab switching (Login / Register)
 * - Form validation
 * - Loading state during submission
 * - Error display
 */
export default function AuthModal() {
  const { login, register, isAuthenticated } = useAuth();

  // Tab state
  const [mode, setMode] = useState('login');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Don't render if already authenticated
  if (isAuthenticated) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Basic validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    if (mode === 'register' && !name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setError(null);
  };

  return (
    <div className="auth-overlay">
      <div className="auth-modal card">
        {/* Logo */}
        <div className="auth-logo">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ff5a1f" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20 L12 4 L20 20 Z" />
          </svg>
          <span>ProjectHub</span>
        </div>

        <h2 className="auth-title">
          {mode === 'login' ? 'Welcome back' : 'Create your account'}
        </h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to access your workspace.'
            : 'Start managing your projects with ease.'}
        </p>

        {/* Error */}
        {error && <div className="auth-error">{error}</div>}

        {/* Tab switcher */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign in
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="auth-field">
              <label htmlFor="auth-name">Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoFocus={mode === 'login'}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            className="auth-submit btn-primary"
            disabled={loading}
          >
            {loading ? (
              <span className="auth-spinner" />
            ) : mode === 'login' ? (
              'Sign in'
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <p className="auth-footer">
          {mode === 'login' ? (
            <>
              Don't have an account?{' '}
              <button className="auth-link" onClick={() => switchMode('register')}>
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button className="auth-link" onClick={() => switchMode('login')}>
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
