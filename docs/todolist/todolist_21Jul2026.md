# Todolist — 21 July 2026

## Carried over from todolist_20Jul2026.md

- **askcareer-ai.com VPS deployment — CLOSED 21 Jul 2026.** Live at https://www.askcareer-ai.com. See `docs/guides/VPSDEPLOYMENT_ASKCAREERAI_21JUL2026.md` for full verification record.
- JD Automation Portal Phase 1 (backend API) — done, not yet wired to any frontend.
- Remaining JD Automation Portal phases (3-7: NLP module, integration, Docker, dev env docs, deploy) — still outstanding, unaffected by today's changes except where noted below.
- LinkedIn job-search automation scoping — not started, still outstanding.

## New today (21 Jul 2026)

### 1. JD Automation Portal — Phase 2 — DONE 21 Jul 2026

**Decision (user, 21 Jul 2026):** `build_frontend_portal` will **not** be a separate/standalone portal route. It will be integrated into the existing **John's Career Copilot** React app (this repo's live `src/` app) as additional tabs or pages alongside the existing chat experience — same app, same deploy, same domain (`askcareer-ai.com`).

- [x] Merged `dev` branch (Phase 1 backend API, commit `86b76d9`) into `main` — it had never been merged; `main`'s `backend/` was missing `jd_api_server.js` and support files entirely until now. Clean merge, no conflicts.
- [x] Design nav/tab structure: tabs within `src/App.jsx` (Chat / JD Portal), no router, matching existing conditional-render conventions (user decision).
- [x] Scope decision: build UI only for the working endpoints (upload, run, history, download); `POST /api/profile/update` stays an unwired, visibly-disabled "coming soon" button pending Phase 3 NLP work (user decision).
- [x] Deleted a typo'd duplicate untracked file, `src/data/jd/JD_ZurichInsurancel_IT_HeadOfData_AI.json` (extra "l"), before starting (user decision).
- [x] New files: `src/utils/jdApi.js`, `src/components/TabBar.jsx/.css`, `src/components/JDPortal/{JDPortal,JDUploadForm,JDRunPanel,JDHistoryList}.jsx` + `.css`.
- [x] Modified: `src/App.jsx` (tab wiring), `src/App.css` (`.app` sizing fix so it correctly shares vertical space with the new tab bar), `package.json` (`dev:all` now also runs `dev:jd-api`), `.env.example` (documented `VITE_JD_API_BASE`).
- [x] Verified end-to-end: API-level `curl` smoke test (upload/409/run/download/history) confirming exact response shapes, plus a full browser-driven Playwright pass (upload → run → results → history → back to Chat with no regressions) — zero console errors, dark mode and mobile viewport both confirmed. Smoke-test data cleaned up afterward.
- [x] Wrote dated guide: `docs/guides/JDPORTALPHASE2_21JUL2026.md`.

### 2. New requirement — `jd_scorecard_resume_v2.py`

New script, created alongside (not replacing) `scripts/jd_scorecard_resume.py`, per soul.md's golden-rule (branch a new dated/versioned script rather than editing the proven one in place).

**Source comparison performed** (read-only, via python-docx dump of paragraph/run structure) — user's manual `_V2.docx` edits vs. the script's original output, for the McDonalds/IT_HeadOfInfrastructure case:
- `data_processed/McDonalds/resume/docx/JohnHauResume2026_..._20JUL2026.docx` vs `..._V2.docx`
- `data_processed/McDonalds/CoverLetter/docx/JohnHauCoverLetter_..._20JUL2026.docx` vs `..._V2.docx`

**Confirmed diff findings:**
- Resume title changed from `TAILORED RESUME — MCDONALDS | IT_HEADOFINFRASTRUCTURE` → `MCDONALDS | IT_HEADOFINFRASTRUCTURE` (prefix dropped). Cover letter title (`COVER LETTER — ...`) was **not** changed by the user's manual edit.
- `Generated : ... | Model: ...` and `Profile : src/data/john_profile.json` lines removed entirely from both resume and cover letter.
- Extra blank lines trimmed throughout (tighter spacing between contact block, section headers, and body).
- Professional Summary paragraph restructured into shorter paragraphs (content reordered slightly) — a one-off manual polish, not treated as a generalizable rule.
- "27+ years" → "extensive" wording change was already present in the resume V2 (professional summary), but **not yet applied** in the cover letter V2 (still reads "delivered for 27 years") — this is a forward-looking request, not something to reverse-engineer from the diff.
- **No bold formatting was manually added** to any achievement bullet/number in either V2 document — confirmed via run-level dump (only section headers are bold in both original and V2). The "bold SMART achievements" requirement is a **new feature to build**, not an existing pattern to copy.

**Requested behavior for v2 (resume):**
- a. (Reference above) compare original vs V2 — done, findings above.
- b. Remove the "TAILORED RESUME —" wording from the resume title.
- c. Remove unnecessary blank lines (tighter spacing, matching V2's density).
- d. Remove the `Generated :` and `Profile :` lines from resume output entirely.
- e. Achievement bullets should be SMART (Specific, Measurable, Achievable, Relevant, Time-bound) with key numbers/major achievements bolded.

**Requested behavior for v2 (cover letter):**
- a/b. Compare original vs V2 — done, findings above.
- c. Remove unnecessary extra lines, `Generated`, `Profile` lines; bold SMART achievements for easier reading.
- d. Don't bold/highlight "27 years" — reword to "extensive years" instead.

**Technical approach proposed (pending user confirmation — see questions below):**
- Header/line removal (b, d for resume; Generated/Profile for cover letter) is a straightforward edit to the plain-text assembly in the script (`f"TAILORED RESUME — ..."` etc. at the point the `.txt` output is composed, ~line 869-888 of `jd_scorecard_resume.py`).
- Blank-line tightening: adjust the text→docx conversion pass (`add_docx_text_block`, line 439) to collapse consecutive blank lines and drop the blank line immediately following a section header.
- Bold SMART achievements: the resume/cover-letter body is LLM-generated free text, not structured JSON — proposed approach is to have the v2 LLM prompt instruct the model to (i) write achievement bullets in SMART form and (ii) wrap the key metric/achievement phrase in `**double asterisks**`, then extend `add_docx_text_block` to split on `**...**` and render those spans as bold runs (reusing the existing plain-text pipeline rather than a new structured format).
- "27 years" → "extensive years" wording: a text substitution/prompt instruction — scope (resume only / cover letter only / both) needs confirmation, see questions.
- Scorecard generation and output format are unaffected — none of the above changes apply to `ScoreCard/`.

## Decisions (user, 21 Jul 2026)

1. **"27 years" → "extensive years" wording:** applies to **both** resume and cover letter.
2. **Bold-achievement mechanism:** LLM writes SMART-form bullets and wraps the key metric/achievement phrase in `**double asterisks**`; the text→docx converter renders those spans as bold runs.
3. **Master template update:** update `data_raw/resume/txt/JohnHauResume2026_MorganStanley.md` too, so the new tighter/cleaner format is the template baseline going forward (not just a v2 post-processing patch).
4. **Backfill scope:** v2 applies to future runs only — existing `data_processed/` outputs (including the manual `_V2.docx` edits) are left untouched.
5. JD Portal tab-vs-page layout (item 1) — not yet decided, to be settled when Phase 2 implementation actually starts (not blocking the v2 script work).

## `jd_scorecard_resume_v2.py` — DONE 21 Jul 2026

- [x] Created `scripts/jd_scorecard_resume_v2.py` (v1 untouched, per soul.md golden-rule)
- [x] Updated master template `data_raw/resume/txt/JohnHauResume2026_MorganStanley.md` with bold-markup example bullets (backed up first: `.20260721_V1.bak`)
- [x] Executed end-to-end against the real McDonalds JD (`--resume-only` and `--coverletter-only`, `--llm=gemini`) — not just written, per soul.md §3.1
- [x] Found and fixed two real bugs during verification: bullet-prefix stripping was eating the bold-open marker; added a safety net for genuinely unbalanced `**` markup from the LLM
- [x] Verified via python-docx dump of the real output: no "TAILORED RESUME —" prefix, no Generated/Profile lines, no "27 years" wording, bold runs render correctly, no stray asterisks, tightened spacing
- [x] Wrote dated guide: `docs/guides/JDSCORECARDRESUMEV2_21JUL2026.md`

**Verification artifacts** (left in place, not deleted): `data_processed/McDonalds/resume/{txt,docx}/..._21JUL2026.*` and `data_processed/McDonalds/CoverLetter/{txt,docx}/..._21JUL2026.*` — real v2 output, doesn't collide with the existing 20 Jul files or the user's manual `_V2.docx` edits.

## GitHub sync — DONE 21 Jul 2026

- [x] Pushed local commits to `origin/main` (`3c946c7` VPS deploy fix, `536c5c3` v2 script) — user requested "Update GitHub now."

## v2 refinement round 2 — DONE 21 Jul 2026

User reviewed real v2 output (Zurich Insurance / IT_HeadOfData_AI JD, screenshots provided) and requested further changes. Implemented, verified end-to-end, and committed.

### Cover letter
- [x] Added `https://askcareer-ai.com` directly under the `linkedin.com/in/johnhau` line in the letter header
- [x] Removed the date line, "Hiring Manager" line, and company-name line — goes straight to "Dear Hiring Manager," (salutation kept, per user decision)
- [x] Bold cap removed — every distinct quantifiable figure in the letter is now bolded
- [x] Job titles bolded on every company/title mention (per user decision — generalized, not just the AIA example)
- [x] Added `clean_coverletter_header()` as a deterministic safety net in case the LLM doesn't fully follow the header-format prompt instruction

### Resume
- [x] Added `tighten_contact_header()` — zero blank lines between name/address/LinkedIn/website
- [x] Bold cap removed — every distinct figure per bullet is now bolded
- [x] Added prompt guidance to weave people-management evidence into the most recent 2-3 roles specifically
- [x] "Earlier Roles (Siemens, Alco)" dates — user supplied them directly in the master template (`Siemens - Apr 1997 - Apr 1998, Alco - Feb 1995 – Mar 1997`); no code change needed since the LLM mirrors the template for this section (no profile-JSON data exists for these two employers). **Note:** verification run showed the LLM collapsing this to a combined `1995 – 1998` range rather than each company's own exact range — possible follow-up if per-company precision matters.

**Re-verified end-to-end** (same McDonalds JD, `--llm=gemini --force`): 76 bold runs in the resume docx, 25 in the cover letter docx, header fully tight in both, zero stray asterisks, zero Generated/Profile lines, zero leftover date/address-block lines, zero "27 years" mentions. See `docs/guides/JDSCORECARDRESUMEV2_21JUL2026.md` for the full record.

## Future roadmap items (requested 21 Jul 2026 — todolist only, not yet scoped/implemented)

- [ ] **MFA on the new JD Portal tabs**: password + Google Authenticator (TOTP) protecting the new tabs/pages once built; the existing chatbot landing page stays open/public for anyone to query the career profile — auth only gates the new JD-portal functionality, not the existing chat experience

## Tomorrow's top priority (refined 21 Jul 2026, evening) — bring-your-own-key + dynamic LLM selection

**Decision (user, 21 Jul 2026 evening):** the earlier "Bring-your-own-LLM-key UI" and "Model version bump (Sonnet 4.6→5)" roadmap items are **merged and refined** into one spec, explicitly *not* implemented tonight — scoped here for tomorrow instead:

- All LLM calls (JD scorecard/resume scripts and any future portal UI) must go through **OpenRouter's API** to invoke Anthropic models (e.g. Claude Sonnet 5), not a hardcoded model slug baked into `LLM_CONFIGS` (`scripts/jd_scorecard_resume.py` / `_v2.py` currently hardcode `"sonnet": ("anthropic/claude-sonnet-4.6", ...)`).
- The user must be able to **input their own API key** (OpenRouter, DeepSeek) — from the web portal UI or via a Python script — rather than only reading from `.env*` files on the server.
- The user must be able to **select the proper Claude LLM** dynamically (e.g. pick Sonnet 5 vs. another OpenRouter-listed Anthropic model) instead of it being hardcoded — same dynamic-selection treatment for DeepSeek.
- **Confirmed 21 Jul 2026 evening (user-supplied screenshot, openrouter.ai/models?q=claude):** "Anthropic: Claude Sonnet 5" is listed on OpenRouter — released ~2 weeks ago, 1.2T weekly tokens, $2/$10 per M input/output tokens, 1M context window. This confirms the model is available via OpenRouter's API; the exact request-time model-slug string (e.g. whether it's `anthropic/claude-sonnet-5` or a different suffix) still needs to be read off the model's own detail page or a live API call tomorrow before wiring it into code — the models list only shows the display name, not the API identifier, so don't hardcode a guessed slug.
- Explicitly deferred, not started tonight: no code changes to `LLM_CONFIGS`, no OpenRouter model-slug confirmed yet from the model detail page/API. This is the first task to scope properly tomorrow.

## JD Portal Phase 2 — VPS deploy explicitly deferred (21 Jul 2026 evening)

Phase 2 frontend is done and verified **locally** (see Phase 2 section above), and its code is pushed to GitHub `main` (commit `135a119`). **Deploying it to the live `askcareer-ai.com` VPS was investigated tonight and deliberately NOT done**, because doing so would ship a visibly broken JD Portal tab to real visitors:

- `docker-compose.prod.yml` only defines `app` (chat backend + frontend) and `caddy` — there is no service running `backend/jd_api_server.js` (port 3010) in production.
- The production `Dockerfile`'s runtime stage is plain `node:18-alpine` with no Python installed — the JD pipeline spawns `scripts/jd_scorecard_resume(_v2).py` via Python, so even adding a jd-api service wouldn't work without a Python runtime in the image.
- `Caddyfile`'s CSP (`connect-src 'self' https://openrouter.ai https://api.deepseek.com`) and the frontend's `JD_API_BASE` default (`http://localhost:3010`) mean a real visitor's browser would try to reach their own machine, not the VPS — blocked by CSP either way.
- **User decision:** stop here, don't deploy JD Portal to VPS tonight. This becomes in-scope for Phase 5 (Docker) + Phase 7 (deploy) of the JD Automation Portal roadmap, not tonight's session.
- **Current live state unaffected:** `https://www.askcareer-ai.com` is still running the pre-Phase-2 chat-only stack (JD Portal frontend code exists on GitHub but has not been deployed there).

## Session close — 21 Jul 2026

- [x] GitHub updated: JD Portal Phase 2 commit (`135a119`) pushed to `origin/main`.
- [x] Todolist updated (this file) to close out Phase 2 and record tomorrow's scoped priority.
- [ ] VPS deploy of JD Portal — deliberately deferred, see section above.
- [ ] Tomorrow: scope + implement bring-your-own-key + dynamic LLM selection (see section above), plus whatever additional feature the user brings.

## Answered questions (21 Jul 2026)

1. "Dear Hiring Manager," salutation stays — only the date/name/company address block above it is removed.
2. Job-title bolding generalizes to every company/title mention in the cover letter, not just AIA.
3. Siemens/Alco dates supplied by user directly in the master template.
4. Uncapped bold-SMART-number rule confirmed acceptable — bold every distinct figure regardless of density.

## Priority order

1. ~~Push to GitHub~~ — **done**
2. ~~Implement "v2 refinement round 2"~~ — **done, see above**
3. ~~JD Portal Phase 2 — integrate as tabs/pages in the existing Career Copilot app~~ — **done locally + on GitHub, VPS deploy deliberately deferred (see above)**
4. ~~Bring-your-own-key + dynamic LLM selection~~ — **superseded as today's (22 Jul 2026) top priority by the `--ResumeAdjustment` work below (user redirected priority); still outstanding, carry forward**
5. Remaining JD Automation Portal phases (NLP, integration, Docker, deploy — needed before JD Portal can go live on the VPS)
6. LinkedIn automation scoping
7. Future roadmap items (MFA) — not yet scoped

---

## 22 Jul 2026 — today's session

### 1. Explainer PowerPoint for `jd_scorecard_resume_v2.py` — DONE

Hiring-manager-facing, plain-English walkthrough of what the script does (not how — no code/jargon). 7 slides: the problem it solves, the 3-step flow, deep dive on the Scorecard, deep dive on Resume/Cover Letter, the anti-hallucination "trust layer," and the bottom-line pitch.

- [x] Built with `python-pptx` (newly installed, not added to `requirements.txt` — one-off deliverable, not a runtime dependency of any script)
- [x] Verified: 7 slides confirmed via re-parsing the file with python-docx/pptx, no mojibake in text runs
- [x] Saved to `docs/guides/JDSCORECARDRESUMEV2_EXPLAINER_22JUL2026.pptx`

### 2. `--ResumeAdjustment` flag added to `jd_scorecard_resume_v2.py` — DONE, this was today's first priority

**User request:** pull the "6a) Resume Adjustments" recommendations out of a JD's own Match Scorecard (e.g. `data_processed/Manulife/ScoreCard/docx/JD_SCORECARD_Manulife_..._21JUL2026.docx`, reviewed alongside the user's manually-edited `JohnHauCoverLetter_Manulife_IT_Director.docx`) and apply that guidance to the Resume and Cover Letter — grounded strictly in `src/data/john_profile.json`, never hallucinated.

**Decisions confirmed by user (22 Jul 2026, via clarifying questions before implementation, per soul.md intake rule):**
1. **Invisible guidance only** — the 6a recommendations shape wording/emphasis/section framing inside the existing Resume/Cover-Letter prompts. No visible "Resume Adjustments" heading is ever printed into the output.
2. **Auto-detect latest scorecard** — glob `data_processed/<Employer>/ScoreCard/txt/` for the most recent scorecard matching the JD; if none exists yet, generate one first (forces `run_scorecard = True` for that run), then extract.
3. **Prompt-level anti-hallucination only** — same mechanism already used everywhere else in this script (explicit LLM rule: apply the guidance to wording only, never invent a fact/figure/project not already in the profile). No new automated post-generation fact-checker was added — consistent with v1/v2's existing architecture.

**Implementation (`scripts/jd_scorecard_resume_v2.py`):**
- [x] Backed up first per soul.md/CLAUDE.md golden-rule: `scripts/jd_scorecard_resume_v2.py.20260722_V1.bak`
- [x] New flag: `--ResumeAdjustment` (boolean, case-insensitive match)
- [x] `find_latest_scorecard_txt()` — globs the existing scorecard pattern already used by `build_output_targets()`
- [x] `extract_resume_adjustments()` + `RESUME_ADJUSTMENTS_RE` — regex-extracts the "6a) Resume Adjustments" block; hardened against real-world format drift (tested against **all 17** historical scorecard `.txt` files under `data_processed/**/ScoreCard/txt/` going back to March 2026 — handles the "a)"-prefixed form, the un-lettered `**Resume Adjustments:**` form, and a subtitle-suffixed heading variant; **17/17 matched correctly**, zero false positives)
- [x] Resolution logic runs once, before the run header prints, so the header's new `ResumeAdj:` line always reflects the final decision (existing file used / none found so generating one first / ignored in scorecard-only mode)
- [x] Guidance text injected into both `RESUME_USER`/`RESUME_SYS` and `COVERLETTER_USER`/`COVERLETTER_SYS` as a new context block + new system rule 12, with an explicit instruction never to invent facts to satisfy it and never to print it verbatim
- [x] Usage docstring and `--help`-style printout at the bottom of the script updated with the new flag

**Verification (soul.md §3.1 — executed, not just written):**
- [x] Real run against the Manulife JD, `--resume-only --ResumeAdjustment --llm=gemini`: correctly auto-detected the existing 21JUL2026 scorecard, extracted 6a, and visibly applied it — Professional Summary headline changed to **"Transformation-Focused Technology & Operations Leader"** (the scorecard's exact suggested headline) and the bridging section retitled **"OPERATIONAL TRANSFORMATION RELEVANCE"** — with zero "Resume Adjustments" text leaked into the output
- [x] Docx spot-check: 75 bold runs, 0 stray asterisks, heading not present
- [x] Anti-hallucination spot-check: flagged three claims in the new output that looked unfamiliar (a `here.now` URL, "16,000 financial advisers," "800+ China developers... 40%") and traced all three back to real entries in `john_profile.json` / the master template — confirmed genuine, not invented
- [x] Real run against the Manulife JD, `--coverletter-only --ResumeAdjustment --llm=gemini`: same mechanism, reused the cached scorecard (no regeneration), 24 bold runs, 0 stray asterisks, no leaked heading
- [x] Separately exercised the "no scorecard exists yet" branch using a throwaway smoke-test JD (`JD_ResumeAdjustmentSmokeTest_Temp`) — confirmed the script generates the scorecard first, then correctly extracts and applies 6a; **all smoke-test artifacts (JD txt, JSON blueprint, `data_processed/ResumeAdjustmentSmokeTest/`) deleted afterward**, no trace left behind
- [x] Real Manulife 22JUL2026 outputs (resume + cover letter, txt + docx) left in place — legitimate output for a real JD, doesn't collide with the 21JUL2026 files or the user's manually-edited docx files

**Not done / explicitly deferred:** no dated guide written yet for this feature (next step); `docs/guides/JDSCORECARDRESUMEV2_21JUL2026.md` (yesterday's v2 guide) not yet updated to mention this addition.
