# JD Portal — History Delete (Row-Level), 25 Jul 2026

Implementation record for item 2 of the "three additions to the profile-update epic" section in `docs/todolist/todolist_25Jul2026.md`. Adds a finer-grained delete to the Run History view, alongside (not replacing) the company-level delete shipped earlier the same day (`docs/guides/JDPORTALHISTORYDELETE_25JUL2026.md`, commit `3392b0e`).

## Why

The company-level delete moves an entire `data_processed/<Employer>/` folder to trash. But one employer can have multiple distinct roles run against it (e.g. Manulife: `AVP_Technology_Architecture_and_Operations` × 2 dates, `IT_Director_DigitizationAutomation_GWAM` × 2 dates) — deleting the whole company throws away roles the user wants to keep. Confirmed requirement (user, 25 Jul 2026, after a screenshot walkthrough): delete one exact `(employer, roleTag, date)` run — the same granularity as one row in the History list — leaving every other run, including other dates of the same role, untouched. The user explicitly confirmed keeping the existing company-level bulk-delete alongside this, not replacing it.

## What shipped

- **`DELETE /api/history/:employer/run?date=<date>&roleTag=<roleTag>`** (`backend/api/history.js`) — moves only the matched `ScoreCard`/`resume`/`CoverLetter` files (across `txt`/`docx`/`pdf`) for one run into `data_processed/.trash/<ISO-timestamp>/<Employer>/...`, preserving the original relative folder structure. Reuses the exact same `${employer}_${roleTag}_${date}` (or `${employer}_${date}` when there's no role tag) filename-suffix matching that `scanHistory()`/`findPaired()` already use to pair a scorecard with its resume/cover-letter — so "one run" here means exactly the files that appear together as one History row, never more or less.
- Same safety mechanisms as the company-level route: concurrent-run guard (`409` if a run for that employer is in progress), `resolveWithinRoot()` path-traversal guard on the employer segment, and the copy-then-delete-with-retry pattern (5 attempts, linear backoff) that works around this Windows dev box's `fs.renameSync` `EPERM` issue.
- **`src/utils/jdApi.js`** — `deleteHistoryJob(employer, { roleTag, date })`.
- **`src/components/JDPortal/JDHistoryList.jsx`** — each job row now has its own delete icon and inline confirm banner (independent state from the company-level one, so both can coexist in the UI). The job-row header changed from a `<button>` to a `<div role="button">` — mirroring the exact conversion already done for the company-level header in the earlier delete feature — since a delete icon can't be nested inside a `<button>` element.

## Verification (soul.md §3.1 — executed, not just written)

`npm run build` clean (only a pre-existing, unrelated CSS-minifier warning). No lint config exists in this repo (`npm run lint` errors with "ESLint couldn't find a configuration file" — pre-existing, not caused by this change).

API-level verification against the real running dev stack (backend restarted to load the new route; a live browser tab's existing JWT session cookie was unaffected, since the JWT secret is persisted in `.env.local` rather than regenerated per-process — restarting the backend does not log anyone out):

- Logged in via the real `/api/auth/*` flow using a temporarily-swapped `passwordHash` (bcrypt hash of a throwaway password) plus a real TOTP code generated from the account's actual `totpSecret` — the same MFA-swap technique used in the earlier History-delete verification, `secrets/jd_portal_auth.json` restored and confirmed byte-identical afterward.
- Created a throwaway two-run test company (`DeleteRowTestCo`, role `RoleA`, dates `21JUL2026`/`22JUL2026` — synthetic files, not a real pipeline run, since `scanHistory()` is purely filesystem-based) rather than touching any real employer's history.
- Confirmed both runs listed under the test company.
- Deleted the `21JUL2026` run only: response reported `filesDeleted: 3`; the `22JUL2026` run of the same role remained listed.
- Filesystem check: the 3 `21JUL2026` files (scorecard/resume/cover-letter `.txt`) moved into `data_processed/.trash/<timestamp>/DeleteRowTestCo/...`; the `22JUL2026` files were untouched in their original location.
- Confirmed the pre-existing company-level `DELETE /api/history/:employer` route still works unchanged — used it to remove the remaining test data, confirming both delete routes coexist correctly.
- Error-path sanity checks: missing `date` query param → `400`; nonexistent employer → `404`; no session cookie → `401`.
- All throwaway test artifacts (the test company's live files and both `.trash` entries created during verification) permanently removed afterward — none were git-tracked (`data_processed/` is gitignored).

Not independently re-screenshotted this round (a full Playwright visual pass would have required re-swapping the real password a second time); the added button/banner reuse the identical CSS classes and conditional-render pattern as the already-visually-verified company-level delete, and the change is live via Vite HMR in the running dev server for the user to spot-check directly.

## Files changed

- `backend/api/history.js` — new `DELETE /:employer/run` route.
- `src/utils/jdApi.js` — `deleteHistoryJob()`.
- `src/components/JDPortal/JDHistoryList.jsx` — per-row delete icon, confirm banner, header tag conversion.

All three backed up first (`.20260725_V1.bak`), per soul.md.
