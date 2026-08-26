# jd_scorecard_resume_v2.py — Cross-Section Dedup + 1-Page Cover Letter Cap (26 Aug 2026)

**Requested:** 26 Aug 2026, same-day session (resumed from the 12 Aug carried-over `/portal2` click-through, which the user confirmed complete first).

**Status: Done and verified.**

## Context

User flagged that resume output was repetitive — the same achievement showing up more than once across the Professional Summary, the dynamic relevance bridge section, and the Professional Experience bullets. Asked for the same dedup principle to apply to the cover letter, for the cover letter to be capped to one printed page, and for the cover letter to stop over-restating the employer's own business/JD back to them. A follow-up round extended the resume dedup scope to also cover the mandatory `AI & AUTOMATION HIGHLIGHTS` section, after a first verification pass found it silently restating figures already used in a Professional Experience bullet.

## Fix

Backed up first per soul.md: `scripts/jd_scorecard_resume_v2.py.20260826_V1.bak` (recovered from the pre-edit git `HEAD` copy, since the edit had already been made in-session before the backup step was caught and corrected).

### 1. Resume cross-section dedup (`RESUME_TASK_RULES`, new rule 18)
The same achievement, project, or quantified figure may not appear more than once across the Professional Summary, the relevance bridge, `AI & AUTOMATION HIGHLIGHTS`, and the Professional Experience bullets. If an achievement is already used in one of those sections, the model must pick a different bullet for the other slot rather than repeating (even reworded). `AI & AUTOMATION HIGHLIGHTS` stays mandatory and independently sourced from `profile.ai_projects` (existing rule 6) — this rule only stops the same fact reappearing a second time in Professional Experience. Reinforced with a matching bullet in the `RESUME_USER` instructions block.

### 2. Cover letter cross-paragraph dedup (`COVERLETTER_TASK_RULES`, new rule 14)
The same quantified achievement/figure may not be restated across paragraphs — specifically, Para 3's deep-dive achievements must not reappear (even reworded) in Para 4's brief per-company mentions.

### 3. Cover letter — stop restating the employer's own JD (`COVERLETTER_TASK_RULES`, new rule 15)
Never restate, paraphrase, or summarize the employer's business description, mission, or the JD's own stated requirements back to the reader anywhere in the letter — the hiring manager already knows their own company and posting; every sentence must be candidate evidence, not JD restatement. (This extends the existing Para-1-only version of this rule, previously rule 3, to the whole letter.)

### 4. Cover letter 1-page cap (`COVERLETTER_TASK_RULES`, rule 3 amended)
Prompt-only enforcement (user's explicit choice over a code-level docx page-count check): rule 3 now states the letter must fit a single printed page, targeting ~350-420 words of body text (salutation through sign-off, excluding the header block). Reinforced in the `COVERLETTER_USER` instructions block.

## Verification

Ran the real pipeline twice against the (pre-existing, untracked) Hospital Authority "Systems Manager (Technical Management)" JD (`--resume-only --force` and `--coverletter-only --force`, `PYTHONIOENCODING=utf-8`/`PYTHONUTF8=1` to work around the pre-existing Windows console-encoding issue, matching the env vars `backend/lib/pythonRunner.js` already sets when the app spawns this script).

**Cover letter** (`data_processed/HospitalAuthority/CoverLetter/txt/JohnHauCoverLetter_HospitalAuthority_IT_Manager_Systems_26AUG2026.txt`):
- Body word count (salutation → sign-off): **379 words** — within the 350-420 target, comfortably one page.
- Checked every bolded quantified figure across all 5 paragraphs for repeats: none found (Para 3's AIA/Edge/Morgan Stanley figures and Para 4's Bank of America/Merrill Lynch figures are fully disjoint).
- No sentence restates what Hospital Authority does or what the JD is asking for.

**Resume** (`data_processed/HospitalAuthority/resume/txt/JohnHauResume2026_HospitalAuthority_IT_Manager_Systems_26AUG2026.txt`):
- First pass (before the AI Highlights fix): found a real duplicate — the Bank of America ITSM automation figures (14,390 hours / 70% efficiency / 7 FTE) appeared in both `AI & AUTOMATION HIGHLIGHTS` and the Bank of America Professional Experience bullet.
- After extending rule 18 to include `AI & AUTOMATION HIGHLIGHTS` and re-running: the same figures now appear **only** in Professional Experience; the regenerated `AI & AUTOMATION HIGHLIGHTS` section (6 bullets) covers 6 distinct projects with no overlap into Professional Experience.
- Cross-checked Professional Summary, relevance bridge, and Professional Experience for any other repeated achievement/figure — none found.

## Files touched
- `scripts/jd_scorecard_resume_v2.py` (rules 18 in `RESUME_TASK_RULES`, 14–15 in `COVERLETTER_TASK_RULES`, rule 3 amendment, both `INSTRUCTIONS` blocks)
- `data_processed/HospitalAuthority/resume/{txt,docx}/JohnHauResume2026_HospitalAuthority_IT_Manager_Systems_26AUG2026.*` (regenerated, verification run)
- `data_processed/HospitalAuthority/CoverLetter/{txt,docx}/JohnHauCoverLetter_HospitalAuthority_IT_Manager_Systems_26AUG2026.*` (regenerated, verification run)
- Backup: `scripts/jd_scorecard_resume_v2.py.20260826_V1.bak`

## Production deployment (26 Aug 2026)

User asked to deploy to `askcareer-ai.com` (VPS `152.42.214.111`). Scoped explicitly to just this
fix (asked first — the alternative was also deploying the entire un-deployed `/portal2`
multi-profile epic accumulated since the last VPS deploy on 6 Aug, `ab7c31a`, which is materially
bigger and was deferred to its own session).

Followed the established scp/rebuild pattern (`docs/guides/JDSCORECARDRESUMEV2_DEEPSEEKTOKENRETRY_03AUG2026.md`
et al.), only `jd_scorecard_resume_v2.py` is affected since that's the only file this fix touched:

1. Read-only pre-check via `ssh root@www.askcareer-ai.com`: all 3 containers healthy (`app`,
   `jd-api`, `caddy`), 60G disk free, confirmed the VPS's existing script hash differs from the
   local one (expected — VPS was still on the pre-dedup version).
2. Backed up the VPS's existing copy first: `scripts/jd_scorecard_resume_v2.py.20260826_pre_deploy.bak`,
   `sha256sum`-verified matching the pre-deploy file before touching anything.
3. `scp`'d the updated script; `sha256sum` on both sides confirmed byte-identical transfer.
4. `docker compose -f docker-compose.prod.yml build jd-api` — build log confirmed the `COPY
   scripts/jd_scorecard_resume_v2.py` layer re-ran (not cached), all other layers cached as
   expected (no unrelated changes).
5. `docker compose -f docker-compose.prod.yml up -d jd-api` — recreated only the `jd-api`
   container; `app` and `caddy` were never touched (confirmed via unchanged `docker ps` uptime:
   `app` 2 weeks, `caddy` 3 weeks, both untouched throughout).

**Verified live, not just assumed deployed:**
- `jd-api` container: `Up ... (healthy)`.
- Public health check through the real domain: `https://www.askcareer-ai.com/jd-api/api/health` →
  `200 {"status":"ok",...}`.
- Confirmed the actual fix is in the running container (not just the image build log): `docker exec
  ... grep -c` for the `CROSS-SECTION DEDUPLICATION` / `CROSS-PARAGRAPH DEDUPLICATION` rule
  markers inside `/app/scripts/jd_scorecard_resume_v2.py` → 2 matches, as expected.
- Confirmed the untouched services stayed untouched and the site still serves: main app
  `https://www.askcareer-ai.com/` → 200, `https://www.askcareer-ai.com/portal` → 200.

Did not attempt a live authenticated portal run through production (no portal password available
to this session, same limitation noted in the 30 Jul/6 Aug deploy guides) — confidence instead
comes from the two local `--force` pipeline runs already verified above (real LLM calls, same
script) plus the byte-identical-transfer + in-container-content verification here.

## Note

`src/data/jd/JD_HospitalAuthority_IT_Manager_Systems.json` (the JD blueprint used for this verification run) was already sitting untracked in the working tree from 12 Aug, unrelated to this feature — still an open item, not resolved here (see `docs/todolist/todolist_26Aug2026.md`).
