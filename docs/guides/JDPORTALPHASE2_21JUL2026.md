# JD Automation Portal — Phase 2 (Frontend Integration)

**Date:** 21 July 2026
**Status:** Done, verified end-to-end

## What this is

Phase 2 wires a UI to the Phase 1 JD Automation API (`backend/jd_api_server.js`, port 3010) inside the existing "Career Copilot" React app (`src/App.jsx`), as tabs alongside the chat experience — not a standalone portal. Users can now paste a job description, run the scorecard/resume/cover-letter pipeline, download generated documents, and browse run history, all from the same deployed app/domain as the chatbot.

## Prerequisite merge

Phase 1 (`backend/jd_api_server.js` and supporting `backend/api/*.js` / `backend/lib/*.js` files, commit `86b76d9`) had only ever been committed to the `dev` branch and was never merged into `main`. As part of this work, `dev` was merged into `main` (clean merge, no conflicts — `dev` only added new files).

## New files

- `src/utils/jdApi.js` — client for the JD API. Exports `uploadJd`, `runJd`, `fetchHistory`, `checkHealth`, and `toDownloadUrl` (normalizes the two different download-path shapes returned by `/api/jd/run`'s `downloadUrls` vs. `/api/history`'s repo-relative paths). Base URL: `import.meta.env.VITE_JD_API_BASE || 'http://localhost:3010'`.
- `src/components/TabBar.jsx` / `.css` — generic tab bar, reused for both the top-level Chat/JD Portal switch and the JD Portal's own New Run/History sub-nav.
- `src/components/JDPortal/JDPortal.jsx` / `.css` — top-level JD Portal container. Renders the sub-tabs, the upload form + run panel, or the history list, plus a disabled "Update Profile from JD (Coming Soon)" button (Phase 3 — the `/api/profile/update` endpoint is a permanent 501 stub in this phase and is never called).
- `src/components/JDPortal/JDUploadForm.jsx` — paste-a-JD form with live character-count validation (≥50 chars) and a 409 overwrite-confirmation flow.
- `src/components/JDPortal/JDRunPanel.jsx` — run configuration (LLM, mode, refresh-blueprint, generate-docx), an elapsed-time indicator while running, a distinct banner for the server's 409 "run already in progress" lock, match-score/strengths/gaps rendering, and download links.
- `src/components/JDPortal/JDHistoryList.jsx` — fetches and lists past runs newest-first with match scores and download links.

## Modified files

- `src/App.jsx` — added `activeTab` state and a `<TabBar>` between `<Hero/>` and the existing chat `.app` block; the chat block and its state are otherwise untouched.
- `src/App.css` — changed `.app`'s sizing from a hardcoded `max-height: calc(100vh - 80px)` to `flex: 1; min-height: 0`, so it correctly fills the remaining vertical space now that a tab bar sits above it (works regardless of exact Hero/TabBar pixel height).
- `package.json` — `dev:all` now also starts `dev:jd-api`, so `npm run dev:all` launches all three processes (Vite, chat backend, JD API).
- `.env.example` — documented `VITE_JD_API_BASE` override.

## Verification performed

1. Merged `dev` → `main`, confirmed `.env.local` has `OPENROUTER_API_KEY`/`DEEPSEEK_API_KEY`.
2. Ran `npm run dev:all` — all three processes started cleanly (Vite 5173, chat backend 3000, JD API 3010); both `/api/health` endpoints returned `200`.
3. **API-level smoke test** (`curl`) against the live JD API: upload → 201; duplicate upload without `overwrite` → 409 with the expected `existing` payload; `POST /api/jd/run` (mode=scorecard, llm=gemini) → 200 with the expected `outputs.scorecard.matchScore/strengths/gaps` and `downloadUrls` shape; download via the returned URL → 200 with correct content and `Content-Type: text/plain`; `GET /api/history` → correct repo-relative path shape.
4. **Browser-level verification** via a Python Playwright script (`chromium.launch()`, headless): loaded the app, switched to the JD Portal tab, filled and submitted the upload form, confirmed the run panel auto-filled with the uploaded filename, ran a live scorecard-only pipeline end-to-end, confirmed the match-score badge and download links rendered, switched to History and confirmed the new run (and pre-existing real runs, including ones with resume/cover-letter outputs) displayed correctly, confirmed the profile-update button is present and disabled, and switched back to Chat and confirmed the existing chat history/functionality was untouched. **Zero browser console errors** across the whole flow.
5. Confirmed dark-mode and mobile-viewport (390×844) rendering — all new components track the existing CSS custom properties correctly in both themes and remain usable at the existing mobile breakpoints.
6. Cleaned up all smoke-test data (`data_raw/jd/txt/JD_PhaseTwoSmokeTest_*`, `data_raw/jd/txt/JD_PlaywrightSmokeTest_*`, and their `data_processed/` outputs) after verification.

## Known limitations / deferred to later phases

- No "list uploaded JD files" endpoint exists yet, so the Run panel's JD-file field is free-text (pre-filled after a successful upload, but not a dropdown/picker).
- `POST /api/profile/update` remains an unimplemented 501 stub — Phase 3.
- No auth/MFA on the JD Portal tabs yet — a separate future roadmap item, intentionally out of scope here.
