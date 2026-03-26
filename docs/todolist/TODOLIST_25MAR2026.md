# Todo List - March 26, 2026

## ✅ COMPLETED TODAY (March 26, 2026)

### Model & UI Improvements
- [x] **Replace Liquid LFM with Mistral 7B Instruct** - More reliable, less hallucination, faster (2-4s)
  - Model changed from `liquid/lfm-2.5-1.2b-thinking:free` to `mistralai/mistral-7b-instruct:free`
  - Better quality for career/resume questions
  - DeepSeek R1 kept unchanged for advanced reasoning
- [x] Fixed LinkedIn button URL: `https://linkedin.com/in/johnhau` → `https://www.linkedin.com/in/john-hau/`
- [x] Updated 13 new quick questions in SidebarIntro component (career-focused, structured)

### Files Modified
- [x] `backend/server.js` - Updated LLM config from Liquid LFM to Mistral 7B
- [x] `src/App.jsx` - Updated model display name from "Liquid LFM 2.26B" to "Mistral 7B Instruct"
- [x] `src/components/SidebarIntro.jsx` - Fixed LinkedIn URL + Updated 13 quick questions

### Live Status
- [x] www.askcareer-ai.com ✅ **FULLY WORKING**
- [x] Mistral 7B Instruct: ✅ New Primary Model (2-4s, better quality)
- [x] DeepSeek R1: ✅ Advanced Reasoning Model (4-6s)

---

## 🎯 PRIORITY 1 - TOMORROW (March 26, 2026)

### ROOT FOLDER CLEANUP (soul.md §1 - Universal Folder Structure)

**Objective**: Reorganize root directory to comply with soul.md rules.

**Rule Reference** (soul.md §1):
```
- All new files MUST belong to one of the designated folders
- /secrets/ MUST be Git-ignored
- All generated dated files MUST include date suffix: YYYYMMDD
- NO .md files in project root (except soul.md)
- All documentation lives under docs/ in category subfolders
```

#### 1a. Move Root `.md` Files to `docs/`
- [ ] `DEPLOYMENT_AUDIT_REPORT.md` → `docs/status/DEPLOYMENT_AUDIT_REPORT_25MAR2026.md`
- [ ] `DEPLOYMENT_STATUS_25MAR2026.md` → `docs/status/` (already dated, just reorganize)
- [ ] `DEPLOYMENT_STATUS_LIVE_25MAR2026.md` → `docs/status/`
- [ ] `OPTIMIZATION_COMPLETE_25MAR2026.md` → `docs/status/`
- [ ] `SECURITY_INCIDENT_25MAR2026.md` → `docs/status/` (or `docs/guides/` for incident response)
- [ ] `VPS_DEPLOY_NOW.md` → `docs/guides/VPS_DEPLOYMENT_QUICK.md`
- [ ] `LIVE_DEPLOYMENT.txt` → `docs/status/LIVE_DEPLOYMENT_25MAR2026.txt`
- [ ] `KEY_ROTATION_INSTRUCTIONS.md` → `docs/guides/KEY_ROTATION_PROCEDURES.md`

#### 1b. Organize Root `.py` Test Scripts → `qa/`
- [ ] `test_all_models.py` → `qa/test_all_models.py`
- [ ] `test_alternatives.py` → `qa/test_alternatives.py`
- [ ] `test_api_keys.py` → `qa/test_api_keys.py`
- [ ] `test_backend.py` → `qa/test_backend.py`
- [ ] `test_free_models.py` → `qa/test_free_models.py`
- [ ] `test_liquid_lfm.py` → `qa/test_liquid_lfm.py`
- [ ] `test_llms_detailed.py` → `qa/test_llms_detailed.py`
- [ ] `test_model_performance.py` → `qa/test_model_performance.py`
- [ ] `test_new_models.py` → `qa/test_new_models.py`
- [ ] `test_openrouter_audit.py` → `qa/test_openrouter_audit.py`
- [ ] `test_openrouter_direct.py` → `qa/test_openrouter_direct.py`
- [ ] `test_perf_comparison.py` → `qa/test_perf_comparison.py`
- [ ] `test_stepfun_direct.py` → `qa/test_stepfun_direct.py`
- [ ] `test_stepfun.py` → `qa/test_stepfun.py`
- [ ] `test_two_models.py` → `qa/test_two_models.py`
- [ ] `quick_test.py` → `qa/quick_test.py` (or keep in root as quick reference?)

#### 1c. Organize Root Audit Scripts → `qa/`
- [ ] `audit_deployment.py` → `qa/audit_deployment.py`
- [ ] `audit_free_deployment.py` → `qa/audit_free_deployment.py`
- [ ] `audit_free_llms.py` → `qa/audit_free_llms.py`
- [ ] `audit_llm_mismatch.py` → `qa/audit_llm_mismatch.py`
- [ ] `comprehensive_audit.py` → `qa/comprehensive_audit.py`
- [ ] `final_audit.py` → `qa/final_audit.py`

#### 1d. Organize Root Deployment Scripts → `scripts/`
- [ ] `deploy-herenow.ps1` → already in `scripts/` (verify location)
- [ ] `deploy-vps.sh` → `scripts/deploy-vps.sh` or `scripts/deploy_vps.sh` (standardize naming)
- [ ] `rotate_keys_vps.py` → `scripts/rotate_keys_vps.py`

#### 1e. Clean Up Root Level Test Files (JavaScript)
- [ ] `test-mobile-viewport.js` → `qa/test-mobile-viewport.js`
- [ ] `test-static-files.js` → `qa/test-static-files.js`

#### 1f. Other Root Files
- [ ] `Caddyfile` → Keep in root (infrastructure config, commonly expected at root)
- [ ] `docker-compose.prod.yml` → Keep in root (infrastructure)
- [ ] `docker-compose.yml` → Keep in root (infrastructure)
- [ ] `Dockerfile` → Keep in root (infrastructure)
- [ ] `package.json` → Keep in root (npm standard)
- [ ] `vite.config.js` → Keep in root (Vite standard)
- [ ] `index.html` → Keep in root (frontend entry point)

#### 1g. Verify .gitignore Rules (soul.md §4)
- [ ] Confirm `.env*` is gitignored
- [ ] Confirm `/secrets/` is gitignored
- [ ] Confirm `/logs/` is gitignored
- [ ] Confirm `node_modules/` is gitignored
- [ ] Verify VPS_DEPLOYMENT.md not tracked (has exposed keys per soul.md §3)

#### 1h. Git Operations
- [ ] Stage all moved files
- [ ] Commit with message: `chore: Reorganize root folder per soul.md §1 standards`
- [ ] Push to GitHub
- [ ] Test that deployment still works after restructuring

---

## 🎯 PRIORITY 2 - MARCH 26 (AFTER CLEANUP)

### Mobile UI/UX - Quick Questions Dropdown Menu

**Task**: Convert sidebar "Quick Questions" buttons to dropdown menu  
**Files to Modify**:
- `src/components/SidebarIntro.jsx` - Change button components to select/dropdown
- `src/components/SidebarIntro.css` - Style dropdown for mobile

**Expected Outcome**: 
- Frees 40-60px vertical space on mobile
- Improves chat window prominence
- Smooth dropdown animations
- Quick question selection populates input & submits

**Acceptance Criteria**:
- [ ] Dropdown displays by default when collapsed
- [ ] Click expands to show all quick questions
- [ ] Selection populates message input
- [ ] Message auto-submits on selection (configurable)
- [ ] Mobile tested (iOS Safari, Chrome Android)
- [ ] Animations smooth under 300ms
- [ ] No layout shift on dropdown toggle

---

## 📝 Notes

- **Current Time**: March 25, 2026, 13:10 UTC
- **Deployed**: www.askcareer-ai.com ✅
- **API Keys**: All rotated after incident (soul.md §3)
- **Security**: Pre-commit hooks active to prevent key exposure
- **Next Review**: March 26, 2026 (09:00 UTC) - Start with root cleanup

---

## 🚀 Long-Term Backlog

- [ ] TypeScript migration (optional)
- [ ] Unit tests for backend API routes
- [ ] E2E tests for chat workflows
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] Analytics dashboard (chat metrics, usage patterns)
- [ ] Multi-language support (i18n)
- [ ] Dark/Light theme toggle
- [ ] Chat history export (PDF, JSON)
