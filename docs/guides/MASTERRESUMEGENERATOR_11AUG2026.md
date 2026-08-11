# Master Resume Generator — 11 Aug 2026

## What it is

`scripts/generate_master_resume.py` builds an exhaustive "everything" master
resume `.docx` directly from `src/data/john_profile.json`. Unlike the
tailored, per-JD resumes produced by `scripts/jd_scorecard_resume_v2.py`
(which selects and trims content to fit a specific job description), this
document is deliberately **not** send-ready — it is a single-source
knowledgebase that captures every fact in the profile, so nothing gets missed
when a future JD-matching pass mines the profile for relevant bullets.

Includes, in full:
- Contact header, professional summary, core competencies, technical skills
- AI & automation highlights and all 7 AI/software projects (full description,
  tech stack, key features, impact, transferable skills)
- All 7 professional-experience entries with every highlight bullet (no
  trimming)
- All 57 major achievements, grouped by company
- Education & certifications, languages, soft skills
- The `key_topics_for_qa` keyword index (used elsewhere for JD-matching/QA)
- All 16 LinkedIn recommendations, verbatim, with recommender name/title/
  company/relationship/date

## Usage

```
python scripts/generate_master_resume.py
```

No arguments, no LLM calls — pure data transformation from the profile JSON.
Re-run any time `john_profile.json` changes to regenerate an up-to-date
master resume.

## Outputs

- `data_processed/MasterResume/resume/txt/JohnHauResume2026_MASTER_FULL_<DATE>.txt`
- `data_processed/MasterResume/resume/docx/JohnHauResume2026_MASTER_FULL_<DATE>.docx`
- `JohnHauResume2026_MASTER_FULL_<DATE>.docx` (copied to project root, matching
  the existing root-level docx naming convention used for tailored resumes)

## Design notes / gotchas

- **Do not import `jd_scorecard_resume_v2.py` as a module.** It is a flat
  top-to-bottom script with no `if __name__ == "__main__":` guard — an early
  version of this script imported `convert_text_file_to_docx` from it and the
  import statement executed the *entire* live JD-processing pipeline (LLM
  calls, file writes) as a side effect. Caught before any file was written or
  API call completed (verified via `git status` — no unintended output), but
  the fix was to copy the small, pure `.txt -> .docx` conversion helpers
  (`style_docx_document`, `add_docx_text_block`, `add_runs_with_markup`,
  `convert_text_file_to_docx`) into this script instead of importing them.
  This also keeps `jd_scorecard_resume_v2.py` untouched per soul.md's
  golden-rule (proven scripts stay immutable).
- **`**bold**` markup and the `" — "` bold-left-side rule don't compose.** In
  the shared converter, a line containing `" — "` gets its left-hand side
  bolded as raw text (not run through markup parsing), while a line without
  `" — "` gets `**...**` spans parsed normally. Wrapping the left side of a
  `" — "` line in `**...**` (as the recommendations section originally did)
  leaks literal asterisks into the rendered docx. Fixed by dropping the `**`
  wrapper on any text that's also going through the em-dash bold-left path —
  bullets (lines starting with `- `) are unaffected since they always route
  through `add_runs_with_markup`.

## Verification performed

- Ran the script; diffed profile JSON counts against generated output:
  16/16 recommendations, 57/57 achievements, 7/7 professional-experience
  entries, 7/7 AI projects all present.
- Opened the generated `.docx` with `python-docx` and confirmed zero stray
  `**` markup, correct bold runs on recommender names, and correct Unicode
  em-dash character (`U+2014`) rather than a corrupted substitute.
