# Todolist — 31 July 2026

## Intake (per soul.md §8.1)

Read `soul.md`, `todolist_30Jul2026.md`, `todolist_25Jul2026.md`, `todolist_23Jul2026.md`, and `status_30Jul2026.md` before starting. soul.md's operating rules re-confirmed into Claude's persistent memory (`feedback_soul_md_operating_rules`) per the user's explicit request.

## Carried over from todolist_30Jul2026.md — "Tomorrow (31 Jul 2026)" priority order (nothing skipped)

1. **LinkedIn automation — discovery-path decision needed** before any build: manual-paste / email-alert-parsing / licensed third-party API / accept-scraping-risk. See `docs/guides/LINKEDINAUTOMATION_SCOPING_30JUL2026.md`.
2. **Exercise a real JD run through the live production portal** (upload a JD, run scorecard-only or full mode, download output) — everything up to enrollment was verified 30 Jul, but a real end-user pipeline run on the VPS has not yet happened.
3. **Consider whether to regenerate the Manulife `_25JUL2026.txt` resume** now that the profile has grown further — not decided.
4. Minor flagged-not-urgent VPS items: `ufw` firewall posture never audited; `app` service's `3000:3000` host port publish (comment claims Caddy-only, worth a deliberate yes/no); `JD_RUN_TIMEOUT_MS=900000` not tuned for the VPS's 2 vCPU/4GB.
5. Dev-env docs for the JD Automation Portal — "how to run this locally" guide for a new contributor still doesn't exist.

## Already completed earlier today (31 Jul, prior session) — resume-generator docx fixes + VPS redeploy

Found via git-log intake, not yet logged in a dated status file until now. Three fixes to `scripts/jd_scorecard_resume_v2.py`, all committed and deployed live to `askcareer-ai.com`:

1. **Summary spotlight order fix** (`6ea31fd`) — Professional Summary was always spotlighting Morgan Stanley (copied from the fixed reference template) regardless of JD relevance or chronological order; added an explicit prompt rule to derive both from actual profile order and JD relevance.
2. **docx double-spacing at section boundaries** (`6ea31fd`) — `convert_text_file_to_docx()` emitted two blank paragraphs at every section boundary instead of one.
3. **Blank row between company header and date line** (`580d163`) — removed the extra gap between the bold "Company — Title" line and its date line in Professional Experience entries.
4. **Inherited 10pt paragraph spacing** (`11863a4`) — python-docx's `docDefaults` was silently adding 10pt "space after" to ~150 of 170 paragraphs per resume (every blank spacer, section title, bullet) on top of intentional spacing; zeroed `Normal` style's spacing while leaving explicit `Pt(3)`/`Pt(4)` overrides untouched.
5. **Production redeploy** (`215f3b3`) — jd-api container on `askcareer-ai.com` rebuilt and redeployed with all three fixes, verified live.

Full record: `docs/guides/JDSCORECARDRESUMEV2_SUMMARYSPOTLIGHT_DOCXSPACING_31JUL2026.md`.

## Reconciliation found at intake — uncommitted state not covered by any todolist

Two untracked files in `src/data/jd/` at session start:
- `JD_DBS_IT_SVP_HeadOfTechnology_OpsRisk.json`
- `JD_HKEX_IT_Infrastructure_CriticalService.json`

Per established practice (30 Jul intake handled the same situation by asking rather than guessing), these are flagged for the user to confirm as legitimate pipeline output before committing — not yet actioned.

## New today (31 Jul 2026) — profile achievement rewrite request, in progress

User supplied 8 draft achievement bullets (AIA budget ×1, Merrill Lynch resiliency/HA ×4, Morgan Stanley VDI/Citrix ×3) to be rewritten as a top-0.1%-recruiter-quality pass reflecting the most relevant JD-matching keywords sourced from `data_raw/jd/txt/*.txt`, then appended into `src/data/john_profile.json`. Scope questions asked before implementing (JD source, overlap handling for Morgan Stanley and Merrill Lynch, target schema location).

**Done and verified 31 Jul 2026:** backed up to `src/data/john_profile.json.20260731_V1.bak` first; keyword source = general ATS common-denominator across all 20 `data_raw/jd/txt/` files; found and cross-checked overlaps against existing profile content before writing (3 Morgan Stanley drafts merged/enriched into existing highlights per user decision; Merrill Lynch's 4 drafts replaced one existing thin line with short ATS-optimized sentences per user decision; AIA budget line was genuinely new, added alongside existing content). Added to both `major_achievements` (4 new cards) and `professional_experience.highlights` (both fields, per user decision). JSON re-verified valid after every edit. Full record: `docs/guides/JOHNPROFILEACHIEVEMENTREWRITE_31JUL2026.md`.

**Follow-up, same day — user manually edited the file further** (consolidated the 4 Merrill Lynch lines into 2, reordered 2 Morgan Stanley lines) and asked for a format check. Found and fixed: 5 non-breaking hyphens (U+2011) in the manually-typed Merrill Lynch lines, normalized to plain ASCII hyphens for ATS safety (wording unchanged). JSON re-verified valid, structure counts unchanged (58 achievements, 7 companies).

**Committed (`a729ad0`) and pushed to `origin/main`** — bundled with the two pipeline-generated JD blueprint files (DBS, HKEX) found untracked at session intake, confirmed valid and legitimate before including.

**Deployed live to `askcareer-ai.com` (VPS `152.42.214.111`)**, same day: VPS's existing `src/data/john_profile.json` backed up first (`john_profile.json.20260731_pre_deploy.bak`) per soul.md golden rule, then the new file `scp`'d over (bind-mounted into both `app` and `jd-api` containers per the 30 Jul deploy architecture — no image rebuild or container restart required). Verified: sha256 checksum identical between local and VPS copy; `docker exec` into both `app` and `jd-api` confirmed the new content (`"APAC Infrastructure Budget Ownership"`) is visible inside each running container's filesystem view; live domain checks `https://www.askcareer-ai.com/` and `https://www.askcareer-ai.com/jd-api/api/health` both return 200.

## Priority order for today

1. Resolve the two untracked JD blueprint files (confirm commit-worthy or discard).
2. Profile achievement rewrite + append (today's new request) — pending scope answers.
3. LinkedIn automation discovery-path decision.
4. Real JD run through the live production portal.
5. Manulife resume regeneration decision.
6. Minor VPS hardening items.
7. Dev-env docs for the JD Automation Portal.
