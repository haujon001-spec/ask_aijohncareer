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
- Bring-your-own-key + dynamic LLM selection (OpenRouter) — **partially done, see below**
- Remaining JD Automation Portal phases (NLP, integration, Docker, dev env docs, deploy — deploy now also covers the new auth/view routes)
- LinkedIn automation scoping

## New today (23 Jul 2026, later still) — collapsible sections, dynamic width, progress/model fix, force-stop, JD text caching

User hit a real ~6-minute run today (Manulife, `--llm=sonnet`, mode=all, `--refresh-blueprint --ResumeAdjustment`) with no progress feedback beyond an elapsed-second counter, reasonably read it as hung, and surfaced five asks plus a request to ask questions before resuming Phase B/C.

1. **Collapsible sections** — every top-level card on "New JD Run" (Paste a Job Description, Run JD Pipeline) and "History" (Run History) should be collapsible, not just the History accordion rows built earlier today.
2. **Dynamic left/right spacing** — `.portal-main`'s fixed `max-width: 960px; margin: 0 auto` leaves large empty margins on wide desktop viewports (visible in screenshot); should scale with available width on both desktop and mobile instead of a fixed cap.
3. **Model slug bug — confirmed and fixed.** `LLM_CONFIGS["sonnet"]` in `scripts/jd_scorecard_resume_v2.py` was `anthropic/claude-sonnet-4.6`. Checked OpenRouter's live `/api/v1/models` API directly: `anthropic/claude-sonnet-4.6` **is** a real, currently-listed model (not a broken slug) — the "hang" was the run genuinely taking ~6 minutes (5 sequential LLM calls: blueprint, blueprint-repair, scorecard, resume, cover letter), not an error. But per the user's 21 Jul decision, `anthropic/claude-sonnet-5` (confirmed present in the same API response, pricing matches the 21 Jul screenshot: $2/$10 per M tokens, 1M context) is the intended model. **Fixed and verified 23 Jul 2026** — real CLI run (`--scorecard-only --llm=sonnet --force`) confirms the new slug calls successfully. `scripts/jd_scorecard_resume.py` (v1) has the same stale slug but was left untouched (golden-rule; v1 is no longer invoked by the portal after today's Phase A repoint) — flagged for the user, not changed without being asked.
4. **Progress visibility during a run** — script already prints step markers (`[0/3]` blueprint, `[1/3]` scorecard, `[2/3]` resume, `[3/3]` cover letter) to stdout; portal UI currently only shows an elapsed-second counter. Scope (polling a captured-stdout/step endpoint vs. full live streaming) and whether this supersedes last turn's "Phase C: keep current run behavior, no live streaming" decision — **needs clarification, asked below**.
5. **Force-stop a running job** — no cancel mechanism exists today; a run only ends via completion or the existing hard timeout in `pythonRunner.js`. Needs a new cancel endpoint + UI button; semantics of already-written partial output (keep vs. discard) — **needs clarification, asked below**.
6. **Cache last-saved JD text** — `JDUploadForm` doesn't persist Employer/Role/JD text across reloads. Scope (last-saved-only vs. also autosave in-progress typing) — **needs clarification, asked below**.

**All five confirmed and done 23 Jul 2026** — see `docs/guides/JDPORTALUSABILITY_23JUL2026.md` for the full build/verification record (also covers the sonnet model-slug fix, item 3 above).

## New today (23 Jul 2026, real-usage follow-up after the width/caching fix)

User tried the fixed portal for real (Manulife re-run, `--llm=sonnet`, mode=all, `--refresh-blueprint`). Width fix confirmed much improved but not fully done; and a real crash surfaced during the run, independent of the width/caching work.

### a. Dynamic width — further enhancement (medium priority, future work)

User confirms the fixed-gutter change is a big improvement but there's still some unused space on desktop. Requested: a way to dynamically adjust the width across desktop/tablet/mobile rather than a single fixed gutter/cap. **Not yet scoped or implemented** — candidate approach for a future pass: per-breakpoint gutter/max-width values (e.g. tighter gutter or higher cap at very wide desktop, current behavior kept for tablet/mobile) rather than one constant for all desktop sizes; needs a proper look at a few real intermediate widths (e.g. 1440px, 1600px laptop panels) before picking values, same "don't guess blind" approach used for the earlier spacing pass.

### b. Sonnet resume generation crash — debug/fix

Real crash during a live `--llm=sonnet` run (mode=all, `--refresh-blueprint`), confirmed via the portal's own debug-output panel:

```
File "jd_scorecard_resume_v2.py", line 952, in <module>
    resume_text = soften_experience_years(resume_text)
File "jd_scorecard_resume_v2.py", line 101, in soften_experience_years
    return YEARS_FIGURE_RE.sub("extensive years", text)
TypeError: expected string or bytes-like object, got 'NoneType'
```

Blueprint refresh, blueprint-repair, and Scorecard all completed successfully with `anthropic/claude-sonnet-5` (confirmed in the debug log); the crash happened on the **Resume** step specifically — `call_llm(...)` (line ~951, `scripts/jd_scorecard_resume_v2.py`) returned `None` for `resume_text`, which then crashed the very first post-processing helper (`soften_experience_years`) since it assumes a string.

**Root cause — confirmed 23 Jul 2026, fixed and verified.** See `docs/guides/JDSCORECARDRESUMEV2_SONNET5TOKENBUDGET_23JUL2026.md` for the full record.
- `call_llm()` (line ~518) returned raw API content with no validation — silently returned `None` on empty content, and (worse) could silently return **truncated** content when `finish_reason == "length"`, since a partial response still has *some* text. Both now raise a clear `RuntimeError` (model, finish_reason, refusal/token-usage detail) instead.
- Confirmed via real testing against the actual failing JD: `anthropic/claude-sonnet-5` is simply more verbose than the previous `claude-sonnet-4.6` slug for every call in this pipeline (not reasoning-tokens — `reasoning_tokens: 0` throughout). Raised `max_tokens` for all five calls: Blueprint 2600→6000, Blueprint Repair 3000→6000, Scorecard 6000→12000, Resume 4500→**20000** (needed the largest jump), Cover Letter 2500→8000.
- Full pipeline re-run (`--refresh-blueprint --force`, mode=all, sonnet — exactly replicating the original crash) now succeeds end-to-end; resume and cover letter output both verified complete (not truncated) by reading the actual files, not just checking for a zero exit code.
- `scripts/jd_scorecard_resume.py` (v1) has the same stale slug and no defensive handling, deliberately left untouched (golden-rule, unused by the portal since Phase A).

## Priority order

1. ~~Fix JD Portal vertical scroll regression~~ — **done, verified 23 Jul 2026**
2. ~~Redesign History/doc-view from modal to expand/collapse accordion~~ — **done, verified 23 Jul 2026**
3. ~~UI/UX spacing polish pass~~ — **done, verified 23 Jul 2026**
4. ~~JD Portal v2 Phase A (backend repoint to v2, --ResumeAdjustment wiring, command preview)~~ — **done, verified 23 Jul 2026**
5. ~~Sonnet model slug fix (claude-sonnet-4.6 → claude-sonnet-5)~~ — **done, verified 23 Jul 2026**
6. ~~Collapsible sections, dynamic width, progress visibility, force-stop, JD text caching~~ — **done, verified 23 Jul 2026**
7. ~~Width follow-up (fixed-gutter fix)~~ — **done, verified 23 Jul 2026**
8. ~~Sonnet resume-generation crash (call_llm truncation/None handling + token budgets)~~ — **done, verified 23 Jul 2026**
9. ~~JD Portal v2 Phase B — company-grouped History accordion~~ — **done, verified 23 Jul 2026**
10. ~~Bring-your-own-key + dynamic LLM selection~~ — **done, verified 23 Jul 2026** — see `docs/guides/JDPORTALBRINGYOUROWNKEY_23JUL2026.md` (technical) and `docs/guides/JDPORTALAPIKEYS_EXPLAINER_23JUL2026.md` (plain-language walkthrough of the behavior). Server-side gitignored key storage (`secrets/jd_portal_llm_keys.json`), optional override falling back to `.env`, curated dropdown + free-text Custom model/provider override, `--api-key=`/`--model=`/`--provider=` CLI flags. Real portal Playwright run succeeded end-to-end through the full bring-your-own-key + custom-model path.
11. JD Portal v2 Phase C — step-wizard redesign (Configure/JD Run/Reports) + light/dark theme toggle
12. Dynamic width further enhancement (per-breakpoint values) — medium priority, future work (see section above)
13. Remaining JD Automation Portal phases (NLP, integration, Docker, dev env docs, deploy — deploy now also covers the new auth/view routes)
14. LinkedIn automation scoping

## Tomorrow (24 Jul 2026) — priority order

Everything logged today under "New today" is done and verified except the two items explicitly deferred as future work (#11 below carries no urgency marker, #12 is medium-priority). Nothing is currently broken or half-finished — a clean starting point.

1. **JD Portal v2 Phase C** — step-wizard redesign (Configure → JD Run → Reports, per the trading-portal-inspired look) + new bespoke light/dark theme toggle. Largest and most design-subjective remaining piece of the whole JD Portal v2 round; scope with fresh eyes before diving in, per soul.md intake (re-read the confirmed decisions in the "JD Portal v2" section above first — phasing, run-behavior, and theme-source questions were already asked and answered, don't re-ask).
2. **Dynamic width further enhancement** — per-breakpoint gutter/max-width values (see section above); worth folding into Phase C's redesign work if that's touching `PortalShell.css` anyway, rather than doing it twice.
3. **Remaining JD Automation Portal phases** (NLP `update_profile_json`, integration, Docker packaging, dev-env docs, VPS deploy — deploy phase now also covers `/api/auth/*`, `/api/view/*`, `/api/settings/*` routes and both `secrets/jd_portal_auth.json` + `secrets/jd_portal_llm_keys.json` provisioning on the VPS).
4. **LinkedIn job-search automation scoping** — not started, still just an idea to scope.
