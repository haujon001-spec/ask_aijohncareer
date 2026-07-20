# soul.md — Universal Project Constitution (Trading Project)
**Author:** John Hau
**Purpose:** Universal rules, structure, naming conventions, QA requirements, security policies, VS Code templates, and automation scripts for this trading project.
**Scope:** Applies to all code, agents, backtest pipelines, and automation in this repository.
**Created:** 2026-03-17

---

## 1. Universal Folder Structure

This project inherits the universal soul.md structure. Pre-existing directories are mapped below:

```
/trading (project root)
  soul.md
  /data_raw            ← raw OHLCV downloads, market data as received
  /data_processed      ← cleaned / normalized data ready for models
  /data                ← (legacy) OHLCV CSV data — gradually migrate to data_raw/data_processed
  /etl                 ← ETL scripts (e.g. ohlcv_incremental_updater.py lives here)
  /models              ← trained HMM / ML models, serialized state
  /strategies          ← trading strategy code
  /backtesting         ← backtesting engine scripts
  /dashboards          ← generated HTML dashboard files (output)
  /templates           ← (legacy) HTML Jinja templates — link to dashboards/
  /reports_html        ← generated HTML reports
  /reports             ← (legacy) JSON/text reports — HTML outputs go to reports_html/
  /visualizations      ← equity curves and chart HTML outputs
  /qa                  ← QA scripts, validators, test helpers
  /tests               ← (legacy) unit/integration tests — new tests go to qa/
  /scripts             ← utility / automation scripts (EXISTING)
  /logs                ← log files (EXISTING — gitignored)
  /config              ← YAML/JSON configuration files (EXISTING)
  /configs             ← (legacy) alternate config location — consolidate into config/
  /docs                ← documentation and guides
    /docs/setup        ← installation and setup guides
    /docs/guides       ← how-to guides and runbooks
    /docs/status       ← status reports and changelogs
    /docs/architecture ← system design and data-flow diagrams
    /docs/api          ← API contracts and external service docs
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
- No additional top-level folders without updating this soul.md.
- **No `.md` files in the project root** — all documentation lives under `docs/` in category subfolders. `soul.md` is the sole exception.

---

## 2. Naming Conventions

### 2.1 Files
- Scripts: `snake_case`
- Dashboards: `dashboard_<name>_YYYYMMDD.html`
- ETL scripts: `etl_<source>_YYYYMMDD.py`
- Reports: `report_<topic>_YYYYMMDD.html`
- Logs: `log_<process>_YYYYMMDD.txt`
- Backtests: `backtest_<strategy>_YYYYMMDD.py`
- Docs: `DOCUMENTNAME_DDMMMYYYY.md` (e.g. `STARTUPSETUPGUIDE_10MAR2026.md`)

### 2.2 Encoding
- All files MUST be UTF-8.

### 2.3 Numbers in dashboards/reports
- Use human-readable formatting (K/M/B/T) — raw integers are forbidden.

---

## 3. QA & Testing Requirements

### 3.1 Mandatory End-to-End Testing Before Declaring Completion
**CRITICAL RULE:** No code, agent, or task may be marked "complete" or "done" until:
1. **The code has been executed** (not just written)
2. **The execution ran without errors** (no silent failures, no "todo" status)
3. **The output has been verified** (humanly inspected or programmatically validated)
4. **All dependencies have been resolved** (API keys, data files, environment vars all validated)

**This is a UNIVERSAL REQUIREMENT across all projects.** Do not mark work complete until you have personally run the code and confirmed it works.

### 3.2 Full Front-to-Back Testing Required
No code may be merged to `main`/`prod` unless:
1. ETL runs successfully (OHLCV data updated)
2. Data processed without warnings
3. Backtest completes with valid results
4. Dashboard generated and validates
5. HTML report generated
6. QA agent validates outputs
7. Logs updated

### 3.3 Dashboard QA Checklist
The QA agent MUST verify:
- All charts render
- No missing images
- No empty tables
- No raw integers
- Unified controls work
- Top 10 panel present
- AI narrative panel present
- No layout shifts
- Timestamp present and correct

### 3.3 HTML Report QA
- Must load without console errors
- Must include updated data
- Must include updated narrative
- Must include correct date suffix

---

## 4. Security & Secrets Management

### 4.1 API Keys & Credentials
**API keys, tokens, passwords, and credentials MUST NEVER appear in:**
- Source code
- Git commits
- Logs
- Dashboards / Reports
- Comments
- VS Code settings

### 4.2 Storage Rules
- All secrets stored in `/secrets/` (gitignored) or loaded from environment variables
- `.env`, `.env.local`, `.env.vps`, `.env.*` are all gitignored
- Use `python-dotenv` to load at runtime — never hardcode
- Never echo secrets in terminal output

### 4.3 Existing .env files
- `.env.local` — local laptop config (gitignored — DO NOT commit)
- `.env.vps` — VPS config (gitignored — DO NOT commit)
- Rotate any keys that were previously committed (see git history)

---

## 5. VS Code Workspace

Managed in `.vscode/` (committed per soul.md — see `.gitignore`).
- `settings.json` — editor and Python settings
- `tasks.json` — Full QA, dashboard generation, memory gateway tasks
- `extensions.json` — recommended extensions

---

## 6. Pre-Commit Enforcement

Managed via `.pre-commit-config.yaml`:
- Secret scanning (gitleaks)
- YAML/JSON validation
- Folder structure check (`scripts/check_structure.sh`)
- Full QA run (`scripts/run_full_qa.sh`)

---

## 7. Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Stable production-ready code |
| `prod` | Live deployment branch |
| `dev` | Active development |
| `feature/*` | Feature branches off dev |

---

## 8. Universal Principles

- Reproducibility over convenience
- Structure over improvisation
- QA over speed
- Security over shortcuts
- Clarity over cleverness
- Auditability over opacity
- **No hallucinated success — only verified success**

### 8.1 Change Safety and Work Intake

- **🥇 GOLDEN RULE — Never override a working trading strategy in place.** A strategy/engine/optimizer
  that has produced verified results (a golden engine, `markov_dynamic_memory.json`, a passing backtest
  script, a live trader) is treated as immutable. To change its behavior you MUST create a **new dated
  version** (e.g. `backtest_markov_dynamic_equity_v2_YYYYMMDD.py`) rather than editing the proven file.
  Always **back up the important script first** to the relevant `archive/` sub-folder as a dated
  `.YYYYMMDD_V<n>.bak` snapshot before any modification. When in doubt whether a script is "working/golden,"
  assume it is and branch a new version. This protects every verified edge in the repo from silent regressions.
- Before changing an existing working script, create a backup in the relevant `archive/` sub-folder first, and keep the prior version as a dated `.bak` snapshot; for example, archive `backtesting/backtest_sra_v2_1_regime_optimizer_20260527.py` before editing it.
- Before starting implementation, read the latest 3 or 4 todo list files under `docs/todolist/` and the latest 3 or 4 status files under `docs/status/` to understand completed work, current runtime state, and priority order.
- If any requirement, dependency, or intended behavior is unclear, ask for clarification before implementing.
- For every newly implemented feature, write or update a dated guide under `docs/guides/` using the project naming convention.
- During active work sessions, keep the current dated files in sync by updating both `docs/todolist/TODOLIST_<DATE>.md` and `docs/status/STATUS_<DATE>.md` together.
- When deployment is verified as working as expected, commit the changes to Git with a clear message and keep the repo history in sync.

---

## 10. Documentation Rules (V2)

Inherited from Memory Management project conventions:

- All `.md` documentation lives under `docs/` in category subfolders (`setup/`, `guides/`, `status/`, `architecture/`, `api/`, `project/`).
- All docs follow `DOCUMENTNAME_DDMMMYYYY.md` naming, e.g. `STARTUPSETUPGUIDE_10MAR2026.md`.
- Old/superseded docs go to `docs/archive/` — never deleted outright.
- **No `.md` files in project root** — `soul.md` is the only exception.
- Every significant change must be logged in `docs/status/` as a dated entry.

---

## 11. 3-Tier Memory Integration (V2 — Mandatory)

All projects MUST leverage the existing 3-tier memory system as shared infrastructure:

- Use the unified memory API and tier manager defined in the Memory Management project (e.g. `three_tier_manager.py`, `semantic_memory.py`, `daily_indexer.py`).
- New projects MUST integrate with the existing memory gateway (OpenClaw integration, unified API) instead of creating ad-hoc memory layers.
- Any new memory-related feature MUST:
  - Reuse the 3-tier architecture
  - Respect existing indexing and startup scripts (`vscode_startup_memory.ps1`)
  - Document changes under `docs/architecture/` and update the documentation index

---

## 12. Peacock Color Registry (V2)

Every project MUST be assigned a distinct Peacock color. Document in `docs/project/README_*.md`.

| Project | Color Name | Hex |
|---------|-----------|-----|
| Trading Algo (this project) | Trading Blue | `#1E88E5` |
| Memory Management | Memory Purple | `#8E24AA` |
| Dashboard UI | Teal | `#00897B` |

**Rule:** New projects MUST claim a color, add it to this table, and configure it in `.vscode/settings.json` under `peacock.color`.

---

## 13. Dashboard & HTML Embedding Rules (V2)

Every generated HTML dashboard or report MUST include a generation metadata block at the top:

```html
<!-- Generated by: scripts/generate_dashboard.py -->
<!-- Project root: /projects/dev/trading -->
<!-- Deployed URL: https://your-domain.com (if applicable) -->
<!-- Generation timestamp: YYYY-MM-DD HH:MM:SS -->
<!-- Data source: data_processed/ohlcv_*.csv -->
<!-- Commit: <git-hash> -->
```

This is **mandatory** for troubleshooting and traceability. Scripts that generate HTML must inject this block automatically.

---

## 14. Human-Style Visual Verification (V2)

Technical QA alone is insufficient. The checkout process requires visual, human-style verification:

- `scripts/open_local_page.sh` MUST open the generated HTML in a browser and prompt for manual confirmation.
- QA is **not complete** until a human (or human-simulating agent) confirms the page visually.

```bash
# scripts/open_local_page.sh — prompts for visual QA confirmation
HTML_FILE="reports_html/latest_dashboard.html"
xdg-open "$HTML_FILE" 2>/dev/null || open "$HTML_FILE" 2>/dev/null
echo "⚠ Manually verify:"
echo "  - Data is present and correct"
echo "  - Charts, tables, and narratives render properly"
echo "  - No layout shifts or missing elements"
read -p "Type 'yes' to confirm visual QA passed: " confirm
[ "$confirm" = "yes" ] || { echo "❌ Visual QA not confirmed."; exit 1; }
echo "✔ Visual QA confirmed."
```

---

## 15. Anti-Hallucination & Debugging Policy (V2)

> **No agent, script, or process may declare success without full verification.**

- No partial passes.
- No "good enough".
- No silent skipping of failing steps.

If something fails, the rule is:

> **Do not proceed. Debug until all errors are fully resolved.**

Logs MUST clearly show:
- What failed
- What was fixed
- Final verified status

All QA steps (technical + visual §14) must pass before a task is marked complete.

---

## 16. Model & Sub-Agent Delegation (Cost-Aware Intelligence)

Match the model to the job. Spend reasoning capacity where it changes the outcome; economize everywhere else.

- **High-capability model (Opus-class) — use for:** deep/strategic thinking, trading-strategy and risk
  design, golden-engine or optimizer changes, multi-file refactors, debugging subtle logic, architecture
  decisions, anything touching money/positions or the anti-hallucination-critical path, and final review.
- **Cheaper/faster model (Haiku/Sonnet-class sub-agent) — delegate:** mechanical, well-specified, low-risk
  work — boilerplate, file moves/renames, doc/comment formatting, log scraping, simple search/lookup,
  repetitive edits with a clear spec, and first-pass drafts that the high model will review.
- **Rule:** when a task is simple and bounded, hand it to a cheaper sub-agent (with a precise prompt) to
  save cost; keep the strategic and high-stakes work on the high-capability model. Never delegate
  irreversible or money-touching actions to a cheap model without high-model review of the result.

---

## 9. Amendments

Changes to this soul.md must be versioned with a date comment and committed.
| Date | Change |
|------|--------|
| 2026-03-17 | Initial soul.md created — applied Universal Project Constitution (V1) to trading project |
| 2026-03-17 | V2 governance appended — docs structure, 3-tier memory, Peacock registry, HTML embedding, human visual verification, anti-hallucination policy (§§10-15) |
| 2026-03-18 | **§3.1 CRITICAL:** Added mandatory end-to-end testing requirement — no code may be marked "complete" until executed, run without errors, and verified. This is a UNIVERSAL REQUIREMENT across all projects. |
| 2026-03-18 | **Trading Specialization:** Created TRADINGSOUL_18MAR2026.md with trading-specific rules that extend and specialize universal requirements |
| 2026-06-04 | **§8.1 Workflow Sync:** Intake now requires reviewing latest todo + status docs, and active sessions must update both `TODOLIST_<DATE>.md` and `STATUS_<DATE>.md` together. |
| 2026-06-28 | **§8.1 Golden Rule:** Never override a working/golden trading strategy in place — create a new dated version and back up the original first. **§16 added:** Model & sub-agent delegation — high-capability model for strategic/high-stakes work, cheaper sub-agents for simple bounded tasks. |
