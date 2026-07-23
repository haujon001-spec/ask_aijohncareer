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

## New today (23 Jul 2026, later session) — JD Portal v2: company-grouped history, exposed CLI params, wizard redesign, theme toggle

User has used the portal for real runs today (e.g. Manulife — AVP_Technology_Architecture_and_Operations, 82/100) and is requesting a second, larger round of changes, referencing screenshots of the live portal plus the look-and-feel of a separate project's portal (`C:\Users\haujo\projects\DEV\trading\web_portal\Unify_portal_20260628.py`, Flask-based). **Not yet scoped/implemented — clarifying questions asked before starting, per soul.md intake workflow and explicit user request.**

1. **History accordion should group by company**, not by individual run — e.g. "Manulife" should be one top-level entry containing both its 22 Jul and 21 Jul job runs nested inside, rather than two separate flat rows. **Phase B — not yet done.**
2. **Expose `jd_scorecard_resume_v2.py`'s CLI parameters in the portal UI**, referencing the trading portal's "Configure" step (strategy cards, numeric/select fields, live command preview) as the interaction pattern. `--ResumeAdjustment` now exposed (Phase A, done below); remaining CLI surface (mode/llm/refresh-blueprint/no-docx) was already exposed pre-existing.
3. **Root cause found during scoping — confirmed and fixed (Phase A, done below).** `backend/lib/pythonRunner.js` was hardcoded to invoke `scripts/jd_scorecard_resume.py` (**v1**), never `_v2.py`. This is why the "Generated :" / "Profile :" lines the user flagged (screenshot) appeared in portal-generated resume/cover-letter output — those were only ever removed from v2, and the portal had never called v2 since it was built. Now repointed to v2.
4. **Command preview before running — done (Phase A, see below).** Shows the exact CLI invocation before the user clicks Run.
5. **Look-and-feel overhaul** — restructure into a step-wizard (Configure → JD Run → Report), optimized for desktop/tablet/mobile. **Phase C — not yet done, largest item, own session.**
6. **Light/dark theme toggle** — current fintech theme is dark-only, flagged as low-contrast; new bespoke light palette (user decision, not reusing the chat app's palette). **Phase C — not yet done.**

**Decisions confirmed by user (23 Jul 2026), scoping this into three phases:**
- Phase A (correctness first): v2 backend repoint + `--ResumeAdjustment` wiring + command preview. **DONE 23 Jul 2026** — see `docs/guides/JDPORTALV2BACKEND_23JUL2026.md`.
- Phase B: company-grouped History accordion, single-open at every level (company → job → doc), same rule as today's flat-list accordion.
- Phase C: step-wizard redesign (Configure/JD Run/Reports, current "keep today's run behavior" — no live-streaming console output, that's an explicitly deferred separate scope) + new bespoke light theme. Largest and most design-subjective — own session.

**Carried forward, still outstanding (unaffected by the above, unchanged priority):**
- Bring-your-own-key + dynamic LLM selection (OpenRouter, confirm the exact Claude Sonnet 5 API model-slug)
- Remaining JD Automation Portal phases (NLP, integration, Docker, dev env docs, deploy — deploy now also covers the new auth/view routes)
- LinkedIn automation scoping

## Priority order

1. ~~Fix JD Portal vertical scroll regression~~ — **done, verified 23 Jul 2026**
2. ~~Redesign History/doc-view from modal to expand/collapse accordion~~ — **done, verified 23 Jul 2026**
3. ~~UI/UX spacing polish pass~~ — **done, verified 23 Jul 2026**
4. ~~JD Portal v2 Phase A (backend repoint to v2, --ResumeAdjustment wiring, command preview)~~ — **done, verified 23 Jul 2026**
5. JD Portal v2 Phase B — company-grouped History accordion
6. JD Portal v2 Phase C — step-wizard redesign (Configure/JD Run/Reports) + light/dark theme toggle
7. Bring-your-own-key + dynamic LLM selection
8. Remaining JD Automation Portal phases (NLP, integration, Docker, dev env docs, deploy — deploy now also covers the new auth/view routes)
9. LinkedIn automation scoping
