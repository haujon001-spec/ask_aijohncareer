# Todolist — 30 July 2026

## Carried over from todolist_25Jul2026.md (exhaustive, nothing skipped)

5-day gap since the last dev session (26–29 Jul) — only two data-only commits landed in between (`8d6005f` profile backfill note, `844985a` Manulife blueprint update + new HKEX blueprint added), no code/todolist activity. Session opened per soul.md intake: read `soul.md`, `todolist_25Jul2026.md`, `todolist_23Jul2026.md`, `todolist_21Jul2026.md`, `status_25Jul2026.md`.

Every item still open at the end of 25 Jul's session, carried forward in full:

1. ~~`jd_scorecard_resume_v2.py` output-quality round (items a–e)~~ — **done, verified 30 Jul 2026.** See section below and `docs/guides/JDSCORECARDRESUMEV2_OUTPUTQUALITY_30JUL2026.md`.
2. **Authoritative `john_profile.json` update capability — full interactive UI epic.** Plan drafted (`sprightly-enchanting-hare.md` under the Claude plans directory), **paused for user questions since 25 Jul, still not approved/implemented.** Per the 25 Jul decisions, before re-locking the plan it needs its scope widened: (i) accept N resume files as input, not one pasted blob; (ii) route each extracted bullet to the correct one of the 13 `profile.*` sections via semantic matching; (iii) rewrite bullets into SMART form with bold key figures before proposing; (iv) for one-off bulk backfills specifically, skip the per-proposal approval UI and auto-write behind a backup, surfacing results via the diff/version-history view instead. Also still includes the `/api/consolidate` dead-route security removal folded into this epic's design. Full scoping: `docs/guides/JOHNPROFILEUPDATE_SCOPING_25JUL2026.md`.
   - Sub-item: `core_competencies` remains untouched by any backfill run to date — not in scope for any pass so far, still open whenever this epic (or a future backfill) is picked up.
3. **Dynamic width further enhancement** (per-breakpoint gutter/max-width values, e.g. tighter gutter or higher cap at very wide desktop) — medium priority, carried forward since 23 Jul.
4. **Remaining JD Automation Portal phases** — integration, Docker packaging, dev-env docs, VPS deploy (deploy phase covers `/api/auth/*`, `/api/view/*`, `/api/settings/*` routes and both `secrets/jd_portal_auth.json` + `secrets/jd_portal_llm_keys.json` provisioning on the VPS). The NLP `update_profile_json` part of this item is superseded by item 2 above.
5. **`PortalEnroll.jsx` silent-fail hardening** — flagged 25 Jul during the CORS bugfix investigation: the enrollment-status check silently fails open to showing the "First-time Portal Setup" form on any fetch error, with no visible error message or distinction between "genuinely not enrolled" and "couldn't check connectivity." Small hardening, not built.
6. **Portal login password — open question, never answered.** After the 25 Jul CORS fix, the user was asked whether they remember the existing portal password or want a full reset (Method B in `docs/guides/JDPORTALPASSWORDROTATION_25JUL2026.md`). No answer recorded since — still open.
7. **LinkedIn job-search automation scoping** — not started, still just an idea to scope.

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
- (e) Reviewed all 46 `major_achievements` entries (as they stood before today's manual profile edit) against `professional_experience` highlights and the raw historical resumes. Two findings reported, **not auto-resolved**:
  1. Root-caused the 25-Jul-flagged possible duplicate: "Cutting-Edge Trading System Implementation" traces to `JohnHauResume2017.txt:39`; "No.1 Global Trading Application Revamp" traces to a `professional_experience` highlight. A third related highlight doesn't cleanly match either.
  2. New finding: "Knowledge Transfer & Team Development" (70% offload) and "Citrix External Trading Support Model Offload" (40% offload) both describe training the same Asia teams — possibly the same initiative with an unresolved numbers inconsistency.

Backed up first per soul.md golden-rule: `scripts/jd_scorecard_resume_v2.py.20260730_V1.bak`. Verified end-to-end (soul.md §3.1) against a real JD (HKEX, `--resume-only --llm=sonnet --force`, no `--refresh-blueprint` to avoid the 25 Jul blueprint-overwrite incident). Full record: `docs/guides/JDSCORECARDRESUMEV2_OUTPUTQUALITY_30JUL2026.md`. **Committed `a6dcfe8`.**

## New today (30 Jul 2026, later) — manual `john_profile.json` edit: syntax fix + duplicate review

User manually edited `src/data/john_profile.json` (added new `major_achievements` entries and new `professional_experience` highlight bullets, mostly around Morgan Stanley), backing it up first to `src/data/john_profile.json.20260730.bak` per soul.md golden-rule, then asked for a correctness/duplicate check.

**Syntax error found and fixed:** a missing comma between two consecutive strings in the Morgan Stanley `professional_experience.highlights` array (between `"...presented findings to senior managers"` and `"Revamped Morgan Stanley's **No.1 global trading application**..."`) made the file invalid JSON (`json.loads` failed at line 732). Fixed — the file now parses cleanly (50 `major_achievements`, 7 `professional_experience` entries). No other syntax issues found elsewhere in the file (confirmed by parsing end-to-end after the fix). Cosmetic note, not fixed: the newly-added lines use tabs/inconsistent indentation vs. the rest of the file's spaces — harmless for JSON validity, left as-is since reformatting the whole file wasn't asked for.

**Duplicate/same-meaning content found — reported, not merged (data judgment call, needs the user's decision):**

1. **New `major_achievements` duplicate, both Morgan Stanley:** "Citrix Virtual Applications Revamp for No.1 Trading Platform" (added today) and the pre-existing "No.1 Global Trading Application Revamp" both describe the identical fact — Citrix XenApp revamp of Morgan Stanley's #1 trading platform, "US$ multi-billions daily trading volume." Recommend merging into one entry.
2. **New `professional_experience` highlight duplicate, same Morgan Stanley bullet list:** the newly-added "Led redesign and performance revamp of Citrix virtual applications supporting Morgan Stanley's No.1 trading platform (multi-billion USD daily volume)" sits two lines above the pre-existing "Revamped Morgan Stanley's **No.1 global trading application** (US$ multi-billions in daily trading volume) using Citrix XenApp technology" — same fact, stated twice in the same list (this pair is also what caused the missing-comma syntax error, since the new line was inserted without a trailing comma).
3. **`professional_experience` highlight now redundant:** the older "Deep dive analysis of India ODC 10K users VPC performance issues" highlight is now superseded by two newly-added, more detailed highlights covering the same India ODC 10K remediation effort ("Core architect for India ODC 10K contractor VDI remediation..." + "Presented full remediation plan..."). Recommend removing the older, thinner line.
4. **Possible `major_achievements` overlap, lower confidence:** new entry "Scientific Load Testing & User Density Validation" (LoginVSI/SPLUNK, methodology-focused) vs. pre-existing "LoginVSI Performance Load Test Tool Introduction" (tool-adoption-focused) — both Morgan Stanley, both LoginVSI-centric. Could be two genuinely distinct facets of the same initiative (introducing the tool vs. using it for load-test analysis) rather than a true duplicate — flagged for a look, not as confidently a duplicate as 1–3 above.
5. **Still-open from earlier today, unaffected by this edit:** the two findings from the output-quality-round review above (Cutting-Edge Trading System vs. an earlier version of the No.1 Trading Application entry; Knowledge Transfer 70% vs. Citrix External Trading 40%) are still open — note that this edit **deleted** the professional_experience highlight that used to back "Cutting-Edge Trading System Implementation" ("Implemented cutting-edge electronic trading system facilitating US$1M first year revenue" no longer appears in the Morgan Stanley highlights), while the standalone `major_achievements` entry for it was left untouched — worth deciding together with finding 1 above, since all of these concern the same cluster of Morgan Stanley trading-application facts.

**Syntax fix committed separately** (`e085a48`) per user decision. **Duplicate-merge decisions received and applied (follow-up commit):**
- Findings 1 & 2 (Morgan Stanley "No.1 trading platform" duplicate, both as a `major_achievements` entry and as a `professional_experience` highlight): merged — kept the pre-existing "No.1 Global Trading Application Revamp" achievement and its matching highlight, folded in the new entry's extra detail ("improved stability, latency, and scalability for mission-critical trading workloads") as a new `impact` field, deleted the newly-added duplicate achievement entry and duplicate highlight line.
- Finding 3 (redundant India ODC 10K highlight): removed the older, thinner "Deep dive analysis of India ODC 10K users VPC performance issues" line, keeping the two newer, more detailed highlights.
- Finding 4 (Scientific Load Testing vs. LoginVSI Tool Introduction) and finding 5 (Cutting-Edge Trading System Implementation, tied to this morning's earlier review) — **not addressed**, user did not extend the merge decision to these; still open for a future pass.
- Verified: JSON parses cleanly (49 `major_achievements`, down from 50; Morgan Stanley `professional_experience` highlights now 48 lines with no "No.1 trading platform" or India-ODC-VPC duplicates remaining), `py_compile` clean on the resume script (unaffected, just confirming nothing else broke).

## Priority order

1. ~~`jd_scorecard_resume_v2.py` output-quality round (a–e)~~ — **done, verified 30 Jul 2026**
2. ~~`john_profile.json` No.1-trading-platform duplicate + India-ODC-highlight redundancy (findings 1–3)~~ — **done, merged/removed and verified 30 Jul 2026**
3. **`john_profile.json` — 2 remaining open findings (4: Scientific Load Testing vs. LoginVSI Tool Introduction; 5: Cutting-Edge Trading System Implementation, tied to this morning's earlier review)** — still awaiting a decision, lower priority than the resolved cluster above
4. Authoritative `john_profile.json` update capability (full UI epic, widened scope per 25 Jul decisions) — plan paused, not yet approved
5. Dynamic width further enhancement — medium priority
6. Remaining JD Automation Portal phases (integration, Docker, dev-env docs, VPS deploy)
7. `PortalEnroll.jsx` silent-fail hardening — small, flagged 25 Jul
8. Portal login password — open question, never answered (remember existing password vs. full reset)
9. LinkedIn automation scoping — not started

## Note

An untracked JD blueprint (`src/data/jd/JD_DBS_IT_SVP_HeadOfTechnology_OpsRisk.json`) remains in the working tree, unrelated to this session's work — left untouched.
