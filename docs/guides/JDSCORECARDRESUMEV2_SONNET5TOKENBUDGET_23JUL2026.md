# jd_scorecard_resume_v2.py — Sonnet-5 truncation crash fix (23 Jul 2026)

## The crash

A real portal run (Manulife JD, `--llm=sonnet`, mode=all, `--refresh-blueprint --ResumeAdjustment`) crashed on the Resume step:

```
File "jd_scorecard_resume_v2.py", line 952, in <module>
    resume_text = soften_experience_years(resume_text)
File "jd_scorecard_resume_v2.py", line 101, in soften_experience_years
    return YEARS_FIGURE_RE.sub("extensive years", text)
TypeError: expected string or bytes-like object, got 'NoneType'
```

## Investigation

`call_llm()` returned `resp.json()["choices"][0]["message"]["content"]` with no validation — when OpenRouter returns `content: null`, this silently propagates `None` three function calls deep before crashing in an unrelated string-processing helper.

Reproduced directly against OpenRouter's API (not through the portal, to iterate faster):
- A **simplified** test prompt (short system/user message asking for a shorter resume-like document) succeeded fine at `max_tokens=4500` with `anthropic/claude-sonnet-5` — `finish_reason: "stop"`, `reasoning_tokens: 0`, `completion_tokens: 4391/4500` (close to the ceiling, but it finished).
- The **real** Resume call (full profile/JD/blueprint/template context, strict SMART-bullet-count requirements: 12+12+10+10+8+3-4 bullets across 6 roles, every quantifiable figure bolded) hit the token ceiling before finishing. `reasoning_tokens: 0` throughout — this is **not** a hidden-reasoning-token issue, `anthropic/claude-sonnet-5` is simply a more verbose model than `anthropic/claude-sonnet-4.6` (the previously-hardcoded slug) for the same task, consistently across every call type in the pipeline (blueprint, blueprint-repair, scorecard, resume, cover letter all under-provisioned once tested against real data).

## Fix

**1. `call_llm()` — defensive handling, no more silent `None`:**
- If `content` is empty/`None`: raises `RuntimeError` with `model`, `finish_reason`, and `refusal` (the field OpenRouter uses to explain a safety/policy refusal) — an immediately actionable error instead of a cryptic three-frames-deep `TypeError`.
- If `finish_reason == "length"` (truncated, but happened to have *some* partial content — the more insidious case, since it doesn't crash and could ship an **incomplete document silently**): raises `RuntimeError` with `completion_tokens` and `reasoning_tokens` from `usage`, discarding the partial output rather than returning it.

**2. Raised `max_tokens` for every call in the pipeline**, based on real measured truncation during verification (not guessed):

| Call | Before | After |
|---|---|---|
| JD Blueprint | 2600 | 6000 |
| JD Blueprint Repair | 3000 | 6000 |
| Scorecard | 6000 | 12000 |
| Resume | 4500 | 20000 |
| Cover Letter | 2500 | 8000 |

Resume needed the largest jump — real testing showed it still truncated at both 8000 and 12000 before succeeding at 20000, given the strict multi-role SMART-bullet-count requirement in the prompt.

## Verification (soul.md §3.1 — executed, not just written)

Real CLI runs against the actual Manulife JD that originally crashed (`data_raw/jd/txt/JD_Manulife_AVP_Technology_Architecture_and_Operations.txt`), `--llm=sonnet`:
- `--resume-only --force` at `max_tokens=8000`: succeeded (no crash) but the **new truncation check caught the resume was still incomplete** (verified by reading the actual output file — it ended mid-sentence, missing the Core Competencies/Education/Languages/Availability sections entirely). This is exactly the kind of silent-incomplete-output bug the new `finish_reason == "length"` check exists to catch.
- Raised to `max_tokens=20000`: succeeded, output verified complete (203 lines vs. the truncated run's 115, ends correctly at "Availability / Immediate", 112 bold-bullet lines, zero stale `Generated :`/`Profile :` lines).
- `--coverletter-only --force` at `max_tokens=8000`: succeeded, output verified complete (ends correctly with "Sincerely, John Hau").
- Full `--refresh-blueprint --force` (mode=all, exactly replicating the original crash scenario) at the fully-updated budgets: **succeeded end-to-end** — blueprint, scorecard, resume, and cover letter all completed without error. Verified the resume (204 lines, ends correctly at "Availability / Immediate") and cover letter (ends correctly with "Sincerely, John Hau") are both genuinely complete, not truncated.
- Along the way, this same real-data testing surfaced that Blueprint (at the original 2600) and Scorecard (at the original 6000) *also* truncated with `anthropic/claude-sonnet-5` — confirming the issue is systemic across the whole pipeline for this model, not Resume-specific, which is why all five calls were raised (see table above), not just the one that originally crashed.

**Real output left in place** (legitimate output for a real JD, dated `23JUL2026`, doesn't collide with prior-day runs): `data_processed/Manulife/{resume,CoverLetter}/{txt,docx}/..._23JUL2026.*`.

## Not fixed / out of scope

- `scripts/jd_scorecard_resume.py` (v1) has its own separate `call_llm`-equivalent and the same stale `claude-sonnet-4.6` slug — **not touched**, per soul.md golden-rule; v1 is no longer invoked by the portal since the 23 Jul Phase A repoint, and this fix only targets `_v2.py`. Flagged for the user, not fixed without being asked.
