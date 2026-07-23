# JD Portal — Usability Round: Collapsible Sections, Dynamic Width, Progress, Force-Stop, JD Caching, Model Fix (23 Jul 2026)

Third JD Portal round today (after the bugfix round and the v2-backend/`--ResumeAdjustment`/command-preview round). Triggered by the user hitting a real ~6-minute run (`--llm=sonnet`, mode=all, `--refresh-blueprint --ResumeAdjustment`) with no progress feedback beyond an elapsed-second counter, reasonably reading it as hung.

## 1. Sonnet model slug — confirmed and fixed

`LLM_CONFIGS["sonnet"]` in `scripts/jd_scorecard_resume_v2.py` was `anthropic/claude-sonnet-4.6`. Checked OpenRouter's live `/api/v1/models` API directly (no auth needed for listing): `anthropic/claude-sonnet-4.6` **is** a real, currently-listed model — the run that prompted this wasn't actually stuck, it completed successfully in 363054ms (~6 min, confirmed in the backend log: full blueprint refresh + blueprint-repair + scorecard + resume + cover letter, 5 sequential LLM calls). But per the 21 Jul decision, `anthropic/claude-sonnet-5` is the intended model — confirmed present in the same API response, pricing matches the 21 Jul screenshot ($2/$10 per M tokens, 1M context). Swapped the slug and the trailing usage-print text. **`scripts/jd_scorecard_resume.py` (v1) has the same stale slug but was deliberately left untouched** (golden-rule; v1 is no longer invoked by the portal after Tuesday's Phase A repoint) — flagged for the user rather than changed without being asked.

Verified with a real CLI call: `--scorecard-only --llm=sonnet --force` completed quickly, log confirms `Model : anthropic/claude-sonnet-5` and a successful OpenRouter call.

## 2. Progress visibility (step-level polling, not full streaming)

Per user decision: lightweight polling, not a full live-console SSE/WebSocket rebuild.

- `backend/lib/pythonRunner.js`: added module-level `currentRun` state tracking the in-flight child process, JD file, start time, and a `currentStep` string parsed from the script's own stdout step markers (`STEP_MARKER_RE = /\[(\d)\/3\]\s+([^\r\n]+)/`, matching lines like `🔍  [1/3] Generating JD Scorecard...`). New export `getCurrentRunStatus()`.
- `backend/api/jd_run.js`: new `GET /api/jd/run/status`, polled by the UI.
- `src/utils/jdApi.js`: new `fetchRunStatus()`.
- `src/components/JDPortal/JDRunPanel.jsx`: polls every 2s while `running`, displays the current step text beneath the elapsed-second counter.

## 3. Force-stop

Per user decision: keep whatever files a cancelled run already finished writing; only the in-flight step is abandoned.

- `pythonRunner.js`: new `cancelCurrentRun()` — on Windows uses `taskkill /pid <pid> /t /f` (more reliable than a bare `child.kill()` for fully ending the process tree); marks the run's `cancelRequested` flag so the `close` handler can report `cancelled: true` distinctly from a genuine crash. `currentRun` is only ever cleared inside the promise's single `finish()` path, so status/cancel always see consistent state.
- `backend/api/jd_run.js`: new `POST /api/jd/run/cancel`; the main run handler now special-cases `result.cancelled` to return `{ success: false, cancelled: true, jdFile, employer }` (HTTP 200, not an error) rather than falling into the generic non-zero-exit-code 500 path.
- `src/utils/jdApi.js`: new `cancelRun()`.
- `JDRunPanel.jsx`: new "Stop" button next to "Run" (visible only while running); on a cancelled response shows a distinct warning banner ("Run stopped — steps already completed before the stop were kept...") instead of treating it as an error.

## 4. JD text caching (last-saved only)

Per user decision: cache only what's been through a successful "Save JD", not in-progress typing.

- `src/components/JDPortal/JDUploadForm.jsx`: on a successful save, `{ employer, role, jdText }` is written to `localStorage` (`jdPortal.lastSavedJd`); on mount, the form's initial state reads from that cache so the last-saved JD pre-fills the "New JD Run" tab after a reload/revisit. Wrapped in try/catch since localStorage can be unavailable (private browsing) — caching is a convenience, not a requirement.

## 5. Collapsible sections

New `src/components/JDPortal/CollapsibleCard.jsx` — a small wrapper (title + optional `headerExtra` node + children) reusing the same chevron styling already built for the History accordion rows. Applied to all three top-level cards: `JDUploadForm` ("Paste a Job Description"), `JDRunPanel` ("Run JD Pipeline"), `JDHistoryList` ("Run History", with the existing "Refresh" button passed as `headerExtra` so clicking it doesn't also toggle collapse). All default open.

## 6. Dynamic width

`src/components/JDPortal/PortalShell.css`: `.portal-main`'s `max-width: 960px` (fixed) → `max-width: min(1400px, 94vw)` — scales with the viewport instead of leaving large dead margins on wide desktop windows, still capped for readability on ultrawide monitors, and naturally narrows on tablet/mobile.

## Verification (soul.md §3.1/§14 — executed and confirmed, not just written)

All via Playwright against the live local dev stack, authenticated with the same temporary-credential-swap + live-TOTP technique used earlier today (user-approved; `secrets/jd_portal_auth.json` backed up and restored immediately after — confirmed restored).

- **Dynamic width**: measured `.portal-main`'s actual rendered width at a 1920px-wide viewport — 1400px (the new cap), a large increase from the old fixed 960px. Screenshot confirms the layout visibly uses the available space.
- **Collapsible**: toggled the "Paste a Job Description" card closed then open again; `.jd-collapsible-body` count went 2 → 1 → 2 as expected. Screenshot confirms a collapsed card renders as just its title bar with a downward chevron.
- **JD text caching**: saved a real (throwaway) JD, reloaded the page, confirmed the Employer/Role fields were pre-filled from the cache. Test artifact (`JD_ClaudeVerifyTemp23Jul_Verification_Role.txt`) deleted afterward.
- **Progress + force-stop**: started a real run (Prudential JD, gemini, mode=all, `--refresh-blueprint`), confirmed `GET /api/jd/run/status` was polled and returned `200`, confirmed the progress line rendered (`Starting…`, i.e. before the first step marker had printed — proving the plumbing is live, not just a static label), clicked "Stop", confirmed `POST /api/jd/run/cancel` returned `200`, the original run request resolved `200` with `cancelled: true`, and the UI showed the expected "Run stopped — steps already completed before the stop were kept" banner. Confirmed no orphaned `python.exe` process remained afterward (the one long-running python process found on the machine was an unrelated VS Code Python-extension helper, not the JD pipeline).
- Zero console errors across all checks.

**Note on an earlier false negative during this verification**: an initial pass used the Playwright selector `button:has-text("Run")`, which also substring-matches the "**New JD Run**" tab button — Playwright's non-strict `page.click()` silently clicked the tab instead of the actual submit button, several times in a row, making it look like Run/Stop/progress weren't working at all. Re-tested with an exact-name locator (`getByRole('button', { name: 'Run', exact: true })`) and everything worked correctly on the first real attempt — this was a test-script bug, not an app bug, logged here in case a future session's Playwright script hits the same trap.

## Not in scope

- JD Portal v2 Phase B (company-grouped History accordion) and Phase C (step-wizard redesign + light/dark theme) — unaffected, still pending, per `docs/todolist/todolist_23Jul2026.md`.
- VPS deployment — unaffected, still deferred.
