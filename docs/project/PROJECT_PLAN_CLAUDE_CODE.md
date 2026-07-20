“Load docs/project/PROJECT_PLAN_CLAUDE_CODE.md and plan for Phase 1.”

---

# ✅ **PROJECT_PLAN_CLAUDE_CODE.md (Updated for Real Folder Structure)**  
### *Master Skill File for Claude Code — JD Automation Portal*

---

# 📁 **1. Existing Folder Structure (from askcareer-ai.txt)**

Claude Code must use this **exact structure** as the foundation:

```
backend/
backup/
config/
dashboards/
data/
data_processed/
data_raw/
dist/
docs/
etl/
logs/
models/
node_modules/
public/
qa/
reports_html/
scripts/
secrets/
src/
```

Key directories relevant to JD automation:

### **JD Engine**
```
scripts/jd_scorecard_resume.py
data_raw/jd/txt/
data_processed/<Employer>/
src/data/john_profile.json
src/data/jd/*.json
data_raw/resume/txt/JohnHauResume2026_MorganStanley.md
```

### **Frontend**
```
public/
src/
dist/
node_modules/
```

### **Backend**
```
backend/
config/
models/
etl/
logs/
```

Claude Code must **not create new top-level folders** unless explicitly listed in this plan.

---

# 🧠 **2. NLP Module — Update john_profile.json**

Claude Code must create:

```
backend/nlp/update_profile_json.py
```

### Responsibilities:

1. Accept raw text describing new work experience  
2. Use LLM to:
   - Segment bullets  
   - Classify into correct JSON sections  
   - Normalize into your schema  
3. Generate a JSON patch  
4. Apply patch to `src/data/john_profile.json`  
5. Validate structure  
6. Log updates to `logs/profile_updates.log`

**Skill:** `update_profile_json`  
**Input:** Raw text  
**Output:** Updated JSON file

---

# 🏗️ **3. Backend API (Node.js + Python Worker)**

Claude Code must scaffold inside **backend/**:

```
backend/api/
    jd_upload.js
    jd_run.js
    profile_update.js
    history.js
    download.js

backend/python_worker/
    run_jd_pipeline.py

backend/nlp/
    update_profile_json.py
```

### API Endpoints

| Endpoint | Description |
|---------|-------------|
| `POST /api/jd/upload` | Save JD file → correct naming → return metadata |
| `POST /api/jd/run` | Spawn Python script → return scorecard/resume/cover letter |
| `POST /api/profile/update` | NLP → update JSON |
| `GET /api/history` | List processed JDs |
| `GET /api/download/:file` | Serve DOCX/PDF/TXT |

### Python Worker

Wrap your existing script:

```
python scripts/jd_scorecard_resume.py JD_<Employer>_<Role>.txt --llm=sonnet
```

Return:

- Scorecard TXT  
- Resume TXT  
- Cover Letter TXT  
- DOCX paths  
- PDF paths  
- Parsed match score  
- Strengths/gaps summary  

**Skill:** `build_backend_api`

---

# 🎨 **4. Frontend (Next.js or React)**

Claude Code must scaffold inside **src/**:

```
src/web/
    pages/
        index.js
        jd-upload.js
        results.js
        profile-update.js
        dashboard.js
    components/
        JDForm.js
        ScorecardCard.js
        ResumePreview.js
        CoverLetterPreview.js
        FileDownload.js
        DashboardCharts.js
```

### Pages

#### **JD Upload**
- Paste JD  
- Employer  
- Role  
- LLM choice  
- Button: “Generate Application Pack”

#### **Results**
- Scorecard summary  
- Resume preview  
- Cover letter preview  
- Download DOCX/PDF  
- Button: “Add new experience to profile”

#### **Profile Update**
- Paste new experience  
- NLP classification preview  
- Approve → update JSON

#### **Dashboard**
- All processed JDs  
- Match score trends  
- Strength/gap heatmap  
- Employer/role analytics

**Skill:** `build_frontend_portal`

---

# 🧩 **5. Integration Layer**

Claude Code must create:

```
docs/integration/
    connect_frontend_backend.md
    connect_backend_python.md
    connect_nlp_profile.md
```

### Responsibilities:

- Connect Next.js → Express API  
- Connect Express → Python worker  
- Connect NLP → JSON updater  
- Test full JD → Scorecard → Resume → Cover Letter pipeline  
- Test DOCX/PDF generation

**Skill:** `integrate_system`

---

# 🐳 **6. Dockerization**

Claude Code must create:

```
docker/
    Dockerfile.backend
    Dockerfile.frontend
    Dockerfile.python_worker
    docker-compose.yml
```

### Requirements:

- Backend container  
- Frontend container  
- Python worker container  
- Shared volume for `data_raw` and `data_processed`  
- Health checks  
- Logging

**Skill:** `dockerize_project`

---

# 🌐 **7. Deployment to VPS (152.42.214.111)**

Claude Code must create:

```
deploy/
    caddy/Caddyfile
    staging-deploy.md
    github-actions.yml
```

### Requirements:

- Domain: `aitradealgo-demo.com`  
- HTTPS via Caddy  
- GitHub Actions CI/CD  
- Auto-deploy to VPS staging environment  
- Docker Compose up/down  
- Log rotation  
- Systemd service for Docker

**Skill:** `deploy_to_vps`

---

# 🧪 **8. Dev Environment (Windows 11)**

Claude Code must generate:

```
dev/
    setup_win11.md
    local_docker_run.md
    vscode_tasks.json
    vscode_launch.json
```

### Requirements:

- Local Docker Desktop  
- Local Next.js dev server  
- Local Express dev server  
- Python worker integration  
- VS Code debugging tasks  
- Hot reload

**Skill:** `setup_dev_env`

---

# 📦 **9. Final Deliverables**

Claude Code must produce:

### ✔ Full folder structure  
### ✔ All source files  
### ✔ All API routes  
### ✔ All Next.js pages  
### ✔ All Docker files  
### ✔ All deployment scripts  
### ✔ All NLP modules  
### ✔ All integration glue  
### ✔ All documentation

---

# 🚀 **10. Execution Order for Claude Code**

Claude Code must follow this exact order:

1. `scan_repo_structure`  
2. `build_backend_api`  
3. `build_frontend_portal`  
4. `update_profile_json`  
5. `integrate_system`  
6. `dockerize_project`  
7. `setup_dev_env`  
8. `deploy_to_vps`

---


