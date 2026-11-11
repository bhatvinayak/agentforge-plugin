const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

let inputData = '';
process.stdin.on('data', chunk => { inputData += chunk; });
process.stdin.on('end', () => {
  try {
    const payload = inputData ? JSON.parse(inputData) : {};
    const input = (payload.lastUserInput || '').trim();

    // Auto-detect project from workspacePaths or fallback to CWD
    let project = 'experiments';
    if (Array.isArray(payload.workspacePaths) && payload.workspacePaths.length > 0) {
      project = path.basename(payload.workspacePaths[0]);
    } else {
      try { project = path.basename(process.cwd()); } catch (e) {}
    }
    if (!project || project === '.' || project === 'dashboard') {
      project = 'experiments';
    }

    // Check for /agent-* pattern
    const match = input.match(/\/(agent-[a-z]+)/i);
    if (match) {
      const agentId = match[1].toLowerCase();
      const stageMap = {
        'agent-pm': 1,
        'agent-planner': 2,
        'agent-coder': 3,
        'agent-tester': 4,
        'agent-reviewer': 5,
        'agent-reality': 6
      };
      const stageId = stageMap[agentId] || 2;
      const cleanTitle = input.replace(/\/(agent-[a-z]+)/i, '').trim().slice(0, 80) || 'Active Workspace Initiative';

      const trackScript = path.join(__dirname, 'track.js');
      // Pass: agentId, stageId, progress, status, taskTitle, currentAction, initiator, project
      execFile(process.execPath, [
        trackScript,
        agentId,
        stageId.toString(),
        '25',
        'working',
        cleanTitle,
        `Started via ${agentId} command: "${cleanTitle.slice(0, 45)}"`,
        'Human (Chat)',
        project
      ]);
    }
  } catch (err) {
    // Fail-safe: hooks must not crash turn
  }

  // Hook specification requires valid JSON on stdout
  process.stdout.write(JSON.stringify({}));
});
