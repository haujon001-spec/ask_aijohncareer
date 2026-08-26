# Todolist — 26 August 2026

## Intake (per soul.md §8.1)

Read `soul.md` and the latest 3-4 todolists (`todolist_12Aug2026.md`,
`todolist_11Aug2026.md`, `todolist_07Aug2026.md`, `todolist_05Aug2026.md`)
before starting. Last commit before today was `4ba2138` (12 Aug 2026) —
a 2-week gap with no repo activity in between. Flagged to the user:

- The 12 Aug todolist was stale (no docs/status/commits since).
- An untracked file, `src/data/jd/JD_HospitalAuthority_IT_Manager_Systems.json`
  (Systems Manager (Technical Management), Hospital Authority), had been
  sitting in the working tree since 12 Aug with no todolist/status entry.
  Not yet actioned — user chose to resume the carried-over `/portal2`
  click-through first; the untracked JD file is still open, see below.

User chose to resume the carried-over `/portal2` click-through item first.

## `/portal2` click-through — COMPLETE

User ran the click-through themselves (I stood by; did not automate with
test credentials). Confirmed successful: login → profile picker → JD run →
Reports step, including the wide `DocViewer` modal shipped 12 Aug. No
issues reported. Marked complete in `docs/todolist/todolist_12Aug2026.md`
(backed up first as `todolist_12Aug2026.md.20260826_V1.bak`).

Dev stack notes for reuse: `npm run dev:all` failed with `EADDRINUSE` on
3000/3010/5173 — turned out frontend/backend/jd-api were **already running**
from an earlier session (verified via `netstat` + health curls, all 200).
Killed the one redundant duplicate vite instance my `dev:all` spawned on
5174; left the pre-existing three untouched.

## New today — dedup + 1-page cover letter cap (`scripts/jd_scorecard_resume_v2.py`)

**Status: Done and verified.** Full writeup:
`docs/guides/JDSCORECARDRESUMEV2_DEDUP_ONEPAGECOVERLETTER_26AUG2026.md`.

User request: "implement the deduplication and to only create a 1 pager
cover letter using scripts/jd_scorecard_resume_v2.py." Clarified via
questions: resume dedup targets same achievement/figure repeating across
Professional Summary / relevance bridge / Professional Experience (later
extended to also cover `AI & AUTOMATION HIGHLIGHTS` after verification
caught a real overlap there); cover letter gets the same cross-paragraph
dedup plus a prompt-only ~350-420 word / 1-page cap (user chose prompt-only
over a code-level docx page-count check) plus a new rule stopping the
letter from restating the employer's own business/JD back to them.

Verified live against the pre-existing untracked Hospital Authority JD
(`--resume-only`/`--coverletter-only --force`, real LLM calls): cover
letter body = 379 words, no repeated figures across paragraphs, no JD
restating; resume first pass caught a real AI-Highlights/Professional-
Experience duplicate (Bank of America ITSM automation figures), fixed by
extending rule 18's scope, re-verified clean on the second pass.

**Deployed to production same day**, scoped to just this fix (user chose
this over also deploying the un-deployed `/portal2` epic accumulated since
the last VPS deploy on 6 Aug). scp + `jd-api`-only rebuild, backed up first
(`*.20260826_pre_deploy.bak` on the VPS), byte-identical transfer confirmed
via `sha256sum`, dedup rule markers confirmed present inside the running
container, health endpoint + main site + `/portal` all verified 200 through
the real domain. `app`/`caddy` confirmed untouched throughout. Full record:
`docs/guides/JDSCORECARDRESUMEV2_DEDUP_ONEPAGECOVERLETTER_26AUG2026.md`.

## Still open (carried, not actioned today)

- **NEXT PRIORITY: deploy the `/portal2` multi-profile epic to the VPS.**
  User explicitly deferred this today (scoped today's deploy to just the
  dedup/1-pager fix instead — see above). Still not deployed to production:
  Phase 1 (`jd_scorecard_resume_v3.py`, `2dccb72`), Phase 2 (resume
  onboarding + `/portal2` UI, `bcc504b`), the master resume generator
  (`a911303`), and the 12 Aug Reports-view width fix (`4ba2138`) — all
  live/verified locally only, none deployed since the last VPS deploy on
  6 Aug (`ab7c31a`). Bigger than today's single-file deploy: needs
  `Dockerfile.jd-api` updated to also `COPY` `jd_scorecard_resume_v3.py`,
  both `app` and `jd-api` rebuilt (not just `jd-api`), and an explicit
  decision on whether any real profile data (e.g. Matina Fung's, currently
  gitignored/local-only) should ship to production at all. See
  `docs/guides/JDPORTALVPSDEPLOY_30JUL2026.md` for the deploy pattern and
  `docs/guides/JDSCORECARDRESUMEV3_MULTIPROFILE_FOUNDATION_11AUG2026.md` /
  `JDPORTAL_PHASE2_ONBOARDING_PORTAL2_11AUG2026.md` for what's being
  deployed.
- Three local commits not yet pushed to `origin/main`: `24f6a57` (dedup/
  1-pager feature), `ed75eda` (deploy record doc), `b1fdbd5` (this
  carry-forward note). User explicitly said to hold the push for now —
  do not push without asking again next session.
- Untracked `src/data/jd/JD_HospitalAuthority_IT_Manager_Systems.json` —
  needs a decision (commit / discard / run through the pipeline).
- Backend/auth: per-user identity (today: shared credential set, JWT
  hardcoded to `{user: 'john'}`).
- Screenshot-to-JD-text capture (vision-LLM call).
- `/api/profile/update-from-resume/propose`+`/approve` still not
  profile-aware.
- Data-isolation/PII posture beyond "minimal" if user base grows.
- Older 31 Jul backlog: LinkedIn automation discovery-path decision,
  Manulife resume regen decision, VPS hardening, dev-env docs, Job Tracker
  status fields.

## Session closed 26 Aug 2026

Working tree clean at close except the pre-existing untracked
`src/data/jd/JD_HospitalAuthority_IT_Manager_Systems.json` (open item
above, unrelated to today's work, left as-is — not committed or deleted
without a decision from the user). 3 local commits ahead of
`origin/main`, held back at the user's explicit request — **do not push
without asking again.**

**Top priority for next session:** deploy the `/portal2` multi-profile
epic to the VPS (see above) — everything needed to scope it is already
recorded here and in the linked guides.
