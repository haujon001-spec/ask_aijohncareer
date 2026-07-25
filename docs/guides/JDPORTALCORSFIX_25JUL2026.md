# JD Portal — CORS "Failed to fetch" on Enroll/Login, 25 Jul 2026

Root-caused and fixed a real login-blocking bug the user hit live: `http://localhost:5175/portal/enroll` showed "First-time Portal Setup" with a `Failed to fetch` banner, even though the account was already enrolled (`secrets/jd_portal_auth.json` has a valid `passwordHash`/`totpSecret` since 22 Jul 2026).

## Root cause

`backend/jd_api_server.js` configured CORS with a single hardcoded origin: `JD_PORTAL_FRONTEND_ORIGIN || 'http://localhost:5173'`. Over the course of the day's session, multiple Vite dev-server instances had been started without cleanly stopping the previous one (confirmed via `wmic process`: three separate `vite.js` processes running simultaneously, on ports 5173, 5174, and 5175, with creation timestamps hours apart) — each new `npm run dev` landed on the next free port once the previous ones were left occupied. The user's active browser tab was on the newest one, port 5175, which was **not** in the CORS allow-list.

Confirmed via a direct CORS preflight simulation (`curl -X OPTIONS` with `Origin: http://localhost:5175`): the server replied `Access-Control-Allow-Origin: http://localhost:5173` regardless of the actual request origin. The browser correctly refuses to expose that response to JS since the origins don't match, which surfaces to `fetch()` as a generic, undiagnostic `TypeError: Failed to fetch` — no CORS-specific detail is exposed to client code by design (browser security).

**Compounding UX gap** (not fixed, just documented): `PortalEnroll.jsx`'s `useEffect` calls `fetchAuthStatus()` to check whether enrollment already exists and redirect to `/portal/login` if so — but its `.catch()` just calls `setChecking(false)` with no error surfaced, silently falling back to rendering the enroll form as if nothing were wrong. This is why a CORS failure *looked like* "not enrolled" instead of an obvious connectivity error. Worth hardening in a future pass (show a visible error and a manual "Try again" / "Go to login" action instead of failing open to the enroll form), not done here since the immediate ask was fixing the actual block.

## Fix

**`backend/jd_api_server.js`** — `JD_PORTAL_FRONTEND_ORIGIN` now accepts a comma-separated list, validated via a dynamic `cors()` origin function instead of a single string. Falls back to `http://localhost:5173,5174,5175,5176` (the common range Vite lands on) if the env var isn't set at all. **`.env.local`** updated to `JD_PORTAL_FRONTEND_ORIGIN=http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176` so the currently-running dev server (whichever port it ends up on) isn't blocked.

Also cleaned up: killed the two orphaned Vite processes (ports 5173, 5174) that were no longer the user's active tab, leaving only the live one (5175) running, and restarted `jd_api_server.js` to load the new CORS config.

## Verification (soul.md §3.1)

- `curl -X OPTIONS` preflight with `Origin: http://localhost:5175` now returns `Access-Control-Allow-Origin: http://localhost:5175` (matching), where it previously returned the mismatched `5173`.
- `GET /api/auth/status` with `Origin: http://localhost:5175` returns `{"enrolled":true}` — confirms the account is genuinely already enrolled; the user should be auto-redirected from `/portal/enroll` to `/portal/login` on refresh, not asked to set up fresh.
- `npm run build` clean.

## What the user needs to do next

Refresh `http://localhost:5175/portal/enroll` (no URL change needed now) — it should auto-redirect to `/portal/login`. From there:
- **If the existing password is remembered:** log in normally with it + the authenticator app code (same TOTP secret as before, unaffected by any of today's changes).
- **If the password is forgotten / a reset is wanted:** follow Method B in `docs/guides/JDPORTALPASSWORDROTATION_25JUL2026.md` (back up + delete `secrets/jd_portal_auth.json`, re-enroll fresh — this does invalidate the existing authenticator entry, a new QR code must be scanned).

## Files changed

- `backend/jd_api_server.js` — multi-origin CORS.
- `.env.local` — `JD_PORTAL_FRONTEND_ORIGIN` widened to a comma-separated list (backed up first, `.env.local.20260725_V1.bak`).

No changes to `secrets/jd_portal_auth.json` — the existing enrollment is untouched.
