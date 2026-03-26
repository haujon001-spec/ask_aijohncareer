# VPS Staging Deployment Procedure - March 26, 2026

**Purpose:** Deploy latest UI/UX changes from `dev` branch to VPS staging environment for testing  
**Status:** Ready to execute  
**Estimated Duration:** 15-20 minutes

---

## Prerequisites (Verify Before Starting)

✅ All items should be confirmed:

- [ ] VPS backup created and verified (see [VPS_BACKUP_AND_RESTORE_26MAR2026.md](VPS_BACKUP_AND_RESTORE_26MAR2026.md))
- [ ] Production build successful (npm run build ✓)
- [ ] Deployment status reviewed ([DEPLOYMENT_STATUS_26MAR2026.md](DEPLOYMENT_STATUS_26MAR2026.md))
- [ ] SSH access to VPS working
- [ ] Git access on VPS server verified
- [ ] Docker and docker-compose installed on VPS
- [ ] `.env.vps` or `.env.staging` exists with valid API keys

---

## Step-by-Step Deployment

### Step 1: Prepare Dev Branch (Already Done - Verify)

On **your laptop** (already completed):
```bash
# ✅ Already on dev branch
git branch
# Should show: * dev

# ✅ All commits are pushed
git status
# Should show: "Your branch is up to date with 'origin/dev'"

# ✅ Latest commit visible
git log --oneline -1
# Should show: 8a51e0d docs: add DEPLOYMENT_STATUS_26MAR2026.md
```

### Step 2: Create Feature Branch for Staging (Optional but Recommended)

If you want to preserve dev as-is and create a release branch:

```bash
git checkout -b release/staging-26mar2026
git push origin release/staging-26mar2026
```

Or proceed directly to Step 3.

### Step 3: Merge Dev → Staging Branch (Local)

On **your laptop**:

```bash
# 1. Switch to staging branch
git checkout staging
git pull origin staging

# 2. Merge dev into staging
git merge dev --no-ff -m "merge: dev → staging deployment (26-Mar-2026)"
# --no-ff preserves merge commit history

# 3. Push to GitHub
git push origin staging
```

Expected output:
```
Merge made by the 'recursive' strategy.
docs/DEPLOYMENT_STATUS_26MAR2026.md | 272 +++++...
 1 file changed, 272 insertions(+), 1 deletion(-)
```

### Step 4: SSH into VPS Server

```bash
ssh user@your-vps-domain-or-ip
# or
ssh -i /path/to/key.pem user@vps-ip-address
```

Once logged in, verify location:
```bash
pwd
# Should be near: /home/user or /root

# Navigate to project
cd /path/to/ask_aijohncareer
git status
```

### Step 5: Create Backup (Critical!)

```bash
# Navigate to project directory
cd /path/to/ask_aijohncareer

# Run backup script
chmod +x scripts/backup_vps.sh
./scripts/backup_vps.sh

# Output will show backup directory created
# Example: /home/user/ask_aijohncareer_backup_20260326_HHMMSS

# SAVE THIS PATH for emergency rollback
BACKUP_PATH="/home/user/ask_aijohncareer_backup_20260326_170000"
echo "Backup in: $BACKUP_PATH" > ~/STAGING_DEPLOYMENT_BACKUP.txt
```

### Step 6: Pull Latest Code from Staging Branch

```bash
git fetch origin
git checkout staging
git pull origin staging

# Verify you're on staging
git branch
# Should show: * staging

# Verify latest commit is from dev merge
git log --oneline -3
# Should show: merge: dev → staging deployment
#             docs: add DEPLOYMENT_STATUS_26MAR2026.md
#             fix: correct all quick questions grammar...
```

### Step 7: Check Environment Configuration

```bash
# Verify .env file exists and has API keys
ls -la | grep -E "\.env"
# Should show: .env or .env.prod or .env.vps

# Verify file has content (don't cat - might expose keys)
wc -l .env
# Should show non-zero line count

# Check specific keys are present (verify count, not values)
grep -c "OPENROUTER_API_KEY" .env
# Should show: 1
grep -c "DEEPSEEK_API_KEY" .env
# Should show: 1
```

### Step 8: Stop Current Services

```bash
# Stop and remove old containers
docker-compose down

# Verify containers are stopped
docker ps
# Should show empty (no running containers)

# Optional: Remove old images (frees disk space)
# docker rmi ask_aijohncareer:latest || true
```

### Step 9: Rebuild and Deploy

```bash
# Build new Docker image with latest code
docker-compose up -d --build

# This will:
# 1. Pull latest Dockerfile
# 2. Install npm dependencies
# 3. Run npm run build (creates dist/)
# 4. Start services on ports 3000 (backend) and 80/443 (frontend via Caddyfile)

# Monitor build progress
docker-compose logs -f
# Wait for "listening on :80" and ":3000" messages
# Press Ctrl+C to exit logs view
```

### Step 10: Verify Deployment Started

```bash
# Check containers are running
docker ps

# Expected output:
# CONTAINER ID  IMAGE                 PORTS                    STATUS
# xxxxx         ask_aijohncareer      0.0.0.0:3000->3000/tcp  Up 5 seconds
# xxxxx         caddy                 0.0.0.0:80->80/tcp      Up 5 seconds
# xxxxx         caddy                 0.0.0.0:443->443/tcp    Up 5 seconds

# If containers not running, check logs
docker-compose logs | tail -50
```

### Step 11: Health Check

```bash
# Test backend API
curl http://localhost:3000/api/health

# Expected: 
# {"status":"ok"} or similar healthy response

# Test frontend (from VPS)
curl http://localhost/ | head -20

# Should return HTML with <title> and no 500 errors
```

---

## Testing on VPS Staging

Once deployment is running, open browser and navigate to **staging domain** or **VPS IP**:

### Test Checklist (Execute Each Item)

#### T1: Homepage Loads
- [ ] Page loads without 404 or 500 errors
- [ ] Hero section visible ("John's Career Copilot")
- [ ] Light theme colors (white background, dark text)
- [ ] Takes < 3 seconds to fully load

#### T2: UI Components
- [ ] Three buttons visible: Light toggle, LinkedIn, Email
- [ ] Quick questions dropdown shows 14 questions
- [ ] Last question reads: "How much cybersecurity experience does John have?"
- [ ] Model selector shows both Gemini and DeepSeek
- [ ] Chat input field visible with placeholder text

#### T3: Theme Toggle
- [ ] Click "Light" button → page goes dark
- [ ] Click again → page returns to light theme
- [ ] Colors change smoothly (no flickering)
- [ ] After reload → theme persists (localStorage working)

#### T4: Chat - Gemini Model
- [ ] Type or select quick question: "What is John's key strength?"
- [ ] Click "Send" button
- [ ] Wait 2-3 seconds for response
- [ ] Response appears in chat with "Gemini 3.1 Flash" badge
- [ ] Response text is readable and relevant

#### T5: Chat - DeepSeek Model
- [ ] Click "DeepSeek R1" model card (pink/gradient)
- [ ] Type new question: "What technologies has John explored?"
- [ ] Click "Send"
- [ ] Wait 5-7 seconds for response (DeepSeek is slower)
- [ ] Response appears with "DeepSeek R1" badge
- [ ] Response shows model answered correctly

#### T6: Browser Console (DevTools)
- [ ] Press F12 → open DevTools
- [ ] Go to "Console" tab
- [ ] **Expected:** No red error messages
- [ ] **OK:** Yellow warnings are fine
- [ ] Check Network tab → all requests show green 200 status

#### T7: Mobile Responsiveness
- [ ] Press F12 → click Device Toolbar icon
- [ ] Select iPhone 12 or Pixel 5 preset
- [ ] **Expected:** Layout adjusts to mobile (single column)
- [ ] Hero buttons stack vertically
- [ ] Chat input stays accessible
- [ ] Dropdown works on mobile

#### T8: Quick Questions Dropdown
- [ ] Click dropdown arrow
- [ ] Scroll through all 14 questions
- [ ] Select "Tell me about John's leadership?"
- [ ] Click "Send"
- [ ] **Key:** Dropdown selection persists (doesn't reset)
- [ ] Response appears for selected question

---

## If All Tests Pass ✅

```bash
# On VPS, save current state
echo "Staging deployment successful" > ~/STAGING_DEPLOYMENT_SUCCESS.txt
date >> ~/STAGING_DEPLOYMENT_SUCCESS.txt

# Document what's running
docker ps > ~/STAGING_DOCKER_PS.txt
docker logs ask_aijohncareer_backend_1 -n 50 > ~/STAGING_BACKEND_LOGS.txt
docker logs ask_aijohncareer_frontend_1 -n 50 > ~/STAGING_FRONTEND_LOGS.txt

# Ready for production merge!
echo "✅ Staging tests all passed - ready to merge to main"
```

### Next: Merge Staging → Main (Production)

Once staging is verified:

On **your laptop**:
```bash
# Switch to main branch
git checkout main
git pull origin main

# Merge staging into main
git merge staging --no-ff -m "merge: staging → main production deployment"

# Push to GitHub
git push origin main

# Verify main has new code
git log --oneline -1
```

On **VPS production server**:
```bash
# Pull latest main
git checkout main
git pull origin main

# Rebuild production
docker-compose down
docker-compose up -d --build

# Test production domain
```

---

## If Tests Fail ❌

```bash
# Don't panic - we have a backup!
# Use the restore script you saved earlier

BACKUP_PATH="/home/user/ask_aijohncareer_backup_20260326_170000"

# Stop services
docker-compose down

# Restore from backup
bash ./scripts/restore_vps.sh "$BACKUP_PATH"

# Verify rolled back successfully
docker ps
curl http://localhost:3000/api/health
```

Then:
1. Note the specific failure in the error logs
2. Return to `dev` branch on laptop
3. Fix the issue
4. Create new commit
5. Merge to `staging` again
6. Retry deployment

---

## Monitoring After Deployment

```bash
# Watch logs in real-time
docker-compose logs -f

# Check resource usage
docker stats

# Monitor specific service
docker logs ask_aijohncareer_backend_1 -f

# Exit log view: Ctrl+C
```

---

## Troubleshooting

### 404 Error on Frontend
```bash
# Check if dist folder was built
ls -la dist/
# If empty, rebuild:
docker-compose down && docker-compose up -d --build
```

### 500 Error on API
```bash
# Check backend logs
docker logs ask_aijohncareer_backend_1 | tail -50

# Common issues:
# - Missing .env file
# - Invalid API keys
# - Port 3000 already in use
```

### Caddyfile Issues
```bash
# Validate Caddyfile syntax
caddy validate --config Caddyfile

# Check Caddy logs
docker logs caddy
```

### Out of Disk Space
```bash
# Check disk usage
df -h

# Clean up Docker
docker system prune -a

# Remove old images
docker images | grep ask_aijohncareer
docker rmi <image-id>
```

---

## Checklist Summary

#### Pre-Deployment
- [ ] Backup created on VPS
- [ ] Code pulled from `staging` branch
- [ ] Environment file verified

#### Deployment
- [ ] `docker-compose down` executed
- [ ] `docker-compose up -d --build` running
- [ ] Containers started successfully

#### Post-Deployment Testing
- [ ] Homepage loads
- [ ] Hero section displays
- [ ] Quick questions dropdown works
- [ ] Chat sends to Gemini → receives response
- [ ] Chat switches to DeepSeek → receives response
- [ ] Theme toggle works
- [ ] No console errors
- [ ] Mobile responsive
- [ ] All 8 tests passed ✅

#### Success
- [ ] `docker ps` shows running containers
- [ ] `curl http://localhost:3000/api/health` returns 200
- [ ] Staging domain accessible and responding

---

## Support & Rollback

**If stuck:**
1. Check logs: `docker-compose logs`
2. Verify .env file has API keys
3. Ensure ports 80, 443, 3000 are available
4. Run restore script if needed

**Emergency Rollback:**
```bash
bash ./scripts/restore_vps.sh /home/user/ask_aijohncareer_backup_20260326_HHMMSS
```

---

## Next Document to Review

[BRANCHING_STRATEGY_26MAR2026.md](BRANCHING_STRATEGY_26MAR2026.md) - For PR and merge procedures

---

## Timeline

| Step | Action | Time |
|------|--------|------|
| 1-3 | Git setup (laptop) | ~2 min |
| 4 | SSH to VPS | ~1 min |
| 5 | Create backup | ~3 min |
| 6 | Pull code | ~1 min |
| 7 | Verify .env | ~1 min |
| 8 | Stop services | ~1 min |
| 9 | Build & deploy | ~5 min |
| 10-11 | Verify running | ~1 min |
| T1-T8 | Testing | ~15 min |
| **Total** | **Complete Deployment** | **~30 min** |

---

**Ready to deploy? Execute Step 1-3 on your laptop, then Steps 4-11 on the VPS server.**
