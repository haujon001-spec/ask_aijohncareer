# VPS Deployment Commands - March 26, 2026

**Status:** Ready to execute  
**Estimated Duration:** 15-20 minutes  
**Rollback Time:** <5 minutes (backup available)

---

## STEP 1: Local Machine - Merge Dev to Staging/Main

Run these commands on **your laptop** in the project directory:

```bash
# 1. Verify you're on dev and all changes are pushed
git branch
# Output should show: * dev

git status
# Output should show: "Your branch is up to date with 'origin/dev'"

# 2. Switch to main (or staging if using staging)
git checkout main
git pull origin main

# 3. Merge dev into main
git merge dev --no-ff -m "deploy: UI redesign + grammar fixes + cybersecurity Q (26-Mar-2026)"

# 4. Verify the merge
git log --oneline -5
# Should show your merge commit at the top

# 5. Push to GitHub
git push origin main
```

**Expected Output:**
```
Merge made by the 'recursive' strategy.
docs/DEPLOYMENT_STATUS_26MAR2026.md | 272 ++++++++++++++
docs/todolist/TODOLIST_26MAR2026.md | 198 +++++++++++
src/components/SidebarIntro.jsx | 15 +-
...
 X files changed, Y insertions(+), Z deletions(-)
```

---

## STEP 2: SSH into VPS Server

Replace credentials with your actual VPS details:

```bash
# Option A: SSH with username/password
ssh user@your-vps-domain.com
# Or with IP:
ssh user@192.168.x.x

# Option B: SSH with key file
ssh -i /path/to/your-key.pem user@your-vps-ip

# Option C: SSH to specific port (if not port 22)
ssh -p 2222 user@your-vps-domain.com
```

Once logged in, you should see the VPS shell prompt.

---

## STEP 3: VPS Server - Create Backup (CRITICAL!)

```bash
# Navigate to project directory
cd /path/to/ask_aijohncareer
# Common path: /home/user/ask_aijohncareer or /var/www/ask_aijohncareer

# Create timestamped backup
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf ~/$BACKUP_FILE \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  .
echo "✅ Backup created: ~/$BACKUP_FILE"

# Verify backup size
ls -lh ~/$BACKUP_FILE
```

**Save this filename somewhere safe** - you may need it for rollback!

---

## STEP 4: VPS Server - Pull Latest Code

```bash
# Verify you're in the project directory
pwd
# Should show: /path/to/ask_aijohncareer

# Fetch latest from GitHub
git fetch origin

# Checkout main (or staging)
git checkout main

# Pull the latest code
git pull origin main
# Output should show the merge commit you just pushed

# Verify new files are present
ls -la src/components/ | grep Hero
# Should show: Hero.jsx and Hero.css
```

---

## STEP 5: VPS Server - Check Environment Variables

```bash
# Check if .env or .env.vps exists
ls -la | grep env
# Should show .env (not in repo, so it must exist on server)

# Verify it has the current API keys
# DO NOT cat/echo it - just check its existence and size
ls -lh .env
# Should show a file, typically 100-500 bytes

# If .env doesn't exist, create it from template:
cat > .env << 'EOF'
OPENROUTER_API_KEY=<INSERT_YOUR_KEY>
DEEPSEEK_API_KEY=<INSERT_YOUR_KEY>
EOF
# Then edit with your actual keys: nano .env
```

---

## STEP 6: VPS Server - Rebuild Docker Image

```bash
# Verify Docker is running
docker ps
# Should list containers

# Verify docker-compose exists
ls -la docker-compose.yml
# Should show the file

# Build without cache (ensures fresh build)
docker-compose build --no-cache
# Takes 2-5 minutes, shows progress

# Expected output at end:
# Successfully tagged ask-aijohncareer:latest
```

---

## STEP 7: VPS Server - Restart Services

```bash
# Stop current services
docker-compose down
# Waits for containers to exit gracefully

# Start new services
docker-compose up -d
# -d = detached mode (runs in background)

# Wait 10 seconds for services to start
sleep 10

# Verify containers are running
docker ps
# Should show 2-3 containers with status "Up N seconds"

# Check for errors in logs
docker-compose logs --tail=20
# Should NOT show "ERROR" or "Exited" status
```

---

## STEP 8: VPS Server - Verify Deployment Success

```bash
# Test backend API is responsive
curl -s http://localhost:3000/api/health
# Expected: 200 OK or {"status":"ok"}

# Test frontend loads
curl -s http://localhost:3000 | grep "Career Copilot" | head -1
# Expected: Returns HTML containing "Career Copilot"

# Check backend can reach environment
docker exec <backend-container-name> env | grep OPENROUTER
# Should show: OPENROUTER_API_KEY=sk-or-v1-...

# Monitor logs for any issues
docker-compose logs -f backend
# Press Ctrl+C to exit
# Should show startup messages, then idle
```

---

## STEP 9: Local Machine - Test Live Domain

Replace `your-domain.com` with your actual VPS domain:

```bash
# Test from your laptop
curl -I https://your-domain.com
# Expected: HTTP 200 or 308 (redirect to HTTPS)

# Or open in browser:
# 1. Open https://your-domain.com
# 2. Check:
#    - Hero section visible
#    - Light theme applied
#    - 🌙 Dark button present
#    - 14 Quick questions in dropdown
#    - Chat input box present
# 3. Send a test message
# 4. Verify response appears in blue
```

---

## STEP 10: VPS Server - Backup Verification (Peace of Mind)

```bash
# List your backup file again
ls -lh ~/backup_*.tar.gz
# Should show the file you created in Step 3

# Test restore capability (verify, don't restore yet)
# Count files before restore
tar -tzf ~/backup_20260326_123456.tar.gz | wc -l
# Should show 500+ files

# Document backup location
echo "Backup: ~/$(ls -t ~/backup_*.tar.gz | head -1)" >> ~/DEPLOYMENT_LOG_26MAR2026.txt
```

---

## TROUBLESHOOTING

### If Docker Build Fails
```bash
# Check Docker logs
docker-compose logs
# Shows error details

# Try building again (sometimes network issues)
docker-compose build --no-cache

# If still fails, rollback:
cd /path/to/ask_aijohncareer
git reset --hard HEAD~1
docker-compose build
docker-compose restart
```

### If Frontend Shows Blank/Errors
```bash
# Check backend is responding
curl http://localhost:3000

# Check Docker container logs
docker logs <container-id>

# Check port is accessible from outside container
curl -H "Host: your-domain.com" http://localhost:3000
```

### If Chat Returns Errors
```bash
# Verify API keys are loaded
docker exec <backend-container> env | grep -i api
# Should show both OPENROUTER and DEEPSEEK keys

# Test backend API directly
curl http://localhost:3000/api/deepseek -d "Test message"
# Should return a response (not 403, 401, or 500)
```

### If Need to Rollback
```bash
# Stop services
docker-compose down

# Restore from backup (replace filename!)
cd ~
tar -xzf backup_20260326_123456.tar.gz -C /path/to/ask_aijohncareer

# Rebuild and restart
cd /path/to/ask_aijohncareer
docker-compose build
docker-compose up -d

# Verify
docker ps
```

---

## Quick Reference - All Commands in Order

Copy-paste friendly version (replace placeholders):

```bash
# LOCAL (your laptop)
git checkout main && git pull origin main
git merge dev --no-ff -m "deploy: UI redesign 26-Mar-2026"
git push origin main

# VPS (after SSH)
cd /path/to/ask_aijohncareer
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf ~/$BACKUP_FILE --exclude=node_modules --exclude=dist --exclude=.git .
git fetch origin && git checkout main && git pull origin main
docker-compose build --no-cache
docker-compose down && docker-compose up -d
sleep 10
docker ps
curl -s http://localhost:3000 | grep "Career Copilot"
```

---

## Deployment Checklist

- [ ] Step 1: Local merge and push to GitHub completed
- [ ] Step 2: SSH into VPS successful
- [ ] Step 3: Backup created and verified
- [ ] Step 4: Latest code pulled from GitHub
- [ ] Step 5: .env file verified with API keys
- [ ] Step 6: Docker image rebuilt
- [ ] Step 7: Services restarted (docker ps shows running)
- [ ] Step 8: Backend and frontend responsive
- [ ] Step 9: Live domain tested (Hero/theme/chat works)
- [ ] Step 10: Backup location documented
- [ ] ✅ **DEPLOYMENT COMPLETE**

---

## Success Indicators

You'll know deployment succeeded when:

✅ `docker ps` shows 2-3 containers with "Up" status  
✅ `curl http://localhost:3000` returns HTML with "Career Copilot"  
✅ Browser loads `https://your-domain.com` without errors  
✅ Hero section displays with light theme  
✅ "🌙 Dark" button visible in top-right  
✅ Quick questions dropdown shows 14 items  
✅ Sending a message returns a response  
✅ No red errors in browser DevTools console  

---

## Need Help?

If something fails:
1. Check the relevant troubleshooting section above
2. Review `docker-compose logs` for error details
3. Verify `.env` file has correct API keys
4. Try rollback procedure if needed
5. Document the error and timestamp

**Estimated time: 15-20 minutes**  
**You've got this! 🚀**
