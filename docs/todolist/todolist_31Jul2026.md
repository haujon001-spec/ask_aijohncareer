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

## New today (31 Jul 2026) — Job Tracker status fields requested for JD Portal History section, not yet scoped

User referenced LinkedIn's own "Job tracker" UI (Saved / In Progress / Applied / Interview / Archived columns, per-job "Did you hear back? Yes/No" toggle, freeform notes) as the model, and asked for equivalent tracking to be added inside the JD Automation Portal's existing **History** tab (the `RUN HISTORY` list — HKEX, Manulife, etc. — where each JD run currently shows scorecard/resume/cover-letter output links).

Requested, verbatim:
1. Mark each entry's status — Applied (with a date), then "Did you hear back?" → Yes → Interview — with notes that can be updated.
2. This lives inside the historical section (i.e. attached to existing Run History / company entries, not a separate page).

**Scope clarified 31 Jul 2026 (questions asked, answers below) — not yet implemented:**
- Granularity: attach status fields to each individual Run History entry (not per-company) — e.g. Manulife's `Senior_Director_...Lead` run gets its own tracker, separate from `AVP_Technology_Architecture...` under the same company.
- Stage list: full LinkedIn-style pipeline — Saved / In Progress / Applied / Interview / Archived.
- Notes: single freeform editable text field per entry (like LinkedIn's "+ Add note"), not per-stage.
- Auto-fill: when a run/entry is first marked "Applied," default the Applied date to that run's existing run date (e.g. 30JUL2026), but leave it user-editable; all other fields are manual.

Still open before build: exact UI placement within each Run History row, and whether this needs new backend/DB fields or can be stored client-side/JSON alongside existing run metadata. Not yet built — awaiting go-ahead to implement.

## New (3 Aug 2026) — DeepSeek "out of tokens" fix on the Resume step, portal debug output

Live portal run (`JD_Invesco_IT_AssociateDirector.txt`, `--llm=deepseek`, mode=all,
`--ResumeAdjustment`) surfaced this in the "RUN JD PIPELINE" debug panel:

```
RuntimeError: OpenRouter returned empty content for 'Resume' call
(model=deepseek-reasoner, finish_reason='length', refusal=None).
```

**Root cause:** `deepseek-reasoner` bills hidden chain-of-thought against the same `max_tokens`
budget as the visible answer, so a complex JD can burn the entire 20000-token Resume budget on
reasoning alone, leaving `content: null`. Unlike the 23 Jul Sonnet-5 truncation fix (a verbosity
issue, `reasoning_tokens: 0`), a single static `max_tokens` bump isn't reliable here since
reasoning length varies per JD.

**Fixed (`scripts/jd_scorecard_resume_v2.py`, `call_llm()`):** auto-retry on
`finish_reason == "length"` — doubles `max_tokens` and retries (up to 2 extra attempts, capped at
64000; Resume's case: 20000 → 40000 → 64000) instead of failing on the first truncation. Also
fixed the error message hardcoding "OpenRouter" even when calling DeepSeek directly. Backed up
first (`jd_scorecard_resume_v2.py.20260803_V1.bak`). Verified by extracting the real edited
function and running it against mocked HTTP responses reproducing the exact failure shape
(truncate-then-succeed and truncate-exhausted scenarios both passed) — **not yet verified with a
live DeepSeek rerun of the original failing JD**, which is the next step before closing this out.
Full record: `docs/guides/JDSCORECARDRESUMEV2_DEEPSEEKTOKENRETRY_03AUG2026.md`.

## Priority order for today

1. **Live-verify the DeepSeek token-retry fix above** by rerunning the original failing JD
   (`JD_Invesco_IT_AssociateDirector.txt`, `--llm=deepseek`) through the portal or CLI.
2. Resolve the two untracked JD blueprint files (confirm commit-worthy or discard).
3. Profile achievement rewrite + append (today's new request) — pending scope answers.
4. LinkedIn automation discovery-path decision.
5. Real JD run through the live production portal.
6. Manulife resume regeneration decision.
7. Minor VPS hardening items.
8. Dev-env docs for the JD Automation Portal.
9. Job Tracker status fields in Portal History section (new today) — pending scope answers below.
