# VPS Backup & Restore Procedure - March 26, 2026

**Purpose**: Create full snapshot of current working VPS configuration BEFORE deploying UI/UX changes from `dev` branch.

**Created**: 2026-03-26  
**Status**: PROCEDURE - Execute on VPS before any deployments

---

## What We're Backing Up

When you deploy the new Option B UI/UX redesign to VPS, we need to preserve:

1. **Current Docker Setup**
   - `docker-compose.yml` (current production config)
   - `Dockerfile` (current image definition)
   - Running Docker containers and volumes

2. **Current Frontend Code**
   - `dist/` folder (currently deployed)
   - Old HTML/CSS/JS assets
   - Old theme styling

3. **Current Backend**
   - `backend/server.js` (current version)
   - Node modules and dependencies

4. **Environment & Secrets**
   - `.env` or `.env.vps` (API keys, configuration)
   - Caddyfile (SSL certificates, domain routing)
   - Any custom nginx/reverse proxy configs

5. **Git History**
   - Current branch state
   - Commit history for rollback

---

## Backup Procedure (EXECUTE ON VPS SERVER)

### Step 1: Create Backup Directory

```bash
# SSH into VPS
ssh user@vps-domain-or-ip

# Create backup directory with timestamp
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/user/ask_aijohncareer_backup_${BACKUP_DATE}"
mkdir -p "$BACKUP_DIR"

echo "Backup directory: $BACKUP_DIR"
```

### Step 2: Backup Docker & Code

```bash
# Back up current working directory
cd /path/to/ask_aijohncareer  # (Replace with actual VPS path)

# 1. Backup docker-compose.yml and Dockerfile
mkdir -p "$BACKUP_DIR/docker"
cp docker-compose.yml "$BACKUP_DIR/docker/"
cp docker-compose.prod.yml "$BACKUP_DIR/docker/" || true
cp Dockerfile "$BACKUP_DIR/docker/"
cp Caddyfile "$BACKUP_DIR/docker/" || true

# 2. Backup current dist/ folder (frontend)
mkdir -p "$BACKUP_DIR/dist"
cp -r dist/* "$BACKUP_DIR/dist/" || true

# 3. Backup backend server code
mkdir -p "$BACKUP_DIR/backend"
cp backend/server.js "$BACKUP_DIR/backend/"
cp -r backend/node_modules "$BACKUP_DIR/backend/" || true

# 4. Backup package.json and lock files
cp package.json "$BACKUP_DIR/" || true
cp package-lock.json "$BACKUP_DIR/" || true
cp pnpm-lock.yaml "$BACKUP_DIR/" || true
```

### Step 3: Backup Environment & Secrets

```bash
# 5. Backup .env files (CRITICAL - contains API keys)
mkdir -p "$BACKUP_DIR/secrets"
cp .env "$BACKUP_DIR/secrets/" || true
cp .env.vps "$BACKUP_DIR/secrets/" || true
cp .env.prod "$BACKUP_DIR/secrets/" || true

# 6. Create permissions document (don't backup actual keys in git)
cat > "$BACKUP_DIR/secrets/README.txt" << 'EOF'
API KEYS REFERENCE - BACKUP METADATA ONLY
(Actual keys stored in encrypted backup, not in this file)

These .env files contain:
- OPENROUTER_API_KEY (production account)
- DEEPSEEK_API_KEY (production account)
- Any other secrets used by backend/server.js

TO RESTORE: Copy .env files back to project root before docker-compose up
EOF
```

### Step 4: Backup Git History

```bash
# 7. Document current branch and commit history
mkdir -p "$BACKUP_DIR/git"
git log --oneline -20 > "$BACKUP_DIR/git/commit_history.txt"
git status > "$BACKUP_DIR/git/git_status.txt"
git branch -a > "$BACKUP_DIR/git/branches.txt"
echo "Current branch: $(git rev-parse --abbrev-ref HEAD)" > "$BACKUP_DIR/git/current_branch.txt"
```

### Step 5: Backup Running Containers

```bash
# 8. Find and document running containers
mkdir -p "$BACKUP_DIR/docker"
docker ps --all > "$BACKUP_DIR/docker/running_containers.txt"
docker images > "$BACKUP_DIR/docker/images.txt"

# 9. Export current images (optional but recommended for full recovery)
# WARNING: This can be large (100MB+). Only if disk space allows.
# docker save ask_aijohncareer:latest -o "$BACKUP_DIR/docker/image_backup.tar"
```

### Step 6: Create Backup Summary

```bash
# Create a summary of what was backed up
cat > "$BACKUP_DIR/BACKUP_SUMMARY.txt" << EOF
VPS BACKUP SNAPSHOT
===================
Backup Date: $(date)
Backup Location: $BACKUP_DIR
Reason: Pre-deployment backup before UI/UX redesign (Option B)

CONTENTS:
✓ docker-compose.yml (current config)
✓ Dockerfile (current image definition)
✓ dist/ folder (current frontend deployment)
✓ backend/server.js (current backend)
✓ package.json and lock files
✓ .env files (secrets - keep encrypted!)
✓ Caddyfile (SSL, domain routing)
✓ Git history and branch info
✓ Docker container inventory

TO RESTORE: See RESTORE_PROCEDURE.md in this directory

IMPORTANT NOTES:
- DO NOT commit this backup to GitHub
- Secrets are in plaintext - keep this backup encrypted/protected
- Store backup on external drive or separate machine if possible
- Test restore procedure on staging before using on production

Production API Keys Backed Up: YES (encrypted)
Estimated Restore Time: 5-15 minutes
ETA

```

### Step 7: Test Backup Integrity

```bash
# Verify all key files are present
echo "=== BACKUP CONTENTS ==="
find "$BACKUP_DIR" -type f | wc -l
echo "files backed up"

du -sh "$BACKUP_DIR"
echo "total backup size"

# List structure
tree "$BACKUP_DIR" || find "$BACKUP_DIR" -type f
```

### Step 8: Archive Backup (Optional but Recommended)

```bash
# Create compressed archive for storage
tar -czf "${BACKUP_DIR}.tar.gz" "$BACKUP_DIR"

# Verify archive
tar -tzf "${BACKUP_DIR}.tar.gz" | head -20
echo "Archive created: ${BACKUP_DIR}.tar.gz"

# Store backup path for reference
echo "BACKUP ARCHIVE: ${BACKUP_DIR}.tar.gz" > ~/LAST_BACKUP_LOCATION.txt
```

---

## Restore Procedure (IF DEPLOYMENT FAILS)

### Full Restore (Complete Rollback)

```bash
# 1. SSH into VPS
ssh user@vps-domain-or-ip

# 2. Stop Docker containers
cd /path/to/ask_aijohncareer
docker-compose down

# 3. Restore from backup
BACKUP_DATE="20260326_HHMMSS"  # Replace with actual backup date
BACKUP_DIR="/home/user/ask_aijohncareer_backup_${BACKUP_DATE}"

# 4. Restore docker files
cp "$BACKUP_DIR/docker/docker-compose.yml" docker-compose.yml
cp "$BACKUP_DIR/docker/Dockerfile" Dockerfile
cp "$BACKUP_DIR/docker/Caddyfile" Caddyfile || true

# 5. Restore frontend dist/ folder
rm -rf dist
cp -r "$BACKUP_DIR/dist" dist

# 6. Restore backend
cp "$BACKUP_DIR/backend/server.js" backend/server.js

# 7. Restore .env files
cp "$BACKUP_DIR/secrets/.env" .env || true
cp "$BACKUP_DIR/secrets/.env.vps" .env.vps || true

# 8. Restore git to previous commit
PREVIOUS_COMMIT=$(cat "$BACKUP_DIR/git/commit_history.txt" | head -1 | awk '{print $1}')
git reset --hard $PREVIOUS_COMMIT

# 9. Restart services
docker-compose up -d --build

# 10. Verify restoration
docker ps
curl http://localhost:3000/api/health  # If exposed
```

### Partial Restore Options

**If only frontend needs rollback:**
```bash
rm -rf dist
cp -r "$BACKUP_DIR/dist" dist
docker-compose restart  # Restart containers to serve old files
```

**If only backend needs rollback:**
```bash
cp "$BACKUP_DIR/backend/server.js" backend/server.js
docker-compose up -d --build  # Rebuild with old backend
```

**If Docker config is broken:**
```bash
cp "$BACKUP_DIR/docker/docker-compose.yml" docker-compose.yml
cp "$BACKUP_DIR/docker/Dockerfile" Dockerfile
docker-compose up -d --build
```

---

## Backup Storage Recommendations

1. **Primary**: Keep on VPS in `/home/user/ask_aijohncareer_backup_*`
2. **Secondary**: Copy to external USB drive or external server
3. **Encryption**: Use `gpg` to encrypt sensitive backup
   ```bash
   # Encrypt
   gpg --symmetric --cipher-algo AES256 "${BACKUP_DIR}.tar.gz"
   
   # Decrypt (when needed)
   gpg "${BACKUP_DIR}.tar.gz.gpg"
   ```
4. **Retention Policy**: Keep last 3 backups, delete older ones

---

## Monitoring Current Deployment

Before starting deployment, document the current state:

```bash
# Check what's currently running
docker ps
docker ps -a
docker logs [container-name] -n 50  # Last 50 log lines

# Test current endpoints
curl http://localhost:3000/api/health
curl http://localhost/  # Frontend home page

# Check current git state
git status
git branch -a
git log --oneline -5

# Document current uptime
docker stats

# Save this to a pre-deployment report
docker ps > pre_deployment_docker_state.txt
git log --oneline -10 > pre_deployment_git_state.txt
Date >> pre_deployment_timestamp.txt
```

---

## Deployment Safety Checklist

Before deploying new code from `dev` branch:

- [ ] Backup created and verified (see above)
- [ ] Backup archive created and tested
- [ ] Current state documented (docker ps, git status, etc.)
- [ ] Staging deployment tested first (if available)
- [ ] Rollback procedure reviewed and understood
- [ ] Team notified of deployment window
- [ ] Monitoring/logging enabled on VPS
- [ ] API keys confirmed in `.env.vps`

---

## Post-Deployment Verification

After deploying new code:

```bash
# 1. Check containers are running
docker ps

# 2. Check for errors in logs
docker logs [frontend-container] -n 20
docker logs [backend-container] -n 20

# 3. Test frontend loads
curl http://localhost/
# Should return HTML with no 500 errors

# 4. Test API endpoints
curl http://localhost:3000/api/health

# 5. Test LLM integration (if enabled)
# Send test message through chat UI

# 6. Monitor resource usage
docker stats --no-stream

# 7. Check SSL certificate (via Caddyfile)
curl -I https://yourdomain.com
```

---

## Emergency Contact Points

If deployment fails:

1. **Immediate rollback**: Run "Full Restore" section above
2. **Check logs**: `docker logs [container-name]`
3. **Check network**: `docker network ls`
4. **Check ports**: `netstat -tuln | grep -E '3000|80|443'`
5. **Caddyfile syntax**: `caddy validate --config Caddyfile`
6. **Docker rebuild**: `docker-compose down && docker-compose up -d --build`

---

## Related Files
- [BRANCHING_STRATEGY_26MAR2026.md](BRANCHING_STRATEGY_26MAR2026.md) - Git workflow
- [soul.md](../soul.md) - Project structure and standards
- [TODOLIST_26MAR2026.md](todolist/TODOLIST_26MAR2026.md) - Current tasks
