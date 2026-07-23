# Status — 23 July 2026

## JD Portal — bug fixes + UX polish from first real user testing

**Status: All three issues fixed and verified locally. Not deployed to the VPS (unchanged, still deferred).**

Full build/verification record: `docs/guides/JDPORTALBUGFIXES_23JUL2026.md`.

1. **Vertical scroll regression** — fixed. Root cause was two-fold: `.jd-portal` lost `overflow-y: auto` in the 22 Jul re-skin, and the new `.portal-shell` used unbounded `min-height: 100vh` instead of `height: 100vh`, so nothing was actually height-constrained for the scroll to apply against. Both fixed; verified via Playwright DOM metrics (`scrollHeight` 3893px vs `clientHeight` 677px, genuinely scrollable) and screenshots showing the full History list reachable.
2. **History modal → nested, single-open accordion** — rebuilt. Company rows expand in place; each doc's "View" expands its rendered content inline beneath it (nested, not expand-all); opening a new company/doc collapses the previous one. New `DocViewerInline` component created for this; the original `DocViewer.jsx` modal was left untouched since `JDRunPanel.jsx` still uses it for fresh-run results (out of scope for this bug report).
3. **Spacing polish pass** — tightened `.portal-header`/`.portal-main` padding, `.jd-portal` gap, `.jd-portal-card` and `.jd-history-card` padding, guided by a live-UI look rather than guessing blind.

**Verification note:** the real portal password wasn't available to Claude. With user approval, `secrets/jd_portal_auth.json` was backed up, `passwordHash` temporarily swapped to a throwaway value (TOTP secret untouched) to allow automated Playwright verification, then restored from backup immediately after — confirmed restored before this session closed.

## JD Portal v2 round — Phase A: backend repoint + command preview (later same day, 23 Jul 2026)

**Status: Done and verified.** Full record: `docs/guides/JDPORTALV2BACKEND_23JUL2026.md`.

User requested a larger second round of portal work (company-grouped history, exposed CLI params, wizard redesign, light/dark theme), scoped per soul.md intake into three phases. Phase A (correctness): found and fixed a real bug — `backend/lib/pythonRunner.js` was still invoking `jd_scorecard_resume.py` (v1), never the `_v2.py` script built 21-22 Jul, so every portal-generated resume/cover letter has been missing all of v2's formatting fixes and `--ResumeAdjustment` support since the portal was built. Repointed to v2, wired `--ResumeAdjustment` end-to-end (backend + UI checkbox), added a live command-preview panel that mirrors the backend's exact arg-building logic. Verified via a real authenticated API run (v2 header confirmed in logs, zero `Generated :`/`Profile :` lines in output, `--ResumeAdjustment` correctly reused an existing scorecard) plus a Playwright check confirming the UI preview text matches the real spawned command.

**Phase B (company-grouped History accordion) and Phase C (step-wizard redesign + light/dark theme) are scoped but not started** — Phase C is the largest and most design-subjective, planned as its own session.

## JD Portal usability round: collapsible sections, dynamic width, progress, force-stop, JD caching, model fix (later still, 23 Jul 2026)

**Status: Done and verified.** Full record: `docs/guides/JDPORTALUSABILITY_23JUL2026.md`.

Triggered by a real ~6-minute run the user reasonably read as hung. Investigated and confirmed `anthropic/claude-sonnet-4.6` (the previously hardcoded "sonnet" slug) is a real, working OpenRouter model — the run wasn't broken, just slow — but swapped it to `anthropic/claude-sonnet-5` per the 21 Jul decision (confirmed via OpenRouter's live models API), verified with a real CLI call. Added: step-level progress polling (no live console streaming, per user decision — reads the script's own `[n/3]` step markers), a force-stop button (keeps already-completed files, only abandons the in-flight step; Windows-safe `taskkill /t` to avoid orphaned processes), last-saved-JD caching via localStorage, collapsible top-level cards (new `CollapsibleCard` component, reused on all three sections), and a dynamic-width fix (`.portal-main` max-width now scales with viewport instead of a fixed 960px cap). All verified via real Playwright runs against the live dev stack, including a genuine force-stop of an in-flight pipeline run with no orphaned processes left behind.

## Known open items (unchanged, carried forward)

- Bring-your-own-key UI (OpenRouter/DeepSeek key input) — model-slug half of this item now done; still need user-supplied-key UI.
- JD Automation Portal Phases 3-7 (NLP profile-update, Docker, VPS deploy) — still outstanding, now includes wiring the new auth/view routes into the prod stack whenever that phase starts.
- LinkedIn job-search automation scoping — not started.
