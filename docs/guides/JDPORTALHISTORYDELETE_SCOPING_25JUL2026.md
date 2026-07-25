# JD Portal — History Delete: Scoping, 25 Jul 2026

Scoping record for adding a delete capability to Run History (`JDHistoryList.jsx`), logged per soul.md intake. **Not implemented yet** — this documents the architecture and decisions needed before a future implementation session, so that session doesn't need to re-scope from scratch.

## Confirmed decision

**"Delete a company" removes outputs only** — `data_processed/<Company>/` (generated scorecards/resumes/cover-letters, all of `ScoreCard/`, `resume/`, `CoverLetter/`, each with `txt/`, `docx/`, and `pdf/` subfolders). It does **not** touch:
- `data_raw/jd/txt/JD_<Company>_<Role>.txt` — source JD text (reusable across reruns of the same role).
- `src/data/jd/JD_<Company>_<Role>.json` — the blueprint cache (also reusable; deleting it just forces a blueprint regeneration on next run).

Rationale: source JD + blueprint are per-*role* reusable inputs, not per-run outputs; a company can have multiple roles, and deleting history shouldn't force re-uploading the original JD text to run it again later.

## Current architecture (read, not yet modified)

- **`src/components/JDPortal/JDHistoryList.jsx`** — history is a **flat, per-run list** from `GET /api/history` (`backend/api/history.js`), grouped client-side by `groupByCompany()` into `{ employer, jobs: [...] }`. No stable server-side run ID — a run is identified by `(employer, roleTag, date)`, derived from filenames.
- **Header rows are literal `<button>` elements** (`jd-history-card-header`, `jd-history-job-header`) — a delete icon can't be nested inside without first converting them to `CollapsibleCard.jsx`'s `<div role="button" tabIndex={0} onKeyDown={...}>` pattern (already proven in this codebase, just needs porting to `JDHistoryList.jsx`'s two header levels). Doc-level delete (per scorecard/resume/cover-letter) is easier — those download/view controls already live in a plain `<div>` body, no restructuring needed there.
- **No delete route exists.** `backend/api/history.js` only has `GET /`. Closest precedent: `DELETE /api/settings/llm-keys/:provider` (`backend/api/settings.js` + `backend/lib/llmKeys.js`) — but that's a soft-clear (nulls a JSON field), not a filesystem delete. There is **no existing filesystem-delete code anywhere in this repo** to copy from.
- **Path safety:** any new delete route must resolve the target path through `backend/lib/pathGuard.js`'s `resolveWithinRoot()` (already used by `download.js`/`view.js`) before calling `fs.rmSync`/`fs.rmdirSync` — a raw `employer` string from the request must never reach the filesystem unvalidated.
- **Auth:** `/api/history` is already mounted behind `requireAuth` in `jd_api_server.js` — a new `DELETE` route on the same router inherits this for free.
- **No trash/undo pattern exists anywhere in this codebase.** Every existing write path is create/overwrite, never delete. `fs.rmSync` is the only option today unless a staging/trash mechanism is built as part of this feature.
- **No concurrent-run guard for delete.** `backend/lib/pythonRunner.js` tracks `currentRun` (single in-flight run); a delete route should check `getCurrentRunStatus()` and refuse to delete a company whose run is currently in-flight, to avoid deleting a directory a running Python process is actively writing into.

## Open questions for the implementation session

1. **Granularity:** company-level only (matches today's confirmed scope), or also per-job-run and per-document delete? The UI structure (accordion) naturally supports all three levels, but the confirmed scope above only covers the company level — job/doc-level delete would need the same "outputs only" question re-answered at finer granularity if built.
2. **Confirmation UX:** a simple `window.confirm()`, or a proper modal listing exactly what will be removed (file count, total size)?
3. **Soft-delete/trash:** build a `data_processed/.trash/<timestamp>/<Company>/` staging move instead of `fs.rmSync`, or accept hard-delete-on-confirm as v1 and revisit if a real "oops" incident happens?
4. **Route shape:** `DELETE /api/history/:employer` (company-level, matching the confirmed scope) — response should probably return the updated history list (same pattern as `settings.js`'s `DELETE /llm-keys/:provider` returning updated `providers`) so the frontend can refresh in place without a second fetch.

## Not implemented

No code changes were made for this item in this session — investigation and scoping only, per explicit user request ("start scoping now").
