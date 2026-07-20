# Todolist — 20 July 2026

## Context

Two workstreams are active in this repo:
1. **askcareer-ai.com VPS fix** — carried over from `todolist_20260519.md`. A container-naming mismatch (`john-career-copilot-app` vs. `app:3000`) was breaking Caddy → app routing. The fix is written locally (`Caddyfile`, `docker-compose.yml`, `scripts/deploy-to-staging.sh`) but **not yet deployed/verified on the actual VPS**.
2. **JD Automation Portal** — new standalone app per `docs/project/PROJECT_PLAN_CLAUDE_CODE.md`, to be deployed separately to a new VPS (`152.42.214.111`, domain `aitradealgo-demo.com`). Execution order: `scan_repo_structure → build_backend_api → build_frontend_portal → update_profile_json → integrate_system → dockerize_project → setup_dev_env → deploy_to_vps`.

## Completed today (20 Jul 2026)

- [x] **JD Automation Portal — Phase 1: Backend API** (`build_backend_api`)
  - New standalone Express server `backend/jd_api_server.js` (port 3010), fully separate process from the live `backend/server.js` chatbot app — zero diff on any existing app file.
  - Endpoints implemented: `POST /api/jd/upload`, `POST /api/jd/run`, `POST /api/profile/update` (stub — 501), `GET /api/history`, `GET /api/download/*`, `GET /api/health`.
  - Wraps `scripts/jd_scorecard_resume.py` via `child_process.spawn` with mapped CLI flags; discovers output files by scanning `data_processed/<Employer>/` rather than re-deriving the script's date-stamp format.
  - Fixed a real bug found during testing: the Python script crashes on emoji output when spawned as a piped subprocess on Windows (`cp1252` codepage) — fixed via `PYTHONIOENCODING=utf-8` on the child process env, without touching the script itself.
  - Verified end-to-end against real data: upload/409/overwrite, a live scorecard run (`llm=gemini`), a full scorecard+resume+coverletter run, history listing, download + path-traversal/extension guards, concurrent-run 409 lock, all error paths. Test artifacts cleaned up afterward.
  - New guide: `docs/guides/JDAUTOMATIONAPI_20JUL2026.md`.
  - Plan file used: `C:\Users\haujo\.claude\plans\atomic-crunching-valley.md`.

## Outstanding

### JD Automation Portal (remaining phases, per PROJECT_PLAN_CLAUDE_CODE.md §10)
- [ ] Phase 2 — `build_frontend_portal`: Next.js-style pages/components (not started)
- [ ] Phase 3 — real `update_profile_json` NLP module (`backend/nlp/update_profile_json.py`) — currently only a `501` stub endpoint exists
- [ ] Phase 4 — `integrate_system`: connect frontend ↔ backend ↔ NLP, end-to-end pipeline test
- [ ] Phase 5 — `dockerize_project`: `docker/Dockerfile.backend`, `.frontend`, `.python_worker`, `docker-compose.yml`
- [ ] Phase 6 — `setup_dev_env`: Windows 11 dev environment docs, VS Code tasks
- [ ] Phase 7 — `deploy_to_vps`: deploy to `152.42.214.111` / `aitradealgo-demo.com` (requires SSH access details and confirmation of the VPS's current state before any deploy action)

### askcareer-ai.com VPS fix (from todolist_20260519.md — still open)
- [ ] Deploy the container-alias fix (`Caddyfile`, `docker-compose.yml`, `scripts/deploy-to-staging.sh`) to the live VPS and verify per that todolist's acceptance criteria (containers stay up after restart, Caddy resolves `app:3000`, public HTTPS works, `/api/health` responds externally)

### LinkedIn job-search automation (separate workstream — not started)
- [ ] Scope and plan personal-use Playwright browser automation (own logged-in session, human-like pacing, saves JD text into `data_raw/jd/txt/` for the existing pipeline) — confirmed approach, not yet designed in detail

## Priority order
1. Deploy/verify the askcareer-ai.com VPS fix (oldest open item, production-affecting)
2. JD Automation Portal Phase 2 (frontend) so Phase 1's API has a UI to drive it
3. LinkedIn automation scoping
4. Remaining JD Automation Portal phases (NLP, Docker, new VPS deployment)
