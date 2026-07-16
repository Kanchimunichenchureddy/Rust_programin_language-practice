import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

/**
 * AuthContext — Manages user authentication state across the app.
 *
 * IMPORTANT: `ipc` is passed as a prop from the parent (App.jsx) so the IPC
 * service exists before any children mount. This avoids the chicken-and-egg
 * problem where the auth context needs IPC but IPC depends on the WebSocket
 * inside a child component.
 *
 * Provides:
 * - user: The currently logged-in user (null if not logged in)
 * - token: The auth token (null if not logged in)
 * - login(email, password): Login and store token + user
 * - register(email, password, name): Register, then login
 * - logout(): Clear auth state
 * - isAuthenticated: Boolean helper
 */

const AuthContext = createContext(null);

export function AuthProvider({ children, ipc, token: externalToken, onTokenChange, wsConnected }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  // On mount (or when token/connection changes), verify the stored token
  useEffect(() => {
    if (!externalToken || !ipc || !wsConnected) {
      // Don't try to authenticate until WebSocket is connected
      if (!wsConnected && externalToken) {
        setUser(null);
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    ipc
      .me()
      .then((userData) => {
        setUser(userData);
        setInitError(null);
      })
      .catch((err) => {
        // Token is invalid (e.g., expired, server restarted) — clear it
        localStorage.removeItem('projecthub_token');
        onTokenChange(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [externalToken, ipc, onTokenChange, wsConnected]);

  /** Login: call backend, store token + user */
  const login = useCallback(
    async (email, password) => {
      if (!ipc) throw new Error('Not connected to backend');

      const result = await ipc.login(email, password);
      const { token: newToken, user: userData } = result;

      localStorage.setItem('projecthub_token', newToken);
      onTokenChange(newToken);
      setUser(userData);

      return userData;
    },
    [ipc, onTokenChange]
  );

  /** Register: create account, then login with the same credentials */
  const register = useCallback(
    async (email, password, name) => {
      if (!ipc) throw new Error('Not connected to backend');

      await ipc.register(email, password, name);
      // Auto-login after registration
      return login(email, password);
    },
    [ipc, login]
  );

  /** Logout: clear token on backend and locally */
  const logout = useCallback(async () => {
    if (ipc && externalToken) {
      try {
        await ipc.logout();
      } catch {
        // Even if logout fails on backend, clear locally
      }
    }

    localStorage.removeItem('projecthub_token');
    onTokenChange(null);
    setUser(null);
  }, [ipc, externalToken, onTokenChange]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token: externalToken,
        login,
        register,
        logout,
        loading,
        initError,
        isAuthenticated: !!externalToken && !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/** Hook to access auth context. Must be used within AuthProvider. */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
