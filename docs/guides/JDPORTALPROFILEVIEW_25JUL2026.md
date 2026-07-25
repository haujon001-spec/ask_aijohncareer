# JD Portal — Human-Readable Profile View + Export, 25 Jul 2026

Implementation record for the "human-readable view + export of `john_profile.json`" backlog item added earlier the same day. **Read-only** — this is deliberately separate from `backend/api/profile_update.js` (the still-disabled "Update Profile from JD" NLP-write stub, a different, still-paused epic). Nothing in this feature ever writes to `john_profile.json`.

## What shipped

**`backend/api/profile_view.js`** (new), mounted at `/api/profile-view` (a distinct prefix from the existing `/api/profile/update` stub, so the two coexist without any route-collision risk):

- `GET /api/profile-view` — reads and returns `{timestamp, profile}` straight from `src/data/john_profile.json`.
- `GET /api/profile-view/export?format=txt|docx` — renders all 13 `profile.*` sections into a single human-readable text document (`renderProfileText()`), matching the plain-text conventions `scripts/convert_txt_to_docx.py` already knows how to format (ALL-CAPS section headers → bold, `•` → bulleted list, `Label — value` → bold label prefix). For `format=txt`, streams that text directly. For `format=docx`, writes the text to a temp file under `backup/.profile-export-tmp/` and **shells out to the existing `scripts/convert_txt_to_docx.py`** (already proven, already a project dependency — `python-docx`) rather than adding a new Node docx-writing library, then streams the resulting `.docx` back and cleans up both temp files afterward.

**Bug hit and fixed during verification:** the docx export's `spawnSync` call crashed with `UnicodeEncodeError` on `convert_txt_to_docx.py`'s emoji print output — the exact same Windows cp1252-codepage issue already documented in `backend/lib/pythonRunner.js` for the JD pipeline's own Python spawn. Fixed identically: `PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1'` in the spawned child's env.

**Frontend** — `src/components/JDPortal/ProfileView.jsx` (new), added as a third top-level tab (`Profile`) in `JDPortal.jsx` alongside "New JD Run" and "History". Renders each profile section as its own collapsible card (`CollapsibleCard`, matching every other section in the portal): header (name/title/contact), Summary, Professional Experience (per-employer highlights), Major Achievements, Core Competencies, Skills/Education/Languages, AI Projects, LinkedIn Recommendations, and Key Topics for Q&A — the latter several rendered as a new `.jd-tag-list`/`.jd-tag` pill style (added to `JDPortal.css`). Two download links ("Download .txt" / "Download .docx") sit in the top card's header, hitting the export endpoint directly via `profileExportUrl(format)` — a plain URL (not a `fetch()` call), since the session cookie is `sameSite: 'lax'` and is sent automatically on a top-level navigation/link-click, same mechanism the existing Resume/Scorecard/Cover-Letter download links already rely on.

The pre-existing disabled "Update Profile from JD (Coming Soon)" stub button was scoped to only render under the "New JD Run" tab (it previously rendered unconditionally below whichever tab was active) — cosmetic-only fix, matches where it actually sits in the real UI (confirmed via the user's own screenshot) and stops it appearing oddly under History/Profile.

## Verification (soul.md §3.1 — executed, not just written)

Real dev stack, MFA-swap login technique (secrets restored + confirmed byte-identical afterward):

1. `GET /api/profile-view` — confirmed `success:true`, correct `timestamp`, all 13 section keys present, `professional_experience` length matched the live file.
2. `GET /api/profile-view/export?format=txt` — 52KB+ plain text, spot-checked header/summary/experience sections render correctly with `•` bullets.
3. `GET /api/profile-view/export?format=docx` — first attempt failed with the Unicode encoding bug above; fixed, backend restarted, retried successfully (200, valid `Content-Disposition`). Opened the resulting file with `python-docx`: 367 paragraphs, confirmed bold runs correctly applied only to the label portion of `Company — Title (Period)` lines (not the whole line), matching `convert_txt_to_docx.py`'s existing heuristic exactly.
4. `npm run build` clean (same pre-existing, unrelated CSS-minifier warning).

## Files changed

- `backend/api/profile_view.js` (new).
- `backend/jd_api_server.js` — mounts the new router at `/api/profile-view`.
- `src/utils/jdApi.js` — `fetchProfile()`, `profileExportUrl(format)`.
- `src/components/JDPortal/ProfileView.jsx` (new).
- `src/components/JDPortal/JDPortal.jsx` — new "Profile" tab; scoped the profile-update stub button to the "New JD Run" tab only.
- `src/components/JDPortal/JDPortal.css` — `.jd-tag-list` / `.jd-tag`.

All edited files backed up first (`.20260725_V1.bak` / `.20260725_V2.bak`), per soul.md.

## Not in scope (by design)

Editing/writing to the profile from this view — that remains the separate, still-paused "Update from Resume" epic (`sprightly-enchanting-hare.md`).
