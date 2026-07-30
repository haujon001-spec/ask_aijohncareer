# JD Automation Portal — Production VPS Deploy (30 Jul 2026)

**Requested:** carried forward since the JD Portal was first built (todolist item 9, "Remaining JD Automation Portal phases: integration, Docker packaging, dev-env docs, VPS deploy"), explicitly picked up this session with the user choosing to go all the way to a live deploy rather than just scope it.

**Status: Done and verified**, with one explicit exception (see "Not verified by this session" below).

## Approach

Used Plan Mode given the size and production risk (live secrets, no in-repo SSH access path, several architecture decisions). Grounded the plan with a read-only Explore agent pass over the actual repo files and a live (read-only) SSH session confirming the VPS's real state, then a Plan agent synthesized a concrete file-by-file plan, reviewed and spot-checked against the real source before execution. Full plan: `C:\Users\haujo\.claude\plans\velvety-whistling-metcalfe.md`.

User confirmed three architecture decisions before planning: (1) use existing local SSH access, (2) same-origin path routing (`/jd-api/*`) rather than a subdomain — avoids any CSP/CORS origin change, and (3) a **separate** Docker image for the JD API + Python, keeping the already-healthy chat-app container untouched.

## Real findings from investigation (not assumed)

- `/opt/john-career-copilot/` on the VPS is **not** a git checkout — populated via tarball/scp. `scripts/deploy-to-staging.sh` (git-based, targets a `.git` that doesn't exist there) is stale and was not extended.
- `backend/api/profile.js` + `backend/lib/profileOps.js` import `shared/profileSchema.js` — a runtime dependency not obvious from `jd_api_server.js` alone, must be copied into the new image.
- `backend/backup.js` writes to `<root>/backup/` — a fourth persistent-state directory alongside `data_raw/`, `data_processed/`, `secrets/`.
- `src/data/` itself must persist across redeploys (JD blueprint cache + `john_profile.json` writes), not just be baked into the image at build time.
- Alpine's Python enforces PEP 668 (`externally-managed-environment`) — a bare `pip install` fails; a venv is required.
- Same-origin path routing does **not** fully bypass CORS — browsers still send `Origin` on same-origin POST/DELETE `fetch()` calls (most JD-portal calls), so `JD_PORTAL_FRONTEND_ORIGIN` still needed the real production origin.

## Changes made (repo)

- **New `Dockerfile.jd-api`**: Node 18-alpine + a Python venv (`/opt/venv`) with `requests`/`python-docx` installed, copies only `backend/`, `shared/`, `scripts/jd_scorecard_resume_v2.py`, `src/data/`. `HEALTHCHECK` hits the real `GET /api/health`.
- **`backend/jd_api_server.js`**: added `app.set('trust proxy', 1)` so the session cookie's `secure` flag reads correctly behind Caddy.
- **`src/utils/jdApi.js`**: `JD_API_BASE` now resolves to `/jd-api` in a Vite production build (`import.meta.env.PROD`), unchanged `localhost:3010` fallback in dev.
- **`Caddyfile`**: `www.askcareer-ai.com` block restructured into an explicit `route { handle_path /jd-api/* {...} ; handle {...} }` so the JD API path and the chat-app catch-all don't rely on Caddy's automatic directive ordering.
- **`docker-compose.prod.yml`**: new `jd-api` service, bind-mounted (not named-volume) state dirs so the real local data persists, no host port published (network-only via `careers`).

All four modified files were backed up first per soul.md golden-rule (`*.20260730_V1.bak`). Committed `fcb99b8`.

## Rollout executed live (soul.md §3.1 — actually run, not just written)

1. Verified SSH access, Docker/Compose versions, current container health, port 3010 free, trading-dashboard PID on :5000, disk space — all read-only checks before touching anything.
2. Built a deploy tarball **excluding `secrets/`** (see security decision below) and `scp`'d it to the VPS.
3. Backed up the VPS directory (`~/backup_pre_jd_portal_20260730_145310.tar.gz`) before extracting.
4. Extracted, created `secrets/` fresh, `chown -R 1001:1001` on all five bind-mount source dirs (container uid).
5. Generated a **fresh** `JD_PORTAL_JWT_SECRET` directly on the VPS via `openssl rand -hex 32`, appended it plus `JD_PORTAL_FRONTEND_ORIGIN`/`JD_RUN_TIMEOUT_MS` to `.env` — never printed the secret value to any terminal output.
6. Built + started `jd-api` in isolation first — confirmed healthy, clean boot log, reachable from inside the `caddy` container over the internal network, before touching any public routing.
7. **Real bug hit and fixed during rollout**: `caddy reload` did not pick up the new `Caddyfile` — `docker-compose.prod.yml` bind-mounts `Caddyfile` as a single file, and `tar -x` replaces files via unlink+create rather than in-place write, so the running container stayed pinned to the old inode. Confirmed via `caddy adapt`'s output (still showing the old flat `reverse_proxy` config) and `cat`ing the file from inside the container (showing old content despite the host file being updated). Fixed with `docker compose up -d --force-recreate caddy` (re-establishes the bind mount) — TLS certs unaffected (persisted in the `caddy_data` named volume, no re-issuance needed, confirmed via `ssl_verify_result: 0` after).
8. Verified `/jd-api/*` routing via curl through the real domain, confirmed the chat app was unaffected throughout.
9. Rebuilt and redeployed `app` last (the one deliberate touch to the working container) — confirmed healthy, confirmed a real chat message still returns a real LLM answer.
10. Real-browser verification (Playwright against the live production domain, not curl): `/portal/enroll` renders correctly, the network tab shows a real `200 /jd-api/api/auth/status` call, zero console errors — confirms the built frontend bundle's `/jd-api` base path, the Caddy routing, and this session's earlier `PortalEnroll.jsx` hardening all work correctly together on the actual production bundle.
11. Verified the Python venv inside `jd-api` directly (`requests`/`python-docx` import successfully, `jd_scorecard_resume_v2.py` compiles) — closes out the PEP-668 packaging risk without requiring a login.
12. Confirmed the unrelated trading-dashboard process on :5000 was never touched (same PIDs before and after).

## Security decision made during rollout, not silently assumed

`secrets/jd_portal_auth.json` (local dev MFA password/TOTP) and `jd_portal_llm_keys.json` (stored LLM API keys) exist locally with real values. Asked the user explicitly rather than guessing: confirmed production should **not** inherit these — it gets a fresh, empty `secrets/` directory and self-provisions on first real use, keeping dev and prod credentials fully separate. The deploy tarball excluded `secrets/` entirely; the directory was created empty, directly on the VPS.

## Not verified by this session — requires the user

The actual authenticated flow (enroll a real production password + TOTP, log in, run a real JD pipeline through the live portal, download a generated `.docx`) was **deliberately left for the user** rather than done by this session, since enrolling would mean this session would come to know John's live production credential. Everything up to and including the unauthenticated surface (`/jd-api/api/health`, `/jd-api/api/auth/status`, the enroll page's real API call) is verified working; the next step is for the user to visit `https://www.askcareer-ai.com/portal/enroll` and complete real enrollment, then exercise a real JD run to close out the very last mile of end-to-end verification.
