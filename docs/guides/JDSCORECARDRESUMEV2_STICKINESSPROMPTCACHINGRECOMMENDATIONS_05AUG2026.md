# jd_scorecard_resume_v2.py — AI-Highlights De-Stickiness, Prompt Caching, Cover-Letter Recommendations Summary (5 Aug 2026)

**Requested:** 5 Aug 2026, same session.

**Status: Done and verified end-to-end (soul.md §3.1) against a real JD and real LLM calls — no mocks.**

## Context

User asked (A–G, full transcript logged in `docs/todolist/todolist_05Aug2026.md`) why resume/cover-letter generation felt "sticky" to the reference template's content rather than adapting to each JD, how to interact with `john_profile.json`, how to optimize for large token context, and for a new cover-letter feature summarizing the 16 LinkedIn recommendations. Three findings and three implementations came out of it.

## Finding 1: the pipeline's real template is `.md`, not `.txt`

`TEMPLATE_PATH` (`jd_scorecard_resume_v2.py:102`, both v1 and v2) points to `data_raw/resume/txt/JohnHauResume2026_MorganStanley.md` — a sibling file to the `.txt` the user asked about, not the `.txt` itself. `profile.metadata.resume_source` naming the `.txt` is pure lineage metadata (`readonly` in `shared/profileSchema.js`), never read at runtime. Diffed the two: the `.md` is newer and already includes the algo-trading/HMM/LightGBM/multi-agent-LLM content matching `profile.ai_projects`'s 10 entries; the `.txt` doesn't. Neither is git-tracked (`/data_raw/` is gitignored). No code change needed here — informational finding only, but explains why editing the `.txt` would never have changed generation output.

## Finding 2 / Fix 1: `AI & AUTOMATION HIGHLIGHTS` had no JD-relevance filter

Every other Resume section has JD-relevance selection logic (rule 10: JD-relevance-first, $-value tiebreaker, for Professional Experience bullets). The `AI & AUTOMATION HIGHLIGHTS` section did not — the old rule 6 said populate it "from the profile/template **only**," explicitly licensing the LLM to reuse the `.md` template's fixed example list regardless of what the JD needed.

**Fixed** (`RESUME_TASK_RULES` rule 6, formerly `RESUME_SYS`): now sources this section strictly from `profile.ai_projects` (10 entries), selected/ordered for JD relevance, with the template explicitly demoted to a layout/format exemplar only — never a content source for this section.

**Verified live** against `JD_Astri_ChiefDirector_AIPlatform_Solutions.txt` (an AI-platform-heavy JD): the generated resume led with Multi-Agent LLM Orchestration and the trading platform, and pulled in three `ai_projects` entries (Semantic Memory & RAG, AI Breeds Portal, Global Market Cap Explorer) that aren't in the `.md` template's fixed list at all — direct proof the section is now drawing from the live profile data and JD-relevance-selecting, not reproducing the template.

## Finding 3 / Fix 2: prompt caching for the 4 sequential per-run LLM calls

`build_profile_context()` sends the same ~70-80K char profile JSON on every one of Blueprint/Scorecard/Resume/Cover Letter calls in a run — redundant, uncached. Added Anthropic prompt caching (via OpenRouter's `cache_control` pass-through) for the Scorecard/Resume/Cover Letter calls, which all share an identical `SHARED_CONTEXT_BLOCK` (JD text + blueprint + profile).

**Real bug caught during verification, not just claimed working:** the first implementation attempt showed zero cache hits across all 3 calls in a live run. Root cause: Anthropic's prefix cache hashes the *entire* request prefix up to the cache breakpoint — system message included — so a byte-identical `SHARED_CONTEXT_BLOCK` inside the user turn still misses if the system message differs per call (Scorecard/Resume/Cover Letter each had their own distinct system prompt). Fixed by introducing one shared, generic `SHARED_SYSTEM_PROMPT` for all three calls, and moving each call's task-specific numbered rules (formerly `SCORECARD_SYS`/`RESUME_SYS`/`COVERLETTER_SYS`) into that call's own user-turn content, positioned after the cache breakpoint.

**Verified live**, full pipeline run (Scorecard → Resume → Cover Letter) against the same Astri JD: all three calls showed `Cache — read: 37850 tokens, written: 0` — genuine cache hits, not just non-error execution. A standalone diagnostic (outside the pipeline) confirmed the underlying mechanism: an uncached ~36K-token call cost $0.0901; the identical call repeated immediately cost $0.0073 — a ~12x reduction on the cached portion. DeepSeek and Gemini are untouched (their providers cache repeated prefixes automatically; explicit `cache_control` is Anthropic-specific and only applied when `MODEL.startswith("anthropic/")`).

Also spot-checked that moving the rules out of the system message didn't degrade instruction-following: bold-figure markup (48 instances), fixed company order (AIA → Bank of America → Edge → Morgan Stanley), and bullet-count rules all still held correctly in the live-generated output.

## Fix 3: cover-letter recommendations summary (new feature, item E)

New `build_recommendations_summary()` (in the Cover Letter section) computes, in Python — not left to the LLM to eyeball from 16 raw paragraphs — a grounded digest of `profile.linkedin_recommendations`:
- Total count (dynamic, `len(recs)` — never hardcoded).
- Relationship-type mix via keyword bucketing on the `relationship` field (vendor-tagged checked before client-tagged, so e.g. Jos Dikhoff/LoginVSI's `"Vendor/Client relationship"` correctly buckets as vendor).
- Recurring-theme frequency via a curated keyword lexicon (client-focused, detail-oriented, dedicated, collaborative/communicator, innovative, result-oriented, trusted/knowledgeable), counted once per recommendation, ranked descending.

New Cover Letter rule 12 instructs the model to weave one social-proof sentence into Para 4/5 using the real count and whichever 2-3 listed themes are most relevant to *this* JD — not a fixed set every time — and never to invent counts, themes, or attribute a quote to a named recommender.

**Verified live** against the Astri JD, actual computed data (16 total; 14 colleagues/2 clients-or-vendor-tagged; ranked themes: collaborative 7/16, trusted/knowledgeable 5/16, client-focused 4/16, detail-oriented 4/16, dedicated 3/16): the generated cover letter produced *"of **16** LinkedIn recommendations, the majority highlight my collaborative communication style, technical trustworthiness, and client focus"* — correct count, and the exact top-3 ranked themes, in rank order.

## Files changed

`scripts/jd_scorecard_resume_v2.py` — backed up first per soul.md golden rule: `scripts/jd_scorecard_resume_v2.py.20260805_V1.bak`.

## Verification summary (soul.md §3.1)

- `py_compile` clean throughout.
- Live pipeline runs against `data_raw/jd/txt/JD_Astri_ChiefDirector_AIPlatform_Solutions.txt`, real `anthropic/claude-sonnet-5` calls via OpenRouter, no mocks:
  - Resume-only run: confirmed AI & Automation Highlights JD-adaptivity.
  - Cover-letter-only run: confirmed recommendations-summary sentence, correct count/themes.
  - Full run (Scorecard+Resume+Cover Letter, one process): confirmed all 3 calls cache-hit (37,850 tokens read, 0 written on each).
  - Standalone diagnostic outside the pipeline confirming the cache write→read cost delta independently of the pipeline's own logic.
- Not yet run against DeepSeek or Gemini (both explicitly excluded from the caching change; no regression expected but not live-verified this session) — carried to `docs/todolist/todolist_05Aug2026.md`.

## Known limitation, not fixed this session

The Blueprint-generation call (`generate_jd_blueprint()`) doesn't share `SHARED_CONTEXT_BLOCK` (it doesn't use `profile_context` at all) and isn't part of this caching pass — only relevant on `--refresh-blueprint` runs, and even then it's 1 of the (now 3, previously 4) calls in a run.

---

# Round 2 (same day) — Company-coverage gap, resume recommendations, declarative opening, years-wording

**Requested:** 5 Aug 2026, later same session, after comparing a concurrently-generated TradeBeyond resume/cover letter against the user's own manually-edited (`_M`) versions of both.

## Context

While the Round 1 work above was in progress, a separate session (not this conversation) ran a full pipeline for a new JD (`JD_TradeBeyond_IT_HeadOfInfrastructure`) and hand-edited the resulting resume/cover letter, saving them as `_M.docx` siblings. The user asked for a careful comparison of the script output vs. their manual edits, four specific things verified (16-recommendations section, the Merrill Lynch "leadership foundation" framing, company order/coverage, and opening-paragraph style), and clarifying questions before implementing.

## Real bug found: Cover Letter silently dropped Edge Technology Group

Diffed all 4 real `.docx` files via `python-docx` (not assumed). The script-generated cover letter's Para 2 covered AIA + Bank of America, then Para 3 jumped straight to Morgan Stanley — **Edge Technology Group never appeared**. The Resume didn't have this problem (its `PROFESSIONAL EXPERIENCE` section is fixed-format and already lists all 5 companies correctly) — the gap was specific to the Cover Letter's theme-organized paragraph plan, which had no rule requiring every company to be covered. Notably, even the user's own `_M` cover letter still dropped Edge — confirming the fix needed to be a new rule, not just imitating the `_M` example.

## Decisions (clarifying questions asked and answered before implementing)

1. Company order — strict reverse-chronological everywhere, including the new declarative opening line (matching `profile.professional_experience`'s actual array order).
2. Recommendation themes stay JD-adaptive from real computed counts (Round 1's design) — not switched to the `_M` version's fixed five, which didn't match the actual keyword-frequency count.
3. Add the recommendations-summary sentence to the Resume's Professional Summary too, not just the Cover Letter.
4. Years wording — allow rounded approximate figures (e.g. "25+ years") where natural, but never the exact computed figure or a precise decimal duration for a single role.

## Changes made (`scripts/jd_scorecard_resume_v2.py`)

Backed up first: `scripts/jd_scorecard_resume_v2.py.20260805_V2.bak`.

- **Relocated `recommendations_summary` computation** from inside the Cover-Letter-only block to top-level (right after `SHARED_SYSTEM_PROMPT`), so both Resume and Cover Letter generation can use it regardless of run order or `--resume-only`/`--coverletter-only` flags.
- **Resume**: new rule 16 (recommendations summary, JD-adaptive, same anti-fabrication constraints as Cover Letter's rule 12), wired via a new `resume_recommendations_summary_block` into `RESUME_USER_PREFIX` and an instruction line in `RESUME_USER`. Old conditional rule 16 (resume-adjustment guidance) renumbered to 17; the pre-existing stray `resume_adjustment_block` header (which referenced the wrong rule number even before today) corrected to match.
- **Resume rule 12** (years wording) softened: rounded approximate figures like "25+ years" now allowed; exact/decimal figures for a single role's tenure still forbidden.
- **Cover Letter rule 3** (paragraph structure) rewritten: 5-6 paragraphs (was 4-5), Para 1 is now a declarative opening naming ALL companies from `professional_experience` in array order ("Across [A], [B], [C]..., I have led/stabilized/delivered...") instead of a "why this role at this company" framing; explicit requirement that every company appear with a real achievement — never silently dropped; Para 4 explicitly permits the single oldest company to additionally serve as an out-of-sequence "leadership foundation" origin story (e.g. an early award) without excusing it from its normal chronological coverage.
- **Cover Letter rule 9** (years wording) softened to match the Resume's new rule 12.
- Updated the `COVERLETTER_USER` "Structure" section and the recommendations-summary placement instruction (now Para 2, matching the new paragraph count) to stay consistent with the rewritten rule 3.

## Verification (soul.md §3.1 — executed, not just written)

`py_compile` clean throughout. Live-regenerated both the Resume and Cover Letter against the exact same JD used in the comparison (`JD_TradeBeyond_IT_HeadOfInfrastructure.txt`, real `anthropic/claude-sonnet-5` calls, no mocks):

- **Resume**: Professional Summary now opens with companies in correct order (AIA, Bank of America, Edge Technology Group, Morgan Stanley, Merrill Lynch) and includes *"Colleagues and stakeholders across **16** LinkedIn recommendations consistently describe John as a collaborative, strong communicator and a trusted, knowledgeable technical expert"* — correct dynamic count, correct top-ranked themes.
- **Cover Letter**: opens with *"Across AIA International Ltd, Bank of America, Edge Technology Group, Morgan Stanley, Merrill Lynch, Siemens H.K. Ltd., and Alco Plastic Products Ltd, I have led global infrastructure teams, stabilized mission-critical environments, and delivered measurable business impact..."* — matches the user's requested style and order exactly, and covers **all 7** `professional_experience` entries (not just the 5 major ones), none dropped. Merrill Lynch's Para 4 reads *"leadership foundation was built over nearly a decade at Merrill Lynch... earning the 2006 Merrill Lynch Individual Special Achievement Award"* — correct rounded phrasing (actual tenure ~9 years 3 months), no fabrication.
- Regex check confirmed no stray "27/27.x years" or "9.5 years" style figures in either output; bold-markup (`**`) count even (balanced) in the cover letter.

## Files changed

`scripts/jd_scorecard_resume_v2.py` only — no `john_profile.json` changes needed.

## Committed, pushed, and deployed to production (5 Aug 2026)

Committed `061137a` (scoped precisely to `scripts/jd_scorecard_resume_v2.py` and this session's
own docs — deliberately excluding the concurrent session's uncommitted `john_profile.json` and JD
blueprint changes, per user decision earlier the same session). Pushed to `origin/main` along with
the 3 previously-uncommitted-to-remote Aug 3 DeepSeek-fix commits (`1d0a355..061137a`).

Deployed to production (`askcareer-ai.com`, VPS `152.42.214.111`), same procedure as the 31 Jul/3
Aug deploys (script is `COPY`'d into the `jd-api` image at build time, not bind-mounted):
1. VPS's existing copy backed up first: `scripts/jd_scorecard_resume_v2.py.20260805_pre_deploy.bak`.
2. `scp`'d the updated script to `/opt/john-career-copilot/scripts/`; `sha256sum` confirmed
   identical to the local file before rebuilding.
3. `docker compose -f docker-compose.prod.yml build jd-api` then `up -d jd-api` — only `jd-api`
   recreated (container ID `d71bfeffb98b` → `2a9d96f1d1f2`); `app` (`d44b9adeb452`) and `caddy`
   (`f746213b453a`) container IDs confirmed byte-for-byte unchanged, untouched throughout.
4. Verified inside the freshly recreated container: `sha256sum` matches the local file exactly;
   `grep` for fix markers (`SHARED_SYSTEM_PROMPT`, `build_recommendations_summary`, the AI-highlights
   de-stickiness wording) all present.
5. Live health checks against the real domain: `https://www.askcareer-ai.com/` → 200,
   `https://www.askcareer-ai.com/jd-api/api/health` → 200 (`{"status":"ok",...}`),
   `https://www.askcareer-ai.com/portal` → 200.

**Not yet done, carried forward:** a real end-user pipeline run through the live production portal
using today's fixes (all verification so far was local-machine `--llm=sonnet` runs against real JDs,
not through the deployed portal UI itself).
