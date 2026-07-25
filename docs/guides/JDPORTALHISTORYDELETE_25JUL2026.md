# JD Portal — History Delete (Company-Level), 25 Jul 2026

Implementation record for item 4 of `docs/todolist/todolist_25Jul2026.md`, scoped earlier the same day in `docs/guides/JDPORTALHISTORYDELETE_SCOPING_25JUL2026.md`. Adds a delete capability to the Run History view: a company row can be removed entirely, soft-deleted to a trash folder rather than permanently erased.

## What shipped

- **`DELETE /api/history/:employer`** (`backend/api/history.js`) — moves `data_processed/<Company>/` into `data_processed/.trash/<ISO-timestamp>/<Company>/`. Source JD text (`data_raw/jd/txt/`) and the blueprint cache (`src/data/jd/`) are left untouched — other role re-runs for the same company may still depend on them. Outputs-only scope, per the approved plan.
- **Concurrent-run guard** — if a run is currently in progress for the same employer (`getCurrentRunStatus()` + `deriveJdMetadata()`), the delete is rejected with `409` instead of racing the pipeline that's actively writing into that directory.
- **Path safety** — the employer path is resolved via `resolveWithinRoot()` (existing `backend/lib/pathGuard.js` helper), same traversal protection used elsewhere in the API.
- **Frontend** — a trash-icon button on each company's History row opens an inline confirm banner (matching the existing `JDUploadForm.jsx` overwrite-conflict banner style, not a native `window.confirm()`). Confirming calls the new route and refreshes the list from its response.
- The GET `/api/history` scan logic was refactored into a shared `scanHistory()` function so both the list route and the new delete route return a consistent, fresh view without duplicating the scan.

## Notable technical finding: `fs.renameSync` unreliable on this Windows dev box

The original implementation used a plain `fs.renameSync(target, destination)` to move the company folder into `.trash/`. This reliably threw `EPERM: operation not permitted` — including in a **brand-new, isolated Node process** run outside the Express server (confirmed via standalone `node -e` scripts), which rules out the running dev server holding its own lock. The most likely cause: Vite's dev-server file watcher has no `server.watch` exclusions configured in `vite.config.js`, so it watches the entire project tree — including the gitignored `data_processed/` output directory — and appears to hold a directory-change-notification handle that blocks an atomic rename specifically, while still permitting reads, copies, and deletes of the same files.

**Fix:** replaced the rename with `fs.cpSync(target, destination, { recursive: true })` immediately followed by `fs.rmSync(target, { recursive: true, force: true })` — copy-then-delete instead of atomic move. Both steps are still wrapped in a short retry loop (5 attempts, linear backoff) to absorb genuinely transient locks (e.g. antivirus scanning a freshly-written `.docx`), but the retry loop was never the actual fix — the rename failure was deterministic, not transient.

If a future feature on this project needs to move a directory on Windows, prefer copy-then-delete over `fs.renameSync` as the default, or add `data_processed/` (and any other write-heavy output directory) to Vite's watch-ignore list.

## Verification (Playwright, real dev stack)

Used the established MFA-swap technique (bcrypt-hash swap of `passwordHash` only, `totpSecret` left untouched, restored from `.bak` and confirmed byte-identical afterward — re-approved for this round per standing instruction). Created a throwaway company (`DeleteTestCo2`) via a real `--scorecard-only` run rather than touching any real employer history.

Confirmed:
- Concurrent-run guard: deleting an employer with a run in flight returns `409` — `{"error":"A run for DeleteTestCo2 is currently in progress — try again once it finishes."}`.
- Confirm UX is the inline banner, not a native dialog.
- After confirming delete, the company row disappears from the History list.
- Filesystem: `data_processed/DeleteTestCo2/` no longer exists; `data_processed/.trash/<timestamp>/DeleteTestCo2/` contains the full moved tree (`CoverLetter/`, `resume/`, `ScoreCard/`).
- `npm run build` clean.
- All throwaway test artifacts (trash folder, source JD text, blueprint cache JSON) removed after verification — none were git-tracked, so no risk to unrelated pending edits.

## Files changed

- `backend/api/history.js` — `DELETE /:employer` route + `scanHistory()` refactor.
- `src/utils/jdApi.js` — `deleteHistoryCompany(employer)`.
- `src/components/JDPortal/JDHistoryList.jsx` — delete icon, inline confirm banner, header converted from `<button>` to `<div role="button">` (to allow nesting the delete control without invalid nested-button HTML, mirroring `CollapsibleCard.jsx`'s existing pattern).
- `src/components/JDPortal/JDPortal.css` — `.jd-button-danger` / `.jd-button-danger--icon` variants.

All edited files were backed up first (dated `.bak`), per soul.md.
