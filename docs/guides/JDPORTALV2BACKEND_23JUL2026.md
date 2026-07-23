# JD Portal — v2 Backend Repoint + Command Preview, 23 Jul 2026 (Phase A)

First of a three-phase round of JD Portal work requested 23 Jul 2026 (see `docs/todolist/todolist_23Jul2026.md` "JD Portal v2" section). Phase A is scoped to correctness: the portal was silently running the wrong script. Phase B (company-grouped History accordion) and Phase C (step-wizard redesign + light/dark theme) are separate, larger passes, not done in this session.

## Bug found during scoping

`backend/lib/pythonRunner.js` was hardcoded to `scripts/jd_scorecard_resume.py` (**v1**) — it had never been switched to `_v2.py`, despite v2 existing since 21 Jul 2026 and being the version with all the formatting fixes (`docs/guides/JDSCORECARDRESUMEV2_21JUL2026.md`) and `--ResumeAdjustment` (`docs/guides/JDSCORECARDRESUMEV2_RESUMEADJUSTMENT_22JUL2026.md`). Every resume/cover letter generated through the portal (as opposed to the CLI directly) since Phase 1 has been v1 output: still carrying the "TAILORED RESUME —" prefix, the `Generated :` / `Profile :` boilerplate lines, no bold SMART-achievement markup, and no `--ResumeAdjustment` support at all (the option didn't exist in the portal's request shape).

## Changes

- `backend/lib/pythonRunner.js`: `SCRIPT_REL_PATH` → `scripts/jd_scorecard_resume_v2.py`. `buildRunArgs()` and `runJdPipeline()` gained a `resumeAdjustment` parameter, appending `--ResumeAdjustment` when set.
- `backend/api/jd_run.js`: `POST /api/jd/run` now accepts `resumeAdjustment` (boolean, default `false`) in the request body and forwards it.
- `src/utils/jdApi.js`: `runJd()` now sends `resumeAdjustment`.
- `src/components/JDPortal/JDRunPanel.jsx`: new "Apply Resume Adjustments" checkbox, and a new **Command Preview** field showing the exact CLI invocation that will run (`buildCommandPreview()`, deliberately mirrors `pythonRunner.js`'s `buildRunArgs()`/`MODE_FLAGS` so the two can't drift silently — computed client-side for instant updates as the user changes fields, no round-trip).
- `src/components/JDPortal/JDPortal.css`: `.jd-command-preview` styling (monospace, cyan-on-dark, matches the fintech theme).

All four modified files backed up first per soul.md (`.20260723_V1.bak`).

## Verification (soul.md §3.1/§14 — executed and confirmed, not just written)

Real API-level run (not just UI interaction) against the already-running local dev stack: authenticated via the same temporary-credential-swap + live-TOTP technique used earlier today (approved by user, `secrets/jd_portal_auth.json` backed up and restored immediately after both rounds of testing — confirmed restored each time), then `POST /api/jd/run` with `{ jdFile: "JD_Prudential_IT_AssociateDirector_DataAnalytics.txt", llm: "gemini", mode: "resume", resumeAdjustment: true }`.

- Backend log confirms the actual spawned process: `...jd_scorecard_resume_v2.py ...JD_Prudential....txt --resume-only --ResumeAdjustment --llm=gemini`, and script stdout header reads `JD APPLICATION GENERATOR v2 — John Hau` with `ResumeAdj : existing → data_processed\Prudential\ScoreCard\txt\JD_SCORECARD_Prudential_IT_AssociateDirector_DataAnalytics_22JUL2026.txt` — confirms `--ResumeAdjustment` correctly auto-detected and reused the existing 22 Jul scorecard rather than regenerating one.
- Response body's resume text: title is `PRUDENTIAL | IT_ASSOCIATEDIRECTOR_DATAANALYTICS` (no "TAILORED RESUME —" prefix), zero `Generated :` / `Profile :` lines, zero "27 years" wording ("extensive experience" instead), `**...**` bold-achievement markup present throughout — all v2 behavior, confirming the repoint took effect for real portal-driven output.
- Frontend command-preview check (Playwright, same JD/llm/mode/ResumeAdjustment combination set via the actual form controls): rendered text `python scripts/jd_scorecard_resume_v2.py "data_raw/jd/txt/JD_Prudential_IT_AssociateDirector_DataAnalytics.txt" --resume-only --ResumeAdjustment --llm=gemini` — matches the real spawned argv exactly (differs only in the display-friendly relative JD path vs. the server's resolved absolute path, which is expected). Screenshot confirms clean rendering, no layout issues. Zero console errors in both checks.

**Verification artifacts left in place** (real output for a real JD, doesn't collide with prior runs): `data_processed/Prudential/resume/{txt,docx}/JohnHauResume2026_Prudential_IT_AssociateDirector_DataAnalytics_23JUL2026.*`.

## Not in scope for Phase A

- Company-grouped History accordion (Phase B).
- Step-wizard restructure (Configure → JD Run → Reports) and light/dark theme toggle (Phase C).
- Scorecard's own console-style header (`Profile : src/data/john_profile.json` printed to stdout, and inside the Scorecard document body itself) is unaffected — that was never in scope for the 21 Jul v2 formatting changes (scorecard format is explicitly unchanged, resume/cover-letter only).
