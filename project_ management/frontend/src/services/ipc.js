/**
 * IPC Service — Typed wrapper around the WebSocket send function.
 *
 * Each method maps to a backend command and:
 * 1. Accepts typed parameters
 * 2. Calls `send()` with the correct command name
 * 3. Returns the parsed response data
 * 4. Propagates backend errors as rejected Promises
 *
 * @param {Function} send - The send function from useWebSocket
 * @param {Function} getToken - Function that returns the current auth token
 * @returns {object} Service object with all command methods
 */

export function createIpcService(send, getToken) {
  /**
   * Helper: send with auth token automatically included.
   */
  const authed = (cmd, payload = {}) => {
    return send(cmd, payload, getToken());
  };

  return {
    // ==================== AUTH ====================

    /** Register a new user. */
    register(email, password, name) {
      return send('auth.register', { email, password, name });
    },

    /** Login and get an auth token. */
    login(email, password) {
      return send('auth.login', { email, password });
    },

    /** Logout (invalidate current token). */
    logout() {
      return authed('auth.logout');
    },

    /** Get the currently authenticated user's profile. */
    me() {
      return authed('auth.me');
    },

    // ==================== DASHBOARD ====================

    /** Get dashboard statistics (project counts, task counts, recent activity). */
    getDashboardStats() {
      return authed('dashboard.stats');
    },

    /** Get recent activity feed. */
    getActivity() {
      return authed('dashboard.activity');
    },

    /** Get upcoming calendar events (deadlines, tasks). */
    getCalendar() {
      return authed('dashboard.calendar');
    },

    // ==================== MEMBERS ====================

    /** List all team members across user's projects. */
    listMembers() {
      return authed('members.list');
    },

    /** Invite a user to a project by email. */
    inviteMember(projectId, email) {
      return authed('members.invite', { project_id: projectId, email });
    },

    /** Remove a member from a project. */
    removeMember(projectId, memberId) {
      return authed('members.remove', { project_id: projectId, member_id: memberId });
    },

    /** Get team stats for dashboard. */
    getTeamStats() {
      return authed('members.stats');
    },

    // ==================== PROJECTS ====================

    /** List all projects. */
    listProjects() {
      return authed('projects.list');
    },

    /** Get a single project by ID. */
    getProject(projectId) {
      return authed('projects.get', { project_id: projectId });
    },

    /** Create a new project. */
    createProject(data) {
      return authed('projects.create', data);
    },

    /** Update an existing project. */
    updateProject(projectId, data) {
      return authed('projects.update', { project_id: projectId, ...data });
    },

    /** Delete a project. */
    deleteProject(projectId) {
      return authed('projects.delete', { project_id: projectId });
    },

    // ==================== TASKS ====================

    /** List tasks, optionally filtered by project. */
    listTasks(projectId) {
      const payload = projectId ? { project_id: projectId } : {};
      return authed('tasks.list', payload);
    },

    /** Get a single task by ID. */
    getTask(taskId) {
      return authed('tasks.get', { task_id: taskId });
    },

    /** Create a new task. */
    createTask(data) {
      return authed('tasks.create', data);
    },

    /** Update a task. */
    updateTask(taskId, data) {
      return authed('tasks.update', { task_id: taskId, ...data });
    },

    /** Delete a task. */
    deleteTask(taskId) {
      return authed('tasks.delete', { task_id: taskId });
    },
  };
}
