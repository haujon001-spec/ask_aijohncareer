# Todolist — 20 July 2026 (updated 21 Jul 2026)

## Context

Two workstreams are active in this repo:
1. **askcareer-ai.com VPS deployment** — carried over from `todolist_20260519.md`. Root cause was **not** the Caddyfile/docker-compose.prod.yml pairing (those already matched, committed since 30 Mar — `Caddyfile` → `john-career-copilot-app:3000`, `docker-compose.prod.yml` → `container_name: john-career-copilot-app`). The actual bug was in `scripts/deploy-to-staging.sh`, which ran plain `docker-compose` (targeting the *other*, inconsistent root `docker-compose.yml`, service `john-career-copilot`, no `container_name`) and grepped for the wrong Caddyfile string. **Fixed 21 Jul 2026** — script now consistently targets `docker-compose.prod.yml` and checks for `john-career-copilot-app:3000`. Root `docker-compose.yml` is left in place but unused/not referenced by the deploy path (per user decision 21 Jul).
2. **JD Automation Portal** — new standalone app per `docs/project/PROJECT_PLAN_CLAUDE_CODE.md`. Phase 1 (backend API) done; Phases 2-7 outstanding, including Docker packaging. Per user decision 21 Jul 2026, deployment target changed: reuse `152.42.214.111` (see below) once the career-copilot deploy is live, rather than a separate `aitradealgo-demo.com` VPS — this is a later phase, not blocking the career-copilot deploy.

### ✅ DNS — resolved and verified propagated (21 Jul 2026)

User changed the `askcareer-ai.com` A record from `187.127.118.219` → `152.42.214.111`. Verified via public resolver (`nslookup askcareer-ai.com 8.8.8.8`): **already propagated** — `askcareer-ai.com` and `www.askcareer-ai.com` both resolve to `152.42.214.111`. (A local/corporate resolver on this machine still caches the old answer — not a real blocker, public DNS is correct.)

Note: `aitradealgo-demo.com` now resolves to `187.127.118.219` — the two domains' A records were effectively swapped, not just one domain repointed.

### VPS `152.42.214.111` — inspected 21 Jul 2026 (read-only, before any changes)

This is **not** a fresh box — it's the existing trading-algo VPS (Ubuntu 24.04, DigitalOcean, hostname `ubuntu-s-2vcpu-4gb-amd-sgp1-01`):
- Port 80: default nginx placeholder page only (not real content).
- Port 5000: the actual trading dashboard (`/root/trading/dashboard.py`, Flask/Werkzeug), monitored every 5 min by a cron job (`health_monitor.py`) — currently 500-erroring, unrelated to this work, **left untouched**.
- System `caddy.service` installed but crash-looping for 2 months (`bind: address already in use` vs nginx on :80).
- **Docker not installed.**
- No Let's Encrypt certs present yet.

**User decision (21 Jul 2026): fully repurpose this VPS for askcareer-ai.com.** Approved actions: stop+disable nginx, stop+disable the dead system `caddy.service`, install Docker+Compose, deploy this repo's `docker-compose.prod.yml` stack (app + Dockerized Caddy container claims ports 80/443). The trading dashboard (port 5000) and its cron monitor are explicitly out of scope and must not be touched.

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
- [ ] Phase 7 — `deploy_to_vps`: deploy to `152.42.214.111` under `askcareer-ai.com` (target changed 21 Jul 2026 — see Context) once the career-copilot deploy is live and stable

### askcareer-ai.com VPS deployment (from todolist_20260519.md — CLOSED 21 Jul 2026)
- [x] DNS A record corrected and verified propagated (21 Jul 2026)
- [x] Root cause identified and fixed: `scripts/deploy-to-staging.sh` now targets `docker-compose.prod.yml` consistently and checks for the correct Caddyfile string (21 Jul 2026)
- [x] On VPS: stopped/disabled nginx + dead `caddy.service`, installed Docker+Compose
- [x] Deployed `docker-compose.prod.yml` stack (app + Caddy) to `152.42.214.111`, with real API keys
- [x] Verified all `todolist_20260519.md` acceptance criteria: containers stay up after restart (no name conflicts), Caddy resolves `john-career-copilot-app:3000` internally, public HTTPS works for both `askcareer-ai.com` and `www.askcareer-ai.com` (Let's Encrypt certs issued), `/api/health` responds `200` externally
- [x] Trading dashboard on VPS port 5000 (cron-monitored) confirmed unaffected throughout
- [x] Wrote dated deployment guide: `docs/guides/VPSDEPLOYMENT_ASKCAREERAI_21JUL2026.md`

**Live:** https://www.askcareer-ai.com

### LinkedIn job-search automation (separate workstream — not started)
- [ ] Scope and plan personal-use Playwright browser automation (own logged-in session, human-like pacing, saves JD text into `data_raw/jd/txt/` for the existing pipeline) — confirmed approach, not yet designed in detail

## Priority order
1. ~~Deploy/verify the askcareer-ai.com VPS stack~~ — **done, live 21 Jul 2026**
2. JD Automation Portal Phase 2 (frontend) so Phase 1's API has a UI to drive it
3. LinkedIn automation scoping
4. Remaining JD Automation Portal phases (NLP, Docker, deploy to 152.42.214.111 under askcareer-ai.com)
