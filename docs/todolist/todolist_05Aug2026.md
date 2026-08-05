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

Not committed to git yet — awaiting user go-ahead (now two rounds of changes stacked in the
working tree).

## Priority order for today

1. ~~Implement the AI & Automation Highlights JD-relevance fix~~ — **done, verified live.**
2. ~~Implement prompt caching for the 4 sequential LLM calls~~ — **done, verified live** (after
   fixing the system-prompt cache-key bug found during verification).
3. ~~Implement the cover-letter recommendations summary~~ — **done, verified live.**
4. ~~Verify all three end-to-end with a real pipeline run~~ — **done**, see guide.
5. ~~Write/update the dated guide under `docs/guides/`~~ — **done.**
6. ~~Implement the TradeBeyond-comparison rework (company coverage, resume recommendations,
   opening style, years wording)~~ — **done, verified live.**
7. Decide whether to commit today's `jd_scorecard_resume_v2.py` changes to git (both rounds).
8. Carry-forward items from `todolist_03Aug2026.md` (live-verify DeepSeek fix, git push decision
   for the 3 Aug commits, and the older 31 Jul backlog) — not picked up this session.
