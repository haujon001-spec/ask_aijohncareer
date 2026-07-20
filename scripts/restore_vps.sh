#!/bin/bash
# VPS Restore Script - Rollback to Previous Deployment
# Purpose: Quickly restore from backup if deployment fails
# Usage: chmod +x restore_vps.sh && ./restore_vps.sh /path/to/backup
# Created: 2026-03-26

set -e  # Exit on any error

BACKUP_DIR="${1:?ERROR: Backup directory not provided. Usage: ./restore_vps.sh /path/to/backup}"
PROJECT_DIR="${2:-.}"  # Use current directory by default

echo "==============================================="
echo "VPS RESTORE SCRIPT - Rolling Back Deployment"
echo "==============================================="
echo "Backup Source: $BACKUP_DIR"
echo "Project Target: $PROJECT_DIR"
echo ""

# Verify backup directory exists
if [ ! -d "$BACKUP_DIR" ]; then
    echo "ERROR: Backup directory not found: $BACKUP_DIR"
    exit 1
fi

if [ ! -f "$BACKUP_DIR/BACKUP_SUMMARY.txt" ]; then
    echo "ERROR: Not a valid backup directory (missing BACKUP_SUMMARY.txt)"
    echo "Make sure you're pointing to the backup root, not the .tar.gz file"
    exit 1
fi

# Display backup info
echo "BACKUP INFORMATION:"
cat "$BACKUP_DIR/BACKUP_SUMMARY.txt"
echo ""

# Ask for confirmation
read -p "⚠️  This will ROLLBACK your deployment. Continue? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "==============================================="
echo "STARTING RESTORE PROCEDURE..."
echo "==============================================="
echo ""

cd "$PROJECT_DIR"

echo "[1/8] Stopping Docker containers..."
docker-compose down || true
sleep 2
echo "   ✓ Containers stopped"

echo "[2/8] Restoring Docker configuration..."
cp "$BACKUP_DIR/docker/docker-compose.yml" docker-compose.yml 2>/dev/null || true
cp "$BACKUP_DIR/docker/Dockerfile" Dockerfile 2>/dev/null || true
cp "$BACKUP_DIR/docker/Caddyfile" Caddyfile 2>/dev/null || true
echo "   ✓ Docker config restored"

echo "[3/8] Restoring frontend (dist folder)..."
if [ -d "$BACKUP_DIR/dist" ] && [ "$(ls -A $BACKUP_DIR/dist)" ]; then
    rm -rf dist
    mkdir -p dist
    cp -r "$BACKUP_DIR/dist/"* dist/
    echo "   ✓ Frontend dist/ restored"
else
    echo "   ⚠ No dist backup found, will need rebuild"
fi

echo "[4/8] Restoring backend..."
if [ -f "$BACKUP_DIR/backend/server.js" ]; then
    cp "$BACKUP_DIR/backend/server.js" backend/server.js
    echo "   ✓ Backend server.js restored"
fi

echo "[5/8] Restoring configuration files..."
cp "$BACKUP_DIR/package.json" . 2>/dev/null || true
cp "$BACKUP_DIR/package-lock.json" . 2>/dev/null || true
cp "$BACKUP_DIR/pnpm-lock.yaml" . 2>/dev/null || true
echo "   ✓ Configuration files restored"

echo "[6/8] Restoring environment secrets..."
if [ -f "$BACKUP_DIR/secrets/.env" ]; then
    cp "$BACKUP_DIR/secrets/.env" .env
    echo "   ✓ .env restored"
fi
if [ -f "$BACKUP_DIR/secrets/.env.vps" ]; then
    cp "$BACKUP_DIR/secrets/.env.vps" .env.vps
    echo "   ✓ .env.vps restored"
fi

echo "[7/8] Restoring Git history..."
if [ -f "$BACKUP_DIR/git/commit_history.txt" ]; then
    PREVIOUS_COMMIT=$(head -1 "$BACKUP_DIR/git/commit_history.txt" | awk '{print $1}')
    if [ ! -z "$PREVIOUS_COMMIT" ]; then
        git reset --hard "$PREVIOUS_COMMIT"
        echo "   ✓ Git reset to: $PREVIOUS_COMMIT"
    fi
fi

echo "[8/8] Restarting services..."
docker-compose up -d --build
sleep 5
echo "   ✓ Services restarted"

echo ""
echo "==============================================="
echo "✓ RESTORE COMPLETE"
echo "==============================================="
echo ""

echo "VERIFICATION STEPS:"
echo ""
echo "1. Check containers are running:"
docker ps
echo ""

echo "2. Check logs for errors:"
echo "   docker logs [container-name]"
echo ""

echo "3. Test frontend:"
echo "   curl http://localhost/"
echo ""

echo "4. Test backend API:"
echo "   curl http://localhost:3000/api/health"
echo ""

echo "5. Check SSL certificate:"
echo "   curl -I https://yourdomain.com"
echo ""

echo "If issues persist, contact support with:"
echo "  - docker logs output"
echo "  - docker ps output"
echo "  - Error messages from above"
echo ""
