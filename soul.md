# soul.md — Universal Project Constitution (Memory Management)
**Author:** John Hau
**Purpose:** Universal rules, structure, naming conventions, QA requirements, security policies, VS Code templates, and automation scripts for this memory management infrastructure project.
**Scope:** Applies to all memory-related code, indexing pipelines, semantic layers, and automation in this repository.
**Created:** 2026-03-17

---

## 1. Universal Folder Structure

This project inherits the universal soul.md structure. Pre-existing directories are mapped below:

```
/memory_management (project root)
  soul.md
  /data_raw            ← raw text inputs, conversation history, unprocessed data
  /data_processed      ← indexed, vectorized, ready for semantic search
  /data                ← (legacy) existing data storage — migrate to data_raw/data_processed
  /etl                 ← ETL scripts (indexing, vectorization, semantic processing)
  /models              ← trained embeddings, semantic models, vector indices
  /dashboards          ← generated HTML monitoring dashboards
  /reports_html        ← generated HTML analysis reports
  /qa                  ← QA scripts, validation, test helpers
  /scripts             ← utility / automation scripts (EXISTING)
  /logs                ← log files (EXISTING — gitignored)
  /config              ← YAML/JSON configuration files (EXISTING)
  /docs                ← documentation and guides
    /docs/setup        ← installation and setup guides
    /docs/guides       ← how-to guides and runbooks
    /docs/status       ← status reports, changelogs, health logs
    /docs/architecture ← memory system design, data-flow diagrams
    /docs/api          ← API contracts for memory layer
    /docs/project      ← project-level READMEs, Peacock color registry
  /secrets             ← credentials, API keys (NEVER committed — gitignored)
  .gitignore
  .pre-commit-config.yaml
  .vscode/
```

### Rules:
- All new files MUST belong to one of the above folders.
- `/secrets/` MUST be Git-ignored.
- All generated dated files MUST include a date suffix: `YYYYMMDD`.
- No `.md` files in project root (except `soul.md`).
- All documentation lives under `docs/` in category subfolders.

---

## 2. Naming Conventions

### 2.1 Files
- Scripts: `snake_case`
- Dashboards: `dashboard_<name>_YYYYMMDD.html`
- ETL scripts: `etl_<source>_YYYYMMDD.py`
- Reports: `report_<topic>_YYYYMMDD.html`
- Logs: `log_<process>_YYYYMMDD.txt`
- Docs: `DOCUMENTNAME_DDMMMYYYY.md` (e.g. `MEMORYARCHITECTURE_10MAR2026.md`)

### 2.2 Encoding
- All files MUST be UTF-8.

---

## 3. QA & Testing Requirements

### 3.1 Full Front-to-Back Testing Required
No code may be merged unless:
1. ETL runs successfully (indexing completes)
2. Data processed without warnings
3. Semantic search validated (returns relevant results)
4. Dashboard generated and validates
5. HTML report generated
6. QA agent validates outputs
7. Logs updated

### 3.2 Memory System QA Checklist
The QA agent MUST verify:
- Indexing completed without errors
- Vector embeddings generated correctly
- Semantic search returns relevant results
- Memory tier isolation maintained
- No memory leaks or orphaned data
- Dashboard shows current index stats
- API latency within acceptable bounds

---

## 4. Security & Secrets Management

### 4.1 Sensitive Data Rules
**API keys, tokens, passwords, and training data samples MUST NEVER appear in:**
- Source code
- Git commits
- Logs (except error hashes)
- Dashboards / Reports
- Comments
- VS Code settings

### 4.2 Storage Rules
- All secrets stored in `/secrets/` (gitignored)
- `.env`, `.env.local`, `.env.*` are all gitignored
- Use environment variables at runtime
- Never echo secrets in terminal or logs

---

## 5. VS Code Workspace

Managed in `.vscode/` (committed per soul.md — see `.gitignore`).

---

## 6. Pre-Commit Enforcement

Managed via `.pre-commit-config.yaml`:
- Secret scanning (gitleaks)
- YAML/JSON validation
- Folder structure check (`scripts/check_structure.sh`)
- Full QA run (`scripts/run_full_qa.sh`)

---

## 7. 3-Tier Memory Integration (Critical)

This project IS the 3-tier memory infrastructure referenced in soul.md §11 across all projects.

- **Tier 1 (User memory):** Persistent notes across workspaces — stored in file system
- **Tier 2 (Session memory):** Current conversation context — stored in memory
- **Tier 3 (Repo memory):** Repository-scoped facts — stored in .memories/ per project

**All projects must integrate with this as the unified API.**

---

## 8. Peacock Color

**Memory Purple** — `#8E24AA`

Configure in `.vscode/settings.json`:
```json
{
  "peacock.color": "#8E24AA",
  "workbench.colorCustomizations": {
    "titleBar.activeBackground": "#8E24AA"
  }
}
```

---

## 9. Universal Principles

- Reproducibility over convenience
- Structure over improvisation
- QA over speed
- Security over shortcuts
- Clarity over cleverness
- Auditability over opacity
- No hallucinated success — only verified success

---

## 10. Amendments

Changes to this soul.md must be versioned with a date comment and committed.

| Date | Change |
|------|--------|
| 2026-03-17 | Initial soul.md created — applied Universal Project Constitution to memory_management project |
