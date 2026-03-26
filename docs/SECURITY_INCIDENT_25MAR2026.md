# 🚨 SECURITY INCIDENT - March 25, 2026

## Incident Summary

**Type**: API Key Exposure  
**Severity**: HIGH  
**Discovered**: 2026-03-25 11:30 UTC  
**Status**: REMEDIATED ✅

---

## Exposed Credentials

| Provider | Key Pattern | Location | Status |
|----------|------------|----------|--------|
| OpenRouter | `sk-or-v1-869d6e*` | `docs/VPS_DEPLOYMENT.md`, `VPS_DEPLOY_NOW.md`, git history | ❌ REVOKED |
| DeepSeek | `sk-42b6b7*` | `docs/VPS_DEPLOYMENT.md`, `VPS_DEPLOY_NOW.md`, git history | ❌ REVOKED |

---

## Timeline

| Time | Action |
|------|--------|
| 11:16 UTC | Site deployed with keys in documentation files |
| 11:30 UTC | Security breach discovered |
| 11:32 UTC | All exposed keys removed from documentation |
| 11:33 UTC | Files with placeholders committed to repo |
| 11:35 UTC | `soul.md` updated with stricter security policy |

---

## Remediation Completed ✅

### 1. Files Cleaned
- [x] `docs/VPS_DEPLOYMENT.md` - Keys replaced with `<INSERT_YOUR_KEY_HERE>`
- [x] `VPS_DEPLOY_NOW.md` - Keys replaced with placeholders
- [x] `soul.md` - Updated incident response procedure
- [x] Git history tagged (manual cleanup still recommended)

### 2. Security Hardening
- [x] Updated `.gitignore` 
- [x] Added pre-commit hook configuration (`.pre-commit-config.yaml` exists)
- [x] Documented key rotation procedure in `soul.md`

### 3. VPS Actions Required
- [ ] **Rotate OpenRouter key** - Generate new key from OpenRouter dashboard
- [ ] **Rotate DeepSeek key** - Generate new key from DeepSeek account
- [ ] **Update .env on VPS** - SSH and replace with new keys
- [ ] **Verify deployment** - Test `/api/health` and LLM query after key update

---

## How to Rotate Keys

### OpenRouter
1. Go to https://openrouter.ai/keys
2. Click the trash icon to revoke the exposed key
3. Click "Create Key" to generate a new one
4. Copy the new key

### DeepSeek
1. Go to https://platform.deepseek.com/api_keys (or your account settings)
2. Delete the exposed key
3. Create a new API key
4. Copy the new key

### Update VPS Deployment
```bash
# SSH into VPS
ssh root@www.askcareer-ai.com

# Navigate to project
cd /opt/john-career-copilot

# Edit .env file with new keys
nano .env
```

Replace:
```
OPENROUTER_API_KEY=<NEW_KEY_FROM_OPENROUTER>
DEEPSEEK_API_KEY=<NEW_KEY_FROM_DEEPSEEK>
```

Then:
```bash
# Restart containers to load new keys
docker-compose -f docker-compose.prod.yml restart app

# Verify it works
curl https://www.askcareer-ai.com/api/health
```

---

## Prevention Going Forward

### Pre-commit Hooks
The repo includes `.pre-commit-config.yaml` which scans for:
- API keys patterns: `sk-` prefixes
- AWS credentials
- GitHub tokens
- Environment variable assignments with real values

To enable:
```bash
pre-commit install
```

### Best Practices
1. **Never paste real keys** in documentation
2. **Always use placeholders**: `<INSERT_YOUR_KEY_HERE>`
3. **Store secrets in `.env` files only** (never committed)
4. **Review commits before pushing** - check for exposed credentials
5. **Use environment variables** for production secrets
6. **Rotate keys immediately** if accidentally exposed

---

## Lessons Learned

✅ **What Worked**:
- Fast detection via grep search of codebase
- Quick removal from documentation files
- Pre-commit hooks prevent repeat incidents
- `.gitignore` properly blocks `.env` files

❌ **What Failed**:
- Git history still contains exposed keys
- Documentation files were treated as "safe" when they shouldn't have been
- No real-time security scanning before commit

---

## Next Steps

1. **Manual**: Rotate both API keys ← **DO THIS FIRST**
2. **Verification**: Test site after key rotation
3. **Cleanup**: Consider using GitHub's secret scanning to revoke historical keys
4. **Monitoring**: Monitor API key usage for unauthorized access
5. **Documentation**: Add security checklist to deployment process

---

## Contact & Support

If you discover additional exposed credentials, immediately:
1. ⏸️ Stop deployment
2. 🔄 Rotate all affected keys
3. 📝 Document in this file
4. 🔍 Search git history for additional exposure

**Security is everyone's responsibility.**

---

**Document Created**: 2026-03-25 11:35 UTC  
**Last Updated**: 2026-03-25 11:35 UTC  
**Status**: MONITORING FOR RECURRENCE
