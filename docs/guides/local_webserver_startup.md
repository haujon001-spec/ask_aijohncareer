# Local Web Server Startup Guide

## Overview

This guide explains how to start (and stop) the local development environment for the Ask AI John Career application, which consists of three processes:

- **Frontend**: React + Vite development server (port 5173) — serves both the public chat app (`/`) and the JD Automation Portal (`/portal`)
- **Chat backend**: Express.js API server (port 3000) — the public chatbot API, never gated by auth
- **JD API backend**: Express.js API server (port 3010) — the JD Automation Portal API (upload/run/history/download/view), added 20 Jul 2026. Since 22 Jul 2026 its routes (except `/api/health` and `/api/auth/*`) require a logged-in MFA session — see "JD Portal first-time setup" below.

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

### Recommended: `npm run dev:all` (starts all three processes)

```powershell
cd C:\Users\haujo\projects\DEV\ask_aijohncareer
npm run dev:all
```

This runs `concurrently "npm run dev" "npm run dev:backend" "npm run dev:jd-api"` — Vite, the chat backend, and the JD API backend all start together in one terminal, with each process's logs prefixed (`[0]` Vite, `[1]` backend, `[2]` jd-api). This is the actual current all-in-one command — use it instead of the PowerShell script below, which predates the JD API server.

**To bring it down:** press `Ctrl+C` once in that terminal. `concurrently` forwards the signal and stops all three processes together.

### ⚠️ `scripts\start-local-servers.ps1` is stale

This script only starts the frontend (5173) and chat backend (3000) — it does **not** start the JD API server (3010), so the JD Portal (`/portal`) will fail to load if you use it. It predates the JD Automation Portal (added 20 Jul 2026) and hasn't been updated since. Use `npm run dev:all` instead until this script is updated to include the third process.

### Manual Startup (individual processes, e.g. for isolated debugging)

**Terminal 1 - Chat backend:**
```powershell
npm run dev:backend
# or
node backend/server.js
```

**Terminal 2 - JD API backend:**
```powershell
npm run dev:jd-api
# or
node backend/jd_api_server.js
```

**Terminal 3 - Frontend:**
```powershell
npm run dev
# or
npx vite
```

**To bring any of these down individually:** `Ctrl+C` in that terminal, or find and kill the port (see "Force Kill" below).

## Access Points

Once all three processes are running:

| Service | URL | Purpose |
|---------|-----|---------|
| **Frontend** | http://localhost:5173 | Public chat app UI |
| **JD Portal** | http://localhost:5173/portal | MFA-gated JD Automation Portal UI (added 22 Jul 2026) |
| **Chat backend health** | http://localhost:3000/api/health | Chat API health check |
| **Chat backend API** | http://localhost:3000/api/* | Chat endpoints |
| **JD API health** | http://localhost:3010/api/health | JD API health check (unauthenticated) |
| **JD API** | http://localhost:3010/api/* | JD Portal endpoints — auth-protected except `/api/health` and `/api/auth/*` |

## JD Portal first-time setup

The JD Portal (`/portal`) requires enrollment before it's usable — this is separate from just starting the servers:

1. With all three processes running, visit `http://localhost:5173/portal` — on a fresh checkout (no `secrets/jd_portal_auth.json` yet) this redirects to `/portal/enroll`.
2. Set a password, scan the QR code with an authenticator app (Google Authenticator, Authy, etc.), confirm with the 6-digit code.
3. Sign in at `/portal/login` with the password + a current code from the authenticator app.

`secrets/jd_portal_auth.json` is gitignored — it does not exist on a fresh clone and enrollment must be done locally each time the repo is freshly checked out. See `docs/guides/JDPORTALREVAMP_22JUL2026.md` for the full design/verification record.

## Troubleshooting

### Port Already in Use

If you get a "port already in use" error (5173, 3000, or 3010):

**Manual Solution:**
```powershell
# Check what's using the ports
Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
Get-NetTCPConnection -LocalPort 3010 -ErrorAction SilentlyContinue

# Kill specific process by ID
Stop-Process -Id <PID> -Force

# Or change ports in vite.config.js / backend/server.js / backend/jd_api_server.js (JD_API_PORT env var)
```

Note: `scripts\start-local-servers.ps1`'s automatic port-cleanup only covers 5173 and 3000 (it predates the JD API server) — if port 3010 is stuck, clear it manually as above.

### Backend Connection Refused

If frontend shows `ECONNREFUSED` errors when calling `/api/health`, or the JD Portal shows connection errors:

1. Verify the relevant backend is running:
   ```powershell
   Test-NetConnection localhost -Port 3000   # chat backend
   Test-NetConnection localhost -Port 3010   # JD API backend
   ```

2. Check that backend's logs for errors

3. Ensure environment variables are loaded (check `.env`, `.env.local`, or `.env.vps`) — the JD API additionally needs `JD_PORTAL_JWT_SECRET` set (see `.env.example`) or `/api/auth/login` will 500

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

**If started with `npm run dev:all` (recommended):** press `Ctrl+C` once in that terminal — `concurrently` stops all three processes (Vite, chat backend, JD API) together.

**If started individually** (separate terminals): `Ctrl+C` in each terminal separately.

**If using the legacy `scripts\start-local-servers.ps1`:** close the PowerShell window, or press `Ctrl+C` in the terminal — the script gracefully shuts down the two processes it started (frontend + chat backend only; it doesn't start or stop the JD API).

### Force Kill (if needed)

```powershell
# Kill all Node processes (dangerous - use cautiously, affects any other Node app running)
Get-Process node | Stop-Process -Force

# Kill by specific port (Bash/Git Bash — find PID then kill)
netstat -ano | grep -E ':(5173|3000|3010)\s' | grep LISTENING
taskkill //F //PID <PID>

# Kill by specific port (PowerShell)
Get-NetTCPConnection -LocalPort 5173,3000,3010 -ErrorAction SilentlyContinue |
  ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }
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
   - Node servers (chat backend + JD API) typically use 50-150MB each
   - Vite with HMR uses ~100-200MB
   - Total: ~300-600MB for all three processes

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

**Last Updated**: 22 July 2026 — added the JD API backend (port 3010, added 20 Jul 2026) and the MFA-gated JD Portal (`/portal`, added 22 Jul 2026) throughout; flagged `scripts\start-local-servers.ps1` as stale (frontend + chat backend only, predates the JD API server) in favor of `npm run dev:all`. Originally created 26 March 2026.
