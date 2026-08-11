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

## Carried over from 10 Aug 2026 — Multi-Profile / Multi-Tenant JD Portal
## (requirements + decisions captured, still NOT scoped or implemented)

Priority remains explicitly deferred — stays behind item 3 above until
prioritized. Full requirements, the 3 locked decisions (self-service signup,
per-user TOTP, vision-LLM screenshot capture), and the folder/data-model
layout decision (`data_raw/<profilename>/`, `data_processed/<profilename>/`,
`src/data/<profilename>/`, new `scripts/jd_scorecard_resume_v3.py`) are
recorded in full in `todolist_07Aug2026.md`. Still open before real scoping
can start: self-service signup's data-isolation/PII-handling posture, and the
exact per-profile sub-tree shape under each namespaced folder.
