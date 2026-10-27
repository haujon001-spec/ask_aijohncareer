# Next session — written 26 October 2026 (session closed; resume with `/next-session`)

> ## UPDATE 27 Oct 2026 (end of day) — DEPLOYED TO VPS (record: `docs/guides/VPSDEPLOY_27OCT2026.md`)
> PDF/`docx_render` fix, screenshot capture, LinkedIn link option, `/portal2` code and earlier unshipped portal changes are LIVE (48 files, hash-verified; rollback tags `*:pre_capture`).
> Screenshot capture verified from the VPS. **LinkedIn link is refused from the VPS (datacenter IP) — works on the laptop only.** Sync stays laptop-only. Nothing pushed to GitHub.
> **Still open:** (1) press Sync to reconcile ~160/47 differing files (per-company conflict choices for FWD, HKEX, Manulife); (2) decide whether to hide the LinkedIn-link button on the live site (it only shows a "use screenshots" message there); (3) real-phone test of screenshots; (4) decide the non-John-data question before enabling profile onboarding on the VPS (script intentionally not in the image); (5) old docx files still contain `**` (rebuild with `scripts/docx_render.py` if wanted); (6) GitHub push of the local commits (not requested).
>
> ## UPDATE 27 Oct 2026 (later) — JD SCREENSHOT CAPTURE built + verified locally (guide: `docs/guides/JDSCREENSHOTCAPTURE_27OCT2026.md`)
> Haiku 5.5 vision, /portal Configure step, fills the JD box for review, images never stored. Real-model UI test: 100% word recall, 0 dupes.
> **Open:** (1) try it on the real phone via `npm run dev:lan` (allow node.exe through Windows Firewall, Private); (2) **deploy to VPS awaits the user's explicit go** (rebuild `app` + `jd-api`; also ships the earlier PDF/Sync changes; `docx_render.py` COPY already in `Dockerfile.jd-api`); (3) `/portal2` has no capture option.
>
> ## UPDATE 27 Oct 2026 — PDF-in-portal, `**` fix and Sync are BUILT + verified locally (guide: `docs/guides/PDFPORTALANDSYNC_27OCT2026.md`)
> Prod login was reset by the user (VPS steps recorded in `JDPORTALPASSWORDROTATION_25JUL2026.md`). Sync design answers: conflicts per
> company, everything (txt+docx+pdf), laptop portal only, JD json synced, outputs + JD inputs.
> **Open / for next session:**
> 1. **Restart the dev server and click through the real login-gated portal** (PDF checkbox, Convert to PDF, Sync tab) — verified only via an auth-stubbed harness.
> 2. **No real sync has been run.** Preview shows ~160 laptop-only / ~47 VPS-only / 5 differing files (FWD x2, HKEX, Manulife x2 conflict). User to press Sync and choose per-company winners.
> 3. **Deploy** (not done): `Dockerfile.jd-api` now COPYs `scripts/docx_render.py` (required, else v2 import fails on the VPS); rebuild `app` + `jd-api`. PDF convert/Sync are hidden on the VPS by design.
> 4. Old docx files still contain `**`; rebuild with `scripts/docx_render.py <folder>` only if the user wants (overwrites docx; manual edits lost; archive copy kept).
> 5. `/portal2` (v3 script) has no PDF wiring and still uses its own old docx writer.
> 6. Decide whether to commit/ignore the 6 untracked JD json files (they now sync, they are not in git). `soul.md` still has an uncommitted edit of the user's.

> **Closing note (26 Oct 2026):** Pushed through `6245c62` + this doc commit. VPS = Node 24.22.1 + new model presets (model-only deploy, /portal2 still pending). Benchmark: DeepSeek Pro full-run was NOT completed (stopped at close; earlier scorecard-only test: 264 s vs Flash 76 s) — optional to re-run. New untracked files left from portal runs, not committed: `src/data/jd/JD_Manulife_AVP_Technology_Asia_Strategy_and_Engineering.json`, `src/data/jd/JD_XXXAmbition_VP_Technology_Cloud_Workspace.json` (plus the pre-existing Hospital Authority one) — decide commit/discard. `soul.md` has an uncommitted modification and `CLAUDE.md` is untracked (pre-existing).

> ## PLANNED FOR 27 Oct 2026 — add the PDF feature to the web portal
> CLI side is DONE + committed 26 Oct: `scripts/jd_scorecard_resume_v2.py --pdf` (PDF alongside each new docx) and
> `--docx-to-pdf=<docx file|folder>` (convert existing docx); guide `docs/guides/DOCXTOPDF_26OCT2026.md`. Engine = Word COM
> (laptop only). **Portal work still to do:**
> 1. Reports step: "Download PDF" / "Convert to PDF" button per document (and a "Generate PDF too" checkbox on the JD Run step that passes `--pdf` via `pythonRunner.js`).
> 2. Backend: jd-api route to list/serve `data_processed/<Employer>/<Type>/pdf/*.pdf` and trigger `--docx-to-pdf=` for one file (path-validate under `data_processed/`, same guard as existing report routes).
> 3. **VPS blocker:** the `jd-api` image is Linux/alpine — no Word. `--pdf` there degrades to a warning (no crash) but makes no PDF. Decide: add LibreOffice to `Dockerfile.jd-api` (`apk add libreoffice` + fonts; bigger image, rebuild jd-api only) vs. laptop-only PDFs synced over (ties into the sync feature below). Fonts: check the PDF looks like the Word one.
> 4. Verify in browser (Playwright) on local portal, then deploy per the scp pattern; update guide + todolist.
>
> **UPDATE (same day): steps 1-5 below are DONE.** Laptop + VPS `app` + `jd-api` all run
> Node v24.22.1 (details in `todolist_26Oct2026.md`, "Node 24 alignment"). Remaining from this
> file: user's real portal login + JD run, then the carried items at the bottom. Rollback tags on
> the VPS: `*:pre_node22` (Node 18 images) and `*:pre_node24` (Node 22 images).
>
> ## NEXT THING TO DO (as of end of 26 Oct 2026)
> 1. **PARTLY DONE (26 Oct, user-confirmed):** local portal login + a real JD run with **Haiku 5.5** works as expected. Still to check: same on the live VPS portal, and a Sonnet 5.5 / DeepSeek Flash/Pro run via the portal UI. (original note follows) log in to the local portal (password was reset 26 Oct via
>    `docs/guides/JDPORTALPASSWORDROTATION_25JUL2026.md` Method A) and run one real JD end-to-end on
>    Node 24.22.1 (`npm run dev:all`, http://localhost:5173/portal). Then do the same on the VPS
>    portal — NB the VPS has its own `secrets/jd_portal_auth.json`, unaffected by the local reset.
> 2. Decide on `npm audit fix` (24 vulns, mostly dev tooling; edits `package-lock.json`).
> 3. Then the carried top priority: **deploy the `/portal2` epic to the VPS** (decide first whether
>    any non-John profile data ships). Not started.
> ## LLM MODEL REVIEW (26 Oct 2026) — presets updated locally, NOT deployed; checker still to build
> Done + verified locally (see `docs/guides/LLMMODELREFRESH_26OCT2026.md`): Sonnet -> `claude-sonnet-5.5`;
> Gemini preset replaced in the UI by **Haiku 5.5** (`haiku`, $0.10/$0.50); chat backend moved off the retired
> `deepseek-reasoner` and the Gemini preview. User decisions: Haiku as the cheap option; checker = **suggest only**.
> **Open items:**
> 1. ~~Top up DeepSeek~~ DONE (USD 20 topped up; verified). DeepSeek presets now Flash (cheap, `deepseek-flash`) + Pro (deep thinking, `deepseek-v4-pro`, effort high) — see guide addendum. Check the VPS's own DeepSeek key balance/account when deploying.
> 2. ~~Deploy the model changes to the VPS~~ DONE 26 Oct 2026 (model-only, patched in place; /portal2 still undeployed). Rollback tags `*:pre_models`. See guide.
> 3. Build the **dynamic model checker** (suggest-only): `GET /jd-api/api/models` reads OpenRouter's public catalog
>    (cache ~24h), filters to anthropic/deepseek/google, drops `:free`/`:batch`/`-vision`/dated snapshots, ranks by
>    newest + price, returns "current vs latest" with price. Configure step gets a "Check for newer models" button;
>    click sets it as the Custom model (existing Custom… path takes any `provider/slug`). Move presets from hard-coded
>    `LLM_CONFIGS` (v2/v3/update_profile + llmClient.js + pythonRunner.js) into one `config/llm_presets.json`.
>    DeepSeek-native ids need `api.deepseek.com/models` + key. Price != quality: test on a real JD before switching a default.
> 4. Reasoning-token cost: both Claude models hit the length-retry on resumes — consider a higher first-try `max_tokens`
>    for Resume, and/or `reasoning` effort params via OpenRouter, to avoid paying for a truncated first attempt.
> 5. Trim the DeepSeek key prefix logged by `backend/server.js` at startup.
>
> ## NEW FEATURE REQUEST (user, 26 Oct 2026) — one-button two-way sync, local laptop <-> VPS
> **Goal:** newly generated resumes, scorecards and cover letters (and the JD inputs behind them) can be
> synced between the laptop and the VPS with ONE button, in either direction (local -> VPS and VPS -> local).
> **Why it's needed (measured 26 Oct):** the two sides have drifted — folders in `data_processed/`: laptop 28 vs VPS 18;
> JD text files in `data_raw/jd/txt/`: 34 vs 25; JD json in `src/data/jd/`: 33 vs 23. Today the only way across is manual scp.
> **What syncs (all already bind-mounted into the `jd-api` container, so no rebuild needed):**
> - `data_processed/<Employer>/{ScoreCard,resume,CoverLetter}/{txt,docx,pdf}` — the generated outputs (main target)
> - `data_raw/jd/txt/*.txt` and `src/data/jd/*.json` — the JD inputs and their cached blueprints
> **What must NOT sync by default (guard-rails):** `secrets/` (password hash, TOTP, stored API keys), `.env*`,
> `src/data/john_profile.json` and other profile folders (one-way, explicit, with backup + diff first — see the
> 30 Jul profile version-history feature), `data_processed/<other-person>/` such as MatinaFung/AlexRivera (the open
> "does non-John data ship to production" decision applies here too), the `ZZModelTest` scratch folder.
> **Suggested design (to confirm with user before building):**
> 1. Portal button **"Sync"** (Reports step or header) with a direction toggle: Push (local -> VPS) / Pull (VPS -> local).
> 2. **Dry-run preview first:** list of new / changed / identical / conflicting files per employer, counts and sizes; user clicks Confirm.
> 3. **Never overwrite silently:** copy only files that are new or newer; on a conflict (same name, different content, both
>    changed) keep both (suffix `.from_vps` / `.from_local`) and flag it; every overwrite is backed up first
>    (`.YYYYMMDD_V<n>.bak`, per soul.md golden rule); deletions are never propagated.
> 4. **Mechanism options:** (a) laptop-side script/endpoint using `rsync`-over-SSH or `scp` with the existing SSH key (simplest,
>    the button lives in the LOCAL portal and drives both directions from the laptop); (b) an authenticated VPS endpoint that
>    streams a tar of changed files (needed if the live VPS portal should also trigger it). Recommend (a) first.
>    The VPS root SSH key must never be exposed to the browser or stored in the portal; use the laptop's own key only.
> 5. Verify with sha256 per file after transfer, show a result summary (copied / skipped / conflicts / failed), log it
>    to `logs/` — no hallucinated success: the summary must come from actual hash checks.
> 6. Tests: dry-run on current drift (expect ~10 new folders each way), round-trip one throwaway employer folder, conflict case,
>    confirm secrets/ and profile files are untouched, confirm container still healthy afterwards.
> **HOW TO ASK (user instruction, 26 Oct 2026): at the start of next session ask these questions ONE BY ONE, in
> multiple-choice format (AskUserQuestion, one question per call, wait for the answer before the next), in this order:**
> | # | Question | Suggested choices |
> |---|---|---|
> | 1 | Which side wins when the same file differs on both? | Laptop wins (Recommended) / VPS wins / Keep both, flag conflict / Ask me per file |
> | 2 | What file types sync? | Everything: txt + docx + pdf (Recommended) / Text only / docx + pdf only |
> | 3 | Who can trigger the sync? | Laptop portal only (Recommended) / Laptop + live VPS portal |
> | 4 | The 3 untracked JD json files (Manulife, XXXAmbition, Hospital Authority)? | Sync them / Keep local only / Commit to git first / Discard |
> | 5 | What gets synced? | Generated outputs only / Outputs + JD inputs (Recommended) / Outputs + inputs + blueprints |
> Then restate the chosen design in 3-4 lines and get a go-ahead before implementing (soul.md §8.1).
>
> **Questions to ask the user at the start of that session:** (1) which side is the source of truth for conflicts;
> (2) include DOCX/PDF binaries or text only; (3) should the live VPS portal also be able to trigger it, or laptop only;
> (4) are the Manulife / XXXAmbition / Hospital Authority JD json files meant to be synced or kept local;
> (5) sync the JD inputs (`data_raw`, `src/data/jd`) or only generated outputs.
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
- VPS rollback tags now: `john-career-copilot-{app,jd-api}:pre_models` only.
- ~~fwupd pending~~ done; old `pre_node22`/`pre_node24` rollback images removed 26 Oct (housekeeping).
