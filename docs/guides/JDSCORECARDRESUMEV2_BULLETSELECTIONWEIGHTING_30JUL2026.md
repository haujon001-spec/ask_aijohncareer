# jd_scorecard_resume_v2.py — Bullet-Selection $-Value/Scale Weighting (30 Jul 2026)

**Requested:** 30 Jul 2026, raised as an open design question after investigating (finding c) how resume bullet selection actually works — carried in `todolist_30Jul2026.md` as item 7, decided same day.

**Status: Done and verified.**

## Context

Earlier the same day, investigation (see "New today — three items raised after seeing the live portal") confirmed that resume bullet **selection** was purely JD-relevance-first under a fixed per-company bullet budget (12/12/10/10/8, 3-4 combined for earlier roles) — dollar-value/scale had no influence on *which* highlights were chosen, only on their *order* once selected (the 30 Jul earlier-session `RESUME_SYS` rule 9). Open question: should selection itself also weight $-value/scale, not just ordering? User decided: **yes, add it.**

## Change made (`scripts/jd_scorecard_resume_v2.py`)

Backed up first per soul.md golden-rule: `scripts/jd_scorecard_resume_v2.py.20260730_V2.bak`.

- **New `RESUME_SYS` rule 10**: "When choosing which achievements fill a company's fixed bullet budget, JD relevance is the primary filter — but when multiple candidate highlights are comparably relevant to the JD, prefer the ones with larger quantified impact (bigger $ savings/revenue, larger user/team/device counts, wider organizational scope) over more routine ones. Never include a highly-quantified but JD-irrelevant bullet ahead of a genuinely JD-relevant one just because its number is bigger — relevance always wins ties in the other direction too."
- Reinforced in `RESUME_USER`'s `BULLET COUNT RULES` block: the "Choose the bullets most relevant to the JD" line now adds "Among comparably JD-relevant candidates within a company, prefer larger quantified impact ($ savings/revenue, user/team/device counts, scope) over routine ones (see system rule 10)".
- Old rules 10–14 (company-order preservation, years-wording, people-management weaving, output-only, resume-adjustment-guidance) renumbered to 11–15; all `(see system rule N)` cross-references in `RESUME_USER` updated to match.
- Scope decision: only the **resume's** bullet-selection mechanism was changed. The cover letter (`COVERLETTER_SYS`/`COVERLETTER_USER`) has no analogous fixed-budget selection step — it's 4-5 themed paragraphs, and Para 2's existing instruction ("Most relevant leadership & operational experience, quantified from profile") already implicitly favors quantified evidence, so it was left untouched. `COVERLETTER_SYS`'s independent 1–12 rule numbering was not touched.

## Verification (soul.md §3.1 — executed, not just written)

- `python -m py_compile scripts/jd_scorecard_resume_v2.py` — clean.
- Real end-to-end run: `python scripts/jd_scorecard_resume_v2.py "data_raw/jd/txt/JD_HKEX_Vice_President_IT_Service_Operation_Management.txt" --resume-only --llm=sonnet --force`. Succeeded, wrote `data_processed/HKEX/resume/{txt,docx}/JohnHauResume2026_HKEX_Vice_President_IT_Service_Operation_Management_30JUL2026.{txt,docx}`.
- Read the generated resume in full: complete, not truncated, 7 companies present in correct profile order, each bullet SMART-form with bolded figures, and high-impact quantified achievements (e.g. AIA's Windows 11 migration **HK$3.5M** savings, patch compliance **58%→100%**; Bank of America's **~80,000** users / **14,390** hours saved; Morgan Stanley's **120,000** desktops / **US$1.4M** OPEX reduction) are clearly present and well-represented within each company's budget — consistent with the new weighting intent. A rigorous statistical A/B comparison against the pre-change prompt wasn't run (this is a probabilistic LLM preference/tiebreaker, not a deterministic code path); this real run confirms the instruction is wired in correctly and doesn't break output quality or completeness.
