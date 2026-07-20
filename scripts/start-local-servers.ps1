# Local Web Server Startup Script
# Starts both frontend (Vite) and backend (Express) servers in separate windows
# Includes process cleanup and health checks

Write-Host "[*] Starting Local Web Server Environment" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$VITE_PORT = 5173
$BACKEND_PORT = 3000
$HEALTH_CHECK_TIMEOUT = 15  # seconds
$HEALTH_CHECK_INTERVAL = 1   # seconds

# Function to kill process on specific port
function Kill-ProcessOnPort {
    param([int]$Port)
    
    try {
        $connections = @(Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" })
        if ($connections.Count -gt 0) {
            Write-Host "[X] Killing existing process(es) on port $Port..." -ForegroundColor Yellow
            foreach ($conn in $connections) {
                $process = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
                if ($process) {
                    Write-Host "   - Stopping: $($process.Name) (PID: $($process.Id))"
                    Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                    Start-Sleep -Milliseconds 500
                }
            }
            Write-Host "[+] Port $Port is now free" -ForegroundColor Green
        }
    } catch {
        Write-Host "[!] Error checking port $Port : $_" -ForegroundColor Yellow
    }
}

# Function to check if a port is listening
function Test-PortListening {
    param([int]$Port)
    
    try {
        $connections = @(Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Where-Object { $_.State -eq "Listen" })
        return ($connections.Count -gt 0)
    } catch {
        return $false
    }
}

# Function to wait for port to be listening
function Wait-PortListening {
    param([int]$Port, [string]$ServiceName)
    
    Write-Host "[?] Waiting for $ServiceName to start on port $Port..." -ForegroundColor Cyan
    $elapsed = 0
    
    while ($elapsed -lt $HEALTH_CHECK_TIMEOUT) {
        if (Test-PortListening -Port $Port) {
            Write-Host "[+] $ServiceName is ready on port $Port" -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds $HEALTH_CHECK_INTERVAL
        $elapsed += $HEALTH_CHECK_INTERVAL
        Write-Host "   Waiting... ($elapsed/$HEALTH_CHECK_TIMEOUT seconds)" -ForegroundColor Gray
    }
    
    Write-Host "[-] $ServiceName failed to start within $HEALTH_CHECK_TIMEOUT seconds" -ForegroundColor Red
    return $false
}

# Clean up existing processes
Write-Host ""
Write-Host "[*] Cleaning up existing processes..." -ForegroundColor Cyan
Kill-ProcessOnPort -Port $VITE_PORT
Kill-ProcessOnPort -Port $BACKEND_PORT

Write-Host ""
Write-Host "[INFO] Starting servers in separate windows..." -ForegroundColor Cyan
Write-Host "[INFO] Backend will show in a separate PowerShell window" -ForegroundColor Gray
Write-Host "[INFO] Frontend will show in a separate PowerShell window" -ForegroundColor Gray
Write-Host ""

$currentDir = (Get-Location).Path

# Start backend server in a new window
Write-Host "[>] Starting Backend Server (Express on port $BACKEND_PORT)..." -ForegroundColor Cyan
$backendCmd = "cd '$currentDir'; node backend/server.js; Write-Host ''; Write-Host 'Backend closed. Press Enter to exit.'; Read-Host"
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", $backendCmd

Start-Sleep -Seconds 3  # Give backend time to start

# Start frontend server in a new window
Write-Host "[>] Starting Frontend Server (Vite on port $VITE_PORT)..." -ForegroundColor Cyan
$frontendCmd = "cd '$currentDir'; npm run dev; Write-Host ''; Write-Host 'Frontend closed. Press Enter to exit.'; Read-Host"
Start-Process PowerShell -ArgumentList "-NoExit", "-Command", $frontendCmd

Write-Host ""
Write-Host "[?] Checking if servers are responding..." -ForegroundColor Cyan
Write-Host ""

# Perform health checks
Start-Sleep -Seconds 3  # Wait for both to start
$backendReady = Test-PortListening -Port $BACKEND_PORT
$frontendReady = Test-PortListening -Port $VITE_PORT

# If not ready yet, wait and retry
if (-not $backendReady) {
    $backendReady = Wait-PortListening -Port $BACKEND_PORT -ServiceName "Backend"
}

if (-not $frontendReady) {
    Start-Sleep -Seconds 2
    $frontendReady = Wait-PortListening -Port $VITE_PORT -ServiceName "Frontend"
}

Write-Host ""
Write-Host "+===========================================+" -ForegroundColor Cyan
Write-Host "|           STARTUP SUMMARY                |" -ForegroundColor Cyan
Write-Host "+===========================================+" -ForegroundColor Cyan

if ($backendReady) {
    Write-Host "| [+] Backend:  http://localhost:$BACKEND_PORT/           |" -ForegroundColor Green
} else {
    Write-Host "| [-] Backend:  FAILED TO START (port $BACKEND_PORT)      |" -ForegroundColor Red
}

if ($frontendReady) {
    Write-Host "| [+] Frontend: http://localhost:$VITE_PORT/           |" -ForegroundColor Green
} else {
    Write-Host "| [-] Frontend: FAILED TO START (port $VITE_PORT)     |" -ForegroundColor Red
}

Write-Host "+===========================================+" -ForegroundColor Cyan
Write-Host ""

if ($backendReady -and $frontendReady) {
    Write-Host "[SUCCESS] Both servers are running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Open your browser:" -ForegroundColor Yellow
    Write-Host "  -> http://localhost:$VITE_PORT" -ForegroundColor White
    Write-Host ""
    Write-Host "Backend API is available at:" -ForegroundColor Yellow
    Write-Host "  -> http://localhost:$BACKEND_PORT/api/*" -ForegroundColor White
} else {
    Write-Host "[WARNING] Some servers failed to start." -ForegroundColor Yellow
    if (-not $backendReady) {
        Write-Host "  - Backend not responding on port $BACKEND_PORT" -ForegroundColor Yellow
    }
    if (-not $frontendReady) {
        Write-Host "  - Frontend not responding on port $VITE_PORT" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "Check the server windows for error messages." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Servers are running in separate windows. Close each window to stop." -ForegroundColor Gray
Write-Host ""
