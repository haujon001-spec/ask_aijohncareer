# jd_scorecard_resume_v2.py — `--ResumeAdjustment` — 22 July 2026

New CLI flag added to the existing `scripts/jd_scorecard_resume_v2.py` (edited in place — this is an additive flag on top of the 21 Jul v2 script, not a fork of it; backed up first per soul.md's golden-rule: `scripts/jd_scorecard_resume_v2.py.20260722_V1.bak`).

## Why

The user reviewed `data_processed/Manulife/ScoreCard/docx/JD_SCORECARD_Manulife_IT_Director_DigitizationAutomation_GWAM_21JUL2026.docx` alongside their own manually-edited `data_processed/Manulife/CoverLetter/docx/JohnHauCoverLetter_Manulife_IT_Director.docx` and wanted the scorecard's own "6a) Resume Adjustments" recommendations (e.g. "change the headline to X," "add a Y highlight section") to actually feed into the Resume and Cover Letter generation, instead of sitting unused in the scorecard.

## Clarifying questions asked before implementation (per soul.md intake rule)

Three real forks were identified and confirmed with the user before writing any code:

1. **Output behavior:** invisible LLM prompt guidance (shapes wording/emphasis only) vs. a visible new section in the output vs. both. → **Invisible guidance only.**
2. **Source resolution:** auto-detect the latest existing scorecard for this JD vs. require an explicit path vs. either. → **Auto-detect latest; generate one first if none exists yet.**
3. **Anti-hallucination rigor:** keep it prompt-level only (consistent with how the rest of the script already works) vs. add a new automated post-generation fact-checker. → **Prompt-level only** — no post-hoc checker exists anywhere else in v1/v2, so adding one here would be new, inconsistent scope.

## What was added

**New flag:** `--ResumeAdjustment` (boolean, case-insensitive).

**`find_latest_scorecard_txt(path)`** — globs `data_processed/<Employer>/ScoreCard/txt/` using the same pattern `build_output_targets()` already uses, returns the most recently modified match or `None`.

**`extract_resume_adjustments(scorecard_text)` + `RESUME_ADJUSTMENTS_RE`** — pulls the "6a) Resume Adjustments" block out of a scorecard body. The regex was hardened against real format drift, not written against a single example:

```python
RESUME_ADJUSTMENTS_RE = re.compile(
    r"\**\s*(?:a\)\s*)?Resume Adjustments\b[^\n]*\n(.*?)"
    r"(?=\n\s*\**\s*(?:[bc]\)\s*)?(?:Interview Preparation|Certifications)|\n\s*#{1,4}\s*\d|\Z)",
    re.IGNORECASE | re.DOTALL,
)
```

Tested against **all 17** historical scorecard `.txt` files under `data_processed/**/ScoreCard/txt/` (dating back to March 2026, spanning multiple LLM backends and prompt-format drift over time) — **17/17 matched correctly**, covering three distinct real-world formats:
- `**a) Resume Adjustments:**` (lettered, bold-wrapped)
- `* **Resume Adjustments:**` (no letter at all — an older/alternate LLM output style)
- `### a) Resume Adjustments — Specific Wording and Framing` (lettered, with a trailing subtitle before the line break)

**Resolution logic** runs once, before the run header prints:
- If a resume/cover-letter output is requested and an existing scorecard is found → read and extract from it.
- If none is found and no scorecard was already going to run this session → force `run_scorecard = True` so one gets generated first, then extract after generation.
- If `--ResumeAdjustment` is passed with `--scorecard-only` → no-op (nothing to feed it into).

**Prompt integration** — the extracted text is injected as a new context block into both `RESUME_USER` and `COVERLETTER_USER`, gated behind a new system rule 12 in `RESUME_SYS`/`COVERLETTER_SYS`:

> Apply it ONLY to wording, emphasis, section framing, and which existing facts get foregrounded. It must NEVER be used to introduce a fact, figure, project, or claim that is not already present in the candidate profile data... Never print the guidance verbatim or add a visible "Resume Adjustments" heading.

This is additive to the existing anti-hallucination rules already in both prompts (rule 1 in each: "ALL facts... come ONLY from the candidate profile") — no separate/weaker rule was created for this feature.

## Verification performed (soul.md §3.1 — executed, not just written)

**Existing-scorecard path:** ran against the real Manulife JD (`data_raw/jd/txt/JD_Manulife_IT_Director_DigitizationAutomation_GWAM.txt`), `--resume-only --ResumeAdjustment --llm=gemini`:
- Console confirmed: `ResumeAdj : existing → data_processed\Manulife\ScoreCard\txt\JD_SCORECARD_Manulife_IT_Director_DigitizationAutomation_GWAM_21JUL2026.txt`
- The guidance was visibly and correctly applied: the Professional Summary's opening headline changed to **"Transformation-Focused Technology & Operations Leader"** — the scorecard's exact suggested wording — and the dynamic bridging section (which the scorecard asked to reframe toward business-operations impact) was retitled **"OPERATIONAL TRANSFORMATION RELEVANCE"**
- Docx dump: 75 bold runs, 0 stray `**`, zero paragraphs containing "resume adjustment" (no leak)
- Anti-hallucination spot-check: three claims in the new output looked unfamiliar at first read (a `here.now` project URL, "16,000 financial advisers," "800+ China developers... 40% latency") — traced all three back to real entries in `src/data/john_profile.json` and the master template; confirmed genuine, not invented

**Cover-letter path:** same JD, `--coverletter-only --ResumeAdjustment --llm=gemini` — reused the cached scorecard (no regeneration), 24 bold runs, 0 stray markup, no leaked heading.

**"No scorecard yet" path:** exercised with a throwaway smoke-test JD (`JD_ResumeAdjustmentSmokeTest_Temp`, not a real employer) — console confirmed `ResumeAdj : none found — generating one first`; the script correctly generated the scorecard, extracted 6a from the fresh text, and applied it to the resume with no leaked heading. All smoke-test artifacts (JD `.txt`, JD blueprint `.json`, `data_processed/ResumeAdjustmentSmokeTest/`) were deleted afterward — nothing left behind.

Real Manulife 22JUL2026 outputs (resume + cover letter, txt + docx) from the first two verification runs were left in place — legitimate output for a real JD, doesn't collide with the 21JUL2026 files or the user's manually-edited docx files.

## Usage

```bash
python scripts/jd_scorecard_resume_v2.py --ResumeAdjustment
python scripts/jd_scorecard_resume_v2.py --resume-only --ResumeAdjustment --llm=gemini
python scripts/jd_scorecard_resume_v2.py --coverletter-only --ResumeAdjustment
```

## Known follow-ups (not done in this session)

- `docs/guides/JDSCORECARDRESUMEV2_21JUL2026.md` (yesterday's v2 guide) was not updated to cross-reference this addition.
- No automated post-generation fact-checker was added (confirmed out of scope — see clarifying questions above); anti-hallucination protection here is prompt-level only, same as everywhere else in v1/v2.
- `--batch` mode already forwards `--ResumeAdjustment` automatically (it's outside the `{--batch, --force}` exclusion set in the forwarded-flags list) but this was not separately executed/verified in batch mode this session.
