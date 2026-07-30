# Status — 30 July 2026

## Session open: intake after a 5-day gap

Read `soul.md`, `docs/todolist/todolist_25Jul2026.md`, `docs/todolist/todolist_23Jul2026.md`, `docs/todolist/todolist_21Jul2026.md`, and `docs/status/status_25Jul2026.md` per soul.md §8.1 intake. No dev session happened 26–29 Jul (only two data-only commits: profile backfill note, Manulife blueprint update + new HKEX blueprint). Identified the top carried-forward, unimplemented priority: the `jd_scorecard_resume_v2.py` output-quality round (items a–e) explicitly deferred from 25 Jul. Asked clarifying questions before implementing (confirmed today's focus, item (e)'s interpretation, item (b)'s fix approach) per soul.md + explicit user request, then proceeded.

## `jd_scorecard_resume_v2.py` output-quality round (items a–e)

**Status: Done and verified.** Full record: `docs/guides/JDSCORECARDRESUMEV2_OUTPUTQUALITY_30JUL2026.md`.

Backed up first: `scripts/jd_scorecard_resume_v2.py.20260730_V1.bak` (soul.md golden-rule).

**Real bug found:** `build_profile_context()`'s `[:14000]` char truncation was already cutting off inside `professional_experience` (the 3rd of 9 previously-included sections, 18,365 chars by itself) — silently dropping `major_achievements`, `ai_projects`, `core_competencies`, `technical_skills`, `education_certifications`, and `languages_spoken` from every Resume/Cover Letter LLM call to date, not just the 4 sections item (b) flagged as missing.

- (b) Added the 4 missing sections (`linkedin_recommendations`, `soft_skills`, `languages`, `key_topics_for_qa`); raised the cap `14000` → `100000` per user's "simple raise" decision. Model context window (1M tokens via OpenRouter `anthropic/claude-sonnet-5`) makes this a non-issue. Confirmed actual context is now 70,532 chars, all 13 sections present, not truncated.
- (c) New RESUME_SYS rule 9 — order bullets within a role by impact, highest-quantified first.
- (d) New RESUME_SYS rule 10 — preserve `professional_experience`'s exact company order, never resequence. Renumbered old rules 9–12 → 11–14 and updated every `(see system rule N)` cross-reference in `RESUME_USER`/the adjustment-guidance header. `COVERLETTER_SYS`'s independent numbering was untouched (no per-role bullet concept there).
- (e) Per user decision, treated as a data-review task, not a code change. Reviewed all 46 `major_achievements` entries against `professional_experience` highlights and the raw historical resumes (`data_raw/resume/txt/*.txt`). Two findings reported, not auto-resolved:
  1. Root-caused the 25-Jul-flagged possible duplicate ("Cutting-Edge Trading System Implementation" vs. "No.1 Global Trading Application Revamp", both Morgan Stanley) to two/three distinct source lines with inconsistent numbers/framing — needs the user's own judgment to merge/reword/confirm.
  2. New: "Knowledge Transfer & Team Development" (70% offload) vs. "Citrix External Trading Support Model Offload" (40% offload) — same Asia teams, different percentages, possibly the same initiative. No output bug (the LLM already merges them into one bullet using 40%), but a source-data inconsistency worth a look.

**Verification (soul.md §3.1):** real end-to-end run against a live JD (HKEX Vice President IT Service Operation Management, `--resume-only --llm=sonnet --force`) — deliberately **without** `--refresh-blueprint`, to avoid repeating the 25 Jul incident where a blueprint refresh overwrote a pending manual edit to a different employer's JD JSON. Confirmed via direct re-execution of the context-builder logic (70,532 chars / 13 sections / no truncation), via reading the generated resume text (role order matches profile array exactly: AIA→BofA→Edge→Morgan Stanley→Merrill Lynch→Siemens/Alco; each role's bullets lead with its most quantified achievement), and via `python-docx` inspection of the output (181 paragraphs, 88 bold runs, 0 stray asterisks, no Generated/Profile lines, no "27 years"). Test output (`data_processed/HKEX/`) deleted afterward — not real user data, doesn't collide with any prior run.

## Known open items

- Major-achievements duplicate/inconsistency findings (above) — awaiting user decision, not yet resolved.
- Authoritative `john_profile.json` update capability (full UI epic: manual editor, in-portal multi-file "Update from Resume", version history, diff view) — plan drafted (`sprightly-enchanting-hare.md`), paused for user questions since 25 Jul, still not approved/implemented.
- Dynamic width further enhancement (per-breakpoint values) — medium priority.
- Remaining JD Automation Portal phases (Docker packaging, dev-env docs, VPS deploy — now also covering `/api/auth/*`, `/api/view/*`, `/api/settings/*` routes and both `secrets/jd_portal_auth.json` + `secrets/jd_portal_llm_keys.json` provisioning).
- `PortalEnroll.jsx` silent-fail hardening (flagged 25 Jul, small).
- LinkedIn job-search automation scoping — not started.

## Working-tree note

`src/data/john_profile.json` has an uncommitted user edit and `src/data/jd/JD_DBS_IT_SVP_HeadOfTechnology_OpsRisk.json` is untracked — both left as-is, consistent with the established practice of never touching the user's own pending profile/JD edits mid-session.
