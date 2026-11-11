const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3333;
const STATIC_DIR = __dirname;
const STATE_FILE = path.join(STATIC_DIR, 'state.json');

function getState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (!Array.isArray(state.tasks)) state.tasks = [];
      if (!Array.isArray(state.events)) state.events = [];
      // Derive list of projects dynamically
      const taskProjects = state.tasks.map(t => t.project).filter(Boolean);
      state.projects = Array.from(new Set([...(state.projects || []), ...taskProjects, 'experiments']));
      return state;
    }
  } catch (e) {
    console.error('Error reading state.json:', e);
  }
  return { tasks: [], events: [], projects: ['experiments'] };
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
    broadcastUpdate(state);
  } catch (e) {
    console.error('Error writing state.json:', e);
  }
}

let sseClients = [];
function broadcastUpdate(state) {
  const data = `data: ${JSON.stringify(state)}\n\n`;
  sseClients.forEach(client => {
    try { client.write(data); } catch (err) {}
  });
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // SSE Stream
  if (url.pathname === '/api/stream') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write(`data: ${JSON.stringify(getState())}\n\n`);
    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });
    return;
  }

  // GET State
  if (url.pathname === '/api/state' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(getState()));
    return;
  }

  function parseBody(callback) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        callback(null, parsed);
      } catch (err) {
        callback(err);
      }
    });
  }

  // POST /api/tasks (Create or Update Task)
  if (url.pathname === '/api/tasks' && req.method === 'POST') {
    parseBody((err, task) => {
      if (err || !task.title) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Valid task title is required' }));
        return;
      }
      const state = getState();
      if (!task.id) {
        task.id = `TASK-${(100 + state.tasks.length + 1)}`;
      }
      if (!task.project) task.project = 'experiments';
      if (!task.initiator) task.initiator = 'Human (Chat)';
      if (!task.currentAction) task.currentAction = task.desc || 'In Progress';

      const existingIdx = state.tasks.findIndex(t => t.id === task.id || (t.title.toLowerCase() === task.title.toLowerCase() && t.project === task.project));
      if (existingIdx >= 0) {
        state.tasks[existingIdx] = { ...state.tasks[existingIdx], ...task };
      } else {
        state.tasks.unshift({
          id: task.id,
          title: task.title,
          desc: task.desc || task.currentAction,
          currentAction: task.currentAction,
          initiator: task.initiator,
          project: task.project,
          priority: task.priority || 'medium',
          stageId: task.stageId || 1,
          progress: task.progress || 0,
          status: task.status || 'working',
          humanGuidance: task.humanGuidance || null,
          createdAt: new Date().toISOString()
        });
      }

      state.events.unshift({
        time: new Date().toLocaleTimeString(),
        source: task.initiator.startsWith('Human') ? 'Task Watcher' : task.initiator,
        project: task.project,
        text: `[${task.project}] [${task.id}] '${task.title}': ${task.currentAction} (${task.progress || 0}%) — Initiated by: ${task.initiator}`
      });

      if (state.events.length > 80) state.events.pop();
      saveState(state);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, task }));
    });
    return;
  }

  // POST /api/tasks/:id/intervene
  const interveneMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)\/intervene$/);
  if (interveneMatch && req.method === 'POST') {
    const taskId = interveneMatch[1];
    parseBody((err, data) => {
      if (err) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid payload' }));
        return;
      }
      const state = getState();
      const task = state.tasks.find(t => t.id === taskId);
      if (!task) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Task not found' }));
        return;
      }
      if (data.directive !== undefined) task.humanGuidance = data.directive;
      if (data.priority) task.priority = data.priority;
      if (data.stageId) task.stageId = data.stageId;
      if (data.status) task.status = data.status;
      if (data.progress !== undefined) task.progress = data.progress;
      if (data.currentAction) task.currentAction = data.currentAction;

      state.events.unshift({
        time: new Date().toLocaleTimeString(),
        source: 'Human Supervisor',
        project: task.project || 'General',
        text: `👑 [${task.project || 'General'}] [${taskId}] Supervisor directive: ${data.directive || 'Stage/priority modified'}`
      });
      if (state.events.length > 80) state.events.pop();
      saveState(state);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, task }));
    });
    return;
  }

  // DELETE /api/tasks/:id
  const deleteMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
  if (deleteMatch && req.method === 'DELETE') {
    const taskId = deleteMatch[1];
    const state = getState();
    const task = state.tasks.find(t => t.id === taskId);
    state.tasks = state.tasks.filter(t => t.id !== taskId);
    state.events.unshift({
      time: new Date().toLocaleTimeString(),
      source: 'Human Supervisor',
      project: task ? task.project : 'General',
      text: `🛑 [${task ? task.project : 'General'}] Task [${taskId}] cancelled and terminated.`
    });
    if (state.events.length > 80) state.events.pop();
    saveState(state);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // POST /api/reset
  if (url.pathname === '/api/reset' && req.method === 'POST') {
    const state = {
      tasks: [],
      projects: ['experiments'],
      events: [
        {
          time: new Date().toLocaleTimeString(),
          source: 'System',
          text: 'Dashboard cleared. Ready for active initiatives.'
        }
      ]
    };
    saveState(state);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // Static File Serving
  let filePath = path.join(STATIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!filePath.startsWith(STATIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(STATIC_DIR, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        res.end('Error loading asset');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`⚡ AgentForge HQ Server running on http://localhost:${PORT}`);
  console.log(`📂 Multi-project selector & initiator telemetry active`);
  console.log(`=======================================================`);
});
