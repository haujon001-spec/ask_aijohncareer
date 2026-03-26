#!/bin/bash
# VPS Deployment Script for John's Career Copilot
# Run on your Linux VPS: bash deploy-vps.sh

set -e  # Exit on error

echo "╔════════════════════════════════════════════╗"
echo "║  John's Career Copilot - VPS Deployment   ║"
echo "╚════════════════════════════════════════════╝"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/opt/john-career-copilot"
DOMAIN="${DOMAIN:-www.askcareer-ai.com}"
REPO_URL="${REPO_URL:-https://github.com/yourusername/ask_aijohncareer.git}"

echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo -e "${RED}❌ This script must be run as root (use sudo)${NC}"
   exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Docker...${NC}"
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}📦 Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo -e "${GREEN}✓ Docker and Docker Compose installed${NC}"

# Create deployment directory
echo -e "${YELLOW}📁 Setting up deployment directory at ${DEPLOY_DIR}...${NC}"
mkdir -p ${DEPLOY_DIR}
cd ${DEPLOY_DIR}

# Clone repository if not already cloned
if [ ! -d .git ]; then
    echo -e "${YELLOW}📥 Cloning repository...${NC}"
    git clone ${REPO_URL} .
else
    echo -e "${YELLOW}🔄 Updating repository...${NC}"
    git pull origin main
fi

# Create .env.local with API keys
if [ ! -f .env.local ]; then
    echo -e "${YELLOW}🔐 Creating .env.local...${NC}"
    cat > .env.local << EOF
# API Keys - KEEP THIS FILE PRIVATE
# Never commit or share these keys
OPENROUTER_API_KEY=${OPENROUTER_API_KEY:-sk-or-v1-YOUR-KEY-HERE}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-sk-YOUR-KEY-HERE}
NODE_ENV=production
PORT=3000
EOF
    chmod 600 .env.local
    echo -e "${YELLOW}⚠️  Edit .env.local with your actual API keys:${NC}"
    echo -e "${YELLOW}    nano .env.local${NC}"
else
    echo -e "${GREEN}✓ .env.local already exists${NC}"
fi

# Update Caddyfile with correct domain
echo -e "${YELLOW}🌐 Updating Caddyfile for domain: ${DOMAIN}...${NC}"
sed -i "s/www.askcareer-ai.com/${DOMAIN}/g" Caddyfile
sed -i "s/askcareer-ai.com/${DOMAIN%www.}/g" Caddyfile

# Build Docker image
echo -e "${YELLOW}🔨 Building Docker image...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to be ready
echo -e "${YELLOW}⏳ Waiting for services to start...${NC}"
sleep 10

# Check health
echo -e "${YELLOW}🏥 Checking health...${NC}"
if docker-compose -f docker-compose.prod.yml exec -T app wget --quiet --tries=1 --spider http://localhost:3000/api/health; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}❌ Backend health check failed${NC}"
    docker-compose -f docker-compose.prod.yml logs app
    exit 1
fi

# Get service status
echo -e ""
echo -e "${GREEN}╔════════════════════════════════════════════╗"
echo -e "║      DEPLOYMENT COMPLETE!                   ║"
echo -e "╚════════════════════════════════════════════╝${NC}"
echo -e ""
echo -e "📋 Service Status:"
docker-compose -f docker-compose.prod.yml ps

echo -e ""
echo -e "🌐 Access your application:"
echo -e "   • HTTPS: https://${DOMAIN}"
echo -e "   • HTTP: http://${DOMAIN} (auto-redirects to HTTPS)"

echo -e ""
echo -e "📊 View logs:"
echo -e "   • All: docker-compose -f docker-compose.prod.yml logs -f"
echo -e "   • App only: docker-compose -f docker-compose.prod.yml logs -f app"
echo -e "   • Caddy only: docker-compose -f docker-compose.prod.yml logs -f caddy"

echo -e ""
echo -e "🔧 Common commands:"
echo -e "   • Stop: docker-compose -f docker-compose.prod.yml down"
echo -e "   • Restart: docker-compose -f docker-compose.prod.yml restart"
echo -e "   • Update: git pull && docker-compose -f docker-compose.prod.yml up -d --build"
echo -e "   • Shell: docker-compose -f docker-compose.prod.yml exec app /bin/sh"

echo -e ""
echo -e "⚠️  Next steps:"
echo -e "   1. Edit .env.local with your actual API keys"
echo -e "   2. Run: docker-compose -f docker-compose.prod.yml restart app"
echo -e "   3. Test: curl https://${DOMAIN}/api/health"
