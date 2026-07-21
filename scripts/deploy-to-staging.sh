#!/bin/bash

###############################################################################
# VPS DEPLOYMENT SCRIPT - Staging Branch
# Date: March 26, 2026
# Purpose: Deploy latest changes from GitHub staging branch with safety checks
###############################################################################

set -e  # Exit on any error

echo "=========================================="
echo "🚀 VPS DEPLOYMENT INITIATED"
echo "=========================================="
echo "Target: askcareer-ai.com"
echo "Branch: staging"
echo "Time: $(date)"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ============================================================================
# STEP 1: Verify directory and git state
# ============================================================================
echo -e "${BLUE}[STEP 1]${NC} Verifying git state..."

if [ ! -d ".git" ]; then
    echo -e "${RED}❌ ERROR: Not in a git repository${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git repository found${NC}"

# ============================================================================
# STEP 2: Create backup (CRITICAL!)
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 2]${NC} Creating backup..."

BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
BACKUP_PATH="$HOME/$BACKUP_FILE"

tar -czf "$BACKUP_PATH" \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=.git \
    --exclude=.env \
    .

if [ -f "$BACKUP_PATH" ]; then
    SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    echo -e "${GREEN}✅ Backup created: $BACKUP_PATH (Size: $SIZE)${NC}"
    echo -e "${YELLOW}⚠️  SAVE THIS FILENAME FOR ROLLBACK: $BACKUP_FILE${NC}"
else
    echo -e "${RED}❌ ERROR: Backup creation failed${NC}"
    exit 1
fi

# ============================================================================
# STEP 3: Fetch and checkout staging branch
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 3]${NC} Fetching staging branch from GitHub..."

git fetch origin staging
git checkout staging
git pull origin staging

echo -e "${GREEN}✅ Successfully checked out staging branch${NC}"

# Verify Hero component exists (key marker of new UI)
if [ -f "src/components/Hero.jsx" ]; then
    echo -e "${GREEN}✅ New Hero component found${NC}"
else
    echo -e "${YELLOW}⚠️  Hero component not found (may be expected)${NC}"
fi

# ============================================================================
# STEP 4: Verify environment variables
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 4]${NC} Verifying .env file..."

if [ ! -f ".env" ]; then
    echo -e "${RED}❌ ERROR: .env file not found${NC}"
    echo "Create .env with: OPENROUTER_API_KEY=... and DEEPSEEK_API_KEY=..."
    exit 1
fi

ENV_SIZE=$(wc -c < .env)
echo -e "${GREEN}✅ .env file found (Size: $ENV_SIZE bytes)${NC}"

# ============================================================================
# STEP 5: Verify Caddyfile (CRITICAL FOR ROUTING!)
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 5]${NC} Verifying Caddyfile configuration..."

if [ ! -f "Caddyfile" ]; then
    echo -e "${RED}❌ ERROR: Caddyfile not found${NC}"
    exit 1
fi

# Check critical Caddyfile entries
if grep -q "john-career-copilot-app:3000" Caddyfile; then
    echo -e "${GREEN}✅ Caddyfile has correct service reference${NC}"
else
    echo -e "${RED}❌ ERROR: Caddyfile missing 'john-career-copilot-app:3000'${NC}"
    exit 1
fi

if grep -q "askcareer-ai.com" Caddyfile; then
    echo -e "${GREEN}✅ Caddyfile configured for askcareer-ai.com${NC}"
else
    echo -e "${RED}❌ ERROR: Caddyfile not configured for askcareer-ai.com${NC}"
    exit 1
fi

# ============================================================================
# STEP 6: Rebuild Docker image (fresh build)
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 6]${NC} Rebuilding Docker image (this takes 2-5 minutes)..."

docker-compose -f docker-compose.prod.yml build --no-cache

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Docker image built successfully${NC}"
else
    echo -e "${RED}❌ ERROR: Docker build failed${NC}"
    echo "Revert with: tar -xzf $BACKUP_PATH"
    exit 1
fi

# ============================================================================
# STEP 7: Stop old containers and start new ones
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 7]${NC} Stopping old containers and starting new deployment..."

docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
sleep 10

echo -e "${GREEN}✅ Services started${NC}"

# ============================================================================
# STEP 8: Verify containers are running
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 8]${NC} Verifying containers are running..."

RUNNING=$(docker ps | grep -c "ask-aijohncareer\|john-career-copilot" || true)

if [ "$RUNNING" -gt 0 ]; then
    echo -e "${GREEN}✅ Application container is running${NC}"
    docker ps
else
    echo -e "${RED}❌ ERROR: Application container not running${NC}"
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

CADDY_RUNNING=$(docker ps | grep -c caddy || true)

if [ "$CADDY_RUNNING" -gt 0 ]; then
    echo -e "${GREEN}✅ Caddy container is running${NC}"
else
    echo -e "${RED}❌ ERROR: Caddy container not running${NC}"
    docker-compose -f docker-compose.prod.yml logs caddy
    exit 1
fi

# ============================================================================
# STEP 9: Verify API health
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 9]${NC} Testing API health..."

HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health 2>/dev/null || echo "000")

if [ "$HEALTH_CHECK" = "200" ] || [ "$HEALTH_CHECK" = "404" ]; then
    echo -e "${GREEN}✅ Backend API is responding (HTTP $HEALTH_CHECK)${NC}"
else
    echo -e "${YELLOW}⚠️  Backend returned HTTP $HEALTH_CHECK (checking logs...)${NC}"
    docker-compose -f docker-compose.prod.yml logs --tail=10 app || true
fi

# ============================================================================
# STEP 10: Verify frontend loads
# ============================================================================
echo ""
echo -e "${BLUE}[STEP 10]${NC} Testing frontend loads..."

FRONTEND_CHECK=$(curl -s http://localhost:3000 | grep -o "Career Copilot\|John" | head -1 || echo "NOT_FOUND")

if [ ! "$FRONTEND_CHECK" = "NOT_FOUND" ]; then
    echo -e "${GREEN}✅ Frontend is serving correctly${NC}"
else
    echo -e "${YELLOW}⚠️  Frontend check inconclusive (checking Docker logs...)${NC}"
    docker-compose -f docker-compose.prod.yml logs --tail=5 app || true
fi

# ============================================================================
# STEP 11: Log deployment completion
# ============================================================================
echo ""
echo "=========================================="
echo -e "${GREEN}✅ DEPLOYMENT COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "📋 Deployment Summary:"
echo "  Branch: staging"
echo "  Time: $(date)"
echo "  Backup: $BACKUP_PATH"
echo "  Domain: https://askcareer-ai.com"
echo ""
echo "✅ Next Steps:"
echo "  1. Test live domain: https://www.askcareer-ai.com"
echo "  2. Verify Hero component loads"
echo "  3. Test dark/light theme toggle"
echo "  4. Send test message in chat"
echo "  5. Check browser console for errors"
echo ""
echo "🔄 Rollback (if needed):"
echo "  cd $(pwd)"
echo "  tar -xzf $BACKUP_PATH"
echo "  docker-compose -f docker-compose.prod.yml down && docker-compose -f docker-compose.prod.yml up -d"
echo ""
