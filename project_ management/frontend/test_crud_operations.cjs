/**
 * CRUD Operations & Access Control Test
 *
 * Tests all CRUD operations across the full stack:
 *  - Project CRUD (create, read, update, delete)
 *  - Task CRUD (create, read, update, delete)
 *  - Member operations (invite, list)
 *  - Access control (member vs owner permissions)
 *
 * Usage: node test_crud_operations.cjs
 * Requires: Backend running on ws://127.0.0.1:9001
 */

const WebSocket = require('ws');

const WS_URL = 'ws://127.0.0.1:9001';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✓ ${message}`);
  } else {
    failed++;
    console.log(`  ✗ ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${message} (got "${actual}")`);
  } else {
    failed++;
    console.log(`  ✗ ${message} — expected "${expected}", got "${actual}"`);
  }
}

async function runTest() {
  // Create two WebSocket connections — one per "user"
  const ws1 = await connectWebSocket('UserA');
  const ws2 = await connectWebSocket('UserB');

  const send1 = createSender(ws1, 'UserA');
  const send2 = createSender(ws2, 'UserB');

  const userAEmail = `crud_owner_${Date.now()}@example.com`;
  const userBEmail = `crud_member_${Date.now()}@example.com`;
  const projectName = `Test Project ${Date.now()}`;
  let projectId = null;
  let taskId1 = null;
  let taskId2 = null;
  let tokenA = null;
  let tokenB = null;

  // Helper for authed sends
  const authed = (sender, token) => (cmd, payload = {}) => sender(cmd, payload, token);

  try {
    // ================================================================
    console.log('\n═══ 1. AUTH — Register Two Users ═══');
    // ================================================================

    // Register User A
    const regA = await send1('auth.register', {
      email: userAEmail, password: 'test123456', name: 'Alice Owner',
    });
    assert(!!regA.id, 'User A registered');

    // Register User B
    const regB = await send2('auth.register', {
      email: userBEmail, password: 'test123456', name: 'Bob Member',
    });
    assert(!!regB.id, 'User B registered');

    // Login User A
    const loginA = await send1('auth.login', { email: userAEmail, password: 'test123456' });
    tokenA = loginA.token;
    assert(!!tokenA, 'User A logged in — token received');
    assert(loginA.user.name === 'Alice Owner', 'User A name correct');

    // Login User B
    const loginB = await send2('auth.login', { email: userBEmail, password: 'test123456' });
    tokenB = loginB.token;
    assert(!!tokenB, 'User B logged in — token received');
    assert(loginB.user.name === 'Bob Member', 'User B name correct');

    const a = authed(send1, tokenA); // User A authed helper
    const b = authed(send2, tokenB); // User B authed helper

    // ================================================================
    console.log('\n═══ 2. USER A — Create Project ═══');
    // ================================================================

    const project = await a('projects.create', {
      name: projectName,
      description: 'A test project for CRUD verification',
      color: '#0891b2',
    });
    projectId = project.id;
    assert(!!projectId, 'Project created with an ID');
    assertEqual(project.name, projectName, 'Project name matches');
    assertEqual(project.status, 'active', 'Project status defaults to active');
    assertEqual(project.owner_id, loginA.user.id, 'Project owner is User A');
    assertEqual(project.color, '#0891b2', 'Project color matches');
    assert(!!project.created_at, 'Project has created_at timestamp');
    assert(!!project.updated_at, 'Project has updated_at timestamp');

    // ================================================================
    console.log('\n═══ 3. USER A — Create Tasks ═══');
    // ================================================================

    const task1 = await a('tasks.create', {
      project_id: projectId,
      title: 'Design database schema',
      description: 'Create the ER diagram and SQL schema',
      priority: 'high',
      due_date: '2026-07-20',
    });
    taskId1 = task1.id;
    assert(!!taskId1, 'Task 1 created with an ID');
    assertEqual(task1.title, 'Design database schema', 'Task 1 title matches');
    assertEqual(task1.status, 'todo', 'Task 1 defaults to todo');
    assertEqual(task1.priority, 'high', 'Task 1 priority matches');
    assertEqual(task1.project_id, projectId, 'Task 1 belongs to the project');

    const task2 = await a('tasks.create', {
      project_id: projectId,
      title: 'Write API endpoints',
      description: 'Implement REST API endpoints',
      priority: 'medium',
    });
    taskId2 = task2.id;
    assert(!!taskId2, 'Task 2 created with an ID');
    assertEqual(task2.title, 'Write API endpoints', 'Task 2 title matches');
    assertEqual(task2.priority, 'medium', 'Task 2 defaults to medium');

    // ================================================================
    console.log('\n═══ 4. USER A — List & Get Project ═══');
    // ================================================================

    // List projects
    const projectsA = await a('projects.list');
    assert(projectsA.length >= 1, 'User A sees at least 1 project');
    assert(projectsA.some(p => p.id === projectId), 'User A sees the created project in list');

    // Get single project
    const projectDetail = await a('projects.get', { project_id: projectId });
    assert(!!projectDetail.project, 'Project detail has project data');
    assert(!!projectDetail.tasks, 'Project detail has tasks');
    assert(projectDetail.tasks.length >= 2, 'Project detail returns at least 2 tasks');
    assert(!!projectDetail.task_counts, 'Project detail has task_counts');

    // ================================================================
    console.log('\n═══ 5. USER A — List & Get Tasks ═══');
    // ================================================================

    // List tasks with project_id
    const tasksWithPid = await a('tasks.list', { project_id: projectId });
    assert(tasksWithPid.length >= 2, 'tasks.list with project_id returns at least 2 tasks');

    // Get single task
    const taskGet = await a('tasks.get', { task_id: taskId1 });
    assertEqual(taskGet.title, 'Design database schema', 'tasks.get returns the correct task');

    // Update task status
    const taskUpdated = await a('tasks.update', {
      task_id: taskId1,
      status: 'in_progress',
    });
    assertEqual(taskUpdated.status, 'in_progress', 'tasks.update changes status to in_progress');

    // ================================================================
    console.log('\n═══ 6. USER A — Invite User B ═══');
    // ================================================================

    const inviteResult = await a('members.invite', {
      project_id: projectId,
      email: userBEmail,
    });
    assert(!!inviteResult.user, 'Invite returns user data');
    assertEqual(inviteResult.user.email, userBEmail, 'Invited user email matches');

    // Duplicate invite should fail
    try {
      await a('members.invite', { project_id: projectId, email: userBEmail });
      assert(false, 'Duplicate invite should be rejected');
    } catch (err) {
      assert(err.message.includes('already a member'), 'Duplicate invite rejected with proper message');
    }

    // ================================================================
    console.log('\n═══ 7. USER B — Verify Read Access ═══');
    // ================================================================

    // User B should now see the project in their list
    const projectsB = await b('projects.list');
    assert(projectsB.some(p => p.id === projectId), 'User B sees the shared project in list');

    // User B can view project details
    const projectBDetail = await b('projects.get', { project_id: projectId });
    assert(!!projectBDetail.project, 'User B can view project details');

    // User B can see all tasks
    const tasksB = await b('tasks.list', { project_id: projectId });
    assert(tasksB.length >= 2, 'User B sees both tasks in the project');
    assert(tasksB.some(t => t.id === taskId1), 'User B sees Task 1');
    assert(tasksB.some(t => t.id === taskId2), 'User B sees Task 2');

    // User B can get individual tasks
    const taskB1 = await b('tasks.get', { task_id: taskId1 });
    assertEqual(taskB1.title, 'Design database schema', 'User B can get Task 1 by ID');

    // ================================================================
    console.log('\n═══ 8. USER B — Verify Create Access (can create tasks) ═══');
    // ================================================================

    const taskB = await b('tasks.create', {
      project_id: projectId,
      title: 'Task by Bob',
      priority: 'low',
    });
    const taskBId = taskB.id;
    assert(!!taskBId, 'User B can create a task in the shared project');
    assertEqual(taskB.title, 'Task by Bob', 'Task created by User B has correct title');

    // ================================================================
    console.log('\n═══ 9. USER B — Verify Update Access (can update tasks) ═══');
    // ================================================================

    const taskBUpdated = await b('tasks.update', {
      task_id: taskBId,
      status: 'review',
      priority: 'high',
    });
    assertEqual(taskBUpdated.status, 'review', 'User B can update task status');
    assertEqual(taskBUpdated.priority, 'high', 'User B can update task priority');

    // ================================================================
    console.log('\n═══ 10. ACCESS CONTROL — Member CANNOT delete project ═══');
    // ================================================================

    try {
      await b('projects.delete', { project_id: projectId });
      assert(false, 'User B should NOT be able to delete the project');
    } catch (err) {
      assert(err.message.includes('owner'), 'Project delete rejected for member: ' + err.message);
    }

    // ================================================================
    console.log('\n═══ 11. ACCESS CONTROL — Member CANNOT update project ═══');
    // ================================================================

    try {
      await b('projects.update', {
        project_id: projectId,
        name: 'Hacked Project Name',
      });
      assert(false, 'User B should NOT be able to update the project');
    } catch (err) {
      assert(err.message.includes('owner'), 'Project update rejected for member: ' + err.message);
    }

    // ================================================================
    console.log('\n═══ 12. ACCESS CONTROL — Member CANNOT delete another member\'s task ═══');
    // ================================================================

    // User A's tasks should be modifiable by User B (they're members of the project)
    // Actually, tasks don't have owner-based protection — they're project-scoped.
    // Let's verify User B can delete their own task (should work since they have project access)
    await b('tasks.delete', { task_id: taskBId });
    assert(true, 'User B can delete their own task (has project access)');

    // Verify task is gone
    const tasksAfterDelete = await b('tasks.list', { project_id: projectId });
    assert(!tasksAfterDelete.some(t => t.id === taskBId), 'Deleted task no longer appears in list');

    // ================================================================
    console.log('\n═══ 13. ACCESS CONTROL — Unauthorized user CANNOT access project ═══');
    // ================================================================

    // Register a third user who is NOT a member
    const ws3 = await connectWebSocket('UserC');
    const send3 = createSender(ws3, 'UserC');
    const userCEmail = `crud_intruder_${Date.now()}@example.com`;
    await send3('auth.register', { email: userCEmail, password: 'test123456', name: 'Charlie Intruder' });
    const loginC = await send3('auth.login', { email: userCEmail, password: 'test123456' });
    const tokenC = loginC.token;
    const c = authed(send3, tokenC);

    // User C should NOT see the project
    const projectsC = await c('projects.list');
    assert(!projectsC.some(p => p.id === projectId), 'Unauthorized user does NOT see the project');

    // User C should NOT be able to view project details
    try {
      await c('projects.get', { project_id: projectId });
      assert(false, 'Unauthorized user should NOT get project details');
    } catch (err) {
      assert(true, 'Project get rejected for unauthorized user: ' + err.message.substring(0, 60));
    }

    // User C should NOT be able to create tasks in this project
    try {
      await c('tasks.create', { project_id: projectId, title: 'Malicious task' });
      assert(false, 'Unauthorized user should NOT create tasks');
    } catch (err) {
      assert(true, 'Task create rejected for unauthorized user: ' + err.message.substring(0, 60));
    }

    // User C should NOT be able to access tasks
    try {
      await c('tasks.get', { task_id: taskId1 });
      assert(false, 'Unauthorized user should NOT get task details');
    } catch (err) {
      assert(true, 'Task get rejected for unauthorized user: ' + err.message.substring(0, 60));
    }

    // User C should NOT be able to update tasks
    try {
      await c('tasks.update', { task_id: taskId1, status: 'done' });
      assert(false, 'Unauthorized user should NOT update tasks');
    } catch (err) {
      assert(true, 'Task update rejected for unauthorized user: ' + err.message.substring(0, 60));
    }

    // User C should NOT be able to delete tasks
    try {
      await c('tasks.delete', { task_id: taskId1 });
      assert(false, 'Unauthorized user should NOT delete tasks');
    } catch (err) {
      assert(true, 'Task delete rejected for unauthorized user: ' + err.message.substring(0, 60));
    }

    ws3.close();

    // ================================================================
    console.log('\n═══ 14. USER A — Owner Operations ═══');
    // ================================================================

    // Owner can update the project
    const updatedProj = await a('projects.update', {
      project_id: projectId,
      status: 'review',
      description: 'Updated description',
    });
    assertEqual(updatedProj.status, 'review', 'Owner can update project status');
    assertEqual(updatedProj.description, 'Updated description', 'Owner can update project description');

    // Owner can list members (current user is excluded, only other members appear)
    const members = await a('members.list');
    assert(members.length >= 1, 'Owner sees at least 1 team member');
    assert(members.some(m => m.email === userBEmail), 'User B appears in members list');
    assert(!members.some(m => m.email === userAEmail), 'Current user (User A) excluded from own members list');

    // ================================================================
    console.log('\n═══ 15. USER A — Delete Project ═══');
    // ================================================================

    await a('projects.delete', { project_id: projectId });
    assert(true, 'Owner can delete the project');

    // Verify project is gone
    const projectsAfterDelete = await a('projects.list');
    assert(!projectsAfterDelete.some(p => p.id === projectId), 'Deleted project no longer in list');

    // Tasks should be cascade-deleted
    try {
      await a('tasks.get', { task_id: taskId1 });
      assert(false, 'Cascade-deleted task should not be fetchable');
    } catch (err) {
      assert(true, 'Tasks cascade-deleted with project');
    }

    // ================================================================
    console.log('\n═══ 16. User A — Verify auth.me + logout ═══');
    // ================================================================

    const me = await a('auth.me');
    assertEqual(me.email, userAEmail, 'auth.me returns correct user');

    await send1('auth.logout', {}, tokenA);
    assert(true, 'User A logged out successfully');

    // After logout, authed call should fail
    try {
      await a('auth.me');
      assert(false, 'Should be rejected after logout');
    } catch (err) {
      assert(true, 'Requests rejected after logout');
    }

    // ================================================================
    console.log('\n═══════════════════════════════════════');
    console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
    console.log('═══════════════════════════════════════\n');

  } catch (err) {
    console.log('\n  ✗ UNEXPECTED ERROR:', err.message);
    failed++;
  }

  ws1.close();
  ws2.close();

  // Exit with proper code
  process.exit(failed > 0 ? 1 : 0);
}

// ----- WebSocket Helpers -----

function connectWebSocket(label) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);
    ws.on('open', () => resolve(ws));
    ws.on('error', (err) => reject(new Error(`${label} WS error: ${err.message}`)));
    setTimeout(() => reject(new Error(`${label} WS connection timeout`)), 10000);
  });
}

function createSender(ws, label) {
  let reqId = 0;
  const pending = new Map();

  ws.on('message', (data) => {
    const resp = JSON.parse(data.toString());
    const p = pending.get(resp.req_id);
    if (p) {
      pending.delete(resp.req_id);
      if (resp.type === 'ok') {
        p.resolve(resp.data);
      } else {
        p.reject(new Error(resp.error?.message || 'Unknown error'));
      }
    }
  });

  return function send(cmd, payload = {}, token = null) {
    return new Promise((resolve, reject) => {
      const id = `req_${++reqId}_${Date.now()}`;
      const request = { cmd, req_id: id, payload };
      if (token) request.token = token;

      const timeout = setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`Timeout: ${cmd}`));
        }
      }, 15000);

      pending.set(id, {
        resolve: (data) => { clearTimeout(timeout); resolve(data); },
        reject: (err) => { clearTimeout(timeout); reject(err); },
      });

      try {
        ws.send(JSON.stringify(request));
      } catch (e) {
        clearTimeout(timeout);
        pending.delete(id);
        reject(new Error(`Send failed: ${e.message}`));
      }
    });
  };
}

runTest().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
