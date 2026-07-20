# Local Web Server Startup Guide

## Overview

This guide explains how to start the local development environment for the Ask AI John Career application, which consists of:

- **Frontend**: React + Vite development server (port 5173)
- **Backend**: Express.js API server (port 3000)

## Prerequisites

Before starting the local servers, ensure you have:

1. **Node.js** installed (v16 or higher)
   ```powershell
   node --version
   ```

2. **npm** installed and available in PATH
   ```powershell
   npm --version
   ```

3. **Dependencies installed**
   ```powershell
   npm install
   ```

4. **Environment variables configured**
   - Create a `.env`, `.env.local`, or `.env.vps` file in the project root
   - Backend will load environment variables in this order:
     - `.env.local` (highest priority)
     - `.env.vps`
     - `.env` (lowest priority)

## Quick Start

### Using the Automated Startup Script

The easiest way to start both servers is using the provided PowerShell startup script:

```powershell
# Navigate to project root
cd C:\Users\haujo\projects\DEV\ask_aijohncareer

# Run the startup script
.\scripts\start-local-servers.ps1
```

**What the script does:**
1. ✓ Kills any existing processes on ports 5173 (Vite) and 3000 (Backend)
2. ✓ Starts the Express backend server
3. ✓ Starts the Vite frontend development server
4. ✓ Performs health checks to verify both servers are running
5. ✓ Displays startup summary with access URLs
6. ✓ Keeps servers running until you close the window
7. ✓ Gracefully shuts down both servers when exiting

### Manual Startup (Alternative)

If you prefer to run servers individually:

**Terminal 1 - Backend:**
```powershell
npm run dev:backend
# or
node backend/server.js
```

**Terminal 2 - Frontend:**
```powershell
npm run dev
# or
npx vite
```

**Terminal 3 - Both Simultaneously:**
```powershell
npm run dev:all
```

## Access Points

Once servers are running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:5173 | Web application UI |
| **Backend Health** | http://localhost:3000/api/health | API health check |
| **Backend API** | http://localhost:3000/api/* | All API endpoints |

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error:

**Automatic Solution:**
- The startup script automatically kills existing processes on both ports

**Manual Solution:**
```powershell
# Check what's using the ports
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

# Kill specific process by ID
Stop-Process -Id <PID> -Force

# Or change ports in vite.config.js and backend/server.js
```

### Backend Connection Refused

If frontend shows `ECONNREFUSED` errors when calling `/api/health`:

1. Verify backend is running:
   ```powershell
   Test-NetConnection localhost -Port 3000
   ```

2. Check backend logs for errors

3. Ensure environment variables are loaded (check `.env`, `.env.local`, or `.env.vps`)

### Environment Variables Not Loading

Backend looks for environment files in this order:

1. `.env.local` (best for local dev, git-ignored)
2. `.env.vps` (VPS-specific config, git-ignored)
3. `.env` (fallback, may be committed)

Create a `.env.local` file with:
```
PORT=3000
OPENROUTER_API_KEY=your_key_here
DEEPSEEK_API_KEY=your_key_here
```

### Vite Hot Module Replacement (HMR) Issues

If changes aren't hot-reloading:

1. Stop and restart Vite
2. Check that `localhost:5173` is accessible (not blocked by firewall)
3. Verify `vite.config.js` HMR settings if behind proxy

## Monitoring

### View Server Logs

**While running script:**
- Terminal output shows real-time server logs

**Individual servers:**
```powershell
# Backend
npm run dev:backend 2>&1 | Tee-Object -FilePath logs/backend.log

# Frontend
npm run dev 2>&1 | Tee-Object -FilePath logs/frontend.log
```

### Health Checks

The startup script performs automatic health checks. To manually check:

```powershell
# Test backend
Test-NetConnection localhost -Port 3000

# Test frontend
Test-NetConnection localhost -Port 5173

# Check with curl/Invoke-WebRequest
Invoke-WebRequest http://localhost:3000/api/health
```

## Cleanup

### Graceful Shutdown

When using the startup script:
1. Close the PowerShell window, or
2. Press `Ctrl+C` in the terminal

The script will gracefully shut down both servers.

### Force Kill (if needed)

```powershell
# Kill all Node processes (dangerous - use cautiously)
Get-Process node | Stop-Process -Force

# Kill specific port
Kill-ProcessOnPort -Port 5173
Kill-ProcessOnPort -Port 3000
```

## Performance Tips

1. **Frontend Only?**
   - If you only need to work on UI without API calls: `npm run dev`
   - Mock API responses in development if needed

2. **Backend Only?**
   - Test API endpoints with curl or Postman: `npm run dev:backend`

3. **Clear Cache**
   - Delete `node_modules` and reinstall if packages seem stale
   - Clear browser cache (F12 > Application > Clear Storage)

4. **Monitor Resource Usage**
   - Node servers typically use 50-150MB each
   - Vite with HMR uses ~100-200MB
   - Total: ~250-450MB for both servers

## Related Files

- [Backend Server Code](../../backend/server.js)
- [Vite Configuration](../../vite.config.js)
- [Environment Setup Guide](../setup/ENV_CONFIGURATION.md)
- [Deployment Options](../BACKEND_DEPLOYMENT_OPTIONS.md)

## Next Steps

After starting the servers:

1. **Open in Browser**: http://localhost:5173
2. **Test API**: Open DevTools Network tab and submit a chat message
3. **View Backend Logs**: Check terminal output for API requests
4. **Develop**: Edit files in `src/` for frontend, `backend/` for API
5. **Hot Reload**: Frontend auto-reloads on save; backend requires restart

---

**Last Updated**: March 26, 2026
