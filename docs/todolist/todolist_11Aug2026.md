# Todolist — 11 August 2026

## Intake (per soul.md §8.1)

Read `soul.md` and the latest 3-4 todolists (`todolist_07Aug2026.md`,
`todolist_05Aug2026.md`, `todolist_03Aug2026.md`, `todolist_31Jul2026.md`)
before starting. Nothing from 8-10 Aug was actioned on the carried-over items
below — 10 Aug's session was the Matina Fung one-off plus capturing the
multi-profile epic requirements (still deferred, unscoped). All items below
are carried forward unchanged from `todolist_07Aug2026.md` except where noted.

## New today (11 Aug 2026) — Master Resume Generator (done)

1. **Built `scripts/generate_master_resume.py`** — generates an exhaustive
   "everything" master resume `.docx` straight from
   `src/data/john_profile.json`: full contact/summary/competencies/skills,
   all 7 AI projects in full detail, all 7 professional-experience entries
   with every highlight, all 57 major achievements grouped by company,
   education/certs/languages/soft-skills, the `key_topics_for_qa` index, and
   all 16 LinkedIn recommendations verbatim. Deliberately not a send-ready
   1-2 page resume — a single-source knowledgebase to mine for future
   JD-tailored resumes. Decisions (exhaustive doc, full-verbatim
   recommendations, reusable script, root-level docx naming) confirmed with
   user before implementation.
   - Output: `JohnHauResume2026_MASTER_FULL_11AUG2026.docx` (project root) +
     `.txt`/`.docx` copies under `data_processed/MasterResume/resume/`.
   - Caught and fixed a real risk during build: an early version imported
     `convert_text_file_to_docx` from `jd_scorecard_resume_v2.py`, which has
     no `if __name__ == "__main__":` guard — the import executed that
     script's entire live pipeline (LLM call, file writes) as a side effect.
     No damage occurred (verified via `git status`), but the fix was to copy
     the pure docx-conversion helpers into the new script instead of
     importing, keeping `jd_scorecard_resume_v2.py` untouched per soul.md's
     golden rule.
   - Also caught and fixed a markup-composition bug (`**bold**` + `" — "`
     bold-left-side rule don't compose in the shared converter — leaked
     literal `**` into the recommendations section) before final verification.
   - Verified: profile JSON counts match generated output exactly
     (16/16 recommendations, 57/57 achievements, 7/7 jobs, 7/7 AI projects);
     opened the `.docx` with python-docx and confirmed no stray markup,
     correct bold runs, correct Unicode em-dash.
   - Guide written: `docs/guides/MASTERRESUMEGENERATOR_11AUG2026.md`.

2. **AEON Credit Service Asia JD blueprint committed.** The
   `src/data/jd/JD_AEONCreditServiceAsia_Head_Of_Information_Technology.json`
   blueprint (plus its Scorecard/Resume/CoverLetter outputs under
   `data_processed/AEONCreditServiceAsia/`, which stay gitignored per the
   existing `data_processed/` pattern) surfaced mid-session from the user's
   own JD Portal run — flagged for confirmation since it wasn't something
   this session triggered; user confirmed it was their own recent JD
   submission. Blueprint committed and pushed alongside
   `JD_Jefferies_IT_VP_VDIDesktopEngineer.json` (pre-existing, previously
   uncommitted).

3. **Multi-Profile epic, Phase 1 (CLI foundation) — built, verified, done.**
   User explicitly prioritized the multi-profile epic today, ahead of the 31
   Jul backlog and the cover-letter density nuance (both explicitly kept in
   backlog per user instruction). Two decisions resolved first (folder-per-
   user profile shape, minimal PII posture), then a plan was drafted and
   approved before implementation (see
   `docs/guides/JDSCORECARDRESUMEV3_MULTIPROFILE_FOUNDATION_11AUG2026.md` for
   the full record). Delivered:
   - `scripts/jd_scorecard_resume_v3.py` — full copy of v2 (never edited),
     adds required `--profile=<Name>` flag; every path namespaced per profile
     (`src/data/<Name>/profile.json`, `src/data/<Name>/jd/`,
     `data_raw/<Name>/jd/txt/`, `data_processed/<Name>/<Employer>/...`).
   - `data_raw/resume/txt/GenericStructuralResumeTemplate.md` — new
     placeholder-only layout template, replacing the old template which
     turned out to be John's real personal resume content injected verbatim
     into every LLM prompt (a real PII-exposure finding, not previously
     noticed, now fixed for any non-John profile).
   - Profile-load hoisted earlier + fails loudly on missing required metadata
     fields, fixing a real leak risk in v2's cover-letter contact fallback
     (which silently substituted John's real phone/email/LinkedIn — safe
     only because v2 only ever loads John's own profile).
   - `src/data/AlexRivera/profile.json` — fictitious synthetic test profile
     (not a real person), used to verify the pipeline end-to-end without
     touching real third-party PII.
   - Verified: 4 fail-loud checks (missing/invalid/nonexistent `--profile`,
     missing metadata field), full end-to-end run (scorecard+resume+cover
     letter), zero-leakage grep against John's real name/contact/employer
     across all outputs, v2 regression check (`git diff --stat` clean, full
     28-JD batch run confirms unchanged output paths/behavior), and both
     `--resume-only`/`--coverletter-only` partial-run modes.
   - Explicitly out of scope for this phase (deferred to later phases):
     backend/auth, per-user MFA, self-service signup, portal UI, screenshot-
     to-JD-text capture, `update_profile_from_resume.py` multi-profile
     support.

4. **Multi-Profile epic, Phase 2 (resume onboarding + `/portal2`) — built,
   verified, done** (backend/route-level; browser click-through still needs
   user's own portal password — see below). User asked for this directly
   after Phase 1, resolving 4 more decisions first (public-repo/PII posture,
   onboarding-mechanism design, v2/v3-parity confirmation, portal2 auth/scope)
   — full record in
   `docs/guides/JDPORTAL_PHASE2_ONBOARDING_PORTAL2_11AUG2026.md`. Delivered:
   - **Public-repo finding**: `gh repo view` confirmed this repo is PUBLIC —
     `.gitignore` now defaults every future `src/data/<Name>/` folder to
     untracked (explicit allow-list for `src/data/jd/` and
     `src/data/AlexRivera/`), closing a real risk before Matina Fung's real
     data ever touched git.
   - `scripts/update_profile_from_resume.py` extended (backed up first,
     `.20260811_V1.bak`): new `--profile=`/`--create-new-profile` mode
     (whole-resume→whole-profile extraction, separate from the existing
     employer-diff mode), `.docx` input support (paragraphs + table cells,
     including nested tables), retired `deepseek-reasoner` alias fixed
     (same class of bug already fixed in v2/v3 on 3 Aug), hardcoded "John
     Hau" genericized in the diff-mode prompt too.
   - **Matina Fung onboarded for real** (`src/data/MatinaFung/profile.json`,
     gitignored, never pushed) — her source docx was missing its entire
     name/contact header (verified via exhaustive check: no images, text
     boxes, headers/footers, or document-properties fallback either); user
     manually restored it, then supplied location + LinkedIn after a second
     gap was found. Also fixed a prompt bug live: first extraction populated
     `ai_projects` with HR-initiatives-that-used-AI-tools rather than
     personally-built systems — tightened the prompt, empty array on re-run
     (correct).
   - Backend: `runJdPipelineV3`/`discoverOutputsV3` in `pythonRunner.js`
     (siblings of the v2 functions, untouched); shared run-lock across
     `/api/jd/run` and new `/api/jd-v3/run` (`jd_run.js`'s old router-local
     boolean replaced with the same `isPipelineBusy()` both now share, so a
     v2 run and a v3 run can't race); new `/api/profiles`, `/api/onboard`,
     `/api/jd-v3/upload`, `/api/jd-v3/run` routes, all additive.
   - Frontend: new `/portal2` route (`ProfilePicker`, `ResumeUpload`,
     `JDRunStepV3`, `JDWizardV3`, `JDPortal2`), reusing the same shared
     password+TOTP gate as `/portal` (not per-person accounts). Found and
     fixed 3 more hardcoded `/portal`-literal spots than originally scoped
     (`PortalEnroll.jsx`) via a `basePath` prop threaded through 4 auth/shell
     components.
   - Verified: v2/v3 parity via `diff` (5 expected buckets only), Matina's
     CLI pipeline run against her real Richemont JD (zero "John Hau" leakage,
     grep-checked), `git diff --stat scripts/jd_scorecard_resume_v2.py`
     clean, `node --check` on every backend file, jd-api dev server restarts
     clean, new routes return `401` not `404` (correctly mounted +
     auth-gated), `npm run build` succeeds.
   - **Not yet done**: an actual browser click-through of `/portal2` (login →
     pick/onboard profile → run JD → confirm Reports) — needs the portal's
     real password, which this session doesn't have. Carried to next time
     the user is available to click through it themselves.

## Carried over from 7 Aug 2026 (still open, not actioned since)

3. ~~Live-verify the production deploy through the actual portal UI.~~ —
   **done, confirmed by user 11 Aug 2026.** Both the cover letter's 5-company
   cap/standalone recommendations paragraph/shorter length AND the Reports
   view's per-section Copy buttons confirmed working as expected on
   `https://www.askcareer-ai.com/portal`.
4. ~~Commit the pending `todolist_05Aug2026.md` doc update~~ — **already done**,
   found resolved in commit `4c0958c` (10 Aug 2026) on checking git history
   today; `todolist_07Aug2026.md` just hadn't been updated to reflect it.
5. ~~Live-verify the DeepSeek token-retry + reasoning-effort fix~~ — **done,
   11 Aug 2026.** Ran
   `python scripts/jd_scorecard_resume_v2.py "data_raw/jd/txt/JD_Invesco_IT_AssociateDirector.txt" --refresh-blueprint --llm=deepseek`
   live. The fix fired for real: Resume call hit
   `finish_reason='length'` at `max_tokens=20000` (`reasoning_tokens=16386`),
   auto-retried at `max_tokens=40000`, and completed cleanly. All three
   outputs (Scorecard/Resume/Cover Letter, txt+docx) regenerated in
   `data_processed/Invesco/`; resume text ends on a proper closing section
   ("AVAILABILITY / Immediate"), not a mid-sentence cutoff — no truncation.
6. Older 31 Jul backlog: LinkedIn automation discovery-path decision,
   Manulife resume regen decision, VPS hardening, dev-env docs, Job Tracker
   status fields.
7. Cover-letter Para 3 achievement density — flagged as an open nuance,
   revisit only if a live read of the letter still feels too dense.

## Multi-Profile / Multi-Tenant JD Portal — Phases 1 & 2 done, rest still open

Phase 1 (CLI foundation) and Phase 2 (resume onboarding + `/portal2`) are
both done — see items 3 and 4 above. Remaining, still NOT scoped or
implemented:
- **Feature request, 11 Aug 2026 (already built, needs browser verification):
  "Take a new profile using a resume and generate a profile.json — make this
  available in the portal."** This is exactly `ResumeUpload.jsx` +
  `POST /api/onboard` from Phase 2 — upload a `.docx`/`.txt` in `/portal2`,
  give it a profile name, and it runs
  `python scripts/update_profile_from_resume.py <file> --profile=<Name>
  --create-new-profile` server-side, same as the CLI command used to onboard
  Matina Fung. **Not yet click-tested in the browser** — this is the
  "immediate next step" below, not a separate build task.
- **Immediate next step — carried to tomorrow (12 Aug 2026)**: user will
  click through `/portal2` themselves (real password required) to confirm
  the browser flow end-to-end — login → profile picker shows Matina Fung →
  run her Richemont JD (or onboard a fresh profile via `ResumeUpload`, the
  feature request above) → confirm the Reports step renders and downloads
  work. Backend routes and the underlying v3 pipeline are already verified
  via CLI/`node --check`/`npm run build`; only the actual UI click-path is
  unconfirmed.
- Backend/auth: extend the existing password+TOTP model to per-user identity
  (today: exactly one credential set, JWT payload hardcoded to `{user:
  'john'}`, no user concept anywhere in `backend/`) — portal2 deliberately
  still reuses the single shared gate + a profile picker, not real accounts.
- Screenshot-to-JD-text capture (vision-LLM call, reusing the existing
  OpenRouter `call_llm()` pattern per the 10 Aug decision).
- `/api/profile/update-from-resume/propose`+`/approve` (the existing pure-JS
  diff-mode route used by John's own profile editor) is still not
  profile-aware — separate from the Python-script extension shipped today.
- Data-isolation/PII-handling posture beyond "minimal" (11 Aug decision) if
  the user base grows beyond a handful of known people.

## Session close (11 Aug 2026)

All work above is committed and pushed to `origin/main`:
- `9daa6a6` — DeepSeek retry-fix live verification (Invesco blueprint refresh)
- `a911303` — master resume generator
- `2dccb72` — multi-profile epic Phase 1 (`jd_scorecard_resume_v3.py`)
- `bcc504b` — multi-profile epic Phase 2 (resume onboarding + `/portal2`)

`docs/guides/` updated: `MASTERRESUMEGENERATOR_11AUG2026.md`,
`JDSCORECARDRESUMEV3_MULTIPROFILE_FOUNDATION_11AUG2026.md`,
`JDPORTAL_PHASE2_ONBOARDING_PORTAL2_11AUG2026.md`. Working tree is clean
(`git status` shows nothing pending) — `src/data/MatinaFung/`,
`data_raw/MatinaFung/`, `data_processed/MatinaFung/` remain local-only and
gitignored, as intended. Session closed here; pick up tomorrow with the
`/portal2` browser click-through as the first item.
