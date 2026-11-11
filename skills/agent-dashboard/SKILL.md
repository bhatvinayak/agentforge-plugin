---
name: agent-dashboard
description: (Agent) Launch and view the live AgentForge web dashboard to monitor active workspace agent workflows with zero dummy data and human-in-the-loop control.
---

# Agent: Web Dashboard

Use this slash command (`/agent-dashboard`) from **any project or chat** to launch and view the visual AgentForge command center.

## Workflow Instructions

1. **Check and Start Server:**
   - Check if the dashboard server is responding on `http://localhost:3333`.
   - If not running, start the server in the background as a daemon:
     `node C:\Users\user\.gemini\config\dashboard\server.js`
2. **Open in Browser:**
   - Launch the dashboard in the user's default browser:
     `Start-Process "http://localhost:3333"`
3. **Embed Live in Chat:**
   - Embed the live interface directly into the chat response using:
     `<agent-embed src="file:///C:/Users/user/.gemini/config/dashboard/index.html"></agent-embed>`
4. **Zero Dummy Data Assurance:**
   - Verify that the dashboard reflects only active tasks related to the current workspace and terminal.
