# Status — 25 July 2026

## Session open: intake + prior-session cleanup

Read `soul.md`, `docs/todolist/todolist_23Jul2026.md`, and `docs/status/status_23Jul2026.md` per soul.md §8.1 intake. Found two uncommitted items left at the end of the 23 Jul session (hiring-manager explainer deck v2/Live Demo slides + companion status entries and FWD run data file) — confirmed with the user and committed them (`e35ef3a`) before starting new work.

## JD Portal v2 Phase C — step-wizard redesign + light/dark theme

**Status: Done and verified.** Full build/verification record: `docs/guides/JDPORTALV2PHASEC_25JUL2026.md`.

Scoped via clarifying questions before implementation (step mapping, History placement, theme-toggle default all confirmed with the user first), then planned and built:

- **New wizard:** `JDWizard.jsx` + `WizardSteps.jsx` (numbered-circle stepper, modeled on the trading portal reference's nav-tab pattern) replace the old flat "New JD Run" stack. `JDRunPanel.jsx` split into `JDRunStep.jsx` (params/preview/run/progress) and `JDReportsStep.jsx` (finished output + empty state), old file backed up then removed.
- **Theme toggle:** new bespoke `[data-portal-theme="daylight"]` light palette added alongside the existing dark "fintech" theme in `src/index.css`, toggled via a new header button in `PortalShell.jsx` (local state + localStorage, deliberately separate from the chat app's own theme system). Introduced shared `--portal-sunken-rgb`/`--portal-glow-1`/`--portal-glow-2` variables so every "recessed surface" across the portal converts cleanly between themes instead of needing per-component overrides — converted 9 hardcoded dark-only color spots across `JDPortal.css`, `PortalShell.css`, `DocViewerInline.css`, `PortalAuth.css`, and `DocViewer.css` (2 of which, hardcoded white bold-text colors, would have gone unreadable in the new light theme if missed).

**Verification note:** authenticated via the same temporary-credential-swap + live-TOTP Playwright technique used 23 Jul (re-approved by the user this session). `secrets/jd_portal_auth.json` backed up before the swap and restored immediately after — confirmed byte-identical to the original both times it was used. A real `--scorecard-only` job was run end-to-end through the new wizard (not mocked) and produced a genuine 76/100 match score, confirming the Reports step and auto-advance-on-completion both work against live output. All test JD artifacts created during verification were deleted afterward — none of it was real user data.

## Phase C follow-up: textarea UX + pipeline retry fix (later same day, 25 Jul 2026)

**Status: Done and verified.** Full record: `docs/guides/JDPORTALPHASECFOLLOWUP_25JUL2026.md`.

User exercised the new wizard for real and reported two issues:

- **Textarea too small** — `.jd-field textarea` raised from `min-height: 140px` (a leftover from when Configure shared the screen with the Run panel) to `360px` desktop / `260px`/`200px` at the 768px/480px breakpoints.
- **Real run failed** ("JD pipeline exited with a non-zero status", Manulife JD, `--refresh-blueprint --ResumeAdjustment --llm=sonnet`, mode=all). Root-caused via direct reproduction: a transient `403 Forbidden` from OpenRouter's multi-provider routing — confirmed the same key/model succeeded seconds later via a direct API test, so this wasn't an invalid key or a wizard bug. `call_llm()` had no retry logic at all; added retry-with-backoff (3 attempts, linear backoff) on connection errors and `{403,408,425,429,500,502,503,504}`, leaving genuinely permanent errors (401, 400) to fail immediately as before. Re-ran the exact failing command end-to-end post-fix — succeeded, all 6 output files written for real (not test data).
- **Separate finding, resolved:** a stale Windows User-level `OPENROUTER_API_KEY` env var (dead key) was surfaced during diagnosis — didn't cause this particular failure (the Node backend's dotenv-loaded key wins over it) but was a landmine for anything reading `os.environ` directly. Removed per user decision; confirmed removed.

**Mistake made and disclosed:** reproducing the exact failing command (which includes `--refresh-blueprint`) to verify the fix regenerated `src/data/jd/JD_Manulife_AVP_Technology_Architecture_and_Operations.json` from scratch — overwriting the user's own pending, uncommitted manual edits to that file (present since at least 23 Jul, deliberately excluded from every commit so far for exactly this reason). Should have checked for pending changes to that specific file before running a `--refresh-blueprint` test against it. Disclosed immediately; user will check VS Code's Timeline/Local History for a recoverable snapshot. File left as-is (the regenerated version), excluded from this session's commit, same as prior sessions.

Verified via Playwright against the live dev stack (same MFA-swap technique, re-approved, `secrets/jd_portal_auth.json` restored and confirmed byte-identical after) — textarea renders at exactly 360px/200px as specified in both themes; `npm run build` and `py_compile` both clean.

## Backlog intake + scoping: Reports view bug, History delete, profile-update capability (later still, 25 Jul 2026)

**Status: Reports bug fixed and verified. History delete and profile-update epic scoped (not implemented) at user's explicit request.**

User reported three items for the backlog, clarified via questions before logging (per soul.md intake — one item, "History > ", was initially incomplete and needed a follow-up question), then asked to start scoping immediately. Ran three parallel investigation passes (one per item), presented findings, and got decisions on the open questions each surfaced before proceeding.

1. **Reports step — top of viewed document cut off/hidden.** **Root-caused and fixed.** `.jd-portal-card`'s `backdrop-filter` was establishing a new CSS containing block for `DocViewer`'s `position: fixed` modal, breaking it out of full-viewport coverage — content bled above the (much smaller) card and was permanently unreachable since scroll can't go negative. Fixed by portaling `DocViewer` to `document.body` via `createPortal`, with `data-portal-theme` re-applied directly on the portaled root (it's now outside `.portal-shell`'s themed subtree). `DocViewer.jsx` backed up first (`.20260725_V1.bak`). Verified via Playwright: modal title/content fully visible at mount, stays fixed when the underlying page is scrolled (the exact original symptom), and correctly re-themes on toggle (`data-portal-theme` confirmed `fintech`→`daylight`). History's separate `DocViewerInline` component was confirmed unaffected (not a fixed-position element, no equivalent bug).
2. **History — ability to delete run files.** **Scoped, not implemented** (explicit user request: scoping only for this and item 3). Company-level delete confirmed scoped to `data_processed/<Company>/` outputs only — source JD text and blueprint cache are left alone. Full architecture and open questions (header-button restructure needed since rows are literal `<button>`s, no trash/undo pattern anywhere in this codebase, no stable run ID, concurrent-run guard needed): `docs/guides/JDPORTALHISTORYDELETE_SCOPING_25JUL2026.md`.
3. **Authoritative `john_profile.json` update capability.** **Scoped, not implemented.** 4-part epic; user confirmed LLM-merged changes require an approval/preview step before writing. Full scoping: `docs/guides/JOHNPROFILEUPDATE_SCOPING_25JUL2026.md`.
   - **Security finding surfaced during scoping:** a live, unauthenticated `POST /api/consolidate` route already exists on production (`backend/server.js`, port 3000, `askcareer-ai.com`) — dead code (no frontend caller) but would corrupt `john_profile.json` if ever triggered (wrong nesting level, wrong key names, no backup, no rate limit). User decided to fold its removal into the profile-update epic's implementation rather than patch it separately now.

User confirmed all three items sit above the existing carried-forward backlog in priority order; items 2 and 3 remain unimplemented by explicit user decision (scoping only), ready for a future implementation session.

## History delete implementation (later still, 25 Jul 2026)

**Status: Done and verified.** Full record: `docs/guides/JDPORTALHISTORYDELETE_25JUL2026.md`.

Implemented item 4 from the backlog above: `DELETE /api/history/:employer` soft-deletes a company's `data_processed/<Company>/` outputs to a timestamped `data_processed/.trash/` folder (source JD text and blueprint cache left alone), guarded by a `409` if a run for that employer is currently in progress. Frontend: trash-icon button on each History company row opens an inline confirm banner (matching `JDUploadForm.jsx`'s existing conflict-banner style), company header converted from `<button>` to `<div role="button">` to allow nesting the delete control.

**Notable finding:** a plain `fs.renameSync` reliably threw `EPERM` on this Windows dev box, confirmed via isolated `node -e` tests to be deterministic (not a transient lock, not the running server holding its own handle) — most likely Vite's dev-server file watcher (no `server.watch` exclusions configured) holding a directory-change handle on `data_processed/`. Fixed by switching to `fs.cpSync` (copy) + `fs.rmSync` (delete) instead of an atomic rename; retry-with-backoff kept around both calls for genuinely transient locks (e.g. AV scanning a fresh `.docx`), but that retry loop was never what fixed the actual bug.

Verified via Playwright against the live dev stack (same MFA-swap technique, re-approved, `secrets/jd_portal_auth.json` restored and confirmed byte-identical after): concurrent-run guard returned `409` as expected, inline banner confirmed (not a native dialog), company row disappeared from the list post-delete, and the filesystem move landed correctly (`data_processed/DeleteTestCo2/` gone, full tree present under `.trash/<timestamp>/DeleteTestCo2/`). `npm run build` clean. All throwaway test artifacts (trash folder, source JD text, blueprint cache JSON) deleted afterward — none were git-tracked.

## Known open items

- Authoritative `john_profile.json` update capability — **scoped**, larger epic, next up to implement. Includes the `/api/consolidate` security fix. `docs/guides/JOHNPROFILEUPDATE_SCOPING_25JUL2026.md`.
- Dynamic width further enhancement (per-breakpoint values) — medium priority.
- JD Automation Portal Phases 3-7 (NLP profile-update — now superseded by the profile-update epic above, Docker, VPS deploy) — still outstanding, includes wiring the new auth/view/settings routes and both `secrets/jd_portal_auth.json` + `secrets/jd_portal_llm_keys.json` provisioning onto the VPS whenever that phase starts.
- LinkedIn job-search automation scoping — not started.
