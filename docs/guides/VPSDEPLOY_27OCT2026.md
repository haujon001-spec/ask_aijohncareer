# VPS deploy — PDF buttons, Sync, screenshot capture, LinkedIn link (27 Oct 2026)

**Status: deployed and verified live** (`www.askcareer-ai.com`). Not pushed to GitHub (separate decision).

## What shipped
Today's features (PDF buttons + `docx_render.py` markdown fix, Sync (hidden on the VPS by design), screenshot capture, LinkedIn link option, key-logging fix) **plus** portal code built in earlier sessions that had never reached the server (the VPS had been behind since 30 Jul / the 26 Oct model-only patch): `/portal2` multi-profile screens and routes (`jd_run_v3.js`, `onboard.js`, `profiles.js`, `JDPortal2.jsx` …), `PortalShell`/auth component changes, history/reports changes. 48 files in total, chosen by **sha256 comparison of local vs VPS** (111 of 159 code files were already identical), so nothing else was touched.

## How (same scp pattern as 30 Jul / 26 Oct)
1. Backup `/root/backup_pre_capture_20261027.tar.gz` (5.4 MB, whole app dir, mode 600) + rollback tags `john-career-copilot-{app,jd-api}:pre_capture`.
2. 48-file tarball (no secrets, env, data, profiles) → scp → sha256 matched → extracted → every file re-hashed identical to local.
3. `docker compose -f docker-compose.prod.yml build jd-api app` (rc=0), then `up -d jd-api`, health check, then `up -d app`. Caddy untouched.

## Verified live
- 3 containers healthy, Node v24.22.1; `/`, `/portal`, `/portal/login`, `/portal2`, `/api/health`, `/jd-api/api/health` = 200.
- New routes exist and are login-protected (401): `jd/link`, `jd/capture` (+`/limits`), `pdf/capabilities`, `sync/status`, `profiles`.
- Deployed JS bundle contains the new UI strings; live `/portal` redirects to sign-in with only the normal 401 from the "am I logged in" probe.
- Inside `jd-api`: `docx_render` imports (python-docx OK), `jd_scorecard_resume_v2.py` compiles.
- **Screenshot capture from the VPS:** real vision call with the server's own key, 8 s, correct output (a half-cut top line correctly marked `[unreadable]`).
- Live chat answers with a real model response. No errors in either container's logs.
- Startup log now prints `set`/`NOT SET` for API keys only (no key characters).
- No non-John profile data exists on the VPS (`src/data` has only `jd/` + John's files).

## Known behaviour on the live site (not bugs)
- **LinkedIn link option does not work from the VPS**: LinkedIn refuses the server's datacenter address ("LinkedIn did not give this server the job page… use screenshots"). It works from the laptop. Screenshots work everywhere.
- **Sync tab is hidden** and `Convert to PDF` / `Also generate PDF` are unavailable on the VPS (no ssh key / no Word); PDFs made on the laptop arrive via Sync.
- **`/portal2` is now reachable** (same login) but **profile onboarding will fail on the VPS**: `Dockerfile.jd-api` deliberately does not include `update_profile_from_resume.py`, keeping other people's resumes off the live server until the "does non-John data ship" decision is made.
- Nothing has been synced: laptop and VPS still differ in outputs (~160 laptop-only / ~47 VPS-only files) until you press Sync.

## Rollback (if ever needed)
```bash
ssh root@152.42.214.111
cd /opt/john-career-copilot
docker tag john-career-copilot-app:pre_capture    john-career-copilot-app:latest
docker tag john-career-copilot-jd-api:pre_capture john-career-copilot-jd-api:latest
docker compose -f docker-compose.prod.yml up -d --no-build app jd-api
# code files: tar -xzf /root/backup_pre_capture_20261027.tar.gz -C /opt   (restores the whole tree incl. secrets as they were)
```
Server leftovers (safe to delete later): `/root/deploy_20261027.tgz`, `/root/build_20261027.log`, `/root/backup_pre_capture_20261027.tar.gz`.

## Gotchas learned (reuse)
- Git Bash `sha256sum` prefixes the hash with `\` when the path contains backslashes and writes `*path` — normalise before comparing. A CRLF file list breaks remote `sha256sum` loops (names end in `\r`).
- The VPS `tar` wants options before arguments (`tar --exclude=… -czf …`).
- Stale dev backends: after code changes, check the listener's `StartTime` on 3010/3000 — an orphaned old `node` keeps the port and the new one silently fails to bind.


---
# Second deploy, same day (user follow-up requests)

## 1. Save JD button not visible — fixed
Cause: Save JD was the last item of a long form inside the portal's inner scroll area; with the capture list open it sat ~1,900 px down and there was no always-visible save action. Fix: **sticky Save bar** (`.jd-form-actions`, stays at the bottom of the scroll area, with a hint saying why it is disabled), screenshot list is now a **compact grid** (160 px for 10 shots on desktop instead of ~750 px), and the JD textarea height is `min(360px, 38vh)` so short windows are not overrun. Measured at 1830×1000, 1440×800, 1280×720 and phone 390×844: Save visible without scrolling at all sizes.

## 2. LinkedIn link on the live site — NOT possible without circumvention
LinkedIn blocks the VPS's datacenter address. Getting past that (alternate guest endpoints, spoofed browser headers, third-party scraping proxies, tunnelling through the laptop's home IP) is bot-check circumvention and against LinkedIn's terms, so it was deliberately **not** attempted (a probing request was also blocked by the tool's permission check). Supported route: **use the link option from the laptop portal** (`npm run dev:lan`, also reachable from the phone on the same Wi-Fi), then bring the JD across with Sync (JD inputs sync) — or use screenshots on the live site. The refusal message on the live site now says exactly this.
Note: the link reader identifies itself with a normal browser User-Agent when fetching the public page.

## 3. /portal2 parked for the live site
User decision: no portal2 on the VPS for now. Done with switches, no code removed:
- Frontend `src/App.jsx`: `/portal2` only exists in dev builds or when built with `VITE_ENABLE_PORTAL2=true`; a production build redirects `/portal2` to `/portal` (and contains none of the portal2 screens).
- Backend `backend/jd_api_server.js`: `/api/profiles`, `/api/onboard`, `/api/jd-v3/*` mount only outside Docker or when `JD_ENABLE_PORTAL2=1`. Live: all three return 404; laptop unchanged.
- **To enable later:** build with `VITE_ENABLE_PORTAL2=true`, set `JD_ENABLE_PORTAL2=1` on `jd-api`, add `scripts/update_profile_from_resume.py` to `Dockerfile.jd-api`, and first settle the "does non-John data ship" question.

## 4. Profile edits pushed to the live server
Safety check first: the VPS profile had **zero** content differences from the last committed version (no server-side edits to lose). Backed up as `src/data/john_profile.json.20261027_pre_deploy.bak` on the VPS, copied with sha256 verified, owner 1001:1001. Both containers read it (bind mount, no restart needed). Verified through the live chat: it now answers "career break ended November 2022, 2.25 years". The profile file is **not committed to git** (tracked file in a public repo, left to the user).

## 5. Sync
Left to the user to run manually.

## Verification (live)
`/portal2`, `/portal2/login` → `/portal/login`; `/jd-api/api/{profiles,onboard,jd-v3/run}` 404; other routes 401; health 200; new UI + sticky CSS in the bundle, no portal2 strings; no page errors; chat OK; 0 errors in logs; both containers healthy.
Rollback tags for this step: `john-career-copilot-{app,jd-api}:pre_portal2off` (earlier: `:pre_capture`).


---
# Third deploy, same day: Save JD hidden on the user's phone (mobile viewport bug)

User's real Android screenshot (live site) showed the bottom of the form clipped by the phone's navigation bar, with only the top sliver of Save JD visible — the earlier sticky-bar fix did not help on a real phone.
- **Cause:** `.portal-shell` used `height: 100vh`. On mobile Chrome `100vh` = screen height with the address bar HIDDEN, taller than the visible area, so the bottom of the portal (and the pinned Save bar) sat below the visible screen. Desktop browsers and Playwright cannot show this (innerHeight == 100vh there), which is why it was missed.
- **Fix:** `PortalShell.css` now sets `height/max-height: 100dvh` after the `100vh` fallback (dynamic viewport height tracks the visible area); Save bar background made near-opaque (0.98) with a `safe-area-inset-bottom` padding. 2 CSS files, hash-verified, app image only (rollback tag `john-career-copilot-app:pre_mobilefix`).
- **Verified:** live CSS bundle contains the `100dvh` rule; desktop 1440×800, Pixel-7 412×915 and 360×640 viewports all show Save JD fully in view with the shell height equal to the visible height; app healthy, no log errors. **Needs the user's phone to confirm** (cannot be reproduced headless).
- **Not changed (same pattern, not reported):** the public chat page also uses `100vh` (`src/App.css` lines 5-6 and 89-90, `src/index.css` line 47) and may clip its bottom input on mobile — candidate for the same `dvh` fix.


---
## Correction (27 Oct, evening): LinkedIn link DOES work on the live portal from the phone
After the third deploy the user reported the link option "works like a charm on the mobile external portal". The earlier statements in this guide ("does not work from the VPS", "NOT possible") were based on one server-side test that LinkedIn refused — LinkedIn's blocking of the VPS address is **intermittent**, not permanent. Treat the link option as best-effort on the live site, with screenshots / the laptop portal as the fallback; still no attempt should be made to circumvent LinkedIn's bot protection.
