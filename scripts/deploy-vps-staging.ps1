# VPS Deployment Launcher - Staging Branch
# This script will SSH into your VPS and execute the deployment

param(
    [string]$SSHHost = "root@askcareer-ai.com",
    [string]$ProjectPath = "/root/ask_aijohncareer"
)

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🚀 VPS DEPLOYMENT LAUNCHER" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Target: $SSHHost" -ForegroundColor Yellow
Write-Host "Project: $ProjectPath" -ForegroundColor Yellow
Write-Host "Branch: staging" -ForegroundColor Yellow
Write-Host ""

# Step 1: Copy deployment script to VPS
Write-Host "[STEP 1] Uploading deployment script to VPS..." -ForegroundColor Blue
Write-Host "Command: scp scripts/deploy-to-staging.sh $SSHHost`:~/" -ForegroundColor Gray
Write-Host ""

scp scripts/deploy-to-staging.sh "${SSHHost}:~/"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ ERROR: Failed to copy script to VPS" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Script uploaded successfully" -ForegroundColor Green
Write-Host ""

# Step 2: SSH and execute deployment
Write-Host "[STEP 2] Executing deployment on VPS..." -ForegroundColor Blue
Write-Host "Connecting to: $SSHHost" -ForegroundColor Gray
Write-Host ""

$sshCommand = @"
echo "Changing to project directory..."
cd $ProjectPath || exit 1

echo "Making deployment script executable..."
chmod +x ~/deploy-to-staging.sh

echo ""
echo "Starting deployment..."
echo ""

~/deploy-to-staging.sh

if [ `$? -eq 0 ]; then
    echo ""
    echo "✅ DEPLOYMENT SUCCESSFUL"
    echo ""
    echo "Test the live domain: https://www.askcareer-ai.com"
else
    echo ""
    echo "❌ DEPLOYMENT FAILED"
    echo "Check the error messages above for details"
    exit 1
fi
"@

ssh $SSHHost $sshCommand

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ ERROR: SSH deployment failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Open browser: https://www.askcareer-ai.com" -ForegroundColor Gray
Write-Host "2. Verify Hero component loads" -ForegroundColor Gray
Write-Host "3. Test dark/light theme toggle" -ForegroundColor Gray
Write-Host "4. Send a test message and verify response" -ForegroundColor Gray
Write-Host "5. Check browser console (F12) for any errors" -ForegroundColor Gray
Write-Host ""
