# Push AgentForge Plugin to GitHub
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "🚀 Pushing AgentForge Plugin to GitHub..." -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan

$pluginDir = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $pluginDir

git remote set-url origin https://github.com/bhatvinayak/agentforge-plugin.git
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "🎉 Successfully pushed to https://github.com/bhatvinayak/agentforge-plugin!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️ If the repository does not exist yet, create it first at:" -ForegroundColor Yellow
    Write-Host "https://github.com/new?name=agentforge-plugin" -ForegroundColor White
}
Write-Host "=======================================================" -ForegroundColor Cyan
