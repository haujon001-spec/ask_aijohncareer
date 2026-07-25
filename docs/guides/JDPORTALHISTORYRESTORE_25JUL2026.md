# JD Portal — Restore Deleted History Files, 25 Jul 2026

Implementation record for the "restore deleted history" backlog item added earlier the same day (`docs/todolist/todolist_25Jul2026.md`), user-requested after exercising the company- and row-level delete features.

## What shipped

**`backend/api/history.js`** — two new routes, reusing the existing `.trash/<ISO-timestamp>/<Employer>/...` layout the two delete routes already write (no new storage convention introduced):

- `GET /api/history/trash` — walks `data_processed/.trash/*/*`, one entry per `<trashId>/<Employer>/` folder (each is the output of exactly one prior delete, whole-company or single-run). Returns `{trashId, employer, deletedAt, fileCount, files[]}` per entry, newest first.
- `POST /api/history/trash/:trashId/:employer/restore` — copies every file back from the trash folder to `data_processed/<Employer>/<same relative path>`, then removes the (now-empty) trash folder. Path-guarded via the existing `resolveWithinRoot()` on both the trash-side and live-side paths.

**Conflict handling (per user decision, 25 Jul 2026):** if *any* file in the trash entry would collide with a file that already exists live (e.g. the same JD was re-run after the original delete), the restore is **refused entirely** with `409` and the exact list of conflicting relative paths — no partial restore, no silent overwrite. The user resolves it manually (delete/rename the live file, or leave the trash entry alone). Verified this leaves both the live file and the trash entry completely untouched.

**Frontend** — new `src/components/JDPortal/JDHistoryTrash.jsx`, a "Deleted Items" collapsible card rendered below the main History list (`JDHistoryList.jsx`), collapsed by default and only shown at all when trash is non-empty. Each entry shows employer/deleted-at/file-count with a Restore button behind the same inline-confirm-banner pattern used elsewhere; a successful restore refreshes both the trash list and the main history list (via an `onRestored` callback). Conflict responses render the exact blocked-file list inline rather than a generic error. `jdApi.js` gained `fetchTrash()` / `restoreTrash(trashId, employer)`.

## Verification (soul.md §3.1 — executed, not just written)

Real dev stack, same MFA-swap login technique as prior rounds (`secrets/jd_portal_auth.json` restored and confirmed byte-identical afterward), throwaway `TrashRestoreTestCo` test data (not a real employer):

1. Deleted a throwaway 3-file test run (company-level delete) — confirmed it appears in `GET /trash`.
2. Restored it — `restoredFiles: 3`, confirmed all 3 files back live at their original paths, and the trash folder gone.
3. Deleted the same test data again, then simulated a re-run by writing a new live file at the same path the trash entry would restore to — attempted restore: got `409` with the exact conflicting path, confirmed via direct file read that the live (newer) file's content was **not** overwritten, and the trash entry was still present afterward (nothing partially applied).
4. `npm run build` clean (same pre-existing, unrelated CSS-minifier warning as previous rounds).
5. All throwaway test artifacts removed afterward; `data_processed/` is gitignored so none were ever at risk of being committed.

## Files changed

- `backend/api/history.js` — `GET /trash`, `POST /trash/:trashId/:employer/restore`, `listFilesRecursive()` helper.
- `src/utils/jdApi.js` — `fetchTrash()`, `restoreTrash()`.
- `src/components/JDPortal/JDHistoryTrash.jsx` (new).
- `src/components/JDPortal/JDHistoryList.jsx` — renders `JDHistoryTrash` below the main list.

All edited files backed up first (`.20260725_V2.bak`), per soul.md.
