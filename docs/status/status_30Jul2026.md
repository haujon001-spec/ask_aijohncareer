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

## Manual `john_profile.json` edit — syntax fix + duplicate review (later, 30 Jul 2026)

User manually added new content to `src/data/john_profile.json` (new `major_achievements` entries + new `professional_experience` highlights, mostly Morgan Stanley), backing it up first to `src/data/john_profile.json.20260730.bak`.

**Fixed:** a missing comma between two consecutive strings in the Morgan Stanley `highlights` array made the file invalid JSON (`json.loads` failed at line 732). Confirmed no other syntax errors exist after the fix (file parses cleanly end-to-end: 50 `major_achievements`, 7 `professional_experience` entries).

**Reported, not merged** (data judgment calls, left for the user):
1. New `major_achievements` entry "Citrix Virtual Applications Revamp for No.1 Trading Platform" duplicates the pre-existing "No.1 Global Trading Application Revamp" — same fact (Citrix XenApp revamp of the #1 trading platform, multi-billion-dollar daily volume).
2. The newly-added `professional_experience` highlight "Led redesign and performance revamp of Citrix virtual applications supporting Morgan Stanley's No.1 trading platform..." duplicates the pre-existing highlight "Revamped Morgan Stanley's **No.1 global trading application**..." two lines below it in the same list (this pair is what caused the missing-comma syntax error).
3. The older highlight "Deep dive analysis of India ODC 10K users VPC performance issues" is now redundant next to two newly-added, richer highlights covering the same India ODC 10K remediation.
4. Lower-confidence: new "Scientific Load Testing & User Density Validation" vs. pre-existing "LoginVSI Performance Load Test Tool Introduction" — both Morgan Stanley/LoginVSI, possibly distinct facets rather than a true duplicate.
5. This edit deleted the highlight that used to back the still-open "Cutting-Edge Trading System Implementation" achievement (from earlier today's review) — the standalone achievement entry itself was untouched, so this should be resolved together with finding 1.

**Syntax fix committed separately** (`e085a48`), per user decision, before the merge decisions were finalized.

## Duplicate resolution (later still, 30 Jul 2026)

User decided findings 1–3: merge the two "No.1 trading platform" duplicates (kept the pre-existing `major_achievements` entry + highlight, folded in the new entry's extra detail as a new `impact` field, deleted the duplicate achievement + highlight), and remove the now-redundant "Deep dive analysis of India ODC 10K users VPC performance issues" highlight. Findings 4 (Scientific Load Testing vs. LoginVSI Tool Introduction) and 5 (Cutting-Edge Trading System Implementation) were **not** extended to this decision — still open. Applied, verified (JSON parses cleanly, 49 `major_achievements` down from 50, Morgan Stanley highlights de-duplicated, `py_compile` clean), and committed as a follow-up.

## Findings 4 & 5 resolved + Edge/Bank of America backfill (later still, 30 Jul 2026)

User supplied `data_raw/resume/txt/JohnHauResumeBofa_Edge_V2ToAppend.txt` (pre-structured JSON achievements + highlight strings for Edge Technology Group and Bank of America) and asked to resolve findings 4/5.

- **Finding 4:** kept both entries as distinct facts, no change.
- **Finding 5:** reworded "Cutting-Edge Trading System Implementation" → "Client-Facing Electronic Trading System Launch," with its `impact` field now explicitly disambiguating it from "No.1 Global Trading Application Revamp" — same underlying facts (US$1M first-year revenue, `JohnHauResume2017.txt:39`), clarified wording only.

**Cross-checked the append file against existing data before writing anything** — found ~16 of 21 new items substantially restated existing highlights/achievements (e.g. Outlook-hang, PowerShell training, Operational Excellence, VDI-tech evaluation, restructuring recommendations already captured for Bank of America; client-CTO engagement, penetration testing, observability/MTTR, 24x7 alignment, RACI already captured for Edge). Per user decision, appended only the 5 genuinely-new items: Edge — CentOS→RedHat trading-system migration, Syslog-NG HA logging, ISO27001 gap-remediation with a new HKD 1.8M revenue figure; Bank of America — 10,000-VPC-user SPLUNK forensics, trading-platform stability remediation. Verified: JSON parses cleanly (54 `major_achievements`, up from 49), Edge highlights 22 lines, Bank of America highlights 18 lines, `py_compile` clean, profile context re-measured at 74,817 chars (still under the 100,000 cap).

## Profile-update JD Portal epic — scoped, planned, and built in full (later still, 30 Jul 2026)

**Status: Done, verified end-to-end.** Full record: `docs/guides/JDPORTALPROFILEUPDATE_30JUL2026.md`. Plan file: `C:\Users\haujo\.claude\plans\ancient-dancing-rocket.md`.

Per "let's go through the next priorities now," this (the item logged above as next priority) was picked up. Confirmed scope via 4 clarifying questions (full 4-part epic in one push; portal always requires explicit approve, never auto-write; manual-only LLM exclusion for `metadata`/`summary`; paste-text-only; client-side diff; auto-prune backups). Used Plan Mode given the size: 2 parallel Explore agents grounded current backend/frontend state, 1 Plan agent synthesized a concrete file-by-file plan, reviewed and finalized before approval.

**Security fix (shipped first):** deleted the dead `backend/consolidation.js`/`src/utils/consolidation.js`/`scripts/test_consolidation.js` and the unauthenticated `POST /api/consolidate` route from `backend/server.js`. Verified the URL now falls through to the pre-existing generic chat-model route, rejecting it — no write path reachable.

**Built:** `shared/profileSchema.js`, `backend/lib/profileOps.js` (11 unit tests passed against real data before any route existed), `backend/lib/textSimilarity.js`, `backend/lib/llmClient.js`, `backend/backup.js` extensions, `backend/api/profile.js` (manual/versions/propose/approve routes, replacing the retired `profile_update.js` stub), and 5 new frontend components (`JDProfile.jsx`, `ProfileEditForm.jsx`, `ProfileUpdateFromResume.jsx`, `ProfileVersionHistory.jsx`, `ProfileDiff.jsx`) plus a new `diff` npm dependency.

**Verified (soul.md §3.1), real dev stack/auth/LLM, no mocks:** backend curl pass (route collisions, auth/path-traversal negatives, manual-edit round-trip), Playwright pass for parts (a)/(c)/(d) (real add-skill → save → history → diff → restore, zero console errors), backend + Playwright pass for part (b) (real `anthropic/claude-sonnet-5` calls producing grounded proposals across 6 different profile sections, confirmed never-auto-write, confirmed partial-approval precision, confirmed self-dedup on a repeat-fact test, unit-tested all 3 validation gates), security-fix regression confirmed, full cleanup (test backups/pending files removed, `secrets/jd_portal_auth.json` restored byte-identical, `git diff` on the profile confirmed 0 lines, `npm run build` clean throughout).

**Real mistake made and disclosed:** first restore-test targeted the *oldest* backup in the list rather than the one the test itself created, silently reverting the working file to a 25-Jul snapshot and wiping this session's earlier dedup/backfill work in the working tree. Caught immediately via `git diff`, fixed via `git show HEAD:... > file` (confirmed clean after). Logged to memory: always restore-test against a backup the test itself just created.

## Three findings from live portal usage, investigated + one fix shipped (later still, 30 Jul 2026)

User raised three items after using the live `/portal`. Investigated all three same session (per soul.md intake), one required and received a real fix.

1. **Landing-page profile staleness — real gap found and fixed.** `/portal`'s routes re-read `john_profile.json` fresh per request; the public chat backend (`backend/server.js`) loaded it once at boot and never refreshed (the only reload path was on the just-deleted `/api/consolidate` route). **Fixed:** `buildSystemPrompt()` now re-reads the file fresh on every chat request (falling back to the boot-time snapshot on a transient read error). Backed up first (`backend/server.js.20260730_V2.bak`). **Verified live:** booted the server once, injected a uniquely-tagged marker directly into `john_profile.json` with *no restart*, then confirmed a real chat call to `/api/deepseek` echoed the marker back — proving the fix works without needing a process restart. Cleaned up the test marker afterward (`git diff` confirmed 0 lines).
2. **Why the Manulife `_25JUL2026.txt` resume omits the "$12.7M TCO" achievement — investigated, not a bug.** Confirmed against the actual 25 Jul 12:21 backup: the profile still had the old combined "$640K" wording at generation time — the "$12.7M TCO" split didn't exist until this morning's manual edit. The resume simply predates the fact; regenerating would pick it up. User decided **not** to regenerate tonight.
3. **Is bullet selection driven by $-value/scale? — investigated, answered no.** `jd_scorecard_resume_v2.py`'s `BULLET COUNT RULES` impose a fixed per-company bullet budget (12/12/10/10/8), with bullets chosen by JD-relevance, not dollar size — the impact-ordering rule added earlier today only sequences already-selected bullets. User deferred a decision on whether to add $-weighting to *selection* itself — open question for tomorrow.

## New session (30 Jul 2026, later still) — soul.md re-confirmed to memory, remaining backlog cleared, live VPS deploy

Fresh session opened per explicit user request: (1) re-confirm soul.md's operating rules into Claude's persistent memory so they apply automatically every future session (saved as `feedback_soul_md_operating_rules`), (2) work `todolist_30Jul2026.md` in priority order, (3) ask before implementing. Intake reconciliation before touching anything: found item 6 (landing-page staleness) was already fixed and committed (`6981181`) but this doc's priority line hadn't been updated, and found undocumented uncommitted working-tree state (a pipeline-regenerated Manulife AVP JD blueprint + a brand-new Manulife Senior Director JD blueprint) not covered by the "Working-tree note" above — asked the user rather than guessing; confirmed both were legitimate pipeline/manual output and committed them (`4837980`).

**Items 6–10, 12 cleared, all verified end-to-end (soul.md §3.1), each with its own guide under `docs/guides/`:**
- **Item 7** — resume bullet *selection* (not just ordering) now weights $-value/scale as a tiebreaker among comparably JD-relevant candidates (new `RESUME_SYS` rule 10). Verified with a real `--resume-only --llm=sonnet --force` run against the HKEX JD. `JDSCORECARDRESUMEV2_BULLETSELECTIONWEIGHTING_30JUL2026.md`, commit `d884e62`.
- **Item 8** — dynamic width further enhancement. Measured `.portal-main`'s real gutter (Playwright against the live dev server) before touching CSS, per this item's own "don't guess blind" note — found the two named laptop widths (1440/1600) were already fine, the real problem was the flat `max-width:1800px` cap not scaling (380px/side dead margin at 2560px). Added two `min-width` breakpoints (1921px→2000px, 2560px→2400px); re-measured, 2560px gutter down to 80px/side. `JDPORTALDYNAMICWIDTH_30JUL2026.md`, commit `b9ab7dc`.
- **Item 10** — `PortalEnroll.jsx` no longer fails open into the enrollment form on a fetch error (the exact 25 Jul CORS-incident ambiguity). New error card (Retry / Go-to-Sign-in). Verified via Playwright route-interception simulating the real failure, plus a Retry-recovers pass. `JDPORTALENROLLHARDENING_30JUL2026.md`, commit `8e5f751`.
- **Item 12** — LinkedIn automation scoped (not built): user selected auto-discover + applied-role tracker, declined application auto-fill. Surfaced a real blocker before writing any code: LinkedIn's ToS prohibits scraping/automated access and there's no self-serve official API for this — 4 candidate paths written up for a future decision. `LINKEDINAUTOMATION_SCOPING_30JUL2026.md`, commit `041a3ec`.

**Item 9 — the big one — JD Automation Portal deployed live to the production VPS.** Used Plan Mode given the production risk (live secrets, no in-repo SSH path, several architecture decisions). Grounded via a read-only Explore pass + live read-only SSH checks, then a Plan agent synthesized a concrete plan, spot-verified against the real source before execution. User confirmed 3 architecture decisions: existing local SSH access, same-origin `/jd-api/*` path routing (not a subdomain), and a separate Docker image for the JD API + Python (chat-app container untouched). New `Dockerfile.jd-api`, `docker-compose.prod.yml` `jd-api` service (bind-mounted state dirs, no host port), `Caddyfile` path routing, `trust proxy` fix in `jd_api_server.js`, `/jd-api` build-time base in `jdApi.js`. Fresh production secrets generated on the VPS itself (not copied from local dev — asked and confirmed with the user first). **Real bug hit and fixed live:** Caddy's single-file bind mount kept serving the *old* Caddyfile after `tar -x` replaced it on the host (inode swap) — `caddy reload` silently no-op'd; fixed via `docker compose up -d --force-recreate caddy`. Verified via curl + a real Playwright pass against the live domain (zero console errors, real `/jd-api` calls succeeding), Python venv confirmed working inside the container, trading-dashboard neighbor on :5000 confirmed untouched throughout. `JDPORTALVPSDEPLOY_30JUL2026.md`, commits `fcb99b8` + `a599d44`. User completed real production enrollment same day and confirmed the live `/portal` looks good.

**Follow-up, same day:** user asked directly whether portal profile edits reach the main chat page or need a restart. Checked rather than assumed — found the `app` compose service had no volume for `src/data/` (only `jd-api` did), so the earlier same-day staleness fix (`6981181`) was silently reading a frozen build-time copy in *production* despite working correctly in local dev. Fixed by adding the same bind mount to `app` (commit `1cd1efb`). Verified with a real LLM round-trip: planted a marker string in the live profile with no restart, the chat's next answer echoed it back, then cleanly restored (checksum matches the pre-edit original exactly).

## Known open items (carried to tomorrow)

- Dynamic width — done, see above. Portal Docker/VPS deploy — done, see above. `PortalEnroll` hardening — done, see above.
- LinkedIn automation — scoped, decision needed on the discovery-path blocker (manual-paste / email-alert-parsing / licensed third-party API / accept scraping risk) before any build.
- VPS firewall (`ufw`) posture was not audited during the deploy — flagged, not urgent.
- The pre-existing `app` service's `3000:3000` host port publish (despite its comment claiming Caddy-only) is a latent, out-of-scope observation from the deploy — worth a deliberate yes/no decision.
- `JD_RUN_TIMEOUT_MS=900000` on the VPS is the repo's own example default, not VPS-tuned (2 vCPU/4GB box) — watch real run times on the next live JD run and adjust if needed.

## Working-tree note

`src/data/jd/JD_DBS_IT_SVP_HeadOfTechnology_OpsRisk.json` remains untracked, consistent with established practice of never touching the user's own pending JD edits — still the only untracked file at session close. `src/data/john_profile.json` clean (0-line diff) after this session's live staleness-fix verification round-trip.
