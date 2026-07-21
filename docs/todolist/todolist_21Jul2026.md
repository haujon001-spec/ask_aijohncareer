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

- All LLM calls (JD scorecard/resume scripts and any future portal UI) must go through **OpenRouter** to invoke Anthropic models (e.g. Claude Sonnet 5), not a hardcoded model slug baked into `LLM_CONFIGS` (`scripts/jd_scorecard_resume.py` / `_v2.py` currently hardcode `"sonnet": ("anthropic/claude-sonnet-4.6", ...)`).
- The user must be able to **input their own API key** (OpenRouter, DeepSeek) — from the web portal UI or via a Python script — rather than only reading from `.env*` files on the server.
- The user must be able to **select the proper Claude LLM** dynamically (e.g. pick Sonnet 5 vs. another OpenRouter-listed Anthropic model) instead of it being hardcoded — same dynamic-selection treatment for DeepSeek.
- Explicitly deferred, not started tonight: no code changes to `LLM_CONFIGS`, no OpenRouter model-slug research/confirmation performed yet. This is the first task to scope properly tomorrow.

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
4. **Tomorrow's top priority:** bring-your-own-key + dynamic LLM selection (OpenRouter/DeepSeek, no hardcoded model slugs) — see "Tomorrow's top priority" section above
5. Remaining JD Automation Portal phases (NLP, integration, Docker, deploy — needed before JD Portal can go live on the VPS)
6. LinkedIn automation scoping
7. Future roadmap items (MFA) — not yet scoped
