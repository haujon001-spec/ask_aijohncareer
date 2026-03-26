# 🛡️ API KEY SECURITY INCIDENT - REMEDIATION GUIDE

## ⚠️ WHAT HAPPENED

Your API keys were accidentally exposed in committed documentation files and git history:
- **OpenRouter Key**: Exposed on GitHub in `docs/VPS_DEPLOYMENT.md`, `VPS_DEPLOY_NOW.md`
- **DeepSeek Key**: Exposed on GitHub in same files
- **Status**: Public repository means GitHub can scan & distribute keys to attackers
- **Action Required**: Immediate key rotation + VPS update

---

## 🛠️ IMMEDIATE ACTIONS (DO THIS NOW)

### Step 1: Revoke Exposed Keys (5 minutes)

**OpenRouter:**
1. Go to https://openrouter.ai/keys
2. Find the exposed key starting with `sk-or-v1-869d6e*`
3. Click the trash icon to **DELETE** it
4. Click "Create Key" button to generate a **NEW key**
5. **COPY** the new key (starts with `sk-or-v1-`)

**DeepSeek:**
1. Go to https://platform.deepseek.com/api_keys
2. Find the exposed key starting with `sk-42b6b7*`
3. Click delete/revoke
4. Click "Create API Key" to generate a **NEW key**
5. **COPY** the new key (starts with `sk-`)

### Step 2: Update VPS Deployment (2 minutes)

Run the secure key rotation script:

```bash
cd c:\Users\haujo\projects\DEV\ask_aijohncareer
python3 rotate_keys_vps.py
```

**The script will:**
1. Prompt for your new OpenRouter key (input is hidden)
2. Prompt for your new DeepSeek key (input is hidden)
3. SSH to your VPS
4. Update the `.env` file securely
5. Restart Docker containers
6. Verify deployment works
7. Test the health endpoint

---

## ✅ VERIFICATION CHECKLIST

After running the rotation script, verify everything:

```bash
# Test homepage loads
curl https://www.askcareer-ai.com/

# Test health endpoint (should return JSON)
curl https://www.askcareer-ai.com/api/health

# Check for errors in backend logs
ssh root@www.askcareer-ai.com "docker logs john-career-copilot-app | tail -20"
```

**Expected output from health endpoint:**
```json
{
  "status": "ok",
  "profile": "loaded",
  "models": ["deepseek", "nemotron"],
  "timestamp": "2026-03-25T11:16:00.000Z"
}
```

---

## 📋 SECURITY HARDENING APPLIED

✅ **Completed:**
- All exposed keys removed from documentation files
- Git repository updated with placeholder text
- `soul.md` strengthened with incident response procedure
- `SECURITY_INCIDENT_25MAR2026.md` created
- `.pre-commit-config.yaml` enabled to block future key commits
- Secure key rotation script added

---

## 🚨 GITHUB HISTORY CLEANUP (Advanced)

The old keys are still in git commit history on GitHub. To completely remove:

**Option 1: GitHub Secret Scanning (Automatic)**
- GitHub automatically scans and notifies if secrets are found
- Go to Settings → Security → Secret Scanning
- Revoked keys are already disabled, so lower risk

**Option 2: Manual Git History Rewrite (Advanced)**
```bash
# Reset to before keys were exposed
git reset --hard 497e0f4  # Commit before incidents

# Force push (be careful - this rewrites history)
git push origin main --force
```

**Option 3: Request GitHub Secret Removal**
- GitHub will remove exposed secrets from git history if requested
- See: https://docs.github.com/en/code-security/secret-scanning/protecting-pushes-with-secret-scanning

---

## 📝 LESSONS & PREVENTION

### What Failed
- ❌ Documentation files treated as "safe" for real keys
- ❌ Git history not cleaned after initial exposure
- ❌ No real-time scanning during commit

### What Now Protects You
- ✅ Pre-commit hooks block any key patterns
- ✅ `.gitignore` blocks `.env` files
- ✅ All docs now use `<INSERT_YOUR_KEY_HERE>` placeholders
- ✅ Rotation script for fast response
- ✅ `soul.md` incident procedure documented

### Best Practices Going Forward
1. **Only store keys in `.env` files** (never committed)
2. **Use environment variables** for production
3. **Use `<PLACEHOLDER>` in all documentation**
4. **Enable pre-commit hooks**: `pre-commit install`
5. **Review commits before pushing**: `git diff` before `git push`
6. **Enable GitHub Secret Scanning** in repo settings

---

## 📞 SUPPORT & TROUBLESHOOTING

### If key rotation fails:

```bash
# Manual update on VPS
ssh root@www.askcareer-ai.com

# Create new .env manually
cat > /opt/john-career-copilot/.env << 'EOF'
OPENROUTER_API_KEY=sk-or-v1-YOUR-NEW-KEY
DEEPSEEK_API_KEY=sk-YOUR-NEW-KEY
PORT=3000
NODE_ENV=production
EOF

# Fix permissions
chmod 600 /opt/john-career-copilot/.env

# Restart
cd /opt/john-career-copilot
docker-compose -f docker-compose.prod.yml restart app

# Verify
sleep 10
curl https://www.askcareer-ai.com/api/health
```

### Expected Timeline
- **< 1 min**: Generate new keys on provider sites
- **2 mins**: Run rotation script
- **30 secs**: Keys updated and deployed
- **1 min**: Containers restart and stabilize

---

## 📊 Status Tracking

| Item | Status | Date |
|------|--------|------|
| Keys exposed | ❌ CONFIRMED | 2026-03-25 |
| Files cleaned | ✅ DONE | 2026-03-25 11:32 |
| soul.md updated | ✅ DONE | 2026-03-25 11:35 |
| Rotation script created | ✅ DONE | 2026-03-25 11:40 |
| New keys generated | ⏳ PENDING | Now |
| VPS updated | ⏳ PENDING | Now |
| Deployment verified | ⏳ PENDING | After rotation |

---

## ⚡ QUICK REFERENCE

| Action | Command |
|--------|---------|
| Generate new OpenRouter | https://openrouter.ai/keys |
| Generate new DeepSeek | https://platform.deepseek.com/api_keys |
| Rotate on VPS | `python3 rotate_keys_vps.py` |
| Test site | `curl https://www.askcareer-ai.com` |
| Check logs | `ssh root@www.askcareer-ai.com "docker logs john-career-copilot-app"` |
| Manual VPS update | Edit `/opt/john-career-copilot/.env` via SSH |

---

## 🎯 Next Steps

1. ✅ Generate new API keys (5 min)
2. ✅ Run `python3 rotate_keys_vps.py` (2 min)
3. ✅ Verify deployment works (1 min)
4. ✅ Delete this guide after completion
5. ✅ Monitor for unauthorized account activity

---

**Incident Detected**: 2026-03-25 11:30 UTC  
**Remediation Guide Created**: 2026-03-25 11:45 UTC  
**Status**: Ready for key rotation  
**Delete After Use**: Yes, this file contains no secrets but guides sensitive process

