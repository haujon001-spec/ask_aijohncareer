# Profile Backfill Script + First Run (AIA), 25 Jul 2026

Implementation record for item 5's narrowed first step in `docs/todolist/todolist_25Jul2026.md`: fixing the authoritative `src/data/john_profile.json` before extending it into a full UI feature. `john_profile.json` was populated once, on 30 Mar 2026, by a naive regex extractor (`backend/consolidation.js`, already flagged for deletion in the paused profile-update plan) — it never captured most of John's real career history, which is the root cause of low JD scorecard match numbers the user had observed.

## What shipped

**`scripts/update_profile_from_resume.py`** (new) — reads one or more raw resume text files and adds only the NEW content they contain to `john_profile.json`, without touching or duplicating anything already captured.

- **File selection is a CLI argument**, not hardcoded — `python scripts/update_profile_from_resume.py <file> [<file2> ...]` — so the same script is reusable for future resumes/employers, and can later be spawned by the JD Portal backend the same way `backend/lib/pythonRunner.js` already spawns `scripts/jd_scorecard_resume_v2.py`, once the "Update from Resume" UI feature is built.
- **`--company=<name>`** optional override; without it, the script auto-detects the employer by matching a known `profile.professional_experience[].company` name against the file's own text.
- **`--llm=sonnet|deepseek|gemini`** (default `sonnet`) — same presets, `LLM_CONFIGS`, retry-with-backoff (3 attempts, linear backoff, same retryable status-code set), and `.env.local → .env.vps → .env` key resolution as `scripts/jd_scorecard_resume_v2.py`, deliberately kept consistent rather than building a separate Node LLM client.
- **`--dry-run`** — runs the extraction and prints what would be added, without backing up or writing.
- **Anti-hallucination rule**: the LLM prompt explicitly forbids inventing or estimating any fact/number not present in the raw text, and forbids restating anything already in the existing captured content (semantic dedupe, not just string match). A second, code-level safety net (`difflib.SequenceMatcher` ratio ≥ 0.72) catches any near-duplicate the model still produces.
- **Bulk-write, not per-item approval**: confirmed by the user (25 Jul 2026) as acceptable specifically for this backfill, because the source is John's own real historical resumes, not LLM-invented content — the pre-write backup covers the undo path. This differs from the still-paused, more cautious "Update from Resume" interactive merge flow designed for arbitrary pasted text.
- **Backup before every write**: writes a timestamped `backup/backup-<ISO timestamp>.json` in the exact format `backend/backup.js`'s `restoreProfile()`/`listBackups()` already expect (`{timestamp, sourceFile, fileSize, profile: <entire original file envelope>}`), so these backups are restorable from the not-yet-built Version History UI too.
- Only ever **adds** — new `highlights` appended to the matched `professional_experience` entry, new entries appended to `major_achievements`, new keywords appended to `key_topics_for_qa`. Never edits or removes existing content.
- Adds `metadata.resume_sources` (array) and `metadata.last_backfilled` — the pre-existing `metadata.resume_source` (singular string) is left untouched for backward compatibility with two other legacy/unused scripts (`scripts/test_generate_resume.js`) that still read it; full cutover to the plural field is deferred to when the paused UI plan is implemented.

## First real run: `JohnHauResume2025-AIA.txt`

```
python scripts/update_profile_from_resume.py data_raw/resume/txt/JohnHauResume2025-AIA.txt --company="AIA International Ltd"
```

- Dry-run first (soul.md §3.1 — verify before committing to a real write): produced 22 new highlights, 6 new achievements, 13 new topics, all traceable to the raw file, correctly SMART/bold-formatted, zero overlap with the existing 11 highlights / 3 achievements.
- Live run hit one bug: despite `response_format: json_object`, the model occasionally still wraps output in a ```` ```json ```` fence. Fixed by stripping a fence wrapper before `json.loads()` if present. Re-ran successfully.
- Live run result: **+16 highlights, +7 achievements, +12 topics** (LLM run-to-run variance between the dry-run and live-run pass — both passes were independently well-grounded, no fabrication in either).
- **Verified end-to-end** (soul.md §3.1 — executed and inspected, not just written):
  - `AIA International Ltd` highlights: 11 → 27.
  - `major_achievements`: 29 → 36.
  - `key_topics_for_qa`: 31 → 43.
  - Backup file (`backup/backup-2026-07-25T10-42-17-300598.json`) confirmed valid JSON and restorable.
  - Diffed the full before/after profile programmatically: every section other than `AIA International Ltd`'s highlights, `major_achievements`, `key_topics_for_qa`, and `metadata` is byte-identical to the backup — confirming the run was purely additive with no accidental edits to Bank of America / Edge Technology Group / Morgan Stanley / Merrill Lynch entries.
- **One item flagged for the user, not silently accepted**: the achievement "ITDR Infrastructure Cost Reduction" cites a cost reduction from the raw text's "usd 7.6 down to usd 6.1 infrastructure cost" — the raw resume text never states the unit (million vs. thousand). The live run's phrasing left the ambiguity as-is (no invented "M" suffix), but the user should confirm the actual unit before this entry is used in a real application.

## Files changed

- `scripts/update_profile_from_resume.py` (new).
- `src/data/john_profile.json` — AIA section backfilled (see above); backed up first via the script's own `backup/backup-*.json` mechanism.

## Second round: 2020 and 2017 resumes (same session, later)

`JohnHauResume2020.txt` and `JohnHauResume2017.txt` each mention **multiple employers in one file** (2020: Edge Technology Group + Morgan Stanley; 2017: Morgan Stanley + Merrill Lynch, plus Siemens/Alco — see below). Ran once per already-existing employer, `--company=` explicitly disambiguating which one to extract for each pass.

**Two real issues hit and fixed:**
1. **`max_tokens` too small as an employer's existing content grows.** Morgan Stanley's extraction hit `finish_reason=length` twice (once at the original `6000`, again at `8000`) as its highlight/achievement count grew across runs — each call echoes the employer's existing content back into the prompt for dedupe context, so the token budget needed headroom for both that echo and the new-content output. Raised to `12000` (matching the scorecard call's budget in `jd_scorecard_resume_v2.py`).
2. **Cross-employer contamination risk** — since a single raw file can mention several employers, the original prompt only said "extract new content" without telling the model to ignore sections about a *different* employer. Hardened both the system and user prompts to explicitly scope extraction to the target employer and discard anything clearly about another one mentioned in the same file. Verified: the Edge Technology Group pass over the 2020 file correctly ignored that file's Morgan Stanley section, and vice versa (spot-checked the returned highlights against the raw text's employer boundaries).

**Results (all verified: valid JSON, purely additive, before/after diffed):**

| Run | Employer | Highlights added | Achievements added | Topics added |
|---|---|---|---|---|
| 2020 | Edge Technology Group | +4 | +0 | +4 |
| 2020 | Morgan Stanley | +5 | +3 | +5 |
| 2017 | Morgan Stanley | +10 | +2 | +10 |
| 2017 | Merrill Lynch | +8 | +2 | +15 |

Running totals after both files: AIA 27, Bank of America 10, Edge Technology Group 19, Morgan Stanley 44, Merrill Lynch 34 highlights; 43 `major_achievements`; 77 `key_topics_for_qa`; `metadata.resume_sources` now `["JohnHauResume2025-AIA.txt", "JohnHauResume2020.txt", "JohnHauResume2017.txt"]`.

**One item flagged for user review, not silently accepted:** the achievement "No.1 Global Trading Application Revamp" (multi-billions daily trading volume, from the 2020/2017 text) may substantively overlap with the pre-existing achievement "Cutting-Edge Trading System Implementation" (US$1M first-year revenue). The two describe different numbers, so both were kept as separate entries rather than the script guessing which is authoritative — worth a human check on whether they're the same underlying project described two ways, or genuinely distinct trading-app work.

## Third round: new-employer creation (Siemens, Alco)

User decided (25 Jul 2026): extend the script to create brand-new `professional_experience` entries rather than skip Siemens H.K. Ltd. and Alco Plastic Products Ltd. — both appear in `JohnHauResume2017.txt`'s career history but had zero JSON representation (previously hardcoded only in the resume-generation template — see the 21 Jul 2026 todolist note on this same gap).

**New `--create-new-employer` flag** (requires `--company="Exact New Employer Name"`): when set and no existing entry matches, `find_matching_experience()` returns `None` instead of exiting with an error, and the LLM prompt gains a `new_entry` schema field (`title`/`period`/`scope`) — filled in strictly from the raw text, same anti-hallucination rule as everything else, never invented. Without this flag, an unmatched `--company` remains a hard error (safe default — accidental creation of a bogus employer entry requires an explicit opt-in).

Both dry-run then live-run, per soul.md §3.1 — every fact independently spot-checked line-by-line against the raw source (lines 144-163 of `JohnHauResume2017.txt`, which weren't in the excerpt read for the second round's Siemens/Alco summary line, but were read in full before this round):

- **Siemens H.K. Ltd.** — new entry (`IT support Officer, MIS department`, Apr 1997 – Apr 1998), +5 highlights, +1 achievement ("Workstation OS Upgrade", 150+ workstations Win 3.51/95 → NT 4.0 — confirmed verbatim in the source), +8 topics.
- **Alco Plastic Products Ltd** — new entry (`PC support Engineer, EDP team`, Feb 1995 – Mar 1997), +5 highlights, +1 achievement ("Workstation Deployment and Support", 40+ workstations DOS 6.11/Win 3.11/95 — confirmed verbatim), +6 topics.

## Final state, all runs this session

| Company | Highlights |
|---|---|
| AIA International Ltd | 27 |
| Bank of America | 10 |
| Edge Technology Group | 19 |
| Morgan Stanley | 44 |
| Merrill Lynch | 34 |
| Siemens H.K. Ltd. (new) | 5 |
| Alco Plastic Products Ltd (new) | 5 |

`major_achievements`: 45 total. `key_topics_for_qa`: 91 total. `metadata.resume_sources`: `["JohnHauResume2025-AIA.txt", "JohnHauResume2020.txt", "JohnHauResume2017.txt"]`. All 5 files under `data_raw/resume/txt/` now processed except `JohnHauResume2023.txt` (user decision: skip — Education/Skills-only content, already substantially covered by the existing 20 `technical_skills` / 27 `education_certifications` entries).

## Not yet done

- `core_competencies` (nested dict) — not touched by any run so far, to keep scope tight and testable; candidate follow-up.
- Wiring this script into the JD Portal UI ("Update from Resume" feature, multi-file support) — still part of the paused plan (`sprightly-enchanting-hare.md`), not started.
- Two items flagged for human review, not silently resolved: the "USD 7.6M/6.1M" unit (now fixed) and the possible "No.1 Global Trading Application Revamp" vs. "Cutting-Edge Trading System Implementation" overlap (still open, see above).
