# Next session — written 26 October 2026

> **UPDATE (same day): steps 1-5 below are DONE.** Laptop + VPS `app` + `jd-api` all run
> Node v24.22.1 (details in `todolist_26Oct2026.md`, "Node 24 alignment"). Remaining from this
> file: user's real portal login + JD run, then the carried items at the bottom. Rollback tags on
> the VPS: `*:pre_node22` (Node 18 images) and `*:pre_node24` (Node 22 images).
>
> ## NEXT THING TO DO (as of end of 26 Oct 2026)
> 1. **User:** log in to the local portal (password was reset 26 Oct via
>    `docs/guides/JDPORTALPASSWORDROTATION_25JUL2026.md` Method A) and run one real JD end-to-end on
>    Node 24.22.1 (`npm run dev:all`, http://localhost:5173/portal). Then do the same on the VPS
>    portal — NB the VPS has its own `secrets/jd_portal_auth.json`, unaffected by the local reset.
> 2. Decide on `npm audit fix` (24 vulns, mostly dev tooling; edits `package-lock.json`).
> 3. Then the carried top priority: **deploy the `/portal2` epic to the VPS** (decide first whether
>    any non-John profile data ships). Not started.
> ## LLM MODEL REVIEW (26 Oct 2026) — findings + plan, nothing changed yet
> Checked the portal's presets against OpenRouter's live catalog (`https://openrouter.ai/api/v1/models`, public, no key).
> $ per 1M tokens in/out:
> | Preset | Current model | Price | Newer/cheaper available |
> |---|---|---|---|
> | Sonnet | `anthropic/claude-sonnet-5` (Jul 2026) | 2.00 / 10.00 | `claude-sonnet-5.5` (Sep 2026) same price; `claude-haiku-5.5` (Oct 2026) 0.10 / 0.50; `claude-opus-5.5` 4/20 |
> | DeepSeek | `deepseek-v4-flash` (Apr 2026, native API) | 0.091 / 0.182 | `deepseek-v4.1-flash` (Sep 2026) 0.02 / 1.00 (cheaper input, *dearer* output); still the cheapest output |
> | Gemini | `google/gemini-3.1-flash-lite-preview` (Mar 2026, a *preview*) | 0.25 / 1.50 | `gemini-3.8-flash` 0.825/4.125 (newer, dearer); `gemini-4-argon` 2/10 |
> Also: `backend/server.js` chat still uses `deepseek-reasoner` (alias DeepSeek retired 24 Jul 2026) and
> `gemini-3.1-flash-lite-preview`, with fallback text saying "DeepSeek V3.2" — stale; review alongside.
> **Planned feature — dynamic model check from the portal:** add `GET /jd-api/api/models` that fetches the
> OpenRouter catalog (cache ~24h; no key needed), filters by family (anthropic / deepseek / google) and
> drops `:free`/`:batch`/`-vision`/dated snapshots, ranks by newest + price, and returns "recommended"
> + "cheapest". Portal Configure step: a "Check for newer models" button showing current vs latest with
> price, one click to set it as the Custom model (existing Custom… path already accepts any
> `provider/slug`). Keep the 3 presets editable via a small config file (e.g. `config/llm_presets.json`)
> instead of the hard-coded `LLM_CONFIGS` in `jd_scorecard_resume_v2.py`/`v3.py`. DeepSeek's native API
> needs its own ids (`/models` on api.deepseek.com with the key). Quality is NOT measured by price — run a
> real JD on a candidate before switching a default.
>
> Resume with the `/next-session` command (`.claude/commands/next-session.md`).

Read `todolist_26Oct2026.md` first (full record of today's SSH fix, OS patching and Node 22 rollout).

## Decision (user, 26 Oct 2026)
Run the **same, latest, safest Node version everywhere** (laptop + VPS containers).
No downgrades. Target: **Node 24 LTS (Krypton), latest patch — v24.22.1 as of 20 Oct 2026**
(Node 24.22.1 and 22.23.4 were released together; the CVE-2026-111497 Brotli fix is
presumed in both, advisory text not read — verify against nodejs.org security release notes).

## Current state at end of session
| Where | Node | Status |
|---|---|---|
| Laptop | v24.13.0 | **Behind** — needs 24.22.1 |
| VPS `app` + `jd-api` containers | v22.23.4 (`node:22-alpine`) | Patched, but not the same major as laptop |

Laptop upgrade was blocked: `winget upgrade --id OpenJS.NodeJS.LTS` failed with
Windows Installer error 1618 ("another installation in progress", stuck `msiexec`
PID 26152, likely from an interrupted install). User is **rebooting the laptop**
to clear it.

## Steps, in order
1. **Laptop:** after reboot, `winget upgrade --id OpenJS.NodeJS.LTS` -> confirm
   `node -v` = v24.22.1 (new terminal). If 1618 persists: install the v24.22.1 MSI
   from nodejs.org manually.
2. **Laptop verify:** `npm run dev:all` (NOT `npm start dev:all` — no `start` script);
   health-check ports 3000, 3010, 5173; open http://localhost:5173/portal.
   Optionally `npm audit fix` (24 vulns, mostly dev tooling e.g. `concurrently`->`shell-quote`) —
   ask first, it edits `package-lock.json`.
3. **VPS:** change `Dockerfile` and `Dockerfile.jd-api` from `node:22-alpine` to
   `node:24-alpine` (back up first as `archive/<file>.YYYYMMDD_V<n>.bak`; on the VPS tag
   current images `:pre_node24` for rollback). Test locally on Node 24, scp the two
   Dockerfiles (verify sha256), `docker compose -f docker-compose.prod.yml build app jd-api`
   + `up -d app jd-api`. Caddy untouched. Pattern identical to the 26 Oct Node 22 rollout.
4. **VPS verify:** both containers healthy, `docker exec ... node -v` = v24.x matching the
   laptop; `/`, `/portal`, `/api/health`, `/jd-api/api/health` 200; bad login 401; live
   chat call OK; logs clean. (A healthcheck script pattern is in the 26 Oct session.)
5. Note `node:24-alpine` tag resolves to the latest 24.x at build time — record the exact
   resulting version in the todolist so laptop/VPS equality is documented.
6. Update todolist + commit Dockerfile change (do **not** push without asking).

## Still carried (unchanged, NOT started — user said not to start the 26 Aug list yet)
- Deploy `/portal2` multi-profile epic to VPS (decide whether any non-John profile data ships).
- 3 unpushed local commits + `f07cfd9` (Node 22 Dockerfiles) — hold push until user says.
- Untracked `src/data/jd/JD_HospitalAuthority_IT_Manager_Systems.json` needs a decision.
- Remaining 26 Aug backlog (per-user auth, screenshot capture, VPS hardening, etc.).

## Reminders
- Logging in to the portal itself (password + MFA) and running a real JD is still untested
  post-patch; ask user to do one run to close that out.
- VPS rollback tags currently present: `john-career-copilot-{app,jd-api}:pre_node22` (Node 18 images).
- One pending non-security apt package on VPS: `fwupd`.
