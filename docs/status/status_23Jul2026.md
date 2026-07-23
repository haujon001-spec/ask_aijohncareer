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

## Width follow-up + Sonnet resume-generation crash fix (later still, 23 Jul 2026)

**Status: Both done and verified.**

- **Width**: the `min(1400px, 94vw)` cap from the usability round still left ~230px dead space per side on the user's actual ~1862px-wide window (94vw exceeded 1400px, so the pixel cap always won). Switched to a fixed ~24px gutter (`width: calc(100% - 48px); max-width: 1800px`) — verified at the user's exact viewport width: gutter dropped from ~230px/side to ~31px/side.
- **Sonnet resume-generation crash — root cause confirmed, fixed and verified.** Full record: `docs/guides/JDSCORECARDRESUMEV2_SONNET5TOKENBUDGET_23JUL2026.md`. `call_llm()` silently returned `None`/truncated content with no validation; `anthropic/claude-sonnet-5` turned out to need substantially more `max_tokens` than the previous `claude-sonnet-4.6` slug for every call in the pipeline (not a reasoning-tokens issue — confirmed `reasoning_tokens: 0` throughout, the model is just more verbose). Added defensive error handling (raises a clear, diagnostic error on empty or truncated content instead of crashing deep in an unrelated helper or silently shipping an incomplete document) and raised every call's token budget based on real measured truncation (Resume needed the biggest jump, 4500→20000). Full pipeline re-run with the exact original failing scenario now succeeds end-to-end, output verified complete by reading the actual files.

## JD Portal v2 Phase B — company-grouped History accordion (later still, 23 Jul 2026)

**Status: Done and verified.** Full record: `docs/guides/JDPORTALV2PHASEB_23JUL2026.md`.

History restructured from a flat per-run accordion into **Company → Job run → Document** (one entry per employer, e.g. "Manulife — 3 runs", expanding to its individual JD runs). Single-open at every level, matching the rule already used for the flat version. Verified via Playwright: 19 flat runs now group into 10 companies, Manulife correctly nests its 3 real runs, single-open confirmed at both new levels, doc viewer still works three levels deep.

## Bring-your-own-key + dynamic LLM selection (later still, 23 Jul 2026)

**Status: Done and verified.** Full record: `docs/guides/JDPORTALBRINGYOUROWNKEY_23JUL2026.md`.

Closes out the item carried forward since 21 Jul. Server-side key storage (`secrets/jd_portal_llm_keys.json`, gitignored, same convention as `jd_portal_auth.json`) — a saved personal OpenRouter/DeepSeek key optionally overrides the server's `.env`-based key, injected only into the spawned Python process's environment (never logged, never sent back to the browser once saved — status responses only show a redacted preview). New "Custom" LLM option in the portal (provider + free-text model id) plus matching `--model=`/`--provider=`/`--api-key=` CLI flags on `jd_scorecard_resume_v2.py`. Verified with a real end-to-end Playwright run: saved a real key via the UI, ran a custom-model job through the full new path, got a genuine successful Match Score back, then cleared the key and confirmed it reverted to the server default with nothing left on disk.

## Session close — 23 Jul 2026

- [x] Wrote a plain-language explainer for the bring-your-own-key behavior: `docs/guides/JDPORTALAPIKEYS_EXPLAINER_23JUL2026.md` (what happens when a key is saved/used/cleared, precedence, security handling, scope) — companion to the technical build record.
- [x] `docs/todolist/todolist_23Jul2026.md` updated with a "Tomorrow (24 Jul 2026) — priority order" section: Phase C first, then the width follow-up (fold into Phase C if convenient), then remaining JD Automation Portal phases, then LinkedIn scoping.
- [x] GitHub updated before session close.
- Nothing left broken or half-finished from today — every item logged under "New today" is done and verified except the two explicitly-deferred future-work items below.

## Known open items (unchanged, carried forward)

- JD Portal v2 Phase C — step-wizard redesign (Configure/JD Run/Reports) + light/dark theme toggle. Largest and most design-subjective remaining piece — tomorrow's top priority.
- Dynamic width further enhancement (per-breakpoint values) — medium priority, consider folding into Phase C.
- JD Automation Portal Phases 3-7 (NLP profile-update, Docker, VPS deploy) — still outstanding, now includes wiring the new auth/view/settings routes and both `secrets/jd_portal_auth.json` + `secrets/jd_portal_llm_keys.json` provisioning onto the VPS whenever that phase starts.
- LinkedIn job-search automation scoping — not started.
