# Environment Configuration Guide

**Date:** 25 MAR 2026  
**Version:** 1.0  
**Governance:** soul.md §4 (Security & Secrets Management)

---

## Overview

This project uses a **3-tier .env fallback chain** for managing environment variables:

1. **`.env.local`** — Development environment (highest priority)
2. **`.env.vps`** — Production VPS environment
3. **`.env`** — Fallback/default environment (lowest priority)

All `.env*` files **MUST be `.gitignored`** to prevent credential leaks.

---

## 🔐 Setup Instructions

### Step 1: Create `/secrets/` Directory

```bash
mkdir -p secrets
echo "secrets/" >> .gitignore
echo ".env.local" >> .gitignore
echo ".env.vps" >> .gitignore
echo ".env" >> .gitignore
```

### Step 2: Generate `.env.local` (Development)

Create `secrets/.env.local`:

```bash
# LLM Provider API Keys
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxx
TOGETHER_API_KEY=xxxxxxxxxxxxx
OPENROUTER_API_KEY=xxxxxxxxxxxxx

# LLM Configuration
LLM_TIMEOUT_MS=5000
LLM_MAX_RETRIES=2
DEFAULT_MODEL=deepseek

# Backend Configuration
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development

# Analytics & Logging
ENABLE_ANALYTICS=true
LOG_LEVEL=debug
```

**Copy to workspace root for local development:**
```bash
cp secrets/.env.local .env.local
```

### Step 3: Generate `.env.vps` (Production)

Create `secrets/.env.vps`:

```bash
# LLM Provider API Keys (Production)
DEEPSEEK_API_KEY=sk-prod-xxxxxxxxxxxxx
TOGETHER_API_KEY=prod-xxxxxxxxxxxxx
OPENROUTER_API_KEY=prod-xxxxxxxxxxxxx

# LLM Configuration (Production Optimized)
LLM_TIMEOUT_MS=3000
LLM_MAX_RETRIES=3
DEFAULT_MODEL=deepseek

# Backend Configuration (Production)
BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
NODE_ENV=production

# Analytics & Logging (Production)
ENABLE_ANALYTICS=true
LOG_LEVEL=error
```

**Deploy to VPS:**
```bash
scp secrets/.env.vps user@vps:/app/.env.vps
```

### Step 4: Generate `.env` (Fallback)

Create `secrets/.env`:

```bash
# Fallback defaults (never commit to git)
DEEPSEEK_API_KEY=fallback-key
TOGETHER_API_KEY=fallback-key
OPENROUTER_API_KEY=fallback-key
LLM_TIMEOUT_MS=4000
LLM_MAX_RETRIES=2
DEFAULT_MODEL=mixtral
BACKEND_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
ENABLE_ANALYTICS=false
LOG_LEVEL=info
```

**Copy to workspace root:**
```bash
cp secrets/.env .env
```

---

## 📋 Environment Variables Reference

| Variable | Scope | Description | Example |
|----------|-------|-------------|---------|
| `DEEPSEEK_API_KEY` | All | DeepSeek API key | `sk-xxxxx` |
| `TOGETHER_API_KEY` | All | Together AI API key | `xxxxx` |
| `OPENROUTER_API_KEY` | All | OpenRouter API key | `xxxxx` |
| `LLM_TIMEOUT_MS` | All | Request timeout (ms) | `5000` |
| `LLM_MAX_RETRIES` | All | Retry attempts on failure | `2` |
| `DEFAULT_MODEL` | All | Default LLM if selection fails | `deepseek` |
| `BACKEND_URL` | Backend | Backend API base URL | `http://localhost:3000` |
| `FRONTEND_URL` | Backend | Frontend URL for CORS | `http://localhost:5173` |
| `NODE_ENV` | All | Environment (development/production) | `development` |
| `ENABLE_ANALYTICS` | Backend | Enable usage analytics | `true` |
| `LOG_LEVEL` | All | Logging level (debug/info/error) | `debug` |

---

## 🔄 Loading Environment Variables in Code

### Python Backend

```python
from dotenv import load_dotenv
import os

# Load with fallback chain (highest priority first)
load_dotenv(".env.local", override=True)   # Development
load_dotenv(".env.vps", override=True)     # Production
load_dotenv(".env", override=True)         # Fallback

# Access variables
deepseek_key = os.getenv("DEEPSEEK_API_KEY")
timeout_ms = int(os.getenv("LLM_TIMEOUT_MS", "5000"))

# Error handling
if not deepseek_key:
    raise ValueError("DEEPSEEK_API_KEY not found in environment")
```

### Node.js Backend

```javascript
import dotenv from 'dotenv';
import fs from 'fs';

// Load with fallback chain
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local', override: true });
} else if (fs.existsSync('.env.vps')) {
  dotenv.config({ path: '.env.vps', override: true });
} else {
  dotenv.config({ path: '.env', override: true });
}

// Access variables
const deepseekKey = process.env.DEEPSEEK_API_KEY;
const timeoutMs = parseInt(process.env.LLM_TIMEOUT_MS || '5000', 10);

// Error handling
if (!deepseekKey) {
  throw new Error('DEEPSEEK_API_KEY not found');
}
```

### React Frontend (Never expose API keys!)

```javascript
// ❌ WRONG: Never put API keys in frontend code
const API_KEY = process.env.REACT_APP_API_KEY;

// ✅ CORRECT: Call backend endpoint
const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/deepseek`, {
  method: 'POST',
  body: JSON.stringify({ question }),
  headers: { 'Content-Type': 'application/json' }
});
```

---

## 🚀 Deployment Checklist

- [ ] Create `secrets/` directory with `.gitignore`
- [ ] Generate `.env.local` with development keys
- [ ] Generate `.env.vps` with production keys
- [ ] Generate `.env` with fallback defaults
- [ ] Copy `.env.local` to workspace root (`cp secrets/.env.local .env.local`)
- [ ] Verify `.gitignore` includes `.env*`
- [ ] Test `load_dotenv()` or `dotenv.config()` with `override=True`
- [ ] Deploy `.env.vps` to production VPS
- [ ] Verify API keys work against live LLM providers
- [ ] Add secret rotation schedule (quarterly)
- [ ] Document API key management in team wiki

---

## ⚠️ Security Rules

✅ **DO:**
- Store all `.env*` files in `/secrets/` or workspace root (both gitignored)
- Use `override=True` when loading dotenv
- Rotate API keys quarterly
- Use different keys for dev/prod/staging
- Log errors but never log credentials

❌ **DON'T:**
- Commit `.env`, `.env.local`, or `.env.vps` to git
- Hardcode API keys in source code
- Include secrets in comments or documentation
- Echo secrets in terminal or logs
- Share `.env` files via email or Slack

---

## 🔄 Fallback Chain Logic

```
USER RUNS APPLICATION
    ↓
1. Check for .env.local → Load with override=True
    ↓ (if exists)
2. Check for .env.vps → Load with override=True
    ↓ (if exists)
3. Check for .env → Load with override=True
    ↓ (if exists)
4. Check environment variables → Use as-is
    ↓
5. If still missing → Raise error and exit
```

**Example scenarios:**

| Scenario | Loaded Files | Precedence |
|----------|--------------|-----------|
| Dev machine | `.env.local` | .env.local |
| Production VPS | `.env.vps` | .env.vps |
| CI/CD Pipeline | `.env` + env vars | .env < env vars |
| Docker container | `.env` (mounted) | .env |

---

## 📚 Related Documentation

- [soul.md §4 — Security & Secrets Management](../../soul.md)
- [PROJECTPLAN_25MAR2026.md](PROJECTPLAN_25MAR2026.md)
- [.pre-commit-config.yaml](../../.pre-commit-config.yaml) — Prevents secrets in commits

---

## 📝 Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-03-25 | Initial ENV_CONFIGURATION.md v1.0 | John Hau |

