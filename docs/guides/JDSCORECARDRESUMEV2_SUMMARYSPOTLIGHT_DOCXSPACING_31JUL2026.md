# jd_scorecard_resume_v2.py — Summary Spotlight Order + Docx Section Spacing (31 Jul 2026)

**Requested:** 31 Jul 2026, same-day review of the HKEX IT Infrastructure resume output.

**Status: Done and verified.**

## Context

User reviewed `data_processed/HKEX/resume/txt/JohnHauResume2026_HKEX_IT_Infrastructure_CriticalService_31JUL2026.txt` (and the matching `.docx`, open in Word at the time) and flagged two problems.

## Bug 1: Professional Summary always spotlighted Morgan Stanley, out of order

The Professional Summary's opening sentence listed companies as "Morgan Stanley, Bank of America, AIA, Edge Technology Group, and Merrill Lynch" — not chronological, not scope-based. The following sentence then dedicated itself entirely to a Morgan Stanley "VP & Asia Manager... 120,000 desktops" spotlight, regardless of the target JD, making Bank of America and Edge Technology Group (both larger scope, more recent roles) look secondary.

**Root cause:** the reference template every resume is told to "mirror exactly" (`RESUME_SYS` rule 2, `scripts/jd_scorecard_resume_v2.py`) is `data_raw/resume/txt/JohnHauResume2026_MorganStanley.md`, whose own summary has that same Morgan Stanley-centric list order and spotlight sentence. The generation prompt never told the model to re-derive the list order or reconsider the spotlight company — so it reproduced the template's Morgan Stanley pattern verbatim on every JD, independent of relevance or recency.

### Fix
Backed up first per soul.md golden rule: `scripts/jd_scorecard_resume_v2.py.20260731_V1.bak`.

- **New `RESUME_SYS` rule 15** (old rule 15 — resume-adjustment guidance — renumbered to 16): company lists in the Professional Summary must follow `professional_experience`'s actual order (most recent first), never the template's fixed order; the spotlight sentence must be reassigned dynamically to whichever company's achievements are most relevant to *this* JD (ties broken by recency), rewritten with that company's own title/scope/achievements — the template's Morgan Stanley wording is reused only if Morgan Stanley genuinely is the best fit.
- Reinforced in `RESUME_USER`'s instructions block, next to the existing "Replace the Professional Summary..." line.

### Verification
Regenerated the HKEX resume (`--resume-only --no-docx --force`, `PYTHONIOENCODING=utf-8` to work around a pre-existing console-encoding issue unrelated to this fix). New summary:
- Company list: "AIA International Ltd, Bank of America, Edge Technology Group, Morgan Stanley, and Merrill Lynch" — matches `professional_experience` order exactly.
- Spotlight sentence now covers AIA (most recent, largest team — 50+ staff) with AIA-specific achievements (patch-compliance backlog, Windows 11 migration, HKMA DR drills, 2024 CrowdStrike outage response) — a genuine fit for an infrastructure-critical-service JD.

## Bug 2: Double blank-row spacing between every section title in the .docx

User was manually deleting one extra blank row between every section title in the generated Word doc.

**Root cause:** `convert_text_file_to_docx()` (`scripts/jd_scorecard_resume_v2.py:749`) processed the `.txt` line-by-line. Every section boundary in the `.txt` is `<content>\n\n----------------------------------------\n\n<SECTION TITLE>` — two blank lines surrounding one separator line. `add_docx_text_block()` turns each blank line into its own empty paragraph but silently drops the separator line (no paragraph emitted for it) — so the two blank lines around it became **two** empty paragraphs in Word where only one gap was intended.

### Fix
Backed up first: `scripts/jd_scorecard_resume_v2.py.20260731_V2.bak` (script), plus dated `.bak` copies of the affected HKEX `.docx`/`.txt` outputs before each regeneration.

- Added `_is_effectively_blank()` helper (blank line OR a `---`/`===`/`___` separator ≥8 chars).
- `convert_text_file_to_docx()` now pre-normalizes the line list: any run of blank/separator lines between two real content lines collapses to exactly one blank-line marker before paragraphs are built. `add_docx_text_block()` itself is unchanged (its separator-skip branch is now effectively unreachable but left in place as a defensive no-op).
- This fixes spacing for every future Resume/Scorecard/Cover Letter `.docx` this script generates, not just the HKEX file.

### Verification
Regenerated the HKEX resume `.docx` from the already-verified `.txt` (via a standalone converter script reusing the exact same `add_docx_text_block`/`style_docx_document`/`add_runs_with_markup` logic, to avoid an unnecessary second LLM call). Checked programmatically with `python-docx`: **max consecutive blank paragraphs = 1** across all 175 paragraphs (previously 2 at every section boundary).

## Files touched
- `scripts/jd_scorecard_resume_v2.py` (both fixes)
- `data_processed/HKEX/resume/txt/JohnHauResume2026_HKEX_IT_Infrastructure_CriticalService_31JUL2026.txt` (regenerated)
- `data_processed/HKEX/resume/docx/JohnHauResume2026_HKEX_IT_Infrastructure_CriticalService_31JUL2026.docx` (regenerated)
- Backups left alongside originals: `scripts/jd_scorecard_resume_v2.py.20260731_V1.bak`, `.20260731_V2.bak`; matching dated `.bak` files for the HKEX txt/docx outputs.
