#!/bin/bash
# VPS Backup Script - Automated Backup Creation
# Purpose: Create complete snapshot of current VPS deployment before changes
# Usage: chmod +x backup_vps.sh && ./backup_vps.sh
# Created: 2026-03-26

set -e  # Exit on any error

echo "==============================================="
echo "VPS BACKUP SCRIPT - Creating Production Snapshot"
echo "==============================================="

# Create timestamped backup directory
BACKUP_DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/$(whoami)/ask_aijohncareer_backup_${BACKUP_DATE}"
PROJECT_DIR="${1:-.}"  # Use current directory by default

echo "Backup Date: $BACKUP_DATE"
echo "Backup Directory: $BACKUP_DIR"
echo "Project Directory: $PROJECT_DIR"
echo ""

# Verify project directory exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "ERROR: Project directory not found: $PROJECT_DIR"
    exit 1
fi

# Create backup structure
mkdir -p "$BACKUP_DIR"/{docker,dist,backend,secrets,git}

echo "[1/8] Backing up Docker configuration..."
cp "$PROJECT_DIR/docker-compose.yml" "$BACKUP_DIR/docker/" 2>/dev/null || true
cp "$PROJECT_DIR/docker-compose.prod.yml" "$BACKUP_DIR/docker/" 2>/dev/null || true
cp "$PROJECT_DIR/Dockerfile" "$BACKUP_DIR/docker/" 2>/dev/null || true
cp "$PROJECT_DIR/Caddyfile" "$BACKUP_DIR/docker/" 2>/dev/null || true
echo "   ✓ Docker files backed up"

echo "[2/8] Backing up frontend distribution..."
if [ -d "$PROJECT_DIR/dist" ]; then
    cp -r "$PROJECT_DIR/dist/"* "$BACKUP_DIR/dist/" 2>/dev/null || true
    echo "   ✓ dist/ folder backed up ($(du -sh $BACKUP_DIR/dist | cut -f1))"
else
    echo "   ⚠ dist/ folder not found (will need rebuild)"
fi

echo "[3/8] Backing up backend code..."
if [ -f "$PROJECT_DIR/backend/server.js" ]; then
    cp "$PROJECT_DIR/backend/server.js" "$BACKUP_DIR/backend/"
    echo "   ✓ backend/server.js backed up"
fi
if [ -d "$PROJECT_DIR/backend/node_modules" ]; then
    echo "   ⚠ Skipping node_modules (will reinstall as needed)"
fi

echo "[4/8] Backing up configuration files..."
cp "$PROJECT_DIR/package.json" "$BACKUP_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/package-lock.json" "$BACKUP_DIR/" 2>/dev/null || true
cp "$PROJECT_DIR/pnpm-lock.yaml" "$BACKUP_DIR/" 2>/dev/null || true
echo "   ✓ package.json and lock files backed up"

echo "[5/8] Backing up environment secrets..."
cp "$PROJECT_DIR/.env" "$BACKUP_DIR/secrets/" 2>/dev/null || true
cp "$PROJECT_DIR/.env.vps" "$BACKUP_DIR/secrets/" 2>/dev/null || true
cp "$PROJECT_DIR/.env.prod" "$BACKUP_DIR/secrets/" 2>/dev/null || true

# Create metadata file (don't expose actual keys)
cat > "$BACKUP_DIR/secrets/README.txt" << 'EOF'
BACKUP SECRETS METADATA
=======================
These .env files contain production API keys and secrets.

DO NOT:
- Commit to git
- Share in messages
- Store in public places
- Upload to cloud services without encryption

DO:
- Keep encrypted in secure location
- Use only for VPS restoration
- Verify ownership before access

BACKUP PROCEDURE: Use gpg to encrypt this backup
  gpg --symmetric --cipher-algo AES256 <backup-archive>

RESTORE: Copy .env files back to project root before docker-compose up
EOF

if [ -f "$BACKUP_DIR/secrets/.env" ] || [ -f "$BACKUP_DIR/secrets/.env.vps" ]; then
    echo "   ✓ Environment files backed up"
else
    echo "   ⚠ No .env files found - ensure they exist on VPS"
fi

echo "[6/8] Documenting Docker state..."
docker ps --all > "$BACKUP_DIR/docker/running_containers.txt" 2>/dev/null || true
docker images > "$BACKUP_DIR/docker/images.txt" 2>/dev/null || true
docker network ls > "$BACKUP_DIR/docker/networks.txt" 2>/dev/null || true
echo "   ✓ Docker state documented"

echo "[7/8] Documenting Git history..."
cd "$PROJECT_DIR"
git log --oneline -20 > "$BACKUP_DIR/git/commit_history.txt" 2>/dev/null || true
git status > "$BACKUP_DIR/git/git_status.txt" 2>/dev/null || true
git branch -a > "$BACKUP_DIR/git/branches.txt" 2>/dev/null || true
git rev-parse --abbrev-ref HEAD > "$BACKUP_DIR/git/current_branch.txt" 2>/dev/null || true
echo "   ✓ Git history backed up"

echo "[8/8] Creating backup summary..."
cat > "$BACKUP_DIR/BACKUP_SUMMARY.txt" << EOF
VPS BACKUP SNAPSHOT - $(date)
=============================

Backup Location: $BACKUP_DIR
Backup Date: $BACKUP_DATE
Reason: Pre-deployment backup before UI/UX changes

CONTENTS:
  ✓ docker-compose.yml (current config)
  ✓ Dockerfile (current image)
  ✓ dist/ folder (frontend - $(du -sh $BACKUP_DIR/dist 2>/dev/null | cut -f1))
  ✓ backend/server.js (current backend)
  ✓ package.json and lock files
  ✓ .env files (SECRETS - keep encrypted!)
  ✓ Caddyfile (SSL/routing)
  ✓ Docker container inventory
  ✓ Git commit history
  ✓ Branch information

BACKUP SIZE: $(du -sh $BACKUP_DIR | cut -f1)

TO RESTORE:
  1. Ensure no other deployments are in progress
  2. Read VPS_BACKUP_AND_RESTORE_26MAR2026.md
  3. Run 'Full Restore' section
  4. Verify: docker ps && curl http://localhost

IMPORTANT:
  - DO NOT commit this backup to git
  - Encrypt if storing off-site (gpg --symmetric)
  - Test restore procedure on staging first
  - Keep for 30+ days or until next deployment

Next Steps:
  1. Create archive: tar -czf "backup_${BACKUP_DATE}.tar.gz" \\
     && du -sh "backup_${BACKUP_DATE}.tar.gz"
  2. Copy to secure location (external drive, encrypted cloud, etc)
  3. Verify restore procedure works
  4. Proceed with deployment

EOF

echo ""
echo "==============================================="
echo "✓ BACKUP COMPLETE"
echo "==============================================="
echo "Location: $BACKUP_DIR"
echo "Size: $(du -sh $BACKUP_DIR | cut -f1)"
echo ""
echo "Next steps:"
echo "  1. Create archive: tar -czf backup_${BACKUP_DATE}.tar.gz $BACKUP_DIR"
echo "  2. Copy to secure storage"
echo "  3. Test restore on staging"
echo "  4. Proceed with deployment"
echo ""
echo "Emergency Restore Command:"
echo "  bash ./scripts/restore_vps.sh $BACKUP_DIR"
echo ""
