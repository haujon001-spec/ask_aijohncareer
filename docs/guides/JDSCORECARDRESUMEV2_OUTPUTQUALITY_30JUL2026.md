# jd_scorecard_resume_v2.py — Output-Quality Round (30 Jul 2026)

**Requested:** 25 Jul 2026 (end of session), explicitly deferred to the next session. Picked up 30 Jul 2026 after a 5-day gap with no dev session (only data-only commits in between).

**Status: Done and verified.**

## Context

`src/data/john_profile.json` grew substantially during the 25 Jul backfill (all 5 raw historical resumes processed): `professional_experience` 5→7 entries, `major_achievements` 29→46, `key_topics_for_qa` 31→99. `jd_scorecard_resume_v2.py`'s prompts were last tuned before that growth, so five follow-up items (a–e) were logged for a future session. Items b–d are implemented here; item e was scoped as a data-review task per user decision and is reported, not auto-resolved.

## Real bug found and fixed: silent profile-context truncation

`build_profile_context()` (`scripts/jd_scorecard_resume_v2.py:546`) built a JSON blob of 9 of the profile's 13 `profile.*` sections, then hard-truncated it to `[:14000]` characters. Measuring the actual current profile: `metadata` (851) + `summary` (960) + `professional_experience` (18,365 chars, now the 3rd key in insertion order) alone exceed 14,000 characters. Since Python dicts preserve insertion order and `json.dumps` serializes in that order, **the 14K-char slice was cutting off in the middle of `professional_experience`** — meaning `major_achievements`, `ai_projects`, `core_competencies`, `technical_skills`, `education_certifications`, and `languages_spoken` were being silently dropped from every Resume/Cover Letter generation call since the section list was written, not just missing the 4 sections item (b) called out. This was never caught before because nothing validates `call_llm()`'s input size, only its output.

## Changes made (`scripts/jd_scorecard_resume_v2.py`)

Backed up first per soul.md golden-rule: `scripts/jd_scorecard_resume_v2.py.20260730_V1.bak`.

### (b) Missing profile sections + truncation cap
- Added the 4 missing sections to `build_profile_context()`'s key list: `linkedin_recommendations`, `soft_skills`, `languages`, `key_topics_for_qa` (now all 13 `profile.*` sections are included).
- Raised the truncation cap `14000` → `100000` (simple raise, per user decision — no selective/summarized trimming). The model is `anthropic/claude-sonnet-5` via OpenRouter with a 1M-token context window, so 100K characters (~25K tokens) is not a meaningful cost/context risk. Measured actual current context size: **70,532 characters, all 13 sections present, well under the new cap** (was previously truncated to 14,000 and cutting off mid-`professional_experience`).
- The cap is now purely a guard against a runaway/corrupt profile file, not an active trim.

### (c) Bullet ordering by impact
No existing rule governed bullet order within a role. Added:
- **New RESUME_SYS rule 9**: "Within each role, order bullets by impact — lead with the most quantified, highest-impact achievements first, descending to more routine/supporting bullets last."
- Reinforced in `RESUME_USER`'s BULLET COUNT RULES block: "Within each company's bullets, lead with the most quantified/highest-impact achievements first (see system rule 9)".

### (d) Preserve profile's role order
`profile.professional_experience`'s actual array order is already AIA → Bank of America → Edge Technology Group → Morgan Stanley → Merrill Lynch → Siemens H.K. Ltd. → Alco Plastic Products Ltd. (latest-first, which also happens to be biggest-remit-first for this career history) — but nothing instructed the LLM to preserve that order in its output. Added:
- **New RESUME_SYS rule 10**: "Preserve the exact company order from the candidate profile's `professional_experience` array (most recent role first, exactly as listed) — never reorder, merge, or resequence companies relative to that array."
- Reinforced in `RESUME_USER`'s BULLET COUNT RULES block: "Company order must match `professional_experience` exactly, most recent first — never resequence (see system rule 10)".

Old rules 9–12 renumbered to 11–14 (years-wording, people-management weaving, output-only, resume-adjustment-guidance); all `(see system rule N)` cross-references in `RESUME_USER` and the adjustment-block header updated to match. `COVERLETTER_SYS`'s independent 1–12 rule numbering (cover letters have no per-role bullet structure, so items c/d don't apply there) was left untouched.

### (e) Major-achievements handling — reviewed, not code-changed
User's explicit decision: interpret this as a **data review/cleanup pass over the raw JSON**, not a change to how the resume script selects/filters achievements. Read all 46 `major_achievements` entries and cross-referenced against `professional_experience` highlights and the raw historical resume files. Findings reported to the user for a decision (see "Open findings" below) — nothing was merged or deleted, consistent with this session's golden-rule/no-silent-resolution practice for `john_profile.json`.

## Verification (soul.md §3.1 — executed, not just written)

Ran the real pipeline end-to-end against a live JD (`data_raw/jd/txt/JD_HKEX_Vice_President_IT_Service_Operation_Management.txt`, `--resume-only --llm=sonnet --force`, no `--refresh-blueprint` — deliberately avoided per the 25 Jul incident where a blueprint refresh overwrote a pending manual edit):

- Confirmed via direct Python re-execution of `build_profile_context()`'s logic against the live profile: **70,532 chars, all 13 sections present, not truncated** (previous 14K cap would have cut off mid-`professional_experience`).
- Role order in the generated resume: AIA → Bank of America → Edge Technology Group → Morgan Stanley → Merrill Lynch → "Earlier Roles (Siemens, Alco)" — exact match to `professional_experience`'s array order.
- Docx spot-check (`python-docx`): 181 paragraphs, 88 bold runs, 0 stray asterisks, no "Generated:"/"Profile:" lines, no "27 years" wording.
- Bullet ordering: each role's bullets lead with its most quantified achievement (e.g. AIA opens with the 58%→100% patch-compliance backlog resolution; Bank of America opens with 99% audit pass rate) — consistent with the new rule, though this is a prompt-level instruction (not code-enforced), so it should be spot-checked again on future runs.
- Test output (`data_processed/HKEX/`) deleted after verification — not real user data.

## Open findings from the item-(e) data review (not auto-resolved — needs a user decision)

1. **Primary, previously flagged (25 Jul):** `major_achievements` entries "Cutting-Edge Trading System Implementation" (Morgan Stanley — "US$1M first year revenue", "electronic trading system... led to integration of additional trading apps") and "No.1 Global Trading Application Revamp" (Morgan Stanley — "US$ multi-billions daily trading volume", Citrix XenApp tech) may describe the same underlying Morgan Stanley trading-application initiative.
   - Traced "Cutting-Edge Trading System Implementation" to its exact source: `data_raw/resume/txt/JohnHauResume2017.txt:39` — *"Cutting-Edge Client facing - Electronic trading system facilitating us$1M first year revenue which was highly regarded by the Equity business and lead to integration of trading apps."*
   - Traced "No.1 Global Trading Application Revamp" to `professional_experience`'s Morgan Stanley highlights: *"Revamped Morgan Stanley's **No.1 global trading application** (US$ multi-billions in daily trading volume) using Citrix XenApp technology"* — an infrastructure/hosting-stability achievement, consistent with John's actual VDI/Citrix engineering role there.
   - A third, related highlight exists in the same entry: *"Generated US$1M additional monthly trade volume in China by improving stability (low latency) for Citrix XenApp trading apps"* — note this says **monthly trade volume**, not **first-year revenue**, so it doesn't cleanly match either of the above either.
   - These may be: (a) the same real achievement described three different ways across different resume-writing rounds with inconsistent numbers/framing (loose 2017 self-authored wording vs. more precise later backfill), or (b) genuinely distinct facts. Only the user can resolve this from memory of the actual work — recommend deciding whether to merge, reword for clarity, or confirm as three separate facts.
2. **Secondary, newly found:** `major_achievements` entries "Knowledge Transfer & Team Development" (cites **70%** offload of virtualization problem cases, Asia Application Team + Windows Server team + Winops team) and "Citrix External Trading Support Model Offload" (cites **40%** reduction in daily support tasks, Asia Application Team + Windows Server team, specifically for Citrix External Trading) both describe training the same Asia teams to take over support duties, with different percentages for what may be the same or overlapping scope. Notably, the actual generated resume already blends these into one bullet using the 40% figure and the three-team list — no output-level duplication bug, but the source JSON has an unresolved numbers inconsistency (70% vs. 40% for what reads like related or the same initiative) worth a data-accuracy pass.

Neither finding was edited — flagged per this project's established practice of never silently resolving ambiguous personal-history facts (see the 25 Jul AIA "USD 7.6M/6.1M" precedent).
