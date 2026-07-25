# Todolist — 25 July 2026

## Carried over from todolist_23Jul2026.md

No `todolist_24Jul2026.md` was written — 23 Jul's "Tomorrow (24 Jul 2026) — priority order" section carried forward as-is into today's session start.

1. ~~JD Portal v2 Phase C — step-wizard redesign (Configure/JD Run/Reports) + light/dark theme toggle~~ — **done, verified 25 Jul 2026.** See `docs/guides/JDPORTALV2PHASEC_25JUL2026.md`.
2. **Dynamic width further enhancement** (per-breakpoint gutter/max-width values) — **still outstanding.** Was flagged as a candidate to fold into Phase C since both touch `PortalShell.css`, but Phase C's scoping (confirmed with the user this session) was strictly Configure/JD Run/Reports step mapping, History placement, and the theme toggle — width tuning wasn't part of the confirmed scope, so it stayed out. Carry forward, medium priority.
3. **Remaining JD Automation Portal phases** (NLP `update_profile_json`, integration, Docker packaging, dev-env docs, VPS deploy) — still outstanding. Deploy phase covers `/api/auth/*`, `/api/view/*`, `/api/settings/*` routes and both `secrets/jd_portal_auth.json` + `secrets/jd_portal_llm_keys.json` provisioning on the VPS.
4. **LinkedIn job-search automation scoping** — not started.

## New today (25 Jul 2026) — JD Portal v2 Phase C

Session opened with soul.md intake (read latest todolist + status docs), then scoped Phase C via clarifying questions before implementation, per soul.md and explicit user request:

- **Step mapping confirmed:** Configure = JD paste only; JD Run = CLI params + command preview + run/progress/force-stop; Reports = finished scorecard/resume/cover-letter output.
- **History placement confirmed:** stays a separate top-level tab, untouched by the wizard restructure.
- **Theme toggle confirmed:** lives in `PortalShell`'s header, defaults to the existing dark ("fintech") theme, new bespoke light palette is opt-in.

Built and verified end-to-end (real Playwright run against the live dev stack, including a genuine `--scorecard-only` job). Full record: `docs/guides/JDPORTALV2PHASEC_25JUL2026.md`.

Also committed two items left uncommitted at the end of the 23 Jul session (hiring-manager explainer deck v2 + Live Demo slides, and their status-doc/data-file companions) before starting today's work.

## New today (25 Jul 2026, later same day) — Phase C follow-up: textarea UX + pipeline retry fix

User exercised the new wizard for a real run and reported two issues, logged here per soul.md intake workflow:

1. **Configure step's JD-paste textarea too small** — a leftover from when it shared the screen with the Run panel below it. **Fixed 25 Jul 2026** — `min-height` raised 140px → 360px desktop (responsive: 260px/200px at 768px/480px). See `docs/guides/JDPORTALPHASECFOLLOWUP_25JUL2026.md`.
2. **Real run failed: "JD pipeline exited with a non-zero status"** (Manulife JD, `--refresh-blueprint --ResumeAdjustment --llm=sonnet`, mode=all). **Root-caused and fixed 25 Jul 2026** — a transient 403 from OpenRouter's multi-provider routing (confirmed: same key/model worked seconds later; not an invalid key, not a wizard bug). `call_llm()` in `scripts/jd_scorecard_resume_v2.py` had zero retry logic — a single transient error killed the whole 5-call pipeline. Added retry-with-backoff (3 attempts, linear backoff) on connection errors and `{403,408,425,429,500,502,503,504}`. Re-ran the exact failing scenario end-to-end — succeeded, all 6 output files written. Full record: `docs/guides/JDPORTALPHASECFOLLOWUP_25JUL2026.md`.
   - **Separate finding, resolved:** a stale Windows User-level `OPENROUTER_API_KEY` env var (dead key, different from the working `.env.local` one) was found during diagnosis — didn't cause this failure but was a latent landmine for anything reading `os.environ` directly. Removed per user decision.

## Priority order

1. ~~JD Portal v2 Phase C~~ — **done, verified 25 Jul 2026**
2. ~~Phase C follow-up: textarea UX + pipeline retry fix~~ — **done, verified 25 Jul 2026**
3. Dynamic width further enhancement (per-breakpoint values) — medium priority, carried forward
4. Remaining JD Automation Portal phases (NLP, integration, Docker, dev env docs, deploy)
5. LinkedIn automation scoping — not started
