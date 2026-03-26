# Git Branching Strategy - March 26, 2026

## Overview
Three-tier branching strategy to separate localhost development from VPS staging and production environments.

---

## Branch Structure

### 1. **`dev` Branch** (Local Development)
- **Purpose**: Active development on laptop (localhost)
- **Environment**: `npm run dev` on port 5173/5174
- **.env file**: `.env.local` (local API keys, database, etc.)
- **Deployment**: NOT deployed to VPS
- **Workflow**:
  - Create feature branches OFF this branch
  - Test locally with `npm run dev`
  - Create PRs to `staging` when ready for VPS testing
  - Development is daily/continuous

### 2. **`staging` Branch** (VPS Pre-Production Testing)
- **Purpose**: Release candidate environment for testing before production
- **Environment**: Docker on VPS with Caddyfile + SSL certificate
- **.env file**: `.env.staging` (staging API keys, may differ from production)
- **Deployment**: Manually deployed to VPS staging server
- **Testing**: Full end-to-end testing happens here
  - ✅ UI/UX rendering with theme toggle
  - ✅ Chat functionality with real LLMs
  - ✅ API integrations working
  - ✅ Mobile responsive 
  - ✅ No console errors
  - ✅ Performance acceptable
- **Workflow**:
  - Merge PRs FROM `dev` branch
  - Run comprehensive testing on VPS
  - After approval and validation, merge to `main`
  - **NO auto-merge** - manual approval required

### 3. **`main` Branch** (VPS Production)
- **Purpose**: Production-ready code running on live VPS
- **Environment**: Docker on VPS with Caddyfile + SSL certificate
- **.env file**: `.env` or `.env.vps` (production API keys)
- **Deployment**: Continuous deployment from `staging` → `main`
  - Only merged FROM `staging` branch after testing
  - Each merge triggers Docker rebuild and restart
- **Stability**: Should always be deployable and stable
- **Workflow**:
  - Only receives merges from `staging`
  - Automatically deploys to live domain
  - All users access this version

---

## Development Workflow

### For Feature Development (Example)

```bash
# 1. Start on dev branch (or create feature branch from dev)
git checkout dev
git pull origin dev

# 2. Create feature branch for isolated work
git checkout -b feature/add-dark-mode

# 3. Make changes, commit locally
git add .
git commit -m "feat: add dark mode toggle"

# 4. Push feature branch to GitHub
git push origin feature/add-dark-mode

# 5. Create Pull Request: feature/add-dark-mode → staging
#    (NOT directly to main)
#    Include: Description, testing steps, screenshots

# 6. Code review + local testing on laptop
#    - npm run dev
#    - Manual UI testing
#    - Browser console check

# 7. Once approved, merge PR
#    - Delete feature branch after merge
#    - Branch now on staging for VPS testing
```

### For Staging Deployment (VPS Testing)

```bash
# On VPS server:
git checkout staging
git pull origin staging

# Update .env.staging with staging API keys
# Run Docker build and restart
docker-compose down
docker-compose up -d --build

# Test in browser at staging domain:
# - UI loads correctly
# - Chat sends/receives messages
# - Theme toggle works
# - No errors in DevTools > Network or Console

# If all tests pass:
git checkout main
git merge staging (or create PR: staging → main)
```

### For Production Deployment (Main)

```bash
# On VPS server:
git checkout main
git pull origin main

# .env already set (.env.vps or .env)
# Docker redeploys with new code
docker-compose down
docker-compose up -d --build

# Verify live domain is working
# Test all features end-to-end
```

---

## Environment Files by Branch

| Branch | File | Storage | Auto-deployed? |
|--------|------|---------|---|
| `dev` | `.env.local` | `.gitignore` ✅ | No |
| `staging` | `.env.staging` | `.gitignore` ✅ | Manual |
| `main` | `.env.vps` or `.env` | `.gitignore` ✅ | Manual |

**CRITICAL**: NEVER commit `.env*` files. Store in `/secrets/` folder locally and manage via VPS directly.

---

## Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Local Development (laptop)                                  │
│                                                             │
│  dev branch                                                 │
│  ├─ npm run dev (port 5173)                               │
│  ├─ .env.local (gitignored)                               │
│  └─ Create feature branches here                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    Create PR to
                    staging branch
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ VPS Staging (pre-production testing)                        │
│                                                             │
│  staging branch                                             │
│  ├─ Docker container (Caddyfile + SSL)                     │
│  ├─ .env.staging (different API keys)                      │
│  ├─ Full E2E testing by human                              │
│  └─ Approval gate (manual merge to main)                   │
└─────────────────────────────────────────────────────────────┘
                           ↓
                    Merge to main
                    (if tests pass)
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ VPS Production (live)                                       │
│                                                             │
│  main branch                                                │
│  ├─ Docker container (Caddyfile + SSL)                     │
│  ├─ .env.vps / .env (production API keys)                  │
│  ├─ Live domain with real users                            │
│  └─ Always stable, always deployable                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Naming Conventions for Feature Branches

When branching off `dev`, use standardized names:

```
feature/add-[feature-name]        (new functionality)
bugfix/fix-[bug-description]      (bug fix)
refactor/[area]-[change]          (code restructuring)
docs/update-[section-name]        (documentation)
test/add-[test-type]-tests        (test additions)
```

**Examples:**
- `feature/add-export-chat`
- `bugfix/fix-mobile-navbar`
- `refactor/simplify-api-calls`
- `docs/update-deployment-guide`
- `test/add-e2e-tests`

---

## Checklist Before Merging Staging → Main

- [ ] All commits from staging tested locally on VPS staging server
- [ ] UI renders correctly (light/dark theme both working)
- [ ] Quick questions dropdown functional
- [ ] Chat sends message and receives response from LLM
- [ ] Model selector switches between Gemini and DeepSeek
- [ ] No console errors (DevTools > Console)
- [ ] No network 404 errors (DevTools > Network tab)
- [ ] Mobile responsive (DevTools > Device Toolbar)
- [ ] Theme preference persists (localStorage)
- [ ] API keys working (no 401/403/500 errors)
- [ ] Performance acceptable (no freezing, smooth scrolling)
- [ ] Production build succeeds: `npm run build`

---

## Rolling Back If Issues Found

### If staging has a critical bug:
```bash
# On staging branch:
git revert <commit-hash>  # Or force-push previous state
git push origin staging

# Test again
docker-compose down && docker-compose up -d --build
```

### If main/production has a critical bug:
```bash
# Emergency hotfix:
git checkout main
git checkout -b hotfix/[bug-description]
# Fix the bug
git commit -m "hotfix: [description]"
# Push hotfix, create PR to staging, test, then merge to main
```

---

## Guidelines

✅ **DO:**
- Use descriptive commit messages
- Create PRs with full descriptions and testing steps
- Always test on VPS staging before merging to main
- Keep commits atomic and focused
- Document breaking changes

❌ **DON'T:**
- Force-push to `main` or `staging` without approval
- Commit `.env` files
- Skip testing on staging
- Merge feature branches directly to main (go through staging first)
- Leave branches cluttering the repo (delete after merge)

---

## Related Documentation
- [VPS_DEPLOYMENT.md](VPS_DEPLOYMENT.md) - Detailed VPS deployment steps
- [soul.md](../soul.md) - Project structure and naming conventions
- [TODOLIST_26MAR2026.md](todolist/TODOLIST_26MAR2026.md) - Current task status
