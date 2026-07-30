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

## New today (30 Jul 2026, later still) — findings 4 & 5 resolved + Edge/BofA backfill from `JohnHauResumeBofa_Edge_V2ToAppend.txt`

User supplied a pre-structured append file (`data_raw/resume/txt/JohnHauResumeBofa_Edge_V2ToAppend.txt`) with 4 sections: new `major_achievements` + new `professional_experience` highlights for both Edge Technology Group and Bank of America, and asked to resolve findings 4/5 from earlier today. Clarifying questions asked and answered before writing anything to the golden data file:

**Findings 4 & 5 resolved:**
- Finding 4 (Scientific Load Testing & User Density Validation vs. LoginVSI Performance Load Test Tool Introduction): **kept both, as distinct facts** — no change made.
- Finding 5 (Cutting-Edge Trading System Implementation): **reworded for clarity**. Renamed to "Client-Facing Electronic Trading System Launch," `impact` field now explicitly notes it's distinct from the separate Citrix XenApp infrastructure revamp recorded under "No.1 Global Trading Application Revamp" — same underlying facts (US$1M first-year revenue, Equity business, led to integration of additional trading apps, sourced from `JohnHauResume2017.txt:39`), just disambiguated wording, nothing invented.

**Edge/BofA append — cross-checked against existing data before writing, not appended blindly.** Comparing all 21 new achievements + 21 new highlights in the append file against what `john_profile.json` already held: ~16 of the 21 items substantially restated existing highlights/achievements almost verbatim (e.g. "Major Incident Management – Outlook Hang Issue" duplicating the existing "Outlook Hang Issue Resolution"; "Standardized Technical Communications" duplicating an existing 40%-complaint-reduction highlight; similar for PowerShell training, Operational Excellence, VDI tech evaluation, restructuring recommendations, RACI, client-CTO engagement, penetration testing, observability/MTTR, 24x7 alignment). User confirmed: **only append genuinely-new items**, skip the duplicates.

**Appended (5 new achievements + 5 new highlights, verified real new facts not previously captured):**
- Edge Technology Group: "Trading System Migration from Unsupported CentOS to RedHat," "Syslog-NG High Availability Logging Architecture," "ISO27001 Gap Identification and Remediation Architecture" (adds a new HKD 1.8M revenue figure to a previously-unquantified compliance fact) — 3 achievements + 3 matching highlights.
- Bank of America: "Deep Performance Forensics for 10,000 VPC Users," "Trading Platform Stability Remediation" — 2 achievements + 2 matching highlights.

**Verified:** JSON parses cleanly (54 `major_achievements`, up from 49), Edge highlights 22 lines, Bank of America highlights 18 lines, `py_compile` clean on both `jd_scorecard_resume_v2.py` and `update_profile_from_resume.py`, and `build_profile_context()`'s output re-measured at 74,817 chars — still comfortably under the 100,000-char cap raised earlier today.

## New today (30 Jul 2026, later still) — profile-update JD Portal + script-level skill, logged as next priority (not started)

User wants today's manual-append workflow (backup → edit/append → duplicate-check → verify → commit) turned into a proper, reusable capability: a JD Portal UI feature *and* a Python-script-level capability for updating `john_profile.json` with new resume achievements going forward, rather than a one-off manual process each time. Per user decision, **this is logged as the clear next priority, not started this session** — it's a natural continuation of the already-paused profile-update UI epic (`docs/guides/JOHNPROFILEUPDATE_SCOPING_25JUL2026.md`, plan file `sprightly-enchanting-hare.md`) and of the existing `scripts/update_profile_from_resume.py` (built 25 Jul for raw-prose resume backfills, with its own near-duplicate safety net via `difflib.SequenceMatcher`). Next session should scope how today's two new patterns fold in:
- **Pre-structured JSON input** (today's `_V2ToAppend.txt` format: ready-to-paste achievement objects + highlight strings) as an alternative input mode alongside `update_profile_from_resume.py`'s existing raw-prose-plus-LLM-extraction mode.
- **Duplicate-detection-before-write** as a first-class step (today's manual cross-check found ~16 of 21 items were near-duplicates) — the script's existing `is_near_duplicate()` (0.72 similarity threshold) is the natural mechanism to reuse/expose here, surfaced to the user as an approve/skip list rather than a silent all-or-nothing write.
- Wiring either mode into the JD Portal UI (spawning the script the same way `pythonRunner.js` already spawns `jd_scorecard_resume_v2.py`) is still gated on the same paused-plan questions as before (manual editor form, approval granularity, version history/diff view).

## New today (30 Jul 2026, later still) — Profile-update JD Portal epic, built in full (all 4 parts)

Per "let's go through the next priorities now," the profile-update epic was picked up as the top priority. Given its size (full paused epic, widened scope, security-fix folded in), used Plan Mode: two parallel Explore agents grounded the current backend/frontend state (confirmed `backend/backup.js`'s format already matches `scripts/update_profile_from_resume.py`'s own backups; confirmed `ProfileView.jsx`/the "Profile" tab already exist and are read-only, live since 25 Jul — a design update from the original paused plan), then a Plan agent synthesized a concrete file-by-file plan, refined via 4 clarifying questions (LLM scope: manual-only for `summary`/`metadata`; paste-text-only, no PDF/DOCX; client-side diff computation; auto-prune old backups). Plan approved, then built and verified in full this session. Full record: `docs/guides/JDPORTALPROFILEUPDATE_30JUL2026.md`, plan file `C:\Users\haujo\.claude\plans\ancient-dancing-rocket.md`.

**Security fix (shipped first, independent):** deleted `backend/consolidation.js` + `src/utils/consolidation.js` + `scripts/test_consolidation.js` (confirmed dead/broken — wrong nesting, no auth, no backup) and the `POST /api/consolidate` route + import from `backend/server.js`. Verified: the URL now falls through to the pre-existing generic `POST /api/:model` chat route, rejecting `consolidate` as an unknown model — the dangerous write path is unreachable.

**Shared foundation:** `shared/profileSchema.js` (new top-level dir — 13-section schema, `LLM_PROPOSABLE_SECTIONS` excludes `metadata`/`summary`/`linkedin_recommendations`), `backend/lib/profileOps.js` (shared op engine — `replaceText`/`updateObject`/`upsertEntry`/`removeEntry`/`appendStrings`/`removeStrings`, verified with 11 standalone test cases against real data), `backend/lib/textSimilarity.js` (JS port of the Python script's `is_near_duplicate()`), `backend/lib/llmClient.js` (Node-native LLM call, no Python spawn), `backend/backup.js` extended (exported `BACKUP_DIR`, added `getBackup()`, wired `cleanupOldBackups(10)` to run after every write).

**Backend routes** (`backend/api/profile.js`, new, replaces the retired `backend/api/profile_update.js` 501 stub): `POST /manual` (part a, optimistic-concurrency 409), `POST /update-from-resume/propose` + `/approve` (part b, never auto-writes, validates section allowlist + operation allowlist + verbatim groundingQuote + near-dup), `GET /versions`, `GET /versions/:filename`, `POST /versions/:filename/restore` (parts c/d).

**Frontend:** `JDProfile.jsx` (new container resolving coexistence with the untouched `ProfileView.jsx` via a nested View/Edit/Update-from-Resume/History sub-tab bar), `ProfileEditForm.jsx` (schema-driven typed editors, dynamic key/value rows for `major_achievements`), `ProfileUpdateFromResume.jsx` (multi-source paste, propose/approve checklist with a "Rejected (N)" section), `ProfileVersionHistory.jsx` + `ProfileDiff.jsx` (new `diff` npm dependency, client-side word/entry diff), `JDPortal.jsx` updated, dead `profile-update-stub` button + CSS removed, new `.tab-bar--sub-nested` CSS variant added.

**Verified end-to-end (soul.md §3.1), real dev stack, real MFA auth (credential-swap technique), real LLM calls, no mocks:**
- Backend curl pass: route-collision, auth-negative (401), path-traversal-negative (400), manual-edit round-trip.
  - **Real mistake made and caught:** first restore test targeted the *oldest* backup instead of the one the test itself created, silently reverting the working file to a 25-Jul snapshot and wiping this session's earlier dedup/backfill work in the working tree. Caught via `git diff` immediately after, fixed via `git show HEAD:... > file` (confirmed 0-line diff after). Lesson logged to memory: always restore-test against a backup the test itself just created, never an arbitrary list entry.
- Playwright pass, parts (a)/(c)/(d): real login → add throwaway skill → Save → History shows new version → Compare correctly highlights it → Restore removes it → confirmed in Edit tab → confirmed untouched `ProfileView` still renders. Zero console errors.
- Backend + Playwright pass, part (b): real `anthropic/claude-sonnet-5` call against a fabricated throwaway resume snippet produced 6 well-grounded proposals across 6 different sections (confirming cross-section semantic routing genuinely works); confirmed file byte-unchanged after propose; partial-approved 2 of 6 (then separately, via Playwright, 1 of 4) — confirmed exactly the approved subset landed each time; a repeat-fact test correctly returned 0 proposals (LLM self-deduped); directly unit-tested all 3 validation gates.
- Security-fix regression confirmed above.
- Full cleanup: all test backups/pending-proposal files removed, `secrets/jd_portal_auth.json` restored byte-identical, test servers killed, `git diff src/data/john_profile.json` confirmed 0 lines, `npm run build` clean throughout.

## New today (30 Jul 2026, later still) — three items raised after seeing the live portal, investigated same session

User was looking at the live `/portal` (screenshot: "New JD Run" step 2, Manulife re-run with DeepSeek) and raised three items. Logged per soul.md intake workflow; (a) is a genuine new backlog item, (b) and (c) were investigated and answered directly this session (not deferred) since they were concrete, bounded questions about existing behavior.

### a. askcareer-ai.com landing page vs. `/portal` — do they share a *live* profile source? **Investigated — real gap found, not yet fixed.**

Both read the exact same file (`src/data/john_profile.json`), but **not with the same freshness guarantee**:
- `/portal`'s routes (`backend/api/profile_view.js`, and this session's new `backend/api/profile.js`) call `fs.readFileSync(PROFILE_PATH, ...)` **fresh on every request** — always current.
- The public chat landing page's backend (`backend/server.js`, port 3000) loads `johnProfile` **once at process boot** (line 66-68) and keeps it in a closure used by every chat request thereafter (`buildSystemPrompt()`) — **it never re-reads the file.** The only reload path that existed (`/api/consolidate`'s post-consolidation reload) was deleted today as part of the security fix, since it was itself broken/unauthenticated — so there is now **no** way to refresh the landing page's in-memory profile short of restarting `backend/server.js`.

**Practical impact:** any edit made through today's new `/portal` profile-update epic (or a manual JSON edit) will show up immediately in `/portal`'s own Profile view, but the public chat landing page will keep answering from the stale, pre-edit profile until that process is restarted. In production this is less acute (a VPS deploy already restarts the container, which naturally re-reads the file) — the practical gap is for local dev, where both processes run side-by-side. **Not fixed yet** — candidate fix: make `backend/server.js` re-read the file per-request (matching the portal's pattern) or add a lightweight periodic/on-demand reload, gated behind a question below.

### b. Why does the Manulife `_25JUL2026.txt` resume omit "Avoided US$12.7M TCO through Center of excellence by identifying 9,800 unassigned/spare/reclaimed virtual desktops for reuse" — a bigger number than the HK$3.5M Windows-11 savings or the US$1.4M OPEX reduction that *are* included? **Investigated and answered — not a selection bug.**

Confirmed directly against the 25 Jul 2026 12:21 backup (`backup/backup-2026-07-25T12-21-19-980689.json`, the last snapshot before that resume was generated): the profile's wording at that time was still the **old, combined** line — `"Avoided US$640K in vendor costs by identifying 9,800 unassigned/spare/reclaimed virtual desktops for reuse"` — there was no "$12.7M TCO" figure anywhere in the profile yet. That figure was only created **this morning (30 Jul)**, when the user's manual edit split the old combined `$640K` line into two separate facts (`"Avoided US$640K in vendor costs on consultancy analysis"` + the new `"Avoided US$12.7M TCO through Center of excellence..."`).

**In short: the resume can only ever draw from what's in the profile at the moment it's generated — this one is simply 5 days older than the fact in question, not a case of the algorithm judging it less important.** The $640K precursor fact *was* correctly included in that resume (merged into the Morgan Stanley OPEX bullet, confirmed present at line 126 of the generated `.txt`) — regenerating this resume today (`--resume-only --force`) would pick up the new $12.7M figure automatically.

### c. Is bullet/achievement selection based on the most impactful events by scale/$ savings? **Investigated and answered — no, not primarily.**

Read `scripts/jd_scorecard_resume_v2.py`'s actual `BULLET COUNT RULES` (~line 1027): each company gets a **fixed, non-negotiable bullet budget** by recency tier — 12/12/10/10/8 bullets for the 1st–5th companies, 3-4 combined for earlier roles — regardless of how many highlights exist or how large their dollar figures are. Within that fixed budget, the instruction is **"choose the bullets most relevant to the JD"** (semantic match to the job description) — not "choose the highest-dollar-value ones." Today's earlier-session addition (system rule 9) only governs **ordering** among the bullets *already selected* (lead with the most quantified/highest-impact first) — it does not influence which highlights make the cut in the first place. Confirmed empirically in the Manulife resume: Morgan Stanley (10-bullet budget) hit exactly 10 by merging the OPEX + vendor-cost facts into one combined bullet rather than dropping either — i.e. compression to fit the budget, not impact-based exclusion.

**So: selection is JD-relevance-first under a fixed per-company bullet ceiling, with impact-based ordering only among whatever gets selected — not a pure "biggest number wins" ranking.** Whether this is the desired behavior going forward, or whether a dollar-value/scale weighting should also factor into *which* bullets get chosen (not just their order), is an open design question for tomorrow — see questions below.

## Priority order

1. ~~`jd_scorecard_resume_v2.py` output-quality round (a–e)~~ — **done, verified 30 Jul 2026**
2. ~~`john_profile.json` No.1-trading-platform duplicate + India-ODC-highlight redundancy (findings 1–3)~~ — **done, merged/removed and verified 30 Jul 2026**
3. ~~`john_profile.json` findings 4 & 5 (LoginVSI overlap; Cutting-Edge Trading System wording)~~ — **done, resolved 30 Jul 2026** (finding 4: kept both; finding 5: reworded)
4. ~~Edge/Bank of America backfill from `JohnHauResumeBofa_Edge_V2ToAppend.txt`~~ — **done, verified 30 Jul 2026** (5 of 21 items appended, 16 skipped as duplicates)
5. ~~Profile-update JD Portal + script-level skill (full 4-part epic + security fix)~~ — **done, verified 30 Jul 2026.** See `docs/guides/JDPORTALPROFILEUPDATE_30JUL2026.md`.
6. **Landing-page profile staleness gap** — real finding, not yet fixed; `backend/server.js` caches `john_profile.json` at boot and never reloads (the only reload path was deleted today as a security fix). Fix approach pending a decision (see questions below).
7. **Resume/cover-letter bullet-selection mechanism** — investigated and explained (see finding c above); whether to add a $-value/scale weighting to *which* bullets get selected (not just their order) is an open design question, pending a decision (see questions below).
8. Dynamic width further enhancement — medium priority
9. Remaining JD Automation Portal phases (integration, Docker, dev-env docs, VPS deploy)
10. `PortalEnroll.jsx` silent-fail hardening — small, flagged 25 Jul
11. ~~Portal login password~~ — **resolved 30 Jul 2026**, user confirmed the new password works as expected
12. LinkedIn automation scoping — not started

## Tomorrow (31 Jul 2026) — carried forward, pending today's clarifying questions

- Decide and implement a fix for the landing-page profile-staleness gap (item 6 above) — options range from "always re-read per chat request" (simplest, matches the portal's own pattern) to a periodic/manual reload.
- Decide whether the resume-generation bullet-selection mechanism should weight $-value/scale into *which* highlights get chosen (not just their order) — if yes, this becomes a `jd_scorecard_resume_v2.py` prompt-engineering change, following the golden-rule backup-first practice used all session.
- Consider whether to regenerate the Manulife `_25JUL2026.txt` resume now that the profile has grown (5 days of backfill + the $12.7M figure) — not decided yet, only surfaced as a possibility during investigation.
- Then continue down the confirmed backlog order: dynamic-width tuning → remaining JD Automation Portal phases (Docker/VPS) → `PortalEnroll.jsx` hardening → LinkedIn scoping.

## Note

An untracked JD blueprint (`src/data/jd/JD_DBS_IT_SVP_HeadOfTechnology_OpsRisk.json`) and a pre-existing, unrelated modification to `src/data/jd/JD_Manulife_AVP_Technology_Architecture_and_Operations.json` remain in the working tree, unrelated to this session's work — left untouched.
