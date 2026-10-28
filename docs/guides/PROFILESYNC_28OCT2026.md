# Profile sync — john_profile.json laptop <-> VPS (28 Oct 2026)

## Why
The profile (`src/data/john_profile.json`) is edited by hand on the laptop often. It was deliberately excluded from the bulk Sync (allow-list in `backend/lib/syncEngine.js`), so the only way across was manual scp. It now has its **own card at the top of the Sync tab** ("Profile (john_profile.json)"). The bulk sync still can never touch it.

## Decisions (user, 28 Oct 2026)
- Direction: both, **push (laptop -> VPS) is the default**; pull sits behind a second confirm.
- Only `src/data/john_profile.json` — the scratch files (`john_profile.bak*_28OCT2026.json`, `.proposed.json`, `*_changes_*.md`) never sync.
- After a push: **no restart** (the containers bind-mount `./src/data`, the chat backend re-reads the file per request); verify by hash, then ask the live chat one profile question.
- Editing the profile on the live portal: never done so far, so any VPS difference is treated as stale (short diff summary + one confirm). Revisit if that changes.

## How it works (laptop portal only; hidden on the VPS)
1. **Check profile** — reads both files, shows size, saved time, years of experience, which side is newer (by the profile's own `timestamp`) and which top-level sections differ (item counts each side).
2. **Push to VPS** (or **Pull from VPS…** -> "Yes, overwrite"): the request carries the two sha256 values from the check; if either side changed since, nothing is written and the user must re-check.
3. Push: byte-exact backup on the VPS (`backup/sync_<stamp>/src/data/john_profile.json`) **and** a version-history entry `backup/backup-<stamp>.json` (same wrapper format as the profile editor's backups, so it is restorable from the live Profile tab); then written to a temp file in `src/data`, `chown 1001:1001`, renamed over the target (atomic).
   Pull: dated backup next to the file (`john_profile.json.YYYYMMDD_V<n>.bak`) plus `backup/sync/<stamp>/...`, then written.
4. Both sides are re-hashed; success is reported only if both equal the expected hash. Result is appended to `logs/sync_<date>.log` (`"kind":"profile"`).
Refuses to copy a file that is not valid JSON or has no `profile.metadata.name`. Identical files -> "nothing to copy".

## Files
`backend/lib/profileSync.js` (new), `backend/api/sync.js` (+`POST /api/sync/profile/preview`, `/profile/run`), `backend/lib/syncEngine.js` (helpers now exported; allow-list unchanged), `src/utils/jdApi.js`, `src/components/JDPortal/SyncPanel.jsx` (`ProfileSyncCard`). Backups of the edited files: `archive/*.20261028_V1.bak`.

## Verified (28 Oct)
Against a throwaway copy on the VPS (`SYNC_REMOTE_ROOT=/tmp/pstest`, removed afterwards): preview differ/identical, stale-sha refusal, push + hash verify + both backups created with owner 1001, identical = no-op, corrupt local refused for push, pull restores with a local .bak. Vite build clean. **Real VPS profile NOT touched during testing.**
Not yet done: click-through of the card in the real login-gated portal (needs a restart of `npm run dev:all`; a running jd-api keeps old routes), and the first real push + live-chat check.
