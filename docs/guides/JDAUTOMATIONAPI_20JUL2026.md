# JD Automation Portal — Backend API (Phase 1)

**Date:** 20 Jul 2026
**Status:** Backend API implemented and verified end-to-end. Frontend, Docker, real NLP profile-updater, and VPS deployment are later phases (see `docs/project/PROJECT_PLAN_CLAUDE_CODE.md`).

## What this is

A standalone Express API that wraps `scripts/jd_scorecard_resume.py` behind HTTP endpoints, so a future frontend (and eventually the deployed portal at `aitradealgo-demo.com`) can upload a JD, run the scorecard/resume/cover-letter pipeline, browse history, and download outputs — without a terminal.

This is a **separate process from `backend/server.js`** (the live askcareer-ai.com chatbot). Nothing in that app, `docker-compose*.yml`, or `Caddyfile` was touched. See `docs/project/PROJECT_PLAN_CLAUDE_CODE.md` for the full multi-phase plan and the plan file used to build this phase at `C:\Users\haujo\.claude\plans\atomic-crunching-valley.md`.

## Running it

```bash
npm run dev:jd-api
# or: node backend/jd_api_server.js
```

Listens on `JD_API_PORT` (default `3010`). Reuses `OPENROUTER_API_KEY`/`DEEPSEEK_API_KEY` from `.env.local`/`.env.vps`/`.env` — no new secrets. See `.env.jd_api.example` for the full list of optional vars (`JD_API_PORT`, `JD_RUN_TIMEOUT_MS`, `PYTHON_BIN`).

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Service status |
| POST | `/api/jd/upload` | `{ employer, role?, jdText, overwrite? }` → saves to `data_raw/jd/txt/` as `JD_<Employer>_<RoleSlug>.txt`. 409 on existing file unless `overwrite:true`. |
| POST | `/api/jd/run` | `{ jdFile, llm, mode, refreshBlueprint?, generateDocx? }` → spawns `jd_scorecard_resume.py` with mapped flags, returns generated content + `downloadUrls`. `llm`: `sonnet`\|`deepseek`\|`gemini`. `mode`: `all`\|`scorecard`\|`resume`\|`coverletter`. Single-run lock (409 if one is already in flight). |
| POST | `/api/profile/update` | Stub — returns `501`. Real NLP profile-updater is a later phase. |
| GET | `/api/history` | Scans `data_processed/<Employer>/` for past runs, newest first. Optional `?employer=`/`?limit=`. |
| GET | `/api/download/*` | Serves a `.txt`/`.docx`/`.pdf` file from `data_processed/`, with path-traversal and extension guards. |

## Known gotcha fixed during verification

`jd_scorecard_resume.py` prints emoji to stdout. When spawned as a **piped child process on Windows** (as this API does), Python inherits the console's `cp1252` codepage instead of UTF-8 and crashes on the first emoji — this does not happen when a human runs the script directly in a UTF-8-configured terminal. Fixed by setting `PYTHONIOENCODING=utf-8`/`PYTHONUTF8=1` on the spawned child's environment in `backend/lib/pythonRunner.js`. The Python script itself was not modified.

## Files

```
backend/jd_api_server.js       # standalone entrypoint, own port
backend/lib/loadEnv.js          # .env.local → .env.vps → .env fallback loader
backend/lib/pathGuard.js         # path-traversal-safe resolver + extension whitelist
backend/lib/jdNaming.js           # shared JD_<Employer>_<Role> naming helpers
backend/lib/pythonRunner.js        # spawn, timeout, output discovery, scorecard parsing
backend/api/jd_upload.js
backend/api/jd_run.js
backend/api/profile_update.js
backend/api/history.js
backend/api/download.js
requirements.txt                # requests==2.33.0, python-docx==1.2.0 (matches .venv)
.env.jd_api.example
```

## Verified (20 Jul 2026)

Ran against real data in `.venv`/`data_raw/jd/txt/`: health check; upload + duplicate 409 + overwrite 201; a real `llm=gemini` scorecard-only run against an existing JD (match score/strengths/gaps parsed correctly); a full `mode=all` run (scorecard+resume+coverLetter all produced); history listing (legacy flat dirs correctly excluded); download success/traversal-blocked/bad-extension/404; two overlapping runs correctly produced a 409 on the second; error paths (missing body, bad `llm`, unknown `jdFile`, traversal in `jdFile`) all return 400/404 with no subprocess spawned. `git status` confirmed zero diff on any existing app file. Test artifacts (`TestCo` uploads/outputs) were cleaned up after verification.
