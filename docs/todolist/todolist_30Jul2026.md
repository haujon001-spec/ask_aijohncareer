# Todolist — 30 July 2026

## Carried over from todolist_25Jul2026.md

5-day gap since the last dev session (26–29 Jul) — only two data-only commits landed in between (`8d6005f` profile backfill note, `844985a` Manulife blueprint update + new HKEX blueprint added), no code/todolist activity. Session opened per soul.md intake: read `soul.md`, `todolist_25Jul2026.md`, `todolist_23Jul2026.md`, `todolist_21Jul2026.md`, `status_25Jul2026.md`. Confirmed with the user this is still the live priority order; asked clarifying questions before implementing (per soul.md + explicit user request) and got answers before starting.

1. ~~`jd_scorecard_resume_v2.py` output-quality round (items a–e)~~ — **done, verified 30 Jul 2026.** See below and `docs/guides/JDSCORECARDRESUMEV2_OUTPUTQUALITY_30JUL2026.md`.
2. Authoritative `john_profile.json` update capability — full interactive UI epic (manual editor, in-portal "Update from Resume" with multi-file support, version history, diff view) — **still plan-drafted, paused for user questions, not yet approved/implemented.** See `docs/guides/JOHNPROFILEUPDATE_SCOPING_25JUL2026.md` and the paused plan file (`sprightly-enchanting-hare.md`).
3. Dynamic width further enhancement (per-breakpoint gutter/max-width values) — medium priority, carried forward.
4. Remaining JD Automation Portal phases (integration, Docker packaging, dev-env docs, VPS deploy — the NLP `update_profile_json` part is superseded by item 2 above).
5. `PortalEnroll.jsx` silent-fail hardening (flagged 25 Jul during the CORS bugfix, not built — enrollment-status check fails open to the enroll form on any fetch error with no visible error/retry).
6. LinkedIn job-search automation scoping — not started.

## New today (30 Jul 2026) — `jd_scorecard_resume_v2.py` output-quality round (items a–e)

Clarifying questions asked and answered before implementing:
- Today's focus confirmed as this item (not the newly-added HKEX blueprint or another backlog item).
- Item (e) interpretation confirmed: **review/clean the raw JSON data** (not a code change to generation-selection logic).
- Item (b) truncation-fix approach confirmed: **raise the cap** (simple), not selective/summarized context building.

**Real bug found during implementation:** `build_profile_context()`'s existing `[:14000]` character truncation was already cutting off *inside* `professional_experience` (3rd section in insertion order, 18,365 chars alone) — meaning `major_achievements`, `ai_projects`, `core_competencies`, `technical_skills`, `education_certifications`, and `languages_spoken` had been silently missing from every Resume/Cover Letter generation, not just the 4 sections item (b) originally called out as missing.

**Done and verified 30 Jul 2026:**
- (b) Added the 4 missing sections (`linkedin_recommendations`, `soft_skills`, `languages`, `key_topics_for_qa`) to `build_profile_context()`; raised the truncation cap `14000` → `100000`. Confirmed actual current context is 70,532 chars, all 13 sections present, no truncation.
- (c) New RESUME_SYS rule 9: order bullets within a role by impact, most quantified/highest-impact first.
- (d) New RESUME_SYS rule 10: preserve `professional_experience`'s exact company order, never resequence. Old rules 9–12 renumbered to 11–14; all cross-references updated.
- (e) Reviewed all 46 `major_achievements` entries against `professional_experience` highlights and the raw historical resumes. Two findings reported to the user, **not auto-resolved** (per this project's established "flag ambiguous personal-history facts, don't silently resolve" practice):
  1. Root-caused the previously-flagged (25 Jul) possible duplicate: "Cutting-Edge Trading System Implementation" traces exactly to `JohnHauResume2017.txt:39` ("Electronic trading system facilitating us$1M first year revenue..."); "No.1 Global Trading Application Revamp" traces to a `professional_experience` highlight ("Revamped Morgan Stanley's No.1 global trading application... US$ multi-billions in daily trading volume... Citrix XenApp"). A third related highlight ("Generated US$1M additional monthly trade volume in China...") doesn't cleanly match either. Could be one achievement described three inconsistent ways across resume-writing rounds, or genuinely distinct facts — needs the user's own memory to resolve.
  2. New finding: "Knowledge Transfer & Team Development" (70% offload) and "Citrix External Trading Support Model Offload" (40% offload) both describe training the same Asia teams to take over support — possibly the same initiative with an unresolved numbers inconsistency. The actual generated resume already blends them into one bullet (using the 40% figure), so no output-level bug, but the source data itself has an open inconsistency.

Backed up first per soul.md golden-rule: `scripts/jd_scorecard_resume_v2.py.20260730_V1.bak`. Verified end-to-end (soul.md §3.1) against a real JD (HKEX, `--resume-only --llm=sonnet --force`, no `--refresh-blueprint` to avoid the 25 Jul blueprint-overwrite incident) — role order, bullet ordering, full 13-section context, bold-run/docx integrity all confirmed; test output deleted afterward. Full record: `docs/guides/JDSCORECARDRESUMEV2_OUTPUTQUALITY_30JUL2026.md`.

## Priority order

1. ~~`jd_scorecard_resume_v2.py` output-quality round (a–e)~~ — **done, verified 30 Jul 2026**
2. Major-achievements duplicate/inconsistency findings (see above) — **flagged, awaiting user decision** (merge / reword / confirm as distinct)
3. Authoritative `john_profile.json` update capability (full UI epic) — plan paused, not yet approved
4. Dynamic width further enhancement — medium priority
5. Remaining JD Automation Portal phases (Docker, VPS deploy)
6. `PortalEnroll.jsx` silent-fail hardening — small, flagged 25 Jul
7. LinkedIn automation scoping — not started

## Note

An untracked JD blueprint (`src/data/jd/JD_DBS_IT_SVP_HeadOfTechnology_OpsRisk.json`) and an uncommitted `src/data/john_profile.json` (user's own manual edit, per established pattern) are present in the working tree — left untouched, not part of this session's commit.
