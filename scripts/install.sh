#!/usr/bin/env bash
set -e

echo "======================================================="
echo "⚡ Installing AgentForge Plugin for Google Antigravity..."
echo "======================================================="

DEST_DIR="${HOME}/.gemini/config/plugins/agentforge"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

echo "Target Plugin Path: ${DEST_DIR}"
mkdir -p "${DEST_DIR}"
cp -R "${SOURCE_DIR}/"* "${DEST_DIR}/"

echo ""
echo "✅ AgentForge plugin installed successfully!"
echo "Restart Antigravity or open a new session to activate:"
echo "  - /agent-dashboard (Launch visual dashboard)"
echo "  - /agent-pm (Product Manager)"
echo "  - /agent-planner (Planning & R&D Architect)"
echo "  - /agent-coder (Senior Software Engineer)"
echo "  - /agent-tester (QA & Test Automation)"
echo "  - /agent-reviewer (Code Reviewer & Security)"
echo "  - /agent-reality (Real-Life Insights Advisor)"
echo "  - /agent-watcher (Task Assigner & Watcher)"
echo "======================================================="
