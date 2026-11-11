const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const DASHBOARD_DIR = __dirname;
const STATE_FILE = path.join(DASHBOARD_DIR, 'state.json');
const SERVER_FILE = path.join(DASHBOARD_DIR, 'server.js');
const PORT = 3333;

const args = process.argv.slice(2);
// Expected args:
// 0: agentId (e.g. 'agent-planner')
// 1: stageId (1-7)
// 2: progress (0-100)
// 3: status ('working' | 'blocked' | 'completed' | 'idle')
// 4: taskTitle (string)
// 5: logMessage / currentAction (detailed description)
// 6: initiator ('Human (Chat)' | 'Alex (PM)' | 'Task Watcher' | etc.)
// 7: project (e.g. 'experiments', 'VoiceNotes')

const agentId = args[0] || 'agent-planner';
const stageId = parseInt(args[1] || '2', 10);
const progress = parseInt(args[2] || '20', 10);
const status = args[3] || 'working';
const taskTitle = args[4] || 'Workspace Initiative';
const currentAction = args[5] || `Active in stage ${stageId}`;
const initiator = args[6] || 'Human (Chat)';

// Auto-detect project from argument or CWD
let project = args[7];
if (!project || project === 'auto') {
  try {
    const cwd = process.cwd();
    project = path.basename(cwd);
    // Ignore generic root folder names if needed
    if (project === 'dashboard' || project === 'agent-hq') {
      project = 'experiments';
    }
  } catch (e) {
    project = 'Default Project';
  }
}

// Friendly agent names
const AGENT_NAMES = {
  'agent-pm': 'Alex (PM)',
  'agent-watcher': 'Omni (Watcher)',
  'agent-planner': 'Elena (Planner)',
  'agent-coder': 'Marcus (Coder)',
  'agent-tester': 'Maya (Tester)',
  'agent-reviewer': 'Silas (Reviewer)',
  'agent-reality': 'Victor (Advisor)'
};

function ensureServerRunning() {
  const req = http.get(`http://localhost:${PORT}/api/state`, () => {});
  req.on('error', () => {
    try {
      const child = spawn(process.execPath, [SERVER_FILE], {
        detached: true,
        stdio: 'ignore',
        cwd: DASHBOARD_DIR,
        windowsHide: true
      });
      child.unref();
      console.log('⚡ AgentForge HQ server self-healed and launched.');
    } catch (e) {
      console.error('Failed to spawn server:', e.message);
    }
  });
  req.setTimeout(800, () => req.destroy());
}

function updateState() {
  let state = { tasks: [], events: [], projects: [] };
  try {
    if (fs.existsSync(STATE_FILE)) {
      state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {
    state = { tasks: [], events: [], projects: [] };
  }

  if (!Array.isArray(state.tasks)) state.tasks = [];
  if (!Array.isArray(state.events)) state.events = [];
  if (!Array.isArray(state.projects)) state.projects = [];

  if (!state.projects.includes(project)) {
    state.projects.push(project);
  }

  // Match existing task by title and project
  let task = state.tasks.find(t => 
    t.title.toLowerCase() === taskTitle.toLowerCase() && 
    t.project === project && 
    t.status !== 'completed'
  );

  if (!task) {
    task = {
      id: `TASK-${(100 + state.tasks.length + 1)}`,
      title: taskTitle,
      desc: currentAction,
      currentAction: currentAction,
      initiator: initiator,
      project: project,
      priority: 'high',
      stageId: stageId,
      progress: progress,
      status: status,
      humanGuidance: null,
      createdAt: new Date().toISOString()
    };
    state.tasks.unshift(task);
  } else {
    task.stageId = stageId;
    task.progress = progress;
    task.status = status;
    task.desc = currentAction;
    task.currentAction = currentAction;
    if (initiator && !task.initiator) task.initiator = initiator;
    task.project = project;
    task.updatedAt = new Date().toISOString();
  }

  const agentName = AGENT_NAMES[agentId] || agentId;
  state.events.unshift({
    time: new Date().toLocaleTimeString(),
    source: agentName,
    initiator: initiator,
    project: project,
    taskId: task.id,
    text: `[${project}] [${task.id}] ${currentAction} (${progress}%) — Initiated by: ${initiator}`
  });

  if (state.events.length > 80) state.events.pop();

  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    console.log(`✅ Dashboard updated: [${project}] [${task.id}] ${taskTitle} -> Stage ${stageId} (${status}, ${progress}%) | Initiator: ${initiator}`);
  } catch (err) {
    console.error('Failed to save state.json:', err.message);
  }

  // Broadcast to live SSE server
  const postData = JSON.stringify(task);
  const req = http.request({
    hostname: 'localhost',
    port: PORT,
    path: '/api/tasks',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 1000
  }, () => {});
  req.on('error', () => {});
  req.write(postData);
  req.end();
}

ensureServerRunning();
updateState();
