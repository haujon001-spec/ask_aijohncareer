# Todolist — 5 August 2026

## Intake (per soul.md §8.1)

Read `soul.md`, `todolist_03Aug2026.md`, `todolist_31Jul2026.md`, `todolist_30Jul2026.md` before
starting. (This entry was originally appended into `todolist_03Aug2026.md` at the user's literal
instruction, then moved into this new dated file on the user's follow-up decision to keep one
file per session date.)

**Reconciliation at intake:** working tree has uncommitted state not covered by any todolist — a
160-line diff to `src/data/jd/JD_Manulife_AVP_Technology_Architecture_and_Operations.json` (looks
like a `--refresh-blueprint` re-run) and a new untracked
`src/data/jd/JD_TradeBeyond_IT_HeadOfInfrastructure.json`. Flagged to the user, not actioned.

**Carried over from `todolist_03Aug2026.md`, still open:**
1. Live-verify the DeepSeek token-retry + reasoning-effort fix with a real rerun of
   `JD_Invesco_IT_AssociateDirector.txt --refresh-blueprint --llm=deepseek`.
2. Decide whether to `git push` the two local commits (`eab9dfa`, `7630a2a`) to `origin/main`.
3. Items 2–8 carried from `todolist_31Jul2026.md` (untracked JD blueprints, LinkedIn automation
   discovery-path decision, real portal JD run, Manulife resume regen decision, VPS hardening,
   dev-env docs, Job Tracker status fields) — unchanged, none actioned today.

## New today (5 Aug 2026) — resume-generation stickiness, token-context optimization, cover-letter recommendations summary

User's request, verbatim (A–G):
- A. Follow the soul.md strict rules.
- B. Explain how `scripts/jd_scorecard_resume_v2.py` works.
- C. What is the interaction between `data_raw/resume/txt/JohnHauResume2026_MorganStanley.txt`
  and `src/data/john_profile.json`?
- D. Resume/cover-letter generation should not be limited/"sticky" to the MorganStanley `.txt`
  content — it's reference format only; generation should adaptively pull the JD-relevant facts
  from `john_profile.json` instead.
- D (second, same letter reused by user). How to optimize the run for large token context?
- E. Cover letter should summarize the LinkedIn recommendations section — 16 recommendations from
  global colleagues/clients/vendors, weighted by similarity, highlighting the top 4 recurring
  adjectives top-to-bottom.
- F. Log any new requirements into today's todolist.
- G. Ask clarifying questions before proceeding further.

### Research done (read-only — script + data inspection)

- **C — real finding, not what the question assumed:** `profile.metadata.resume_source` naming
  the `.txt` file is pure lineage metadata (`readonly` in `shared/profileSchema.js`), never read
  by the pipeline at runtime. The pipeline's actual `TEMPLATE_PATH`
  (`jd_scorecard_resume_v2.py:102`, both v1 and v2) points to a **sibling `.md` file**
  (`JohnHauResume2026_MorganStanley.md`), not the `.txt`. Diffed the two: the `.md` is newer and
  already includes the algo-trading/HMM/LightGBM/multi-agent-LLM/Tavily content matching
  `profile.ai_projects`'s current 10 entries — the `.txt` doesn't have any of that. Neither file
  is git-tracked (`/data_raw/` is fully gitignored), so this `.txt`/`.md` drift has been invisible.
- **D (stickiness) — root cause found:** every other Resume section has JD-relevance selection
  logic (system rule 10: JD-relevance-first, $-value tiebreaker, for Professional Experience
  bullets). `AI & AUTOMATION HIGHLIGHTS` does not — system rule 6 just says populate it "from the
  profile/template **only**," with no JD-relevance filter, explicitly licensing the LLM to lean on
  the `.md` template's fixed example list regardless of what the JD actually needs.
- **D (token context) — current state:** `build_profile_context()` sends the same ~70-80K char
  profile JSON on all 4 sequential calls in a `--refresh-blueprint` run (Blueprint, Scorecard,
  Resume, Cover Letter) — not a hard limit for Sonnet/Gemini (1M context) but repeated, uncached
  cost/latency on every call. DeepSeek's `reasoning_effort=low` fix (3 Aug session) addressed the
  dominant slowness cause; large repeated context is a smaller, separate cost layered on top.
- **E — grounded in actual data**, not assumed: `profile.linkedin_recommendations` has exactly 16
  entries. Relationship tags: 1 explicit `"Client/Stakeholder"` (Sheeba Khadeer), 1 explicit
  `"Vendor/Client relationship"` (Jos Dikhoff/LoginVSI), the other 14 are Colleague/Direct
  report/Mentor/Team Member (Morgan Stanley, JPMorgan, KPMG, AWS, VMware, Citrix Community) — not
  an even three-way colleague/client/vendor split. Did a real word/theme-frequency pass across all
  16 full recommendation texts (not fabricated): most-repeated distinctive traits, excluding
  near-universal "technical/leadership" language, were roughly Collaborative/communicator (~5/16),
  Client-focused (4/16), Detail-oriented (4/16), Dedicated/driven (3/16).

### Decided (clarifying questions asked and answered before implementing)

1. **Stickiness fix — full fix.** Source `AI & AUTOMATION HIGHLIGHTS` strictly from
   `profile.ai_projects` with JD-relevance selection/ordering (same treatment as Professional
   Experience bullets); strip the `.md` template as an allowed content source from system rule 6
   — template becomes layout-only everywhere.
2. **Token-context optimization — prompt caching first.** Add cache-control markers so the
   identical `profile_context`/`jd_blueprint_context` blocks are cached across the 4 sequential
   calls in one run, rather than per-call trimming.
3. **Cover-letter recommendations summary — fixed count + JD-adaptive traits.** Count computed
   dynamically from `len(profile.linkedin_recommendations)` (never hardcoded "16"), but the LLM
   picks whichever 3-4 recurring traits are most relevant to the specific JD, not always the same
   fixed four.
4. **Todolist file — moved to this new dated file**, per soul.md's one-file-per-session-date
   convention, rather than staying appended inside `todolist_03Aug2026.md`.

### Status — done and verified same session

Backed up first per soul.md golden rule: `scripts/jd_scorecard_resume_v2.py.20260805_V1.bak`.
All three items implemented and live-verified end-to-end (soul.md §3.1) against a real JD
(`JD_Astri_ChiefDirector_AIPlatform_Solutions.txt`) with real `anthropic/claude-sonnet-5` calls —
no mocks. Full record: `docs/guides/JDSCORECARDRESUMEV2_STICKINESSPROMPTCACHINGRECOMMENDATIONS_05AUG2026.md`.

**Real bug caught during verification, not just claimed working:** the first caching
implementation showed zero cache hits — Anthropic's prefix cache requires the entire request
prefix byte-identical up to the breakpoint, *including the system message*, and Scorecard/
Resume/Cover Letter each had a different system prompt. Fixed by unifying all three onto one
shared, generic system prompt and moving each call's task rules into its own user-turn content
(after the cache breakpoint). Re-verified live: all 3 calls in a full pipeline run then showed
genuine cache reads (37,850 tokens each, 0 written).

Not committed to git yet — awaiting user go-ahead.

## New today (5 Aug 2026, later) — TradeBeyond docx comparison: company-coverage gap, resume recommendations, opening style

**Concurrent-session context found at this point:** while the caching/stickiness/recommendations
work above was in progress, a separate session (not this conversation) ran a full pipeline for a
new JD, `JD_TradeBeyond_IT_HeadOfInfrastructure`, and manually post-edited the resume and cover
letter (saved as `_M.docx` siblings alongside the script-generated `.docx` files). It also rewrote
`profile.ai_projects` with a richer schema (backed up first as `john_profile.json.20260805_V1.bak`,
consistent with soul.md discipline) and left two stray `.docx` files in the project root — flagged,
left untouched per user decision (not this session's to manage).

User asked (A–G, verbatim in spirit): compare the script-generated vs `_M`-manually-edited
TradeBeyond resume/cover letter; verify the "16 recommendations" section in both; check the
Merrill Lynch "Individual Special Achievement Award" leadership-foundation framing; fix the
company order/coverage (must flow AIA → Bank of America → Edge → Morgan Stanley → Merrill Lynch,
no skipping); replace the cover letter's "why this role" opening with a direct declarative
"Across [companies], I have led/stabilized/delivered..." opening; identify which files need
changing; ask clarifying questions before logging.

### Findings (extracted and diffed all 4 real .docx files via python-docx, not assumed)

- **Real bug found:** the script-generated cover letter's narrative **skips Edge Technology Group
  entirely** — Para 2 covers AIA + Bank of America, Para 3 jumps straight to Morgan Stanley. The
  Resume doesn't have this problem (its `PROFESSIONAL EXPERIENCE` section is fixed-format, already
  lists all 5 companies correctly) — the gap is specific to the Cover Letter's theme-organized
  paragraph plan, which has no rule requiring every company to be covered.
- **Notable: even the user's own `_M` cover letter still drops Edge Technology Group** — so the
  fix needs to be a new rule, not just imitating the `_M` example's paragraph structure.
- The `_M` resume and `_M` cover letter both add a "16 written recommendations" sentence — the
  cover letter's is new scope I'd already built earlier today (this run predates that fix); the
  **resume's is new scope** (not built anywhere yet).
- The `_M` five recommendation qualities (client-focused, innovative, detail-minded, strong
  technical leader, excellent communicator) don't match this session's keyword-frequency count
  (collaborative/communicator 7×, trusted/knowledgeable 5×, client-focused 4×, detail-oriented 4×,
  dedicated 3×, innovative only 2×) — a holistic human read vs. a keyword count, and fixed-five vs.
  today's already-approved JD-adaptive design.
- `_M` resume says "25+ years" (current rule 12/9 forbids any near-exact years figure); `_M` letter
  says "9.5 years at Merrill Lynch" (actual span ~9 years 3 months) — both flagged as precision
  items, not blocking.

### Decided (clarifying questions asked and answered before implementing)

1. **Company order — strict reverse-chronological everywhere**, including the cover letter's new
   declarative opening line: AIA, Bank of America, Edge Technology Group, Morgan Stanley, Merrill
   Lynch — matching `profile.professional_experience`'s actual array order.
2. **Recommendation themes stay JD-adaptive from real computed counts** (today's already-approved
   design) — not switched to the `_M` version's fixed five.
3. **Add the recommendations-summary sentence to the Resume's Professional Summary too**, not just
   the Cover Letter.
4. **Years wording — allow rounded approximate figures** (e.g. "25+ years") where it strengthens
   positioning, but never the exact computed figure or a precise decimal duration for a single
   role; fix "9.5 years"-style claims to a rounded phrase like "nearly a decade" instead.

### Files to change

Only `scripts/jd_scorecard_resume_v2.py` — no `john_profile.json` changes needed, every fact
involved already exists there; this is a prompt/instruction fix, not a missing-data problem.

### Status — done and verified same session

Backed up first: `scripts/jd_scorecard_resume_v2.py.20260805_V2.bak`. All four decisions
implemented and live-verified against the exact TradeBeyond JD used in the comparison, real
`anthropic/claude-sonnet-5` calls, no mocks. Full record appended to
`docs/guides/JDSCORECARDRESUMEV2_STICKINESSPROMPTCACHINGRECOMMENDATIONS_05AUG2026.md` ("Round 2").

Regenerated Resume: Professional Summary opens with companies in correct reverse-chronological
order and includes the recommendations sentence with correct dynamic count (16) and top-ranked
themes. Regenerated Cover Letter: opens with the exact declarative style requested, covers all 7
`professional_experience` entries (not just the 5 major ones) with no company dropped, and the
Merrill Lynch "leadership foundation" paragraph correctly says "nearly a decade" instead of the
imprecise "9.5 years." Regex-checked: no stray exact/decimal years figures in either output;
bold-markup balanced in the cover letter.

**Committed (`061137a`), pushed to `origin/main`** (along with 3 previously-unpushed 3 Aug commits,
`1d0a355..061137a`), scoped precisely to `scripts/jd_scorecard_resume_v2.py` + this session's own
docs — the concurrent session's `john_profile.json`/JD blueprint changes deliberately excluded.

**Deployed to production** (`askcareer-ai.com`): `jd-api` image rebuilt and container recreated
(VPS copy backed up first, `sha256sum` verified matching, fix markers confirmed present inside the
running container); `app`/`caddy` container IDs unchanged throughout. Live checks all 200: `/`,
`/jd-api/api/health`, `/portal`. Full record in the guide's new "Committed, pushed, and deployed"
section.

**Still open:** a real end-user pipeline run through the live production portal (not just local
`--llm=sonnet` verification runs) to confirm today's fixes behave the same way through the deployed
UI.

## Priority order for today

1. ~~Implement the AI & Automation Highlights JD-relevance fix~~ — **done, verified live.**
2. ~~Implement prompt caching for the 4 sequential LLM calls~~ — **done, verified live** (after
   fixing the system-prompt cache-key bug found during verification).
3. ~~Implement the cover-letter recommendations summary~~ — **done, verified live.**
4. ~~Verify all three end-to-end with a real pipeline run~~ — **done**, see guide.
5. ~~Write/update the dated guide under `docs/guides/`~~ — **done.**
6. ~~Implement the TradeBeyond-comparison rework (company coverage, resume recommendations,
   opening style, years wording)~~ — **done, verified live.**
7. ~~Commit today's `jd_scorecard_resume_v2.py` changes and push to GitHub~~ — **done (`061137a`),
   pushed along with the 3 Aug commits.**
8. ~~Deploy to production VPS~~ — **done, verified live (`/`, `/jd-api/api/health`, `/portal` all
   200).**
9. **Tomorrow:** a real end-user pipeline run through the live production portal to confirm
   today's fixes work end-to-end through the deployed UI (not just local CLI runs).
10. Carry-forward items from `todolist_03Aug2026.md` (live-verify DeepSeek fix, and the older 31
    Jul backlog: LinkedIn automation discovery-path decision, Manulife resume regen decision, VPS
    hardening, dev-env docs, Job Tracker status fields) — not picked up this session.
11. Reconcile the concurrent session's work whenever convenient: uncommitted `john_profile.json`
    ai_projects rewrite, `JD_Manulife_...json` diff, new `JD_TradeBeyond_...json` /
    `JD_TransmericaLifeBermuda_...json` blueprints, and two stray root-level `.docx` files — none
    of this touched or committed this session, per user decision.

## New today (6 Aug 2026) — john_profile.json JSON syntax bug (portal pipeline crash)

**Bug report (verbatim, via portal screenshot):** running the JD pipeline from the portal
(`JD_StarbucksAsiaPacific_Technology_Director_Corporate_digital.txt`, DeepSeek, mode=All) failed
immediately with `json.decoder.JSONDecodeError: Expecting ',' delimiter: line 896 column 5 (char
62091)` at `jd_scorecard_resume_v2.py:564` (`profile_raw = json.loads(PROFILE_PATH.read_text(...))`
). User asked (A–C): follow soul.md strict rules; log the fix here; ask clarifying questions before
proceeding.

**Root cause:** the uncommitted `john_profile.json` `ai_projects` rewrite carried over from item 11
above (concurrent session, 5 Aug) left the `Edge Technology Group` → `Centralized Services Manager`
highlights array with a missing comma between two relocated bullet strings (line 895/896), plus
tab-indentation (vs. the file's 2-space-equivalent/10-space convention) on 6 lines total: the
2 lines at the break point, and 4 more in the AIA `Associate Director, Infrastructure Services`
highlights (`Managed HKD 28M...`, `Delivered Windows 11...`, `Led 1,700-user relocation...`,
`Strengthened patch compliance...`). Confirmed via a scratch-copy JSON validation pass that this
was the file's *only* syntax error — fixing it made the full 1491-line file parse cleanly.

**Clarifying questions asked and answered before implementing:**
1. Scope, given item 11 flagged this file as "not this session's to manage" — **user chose full
   reconciliation now** (not just the minimal comma fix), since it's actively breaking the portal.
2. Tab-indented lines — **user chose normalize to spaces**, matching the file's existing style.
3. Backup — **user chose a new dated backup** even though a `20260805_V1.bak` already exists from
   the concurrent session.

**Full reconciliation performed:**
- Backed up first: `src/data/john_profile.json.20260806_V1.bak`.
- Fixed the missing comma (line 895) and normalized all 6 tab-indented lines to the file's
  standard indentation; stripped trailing whitespace. Re-validated: `python -c "json.load(...)"`
  now succeeds; zero tabs or trailing whitespace remain in the file.
- Reviewed the rest of the concurrent session's `ai_projects` rewrite for compatibility with
  `jd_scorecard_resume_v2.py`: the new richer per-project schema (`id`, `repo`, `resume_bullet`,
  `key_features`, `transferable_skills`, `project_name`, `repo_visibility`, `github_url`) is
  structurally safe — `build_profile_context()` (script line ~573-582) JSON-dumps `ai_projects`
  wholesale into the LLM prompt regardless of field names, so extra fields are just more context,
  not a schema mismatch.
- **Finding, not fixed (flagging only):** the concurrent session also added a new top-level
  `profile.ai_automation_highlights` block (precomputed bullets, positioning statement, reference
  links) that is **not** in `build_profile_context()`'s explicit section whitelist
  (`jd_scorecard_resume_v2.py:575-579`) — it is currently inert, never read by the pipeline. Left
  untouched pending user decision on whether it should be wired in or was scaffolding for later.

**Verification (soul.md §3.1 — executed, not just edited):** ran the exact crash-point code
(`json.loads(PROFILE_PATH.read_text(...))` → `profile.get("profile", profile_raw)`) directly
against the fixed file: succeeds, 14 profile keys, 7 `ai_projects` entries. Did not run a full
live LLM pipeline pass (would incur real API cost) — that is covered by the pre-existing "Tomorrow"
item 9 above (real end-user portal run) and can validate this fix as part of that same pass.

**Status:** fix applied and locally verified at the code level; not yet committed (git-status still
shows `john_profile.json` as modified — this session's fix plus the concurrent session's rewrite
are now combined in the working tree, same as item 11 already described); not yet re-run through
the portal UI.

**User re-ran the portal live** through `New JD Run` → `JD Run` → `Reports` for the same
`JD_StarbucksAsiaPacific_Technology_Director_Corporate_digital.txt` — succeeded end-to-end (74/100
GOOD MATCH, Scorecard + Resume + Cover Letter all generated). Confirms the fix above resolves the
crash live, through the real UI, not just the local code-path check.

## New today (6 Aug 2026, later) — cover-letter tightening + Reports copy-to-clipboard

User reviewed the live cover letter output and asked (A–C, verbatim in spirit):
1. Add copy-to-clipboard on the Reports view's Strengths and Gaps sections.
2. Cover letter opening line only names 4 latest companies (quote was truncated by the screenshot
   crop at "...Merrill Lynch"); remove the 5th/6th company info from it.
3. Remove anything from the oldest company (Alco Plastic Products Ltd) from the cover letter.
4. Move the "16 LinkedIn recommendations..." sentence to be the top of the second paragraph.
5. Trim to the top 2-3 JD/ATS-relevant achievements — letter reads too long for a hiring manager.

**Clarifying questions asked and answered before implementing** (the original ask was ambiguous:
"4 latest" vs. an explicit 5-company quote; scope — one-off vs. permanent script rule; whether
Siemens H.K. Ltd. — paired with Alco in the same sentence — also goes):
1. **Scope — permanent script rule change**, not a one-off edit to this one output. User's own
   words: Siemens/Alco "reflect my early days in IT which are irrelevant for senior roles that I
   am applying to" — a general principle, applies to every future JD's cover letter.
2. **Company count — the 5 most recent** (AIA, Bank of America, Edge Technology Group, Morgan
   Stanley, Merrill Lynch), not 4 — corrects the screenshot-truncated original ask.
3. **Remove both Siemens H.K. Ltd. and Alco Plastic Products Ltd** (the 2 oldest of the profile's 7
   `professional_experience` entries, 1995-1998, pre-dating the senior IT career) — confirmed via
   `profile.professional_experience`: entries are already in reverse-chronological array order, so
   this is "keep the first 5 array entries, drop the last 2" — no hardcoded company names needed in
   the rule itself beyond the explanatory example.
4. **Copy button — per-section** (separate button on Strengths and on Gaps), not one whole-card
   button.

**Implementation — cover letter (`scripts/jd_scorecard_resume_v2.py`):**
- Backed up first: `scripts/jd_scorecard_resume_v2.py.20260806_V1.bak`.
- Rewrote `COVERLETTER_TASK_RULES` rule 3's paragraph plan (previously 5-6 paragraphs covering ALL
  7 `professional_experience` entries, no company ever dropped — the 5 Aug decision): now 5 tight
  paragraphs covering only the 5 most recent entries (skip beyond the 5th — early-career/entry-level
  roles not relevant to senior leadership targets); Para 2 is now the recommendations-summary
  sentence on its own as a short standalone paragraph (previously buried mid-paragraph); Para 3 is
  the letter's substantive core (2-3 strongest JD-relevant, ATS-quantified achievements); Para 4
  covers the remaining companies briefly (continuity/keyword coverage, one sentence each); Para 5
  combines innovation/differentiators with the closing to keep the letter tight. Updated rule 12
  (recommendations block) and the `Structure`/`Key themes` instruction text to match. **This
  formally supersedes the 5 Aug "cover all 7, no company dropped" decision for cover letters only**
  — the Resume section is unaffected (it already only lists the 5 major companies in its main
  section, with Siemens/Alco compressed into a separate "Earlier Roles" line — confirmed by
  inspection, not assumed).
- **Verified live**: re-ran `python scripts/jd_scorecard_resume_v2.py
  "data_raw/jd/txt/JD_StarbucksAsiaPacific_Technology_Director_Corporate_digital.txt" --llm=sonnet
  --coverletter-only` (real `anthropic/claude-sonnet-5` call via OpenRouter, no mocks). Result:
  opening line now names exactly 5 companies (AIA → Bank of America → Edge Technology Group →
  Morgan Stanley → Merrill Lynch); Siemens/Alco fully absent from the whole letter; the "16
  LinkedIn recommendations" sentence is now its own standalone Para 2, immediately after the
  opening; letter is 5 paragraphs instead of 6, noticeably tighter (22 lines vs. the prior 25).
  **Not fully resolved:** Para 3 still stacks several quantified metrics across 3 companies rather
  than a strict 2-3-achievements-total count — flagged to the user as an open nuance rather than
  guessed further; may need a follow-up tightening pass depending on their read of the live output.
  Output written to
  `data_processed/StarbucksAsiaPacific/CoverLetter/{txt,docx}/...06AUG2026.*` (overwrote today's
  earlier portal-generated version — pre-existing behavior, not new).

**Implementation — Reports view copy buttons (frontend):**
- Backed up first: `src/components/JDPortal/JDReportsStep.jsx.20260806_V1.bak` and
  `JDPortal.css.20260806_V1.bak`.
- Added a `handleCopy()` helper (Clipboard API with a `document.execCommand('copy')` fallback for
  non-secure contexts) and a `copiedKey` state for a transient "Copied!" label. Added a
  `.jd-details-header` flex row with a `.jd-button-copy` button next to each of the Strengths and
  Gaps `<strong>` headings in `JDReportsStep.jsx`; matching CSS added to `JDPortal.css`.
- **Verified via build, not yet via browser**: `npm run build` succeeds cleanly from these two
  files (confirmed a pre-existing, unrelated CSS minify warning — `Unexpected "}"` — reproduces
  identically on a `git stash`d `main`, so it predates this session and isn't from this change).
  Did not launch a second local dev server to click-test in a browser, since the user already had
  `npm run dev:all` running live for their own portal-testing session and a second instance risked
  a port conflict — asked the user to visually confirm the Copy buttons in their already-running
  session instead of duplicating it.

**Status:** both changes implemented and locally verified (script: live LLM run; frontend: clean
build); neither committed yet. Cover-letter Para 3 achievement density flagged as an open question
pending user feedback on the live regenerated output.
