# Todolist — 23 July 2026

## Carried over from todolist_21Jul2026.md

- **JD Portal revamp (MFA-gated fintech portal) — DONE 22 Jul 2026, then bugs found in first real user testing same evening — see "New today" below.** Build/verification record: `docs/guides/JDPORTALREVAMP_22JUL2026.md`.
- **`--ResumeAdjustment` flag — DONE.** Guide written and committed: `docs/guides/JDSCORECARDRESUMEV2_RESUMEADJUSTMENT_22JUL2026.md` (commit `c4a27c5`). The 21 Jul todolist's "not done" note for this was stale and has been corrected in place.
- Bring-your-own-key + dynamic LLM selection (OpenRouter, confirm the exact Claude Sonnet 5 API model-slug) — **still outstanding**, repeatedly bumped by higher-priority work (`--ResumeAdjustment`, then the JD Portal revamp). Carry forward again.
- JD Automation Portal Phases 3-7 (NLP `update_profile_json`, integration, Docker packaging, dev-env docs, VPS deploy) — **still outstanding**. Phase 7 (deploy) now also needs to account for the new `/api/auth/*` + `/api/view/*` routes and `secrets/jd_portal_auth.json` provisioning on the VPS, since those didn't exist when this phase was originally scoped.
- LinkedIn job-search automation scoping — **not started**.

## New today (22 Jul 2026, evening) — JD Portal revamp bugs found in first real user testing

User exercised the newly-built portal (enrolled, logged in, opened History) and found three UI issues. Logged here per soul.md intake workflow.

**All three fixed and verified 23 Jul 2026 — see `docs/guides/JDPORTALBUGFIXES_23JUL2026.md` for the full build/verification record.**

### 1. Vertical scroll not working in "New JD Run" and "History" tabs

Neither tab scrolls when content overflows the viewport (confirmed visually — the History screenshot shows a long list that should scroll but the page appears clipped/fixed).

**Likely root cause (self-identified, needs verification before fixing):** during the fintech re-skin of `src/components/JDPortal/JDPortal.css`, the `.jd-portal` rule's `overflow-y: auto` (present in the pre-revamp version) was dropped when the rule was rewritten to use `--portal-*` CSS vars — the new rule only has `flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 20px;`, no `overflow-y`. Since the global `body` (`src/index.css`) is `height: 100vh; overflow: hidden;`, any inner container that lost its own scroll region has nowhere to scroll — this matches the symptom exactly. First thing to check tomorrow: re-add `overflow-y: auto` to `.jd-portal` (and verify `.portal-main`/`.portal-shell` in `PortalShell.css` aren't also clipping it above that).

### 2. "View" button / doc viewer not behaving as expected

User's screenshots show a dimmed/overlaid page after interacting with History, without the expected modal document content clearly visible — needs live debugging tomorrow (check browser console for errors, confirm `/api/view/*` response, confirm `DocViewer`'s conditional render).

**Design change requested (supersedes the modal approach entirely):** instead of a popup modal per document, each company's history entry should have its own **expand/collapse (accordion) section** — clicking a company row (or each sub-document within it) expands that section in-place to show the rendered content, rather than opening an overlay. Needs a rework of `JDHistoryList.jsx` (and possibly `DocViewer.jsx`, which may go from a modal component to an inline expandable-content component) — scope this properly before implementing, not a one-line fix.

### 3. UI/UX spacing too loose ("too spacey")

General polish pass needed on `PortalShell.css` / `JDPortal.css` — padding, gaps, and card sizing feel oversized. Needs a design pass (tighten `.portal-main` padding, `.jd-portal` gap, `.jd-portal-card` padding) — defer exact values to a proper look at the live UI tomorrow rather than guessing blind.

## Priority order

1. ~~Fix JD Portal vertical scroll regression~~ — **done, verified 23 Jul 2026**
2. ~~Redesign History/doc-view from modal to expand/collapse accordion~~ — **done, verified 23 Jul 2026**
3. ~~UI/UX spacing polish pass~~ — **done, verified 23 Jul 2026**
4. Bring-your-own-key + dynamic LLM selection
5. Remaining JD Automation Portal phases (NLP, integration, Docker, dev env docs, deploy — deploy now also covers the new auth/view routes)
6. LinkedIn automation scoping
