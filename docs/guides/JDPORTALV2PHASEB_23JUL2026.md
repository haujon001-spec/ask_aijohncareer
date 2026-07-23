# JD Portal v2 — Phase B: Company-Grouped History Accordion (23 Jul 2026)

Second of the three-phase JD Portal v2 round (Phase A: `docs/guides/JDPORTALV2BACKEND_23JUL2026.md`; Phase C: step-wizard redesign + theme, not started).

## What changed

History previously showed one flat accordion row per **run** (company + date + idx). With repeated JDs for the same employer (e.g. Manulife had 3 separate runs across 21/22/23 Jul), this meant 3 separate top-level rows all labeled "Manulife". Per user decision, restructured into a third nesting level:

**Company → Job run → Document** (was: Job run → Document)

- `src/components/JDPortal/JDHistoryList.jsx`: added `groupByCompany()`, grouping the (already recency-sorted) flat `history` array by `entry.employer` using a `Map` — insertion order naturally gives "most-recently-active company first" for free, matching the previous flat ordering's intent, with no backend change needed (grouping is presentation-only).
- New state: `expandedCompany` (top level), `expandedJob` (was `expandedCompany` in the old flat version — renamed for clarity now that there's a real company level above it), `expandedDoc` (unchanged concept, now keyed to `jobKey` instead of the old flat `companyKey`).
- **Single-open at every level**, per user decision: opening a different company collapses the previous one *and* clears any open job/doc; opening a different job within the same company collapses the previous job *and* clears any open doc; opening a different doc replaces the previous one. Same rule already used for the flat version built earlier today, just extended one level deeper.
- New CSS: `.jd-history-job`, `.jd-history-job-header/-title/-meta/-date`, `.jd-history-job-body` — visually nested under the company card (subtle background, left margin, smaller title), reusing the existing `.jd-history-chevron` styling for both levels so open/closed states look consistent top-to-bottom.
- Company header now shows a run count (e.g. "3 runs") instead of a per-run match score, since a company can span multiple JDs with different scores; the match-score badge moved down to the job level where it actually belongs.

## Verification (soul.md §3.1/§14 — executed and confirmed, not just written)

Real Playwright pass against the live local dev stack (same temp-credential-swap + live-TOTP technique used throughout today, user-approved; `secrets/jd_portal_auth.json` backed up and restored immediately after — confirmed restored):

- History now shows **10 company-level rows** (grouped from the prior flat list of 19 individual runs).
- Manulife correctly groups all **3** of its real runs (23/22/21 Jul) as nested job rows, each with its own match score and date, confirmed via `.jd-history-job-date` text: `["23JUL2026", "22JUL2026", "21JUL2026"]`.
- Single-open confirmed at every level: opening a second job left exactly 1 `.jd-history-job-body` open (not 2); switching to a different company (Prudential) left exactly 1 `.jd-history-card-body` open and 0 `.jd-history-job-body`/doc state carried over from Manulife.
- Doc viewer still works correctly nested three levels deep — screenshot confirms a Scorecard's mammoth-rendered content displaying inline under the correct job under the correct company. (Also incidentally re-confirmed, while reviewing this screenshot, that Scorecard documents *still* show their own `Generated :`/`Profile :` header lines — this is expected/unchanged, never in scope for removal; only Resume/Cover Letter had those lines removed by v2.)
- Zero console errors.

## Not in scope

- Phase C (step-wizard redesign, Configure/JD Run/Reports; light/dark theme) — unaffected, still pending.
- VPS deployment — unaffected, still deferred.
