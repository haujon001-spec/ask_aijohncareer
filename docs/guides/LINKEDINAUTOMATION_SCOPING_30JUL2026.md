# LinkedIn Job-Search Automation — Scoping (30 Jul 2026)

Scoping record for todolist item 12, carried as "not started, still just an idea" since 23 Jul 2026. **Not implemented — scoping only, per user decision this session.** User selected two capabilities out of four offered; auto-fill/submit of LinkedIn's own application forms was explicitly **not** selected (higher-risk, deferred/rejected).

## Selected scope

1. **Auto-discover matching job postings.** Find LinkedIn postings that match John's profile and surface them as candidate JDs, feeding into the existing `jd_scorecard_resume_v2.py` / JD Portal pipeline (paste-a-JD today; this would add a "discovered" source).
2. **Track applied roles.** A lightweight tracker for roles already applied to via LinkedIn — status, dates, follow-ups.

Not in scope (deferred): auto-filling or submitting LinkedIn's own application forms.

## Real blocker that needs a decision before any implementation: LinkedIn's Terms of Service

LinkedIn's User Agreement explicitly prohibits scraping and automated data collection (Section 8.2), and LinkedIn actively detects and bans accounts for automated access (well-documented history of cease-and-desist letters and account suspensions against scraping tools, including the hiQ Labs litigation). This applies whether "auto-discover" is built as:
- **Unofficial scraping** (headless browser driving John's real LinkedIn session, or a `requests`/`playwright`-based scraper) — real risk of triggering LinkedIn's bot detection and suspending John's personal account, which is a materially worse outcome than not having this feature.
- **LinkedIn's official API** — the Jobs API and most useful endpoints are gated behind LinkedIn Partner Programs (Talent Solutions, Marketing Developer Platform) that are not self-serve for an individual; there is no public, ToS-compliant "search jobs matching my profile" API available to an individual developer today.
- **Third-party job-aggregator APIs** (e.g. a paid jobs-data API that itself sources LinkedIn listings under its own commercial agreement) — technically compliant from this project's side, but adds a paid dependency and doesn't give the exact "LinkedIn's own listings, live" behavior implied by the ask.

**This needs an explicit decision from the user before any code is written** — it's a real account-safety tradeoff (John's personal LinkedIn identity), not a technical detail. Candidate paths, cheapest-first:
- (a) Manual-paste workflow only for now: John pastes LinkedIn job URLs/text himself (same pattern as today's JD paste), automation limited to parsing + matching, not discovery. Zero ToS risk, smallest build.
- (b) Email/RSS-based discovery: LinkedIn job-alert emails (which John can already set up natively) parsed by a script/portal feature, instead of scraping LinkedIn directly. Avoids touching LinkedIn's site/API at all.
- (c) A licensed third-party jobs API, accepting the added cost/dependency.
- (d) Direct scraping/automation against LinkedIn — not recommended given the ToS/account-ban risk above; would need explicit, informed sign-off if chosen anyway.

## Second capability — applied-role tracker

Lower risk, no ToS concerns (this is just John's own data about his own applications). Natural fit as a new JD Portal tab/table:
- Fields: employer, role, date applied, source (LinkedIn / direct / referral), status (applied / interview / rejected / offer), notes, optional link to the matching `data_processed/<Employer>/` JD-run folder if one exists.
- Storage: likely a simple JSON file under `data_processed/` or a new `data/applications.json`, following the repo's existing "filesystem is the source of truth, no DB" convention (same as `history.js`, profile backups).
- Could reuse `JDHistoryList.jsx`'s table/row patterns for the UI rather than building a new list component from scratch.

## Open questions for a future implementation session

1. Which discovery path — (a)/(b)/(c)/(d) above — does the user want to commit to? This gates whether "auto-discover" is buildable at all in a ToS-safe way.
2. Does the applied-role tracker need manual entry only, or should completing a JD Portal run (scorecard/resume/cover-letter generated) auto-create a draft tracker entry?
3. Should discovered/tracked roles link back into the existing History view, or live as a fully separate tab?

## Not implemented

No code changes made. This document exists to unblock a future implementation session with the discovery-path decision already surfaced, rather than starting that session by re-deriving the ToS problem from scratch.
