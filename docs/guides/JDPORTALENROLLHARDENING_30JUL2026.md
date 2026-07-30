# PortalEnroll.jsx — Silent-Fail Hardening (30 Jul 2026)

**Requested:** flagged 25 Jul 2026 during the CORS bugfix investigation, carried forward as todolist item 10 (small, not built until now).

**Status: Done and verified.**

## Context

`PortalEnroll.jsx`'s enrollment-status check (`useEffect` calling `fetchAuthStatus()`) failed open on any fetch error — `.catch(() => setChecking(false))` — falling through to render the "First-time Portal Setup" enrollment form with no visible error and no way to tell "genuinely not enrolled" apart from "couldn't reach the server." This is exactly what happened during the 25 Jul CORS incident: a connectivity failure looked identical to a fresh, un-enrolled portal. Re-running the enrollment flow over an already-enrolled account would be destructive (new password, new TOTP secret), so failing open here is a real risk, not just a UX rough edge.

## Change made

- `src/components/JDPortal/auth/PortalEnroll.jsx`: extracted the status check into `runStatusCheck()`, added a `checkError` state. On fetch failure, the component now renders a dedicated error card ("Couldn't verify portal status") with the actual error message, a **Retry** button (re-runs the check), and an **Already enrolled? Go to Sign-in** button — never the enrollment form itself.
- `src/components/JDPortal/auth/PortalAuth.css`: added a `.portal-button--secondary` outline variant (existing `.portal-button` is a filled gradient primary; two stacked primaries would have been visually indistinguishable) and spacing between stacked buttons.

## Verification (soul.md §3.1)

- `npm run build` — clean (one pre-existing, unrelated CSS minify warning confirmed present before this change too via `git stash` + rebuild — not introduced by this work, left untouched).
- Real browser test (Playwright against the live Vite dev server, `localhost:5173`):
  - Baseline: JD API backend (`localhost:3010`) actually running and enrolled — loading `/portal/enroll` correctly auto-redirects to `/portal/login` (unaffected, sanity check).
  - Failure path: intercepted and aborted the `/api/auth/status` request (`page.route(...).abort('connectionrefused')`, simulating the real CORS/connectivity failure mode from 25 Jul) — confirmed the new error card renders (`Couldn't verify portal status`, real `Failed to fetch` message shown), the enrollment form (`#enroll-password`) is **not** rendered, both buttons present.
  - Recovery: unblocked the route and clicked **Retry** — correctly re-ran the check against the real (enrolled) backend and redirected to `/portal/login`.
  - Screenshot confirmed correct dark-theme rendering of the new error card and secondary button styling.
