# VPS Deployment Guide - Docker + Nginx

## Prerequisites on VPS

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 2. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Install Nginx (optional, if using as reverse proxy)
sudo apt-get update && sudo apt-get install -y nginx

# 4. Create deployment directory
mkdir -p /opt/john-career-copilot
cd /opt/john-career-copilot
```

## Step 1: Push Code to VPS

### Option A: Via Git (Recommended)
```bash
# Push your code to GitHub
git add .
git commit -m "add: Docker support for VPS deployment"
git push

# On VPS, clone the repo
cd /opt/john-career-copilot
git clone <your-repo-url> .
```

### Option B: Direct Upload
```bash
# From your local machine
scp -r * user@vps-ip:/opt/john-career-copilot/
```

## Step 2: Set Environment Variables

```bash
# On VPS
cd /opt/john-career-copilot

# Create .env.local with your API keys (NEVER commit this)
cat > .env.local << 'EOF'
OPENROUTER_API_KEY=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
DEEPSEEK_API_KEY=sk-42b6b71d9eb4477a89c97bfc5709e488
PORT=3000
NODE_ENV=production
EOF

# Secure the file
chmod 600 .env.local
```

## Step 3: Build & Run with Docker

```bash
# Build the Docker image
docker-compose build

# Start the container (background)
docker-compose up -d

# Check status
docker-compose ps
docker logs john-career-copilot_john-career-copilot_1

# View live logs
docker-compose logs -f

# Stop the container
docker-compose down
```

## Step 4: Setup Nginx Reverse Proxy (Recommended)

Create `/etc/nginx/sites-available/john-career-copilot`:

```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name your-domain.com;
    
    # Redirect to Docker container
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Allow large uploads for profiles
        client_max_body_size 10M;
    }
    
    # Healthcheck endpoint
    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

Enable and start Nginx:

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/john-career-copilot /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Reload after changes
sudo systemctl reload nginx
```

## Step 5: Enable HTTPS with Let's Encrypt

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (should be automatic)
sudo systemctl enable certbot.timer
```

## Monitoring & Maintenance

```bash
# View container logs
docker-compose logs -f

# Restart container
docker-compose restart

# Update code and redeploy
cd /opt/john-career-copilot
git pull
docker-compose build
docker-compose up -d

# Check disk usage
docker system df

# Clean up unused images/containers
docker system prune -a
```

## Scaling Across 3 VPS Servers

### Option 1: Load Balancer (Recommended)
```
Client → Load Balancer (HAProxy/Nginx) → VPS 1 (John Career)
                                      → VPS 2 (Backup/Mirror)
                                      → VPS 3 (Backup/Mirror)
```

### Option 2: Simple Round-Robin DNS
- Point your domain to 3 VPS IPs
- DNS will distribute traffic automatically
- Less reliable but cheaper

### Option 3: Single VPS, Others Idle
- Deploy only on VPS 1
- Keep VPS 2 & 3 ready for failover
- Simple rsync/git sync between servers

---

## Quick Commands Reference

```bash
# Start services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs

# Update code and redeploy
git pull && docker-compose build && docker-compose up -d

# View API
curl http://localhost:3000/api/health
curl http://your-domain.com/api/health

# Test model endpoint
curl -X POST http://localhost:3000/api/deepseek \
  -H "Content-Type: application/json" \
  -d '{"question":"What is John'\''s background?"}'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 already in use | `docker-compose down` then `docker-compose up -d` |
| API key not loaded | Check `.env.local` exists and has correct format |
| Frontend gives 404 | Run `npm run build` before building Docker image |
| Nginx not proxying | Check `sudo nginx -t`, then `sudo systemctl reload nginx` |
| High memory usage | Add resource limits in `docker-compose.yml` |
| Container keeps restarting | Check logs: `docker-compose logs` |

---

## Cost Breakdown (3 VPS Setup)

- **VPS 1** (Primary): ~$5-15/month
- **VPS 2** (Failover): ~$5-15/month  
- **VPS 3** (Failover): ~$5-15/month
- **Total**: ~$15-45/month (much cheaper than serverless at scale)

All includes Docker, full backend access, and complete control.
