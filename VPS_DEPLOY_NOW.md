# 🚀 VPS DEPLOYMENT INSTRUCTIONS - www.askcareer-ai.com

## ✅ What's Ready
- ✅ Frontend rebuilt with **scrollable layout** (no more split-screen!)
- ✅ Backend configured for production
- ✅ Docker + Caddy setup complete
- ✅ All code committed to git

## 🔧 VPS Deployment Steps

### Step 1: SSH Into Your VPS
```bash
ssh root@www.askcareer-ai.com
```

### Step 2: Clone/Update Project
```bash
cd /opt && mkdir -p john-career-copilot && cd john-career-copilot
git clone https://github.com/yourusername/ask_aijohncareer.git . 
# OR if already cloned: git pull origin main
```

### Step 3: Create Environment File
```bash
cat > .env.vps << 'EOF'
OPENROUTER_API_KEY=<INSERT_YOUR_OPENROUTER_KEY_HERE>
DEEPSEEK_API_KEY=<INSERT_YOUR_DEEPSEEK_KEY_HERE>
PORT=3000
NODE_ENV=production
EOF

chmod 600 .env.vps
```

### Step 4: Install Docker & Docker Compose (if needed)
```bash
curl -fsSL https://get.docker.com | sh
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Step 5: Build & Start Services
```bash
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

### Step 6: Verify Deployment
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Check backend health
curl https://www.askcareer-ai.com/api/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f app
```

## 🌐 Access Your App

**Frontend + API:** https://www.askcareer-ai.com

**Features:**
- ✅ Full HTTPS/SSL (auto via Let's Encrypt)
- ✅ Scrollable vertical layout (sidebar → chat, no split-screen)
- ✅ Both models working: Liquid LFM 2.5 Free + DeepSeek R1
- ✅ Reverse proxy auto-routes `/` to frontend, `/api/*` to backend
- ✅ Auto-redirects HTTP → HTTPS

## 📊 Common Commands

```bash
# View live logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart app
docker-compose -f docker-compose.prod.yml restart app

# Stop all services
docker-compose -f docker-compose.prod.yml down

# Update and redeploy
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## ❌ Issues?

```bash
# Shell into container
docker-compose -f docker-compose.prod.yml exec app sh

# Check backend port
netstat -tulpn | grep 3000

# Check Caddy
docker-compose -f docker-compose.prod.yml logs caddy

# Restart from scratch
docker-compose -f docker-compose.prod.yml down -v
docker system prune -a
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📋 Architecture

```
DNS: www.askcareer-ai.com → 145.79.8.22 (Your VPS IP)
         ↓
    Caddy (Port 80/443)
    - Auto HTTPS via Let's Encrypt
    - Reverse proxy to backend
         ↓
    Express Backend (Port 3000)
    - Serves frontend (React app)
    - Handles LLM API calls (/api/*)
    - Proxies to OpenRouter & DeepSeek
```

## ✨ UI/UX Improvements in This Build

✅ **Fixed split-screen layout** - Now fully scrollable  
✅ **Vertical stacking** - Sidebar on top, messages below  
✅ **Free scrolling** - No viewport constraints  
✅ **Touch-friendly buttons** - 44px minimum height  
✅ **Mobile-first design** - Responsive at all sizes  

---

**Ready? Deploy now!**
