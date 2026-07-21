# jd_scorecard_resume_v2.py — 21 July 2026

New script, `scripts/jd_scorecard_resume_v2.py`, kept alongside `scripts/jd_scorecard_resume.py` (not replacing it) per soul.md's golden-rule — branch a new version rather than editing a proven script in place.

## Why

The user manually edited two 20 Jul outputs (`data_processed/McDonalds/resume/docx/..._20JUL2026_V2.docx` and the equivalent cover letter) and asked for the underlying generator to produce that improved format automatically going forward. The diff was inspected read-only (python-docx paragraph/run dump) to ground the requirements in the actual before/after content rather than assumption.

## What changed vs. v1

**Resume:**
- Title: `TAILORED RESUME — EMPLOYER | ROLE` → `EMPLOYER | ROLE` (prefix dropped)
- `Generated :` / `Profile :` boilerplate lines removed from the output entirely
- Every achievement bullet is written in SMART form (Specific, Measurable, Achievable, Relevant, Time-bound) with its one key metric/achievement phrase wrapped in `**double asterisks**`, rendered as a bold run in the `.docx`
- No exact "27 years" / "27+ years" figure — reworded to "extensive years"/"extensive experience" (both an LLM prompt instruction and a deterministic regex safety net)
- Blank-line spacing tightened: no double-blank runs, no blank line directly under a section header before its content

**Cover letter:**
- Same Generated/Profile removal, same bold-achievement markup (1-2 phrases in paragraphs 2 and 4, never a whole sentence), same "extensive years" wording, same blank-line tightening
- Title **keeps** its `COVER LETTER — EMPLOYER | ROLE` prefix — the user's own manual edit did not remove it, so v2 doesn't either

**Scorecard:** unchanged — explicitly out of scope for this pass.

**Master template also updated** (`data_raw/resume/txt/JohnHauResume2026_MorganStanley.md`, backed up first as `.20260721_V1.bak`): added `**bold**` markup around 5 example achievement metrics across three different companies' bullet lists, so the LLM has a concrete few-shot pattern to mirror (the system prompt says to mirror the template's bullet style "exactly"). This template is shared with v1 — the user explicitly chose to update it as the new shared baseline rather than leave v1 untouched.

Per user decision: v2 applies to **future runs only** — existing `data_processed/` outputs (including the manual `_V2.docx` edits) are left untouched.

## How the bold markup works

The resume/cover-letter body is LLM-generated free text, not structured data, so bolding uses a two-step approach:
1. The system/user prompts instruct the LLM to wrap the key achievement phrase per bullet/paragraph in `**...**`.
2. `add_runs_with_markup()` (new in v2) splits each line on `\*\*(.+?)\*\*` and emits alternating normal/bold `docx` runs.

Two real bugs were found and fixed during verification (not just written — actually executed against a live JD and inspected):
- The original bullet-prefix stripping used `stripped.lstrip("•*- ")`, which strips *all* leading characters in that set — so a bullet starting with `* **Achieved...` had its bold-open marker eaten along with the bullet marker, leaving a stray trailing `**` in the visible text. Fixed by replacing it with a single-prefix regex (`re.sub(r"^[•*-]\s+", "", stripped, count=1)`).
- Added a safety net in `add_runs_with_markup()`: if a line has an odd count of `**` (genuinely unbalanced LLM output), it falls back to plain text with the markers stripped, rather than leaking a stray `**` into the document.

## Verification performed (soul.md §3.1 — executed, not just written)

Ran against the real McDonalds JD (`data_raw/jd/txt/JD_McDonalds_IT_HeadOfInfrastructure.txt`) with `--llm=gemini` (cheapest model), both `--resume-only` and `--coverletter-only`, producing real, date-stamped (`21JUL2026`) outputs alongside the existing 20 Jul ones (no collision, no overwrite of the user's manual `_V2.docx` edits).

Confirmed via a python-docx dump of the actual generated `.docx` files:
- Resume title paragraph: `MCDONALDS | IT_HEADOFINFRASTRUCTURE` (no "TAILORED RESUME —" prefix)
- Cover letter title paragraph: `COVER LETTER — MCDONALDS | IT_HEADOFINFRASTRUCTURE` (prefix kept)
- Zero paragraphs containing `Generated` or `Profile`
- Zero paragraphs matching a `27(+) years` pattern
- Zero stray `*` characters left in any paragraph (markup fully consumed)
- 30 bold runs in the resume (headers + one per achievement bullet), 2 in the cover letter body (one per paragraph 2 and 4, as instructed) plus the title
- Spacing: section headers followed immediately by content, single blank lines between blocks, no double-blank runs

Output files produced by this verification run (left in place — real, correct examples, not deleted):
- `data_processed/McDonalds/resume/txt/JohnHauResume2026_McDonalds_IT_HeadOfInfrastructure_21JUL2026.txt` + `.docx`
- `data_processed/McDonalds/CoverLetter/txt/JohnHauCoverLetter_McDonalds_IT_HeadOfInfrastructure_21JUL2026.txt` + `.docx`

## Usage

Identical to v1, just invoke the new file:
```bash
python scripts/jd_scorecard_resume_v2.py
python scripts/jd_scorecard_resume_v2.py "data_raw/jd/txt/AnotherJD.txt"
python scripts/jd_scorecard_resume_v2.py --resume-only --llm=gemini
python scripts/jd_scorecard_resume_v2.py --coverletter-only --llm=deepseek
python scripts/jd_scorecard_resume_v2.py --batch
```

## Round 2 refinements (same day, 21 Jul 2026 — based on live Zurich Insurance test output)

After reviewing real v2 output, the user requested further changes, confirmed via a short question round:

**Cover letter:**
- `https://askcareer-ai.com` added directly under the `linkedin.com/in/johnhau` line in the header
- Date line, "Hiring Manager" line, and company-name line removed entirely — goes straight from the header block to "Dear Hiring Manager," (salutation kept, per user's answer)
- Bold-achievement cap removed: every distinct quantifiable figure anywhere in the letter is now bolded (was capped at 1-2 per paragraph)
- Job titles are now bolded on **every** company/title mention in the letter (was scoped to a single example), e.g. `**Associate Director, Infrastructure Services** at **AIA International Ltd**`

**Resume:**
- Header block (name/address/LinkedIn/website) fully tightened — zero blank lines between those four lines (new `tighten_contact_header()` function, applied only to the resume, since the cover letter header was already tight)
- Bold-achievement cap removed here too — every distinct figure per bullet is now bolded (was one per bullet)
- Added explicit prompt guidance to weave visible people-management evidence (mentoring, team leadership, coaching) into the most recent 2-3 roles specifically, not just a generic soft-skills line
- "Earlier Roles (Siemens, Alco)" dates: the user supplied the actual dates directly in the master template (`Siemens - Apr 1997 - Apr 1998, Alco - Feb 1995 – Mar 1997`) — no code change needed, the LLM mirrors this template line since no profile-JSON data exists for these two employers. **Note:** in the verification run, the LLM collapsed this to a single combined `1995 – 1998` range rather than showing each company's own exact range — flagged back to the user as a possible follow-up if per-company precision is wanted.

**New deterministic safety net:** `clean_coverletter_header()` — strips any leftover date/"Hiring Manager"/company-name line up to the salutation, in case the LLM doesn't fully follow the prompt instruction on a given run.

Re-verified end-to-end (same McDonalds JD, `--llm=gemini`, `--force` to regenerate over the same day's test files): header tightened correctly in both formats, 76 bold runs in the resume docx / 25 in the cover letter docx, zero stray asterisks, zero Generated/Profile lines, zero leftover address-block lines, zero "27 years" mentions.

## Known follow-ups (not done in this session)

- v1 (`jd_scorecard_resume.py`) is untouched and remains available/callable — only the shared master template changed underneath it, per user decision.
- Regenerating older employers'/JDs' outputs with v2 was explicitly declined by the user (future runs only) — no backfill was performed.
- The JD Automation Portal frontend (Phase 2) will need a UI control for `--llm=` selection etc. once it's built as tabs/pages inside the existing Career Copilot app — not part of this change.
