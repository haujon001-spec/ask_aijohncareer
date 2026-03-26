# Deploy to VPS - Step 1: Prepare Local Machine
# Run this PowerShell script on your laptop to merge dev→main and push to GitHub

param(
    [string]$TargetBranch = "main"
)

Write-Host "🚀 VPS Deployment - Step 1: Local Machine Preparation" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify current branch is dev
Write-Host "📍 Step 1: Verifying current branch..." -ForegroundColor Yellow
$currentBranch = & git rev-parse --abbrev-ref HEAD 2>$null
if ($currentBranch -ne "dev") {
    Write-Host "❌ ERROR: Not on dev branch (currently on: $currentBranch)" -ForegroundColor Red
    Write-Host "   Run: git checkout dev" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ On dev branch" -ForegroundColor Green

# Step 2: Verify dev is up to date
Write-Host ""
Write-Host "📍 Step 2: Checking if dev is up to date with origin..." -ForegroundColor Yellow
& git fetch origin 2>$null
$localHead = & git rev-parse dev 2>$null
$remoteHead = & git rev-parse origin/dev 2>$null

if ($localHead -eq $remoteHead) {
    Write-Host "✅ dev branch is up to date with origin/dev" -ForegroundColor Green
} else {
    Write-Host "⚠️  dev branch has unpushed commits" -ForegroundColor Yellow
    Write-Host "   Run: git push origin dev" -ForegroundColor Gray
    exit 1
}

# Step 3: Verify working directory is clean
Write-Host ""
Write-Host "📍 Step 3: Checking if working directory is clean..." -ForegroundColor Yellow
$status = & git status --porcelain
if ($status) {
    Write-Host "❌ ERROR: Uncommitted changes detected:" -ForegroundColor Red
    Write-Host $status -ForegroundColor Gray
    Write-Host "" -ForegroundColor Gray
    Write-Host "   Run: git add . && git commit -m '<message>'" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ Working directory is clean" -ForegroundColor Green

# Step 4: Checkout target branch
Write-Host ""
Write-Host "📍 Step 4: Switching to $TargetBranch branch..." -ForegroundColor Yellow
& git checkout $TargetBranch 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Failed to checkout $TargetBranch" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Switched to $TargetBranch branch" -ForegroundColor Green

# Step 5: Pull latest from remote
Write-Host ""
Write-Host "📍 Step 5: Pulling latest from origin/$TargetBranch..." -ForegroundColor Yellow
& git pull origin $TargetBranch 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Could not pull latest (may be at same commit)" -ForegroundColor Yellow
}
Write-Host "✅ Pulled latest from origin" -ForegroundColor Green

# Step 6: Merge dev into target branch
Write-Host ""
Write-Host "📍 Step 6: Merging dev -> $TargetBranch..." -ForegroundColor Yellow
$timestamp = Get-Date -Format "dd-MMM-yyyy"
& git merge dev --no-ff -m "deploy: UI redesign + grammar fixes + cybersecurity Q ($timestamp)" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Merge conflict detected" -ForegroundColor Red
    Write-Host "   Resolve conflicts manually, then run: git add . && git commit" -ForegroundColor Gray
    Write-Host "   Or abort with: git merge --abort" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ Merged dev into $TargetBranch" -ForegroundColor Green

# Step 7: Show merge summary
Write-Host ""
Write-Host "📋 Merge Summary:" -ForegroundColor Cyan
& git log --oneline -5

# Step 8: Push to GitHub
Write-Host ""
Write-Host "📍 Step 7: Pushing to origin/$TargetBranch..." -ForegroundColor Yellow
& git push origin $TargetBranch 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Failed to push to origin" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Pushed to origin/$TargetBranch" -ForegroundColor Green

# Success message
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ LOCAL DEPLOYMENT PREPARATION COMPLETE!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. SSH into VPS server"
Write-Host "2. Run deployment commands from DEPLOYMENT_COMMANDS_26MAR2026.md (Steps 3-10)"
Write-Host "3. Test live domain after deployment"
Write-Host ""
Write-Host "SSH Command:" -ForegroundColor Cyan
Write-Host "  ssh user@your-vps-domain.com" -ForegroundColor Gray
Write-Host ""
