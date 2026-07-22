# JD Portal Revamp — MFA-Gated Fintech Portal (22 Jul 2026)

**Status: Built and verified locally. Not deployed to the VPS (deployment stays deferred, see "Out of scope" below).**

## What changed

The JD Automation Portal — previously a tab inside the public `src/App.jsx`, alongside "John's Career Copilot" — is now a **separate, MFA-gated route** (`/portal`), visually distinct from the public chat page, with an in-browser view mode for generated `.docx` outputs. This closes the gap where any site visitor could open the JD Portal tab and use the internal tool.

Plan file: `C:\Users\haujo\.claude\plans\imperative-napping-flamingo.md` (approved 22 Jul 2026). Full requirements/decisions recorded in `docs/todolist/todolist_21Jul2026.md`, "3. JD Portal revamp" section.

## Architecture

- **Routing**: `react-router-dom` added. `/` renders `ChatPage.jsx` (chat logic extracted verbatim from the old `App.jsx`, unchanged). `/portal/*` renders inside `PortalShell`, with `login`, `enroll`, and the protected portal itself as sub-routes.
- **MFA**: password + TOTP (Google Authenticator-compatible), single user. Enrollment (`/portal/enroll`) is a one-time flow: set password → scan QR → confirm one code → locked. Once `totpEnrolled: true`, `/api/auth/enroll` returns `409` permanently — re-enrollment requires manually deleting `secrets/jd_portal_auth.json` on the server (no recovery-code path built, per user decision).
- **Session**: stateless JWT (`jsonwebtoken`) in an httpOnly, `sameSite=lax` cookie, 12h expiry. `secure` is derived from `req.secure` (the actual request scheme), **not** `NODE_ENV` — this repo's `.env.local → .env.vps → .env` load chain merges `NODE_ENV=production` from `.env.vps` into local dev too, which would otherwise wrongly mark the cookie `Secure` and silently break login over plain HTTP.
- **Secrets**: `secrets/jd_portal_auth.json` (gitignored, with a tracked `.example` placeholder — required an explicit `!/secrets/jd_portal_auth.json.example` negation in `.gitignore` since `/secrets/` ignores the whole directory).
- **Protected routes**: every existing JD route (`/api/jd/upload`, `/api/jd/run`, `/api/profile/update`, `/api/history`, `/api/download`) plus the new `/api/view` now sit behind `requireAuth` middleware in `backend/jd_api_server.js`. Only `/api/health` and `/api/auth/*` stay open.
- **Rate limiting**: `express-rate-limit` on `POST /api/auth/login`, 5 attempts / 15 min / IP.
- **Docx view mode**: new `GET /api/view/*` converts a `.docx` to HTML server-side via `mammoth`, reusing the existing `resolveWithinRoot` path guard (restricted to `.docx`, rejects `~$*.docx` Word-lock artifacts). Frontend renders it in a `DocViewer` modal, sanitized with `DOMPurify` before `dangerouslySetInnerHTML`.
- **Theme**: new `[data-portal-theme="fintech"]` CSS variable scope (dark navy backgrounds, metallic blue gradients, glass-panel cards) set on `PortalShell`'s own root element — independent of the chat app's `data-theme` light/dark toggle on `document.documentElement`, in both directions.

## Files

New: `backend/lib/auth.js`, `backend/api/auth.js`, `backend/api/view.js`, `src/components/ChatPage.jsx`, `src/components/JDPortal/PortalShell.jsx/.css`, `src/components/JDPortal/auth/{PortalLogin,PortalEnroll,ProtectedRoute}.jsx` + `PortalAuth.css`, `src/context/PortalAuthContext.jsx`, `src/components/JDPortal/DocViewer.jsx/.css`, `secrets/jd_portal_auth.json.example`.

Edited (backed up first per soul.md golden rule — `.20260722_V1.bak` alongside each): `src/App.jsx`, `backend/jd_api_server.js`, `src/utils/jdApi.js`, `src/components/JDPortal/JDPortal.css`, `src/components/JDPortal/JDHistoryList.jsx`.

Edited (additive, no backup): `src/main.jsx`, `src/index.css`, `src/components/JDPortal/JDRunPanel.jsx`, `src/components/TabBar.css`, `package.json`, `.env.example`, `.env.local` (new local dev secrets), `.gitignore`.

Untouched: `backend/server.js`, `scripts/jd_scorecard_resume_v2.py`, `Dockerfile`, `docker-compose.prod.yml`, `Caddyfile`.

## Dependencies added

Frontend: `react-router-dom`, `qrcode.react`, `dompurify`. Backend: `jsonwebtoken`, `bcryptjs`, `otplib@12` (v13 ships a completely different async API with no `authenticator` singleton — reverted to the stable v12 classic API this code is built against; deprecation warning is a version-upgrade nag, not a functional or security issue), `cookie-parser`, `mammoth`, `express-rate-limit`.

## Verification (executed 22 Jul 2026, per soul.md §3.1 — not just written)

All via `npm run dev:all` (vite:5173, chat backend:3000, jd-api:3010):

- **API-level (curl)**: enroll with weak password → `400`; enroll with valid password → secret + otpauth URL returned; confirm with wrong code → `Invalid code`; confirm with correct TOTP code (generated live via `otplib`) → `{"ok":true}`, `totpEnrolled` flips to `true` in the on-disk JSON; re-enroll after completion → `409`; login with wrong TOTP → `401`; login with correct password + fresh TOTP → `200` + `Set-Cookie` (httpOnly, `SameSite=Lax`, no `Secure` over local HTTP); `GET /api/history`/`/api/auth/me` without cookie → `401`, with cookie → `200`; `GET /api/download/*` with cookie → `200`, without → `401`; `GET /api/view/*` traversal attempt, non-`.docx` extension, and a `~$Locked.docx` artifact all rejected; 6 rapid login attempts → 5th/6th return `429`.
- **Browser-level (Playwright, headless Chromium, screenshots captured)**:
  - `/` — chat page renders identically to pre-change, sent a real message, got a real LLM reply, zero regressions.
  - `/portal` unauthenticated → redirects to `/portal/login`.
  - Login with password + live TOTP code → redirects to `/portal`, fintech theme (dark navy, glass cards, metallic-blue gradient buttons) renders correctly and is visually distinct from the chat app's light theme.
  - History tab: real run history rendered (42 View buttons found across real docx entries); clicking "View" opened the `DocViewer` modal showing converted HTML (headings, bold text, real scorecard content) styled to the fintech theme.
  - Mobile viewport (390×844): login form and portal cards fully usable, `document.body.scrollWidth === window.innerWidth` (no horizontal scroll).
  - "Log out" → session cleared, redirected back to `/portal/login`.
  - Console errors: only expected `401`s from the pre-login auth check — no unhandled errors.

**Bug found and fixed during verification**: the session cookie's `secure` flag was initially tied to `NODE_ENV === 'production'`, which is unexpectedly `true` even in local dev because `.env.vps` (loaded as part of the `.env.local → .env.vps → .env` chain) sets `NODE_ENV=production` and gets merged in. This made the cookie `Secure`-flagged on plain `http://localhost`, which works in modern browsers' `localhost`-as-secure-context exception but would break on any non-localhost LAN/HTTP testing. Fixed by deriving `secure` from `req.secure` (the actual request scheme) instead — deploy-environment-agnostic and correct once behind HTTPS in production too.

## Out of scope (deferred, unchanged from before this session)

VPS/Docker/Caddy deployment of this feature, multi-user auth, JD Automation Portal Phases 3-7 (NLP/profile-update), bring-your-own-LLM-key work. See `docs/todolist/todolist_21Jul2026.md` for the full outstanding list.
