# Status — 23 July 2026

## JD Portal — bug fixes + UX polish from first real user testing

**Status: All three issues fixed and verified locally. Not deployed to the VPS (unchanged, still deferred).**

Full build/verification record: `docs/guides/JDPORTALBUGFIXES_23JUL2026.md`.

1. **Vertical scroll regression** — fixed. Root cause was two-fold: `.jd-portal` lost `overflow-y: auto` in the 22 Jul re-skin, and the new `.portal-shell` used unbounded `min-height: 100vh` instead of `height: 100vh`, so nothing was actually height-constrained for the scroll to apply against. Both fixed; verified via Playwright DOM metrics (`scrollHeight` 3893px vs `clientHeight` 677px, genuinely scrollable) and screenshots showing the full History list reachable.
2. **History modal → nested, single-open accordion** — rebuilt. Company rows expand in place; each doc's "View" expands its rendered content inline beneath it (nested, not expand-all); opening a new company/doc collapses the previous one. New `DocViewerInline` component created for this; the original `DocViewer.jsx` modal was left untouched since `JDRunPanel.jsx` still uses it for fresh-run results (out of scope for this bug report).
3. **Spacing polish pass** — tightened `.portal-header`/`.portal-main` padding, `.jd-portal` gap, `.jd-portal-card` and `.jd-history-card` padding, guided by a live-UI look rather than guessing blind.

**Verification note:** the real portal password wasn't available to Claude. With user approval, `secrets/jd_portal_auth.json` was backed up, `passwordHash` temporarily swapped to a throwaway value (TOTP secret untouched) to allow automated Playwright verification, then restored from backup immediately after — confirmed restored before this session closed.

## Known open items (unchanged, carried forward)

- Bring-your-own-key + dynamic LLM selection (OpenRouter, Claude Sonnet 5 model-slug confirmation) — still outstanding.
- JD Automation Portal Phases 3-7 (NLP profile-update, Docker, VPS deploy) — still outstanding, now includes wiring the new auth/view routes into the prod stack whenever that phase starts.
- LinkedIn job-search automation scoping — not started.
