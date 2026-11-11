# AgentForge 1-Click Installer for Windows
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "⚡ Installing AgentForge Plugin for Google Antigravity..." -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

$destDir = "$env:USERPROFILE\.gemini\config\plugins\agentforge"
$sourceDir = Resolve-Path (Join-Path $PSScriptRoot "..")

Write-Host "Target Plugin Path: $destDir" -ForegroundColor Yellow

if (!(Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

Copy-Item -Recurse -Force "$sourceDir\*" $destDir

Write-Host ""
Write-Host "✅ AgentForge plugin installed successfully!" -ForegroundColor Green
Write-Host "Restart Antigravity or open a new session to activate:" -ForegroundColor Green
Write-Host "  - /agent-dashboard (Launch visual dashboard)" -ForegroundColor White
Write-Host "  - /agent-pm (Product Manager)" -ForegroundColor White
Write-Host "  - /agent-planner (Planning & R&D Architect)" -ForegroundColor White
Write-Host "  - /agent-coder (Senior Software Engineer)" -ForegroundColor White
Write-Host "  - /agent-tester (QA & Test Automation)" -ForegroundColor White
Write-Host "  - /agent-reviewer (Code Reviewer & Security)" -ForegroundColor White
Write-Host "  - /agent-reality (Real-Life Insights Advisor)" -ForegroundColor White
Write-Host "  - /agent-watcher (Task Assigner & Watcher)" -ForegroundColor White
Write-Host "=======================================================" -ForegroundColor Cyan
