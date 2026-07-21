# Status — 20 July 2026 (correction appended 21 Jul 2026)

## Correction (21 Jul 2026)

The "askcareer-ai.com" entry below is **inaccurate** and superseded. It claimed a Caddyfile/docker-compose.yml fix existed as uncommitted local changes (`reverse_proxy app:3000`, network alias `app`). Verified 21 Jul 2026: `git status` shows these files clean — no such uncommitted changes exist or ever landed in the working tree. The real, already-committed state (since commit `1fa97ef`, 30 Mar) is `Caddyfile` → `john-career-copilot-app:3000` matching `docker-compose.prod.yml`'s `container_name: john-career-copilot-app` — these two files were already consistent. The actual bug was in `scripts/deploy-to-staging.sh` (wrong compose file target + wrong grep string), fixed 21 Jul 2026. See `docs/todolist/todolist_20Jul2026.md` for the current, verified state.

## JD Automation Portal — Phase 1 (Backend API)

**Status: Built and verified locally. Not deployed anywhere.**

- Runs as `backend/jd_api_server.js` on port 3010, started manually via `npm run dev:jd-api`. Not yet wired into any Docker container or process manager — this is expected, Docker is a later phase.
- All 6 endpoints (`/api/health`, `/api/jd/upload`, `/api/jd/run`, `/api/profile/update`, `/api/history`, `/api/download/*`) exercised against real data on 20 Jul 2026 — see `docs/guides/JDAUTOMATIONAPI_20JUL2026.md` for the full verification log.
- `git status` confirmed zero diff on `backend/server.js`, `docker-compose*.yml`, `Caddyfile`, or any `.env*` file — the live askcareer-ai.com app was not touched or put at risk.
- Known non-issue: hitting `http://localhost:3010/` (bare root) in a browser returns `{"error":"Not found"}` — correct behavior, this is an API-only server with no frontend yet (Phase 2).
- No `/api/profile/update` real implementation yet — returns `501` by design.

## askcareer-ai.com (live production app)

**Status: Fix written locally, not yet deployed or verified on the VPS.**

- Root cause (from `todolist_20260519.md`): Caddy's reverse-proxy target (`john-career-copilot-app:3000`) didn't match the app service's actual network alias, breaking routing after a VPS upgrade.
- Fix present as uncommitted local changes: `Caddyfile` (`reverse_proxy app:3000`), `docker-compose.yml` (network alias `app`), `scripts/deploy-to-staging.sh` (updated grep check).
- **Not yet applied to the live VPS.** Per soul.md §3.1, this cannot be marked done until deployed and the acceptance criteria in `todolist_20260519.md` are confirmed externally (public HTTPS + `/api/health` reachable from outside the VPS).

## New VPS (152.42.214.111 / aitradealgo-demo.com)

**Status: Not provisioned/confirmed.** No deployment has been attempted. SSH access details and current box state (fresh vs. already running something) still need to be confirmed with the user before any deploy action, per the approved Phase 1 plan's explicit out-of-scope note.

## Known open risks / follow-ups

- `python-docx`/`requests` versions pinned in the new root `requirements.txt` (`2.33.0` / `1.2.0`) were verified installed in the existing `.venv` — not yet tested inside a container (Docker phase not started).
- `src/data/john_profile.json` shows local modifications unrelated to this session's work (new trading-platform project entries) — appears to be the user's own concurrent edit in the IDE, not something this session changed. Flagged here for visibility, not treated as a bug.
- Git branch sync (main/dev/staging) for today's changes is in progress as a separate action — see commit history after this status entry for what actually landed where.
