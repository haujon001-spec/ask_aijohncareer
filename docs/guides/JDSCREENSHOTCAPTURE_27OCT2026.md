# JD Screenshot Capture (phone → portal) — 27 Oct 2026

**Why:** LinkedIn's mobile app blocks copy/paste of job text. This lets you take several screenshots of a job ad on the phone, upload them in order, and get the JD text back in the portal's JD box.

**Status:** built and verified **locally**. **Not deployed to the VPS yet** (waiting for the user's go-ahead).

## Decisions (user, 27 Oct 2026)
- Works from the phone against **both** the live portal and the laptop portal.
- Lives in **/portal → Configure → "Capture from screenshots"** (not `/portal2`; the option is off by default in `JDUploadForm`, `/portal`'s wizard turns it on).
- Result **fills the JD box for review**; nothing runs automatically.
- Model **Haiku 5.5**; images are **processed in memory and never stored**.
- Limits: **10 screenshots**, **5 MB each** (server-checked).

## How to use it
1. Phone: open the portal, sign in (password + code), **New JD Run → Configure → Capture from screenshots**.
2. **Choose screenshots** (multi-select from the gallery) and/or **Take photo**. Top of the ad first; the ↑ / ↓ buttons reorder, ✕ removes.
3. **Read job description from N screenshots** (~20 s). Employer, Role and the JD text are filled in; a yellow banner lists anything the model flagged (unreadable words are written `[unreadable]`).
4. Read it through, fix anything, then **Save JD** as usual.

If no job ad can be read, the form is left exactly as it was and the banner explains why.

## Using the LAPTOP portal from the phone (Wi-Fi)
```powershell
cd C:\Users\haujo\projects\DEV\ask_aijohncareer
npm run dev:lan        # same as dev:all but Vite listens on the network (vite --host)
ipconfig               # note the laptop's IPv4 address, e.g. 10.0.5.69
```
- Phone on the **same Wi-Fi** → `http://<laptop-ip>:5173/portal`.
- First run, Windows Firewall asks about `node.exe`: **allow on Private networks** (ports 5173 and 3010).
- It is plain `http` on the home network. The laptop's IP can change; re-check with `ipconfig`.
- Use `npm run dev:all` as normal when you do not want the dev server visible on the network.

How it works without opening the API to the LAN: in dev the frontend now calls the API on **the same hostname the page was loaded from** (`http://<laptop-ip>:3010`), and the API accepts an Origin only if its hostname equals the host the request was addressed to (plus the configured `JD_PORTAL_FRONTEND_ORIGIN` list). A page served from any other host is refused.

## What was built
| Piece | File |
|---|---|
| Vision LLM call (OpenRouter, ordered images) | `backend/lib/llmClient.js` — `callLlmVisionJson`; retry/parse logic factored into shared helpers (behaviour of `callLlmJson` unchanged) |
| Prompt, image validation, result cleaning | `backend/lib/jdCapture.js` |
| Route `POST /api/jd/capture` (+ `GET /limits`) | `backend/api/jd_capture.js` — behind the MFA session, 30 captures/hour limiter |
| Server wiring | `backend/jd_api_server.js` — own 40 MB parser for this route only (global stays 2 MB), JSON error handler, same-host CORS rule |
| Phone UI | `src/components/JDPortal/CaptureFromScreenshots.jsx` (downsizes to ≤2400 px JPEG before upload), hooked into `JDUploadForm.jsx`, enabled in `JDWizard.jsx` |
| API base follows page hostname | `src/utils/jdApi.js` |
| LAN launcher | `package.json` → `dev:lan` |

Prompt rules: transcribe verbatim, join in order and drop the overlap between neighbouring screenshots, strip app chrome (status bar, Apply/Save buttons, applicant counts, ads), never guess unreadable text, and treat text inside images as data, not instructions. The server validates declared type **and** magic bytes of each image before spending an LLM call.

## Verification (real, not simulated)
- Unit: 16/16 (validation incl. fake-type/oversize/non-base64/over-limit; refactored LLM client against a mocked `fetch`: retry path, payload shape, image ordering, `length` error, refusal of DeepSeek).
- Real server (side port): a 10 MB body to the capture route → **401** (auth) rather than 413; the same size to another route → **413** (global cap kept); same-host Origin allowed, foreign LAN origin and public origin refused.
- Real model, real UI, iPhone-sized browser: 9 realistic overlapping screenshots (status bar, sticky Apply bar, lines cut mid-way) of an 8.4 KB DBS ad → **18 s, 100% word recall vs the original, 0 duplicated lines, no app chrome leaked**, employer `DBSBank` and role detected. Saved as `JD_DBSBank_IT_SVP_…txt` and the wizard advanced to the run step.
- Non-job screenshot → form untouched + explanation. 13 files picked → 10 kept + message.
- Page served from the laptop's LAN IP calls the API on that IP.

## Not verified / limits
- **No real phone test yet**: Playwright emulates an iPhone; real HEIC photos, real camera capture and Wi-Fi/firewall behaviour need one try on the actual phone. (Photos are re-encoded to JPEG in the browser, which should cover HEIC on Safari.)
- Logged-in behaviour was tested through an auth-stubbed harness (real routers) so the real credentials stayed untouched.
- Test used a synthetic page rendered from a real JD, not a live LinkedIn screenshot; very small or low-contrast text may produce `[unreadable]` notes.
- `/portal2` does not have the option.

## Follow-up, same day: first real use hit "HTTP 413"
- **Cause:** the user's dev backend (port 3010) had been started *before* the capture code existed. The old process rejects any body over 2 MB with a bare 413 (global parser) — ten re-encoded screenshots exceed that — and answers the capture route with 404. Fix = **restart the backend** (`npm run dev:all` / `dev:lan`); a password reset or page reload does not pick up new backend code.
- **Hardening added:** the panel now calls `GET /api/jd/capture/limits` on open; a 404 shows "backend started before screenshot capture was added — restart it". A 413/404 on upload gives a plain-English message instead of "HTTP 413".
- **Prompt:** screenshots picked out of order are re-ordered by content continuity (tested with two shuffled screenshots: 40/40 passages found, 39/39 in order; a 3.8 MB upload accepted).
- **UI:** the panel states that nothing needs to be typed or pasted below — Employer, Role and text are filled in and replace what is there.
- Note: two Vite servers (5173 and 5174) were running; use one.

### Second follow-up: "Read button does nothing" (same day)
- **Cause 1 (the real blocker):** after restarting, only Vite was new. The JD API (3010) and chat backend (3000) were orphaned `node` processes from 14:04 still holding their ports, so the freshly started backends could not bind and the OLD code kept answering (capture route = 404, bodies >2 MB = 413). Check with: `Get-NetTCPConnection -State Listen -LocalPort 3010 | % { Get-Process -Id $_.OwningProcess | select Id,StartTime }` — the StartTime must be later than the last code change. Stop the stale process, then start the servers again.
- **Cause 2 (UI):** with 10 screenshots listed, the button was far below the error banner, so a failure was off-screen and looked like "nothing happened". The Read button, a progress indicator and any error now sit together directly under the Choose/Take buttons, above the list (`role="alert"`).

## Option 2: paste a LinkedIn job link (added same day)
User asked whether the app could read the job from its URL (offering to supply LinkedIn credentials).

- **No LinkedIn login is used or stored — and none should be given to the app or to Claude.** LinkedIn's terms prohibit automated logins (risk to the user's real career account), storing the password would put it on the laptop and the VPS, and logins hit captchas/verification. Instead the server reads the **public** job page LinkedIn serves to anyone.
- **UI:** `/portal` → Configure → **Paste a LinkedIn job link** (beside "Capture from screenshots"). On the phone: open the job → Share → Copy link → paste. Fills Employer / Role / text for review, same banner flow as screenshots. Scope = LinkedIn job links only (user decision); other sites are refused with a pointer to screenshots/paste.
- **How:** `backend/lib/jdLink.js` extracts the numeric job id from the link (full/country-subdomain/slug/tracking links, `?currentJobId=` collection links, `lnkd.in` short links whose redirect must land on linkedin.com) and always fetches `https://www.linkedin.com/jobs/view/<id>/` itself, so a pasted link can never choose which host the server contacts (no SSRF). Title/company/location/description are parsed straight from the page markup — **no LLM, no cost**, exact text. Route `POST /api/jd/link` (`backend/api/jd_link.js`), behind the MFA session, 60/hour limiter. Component `CaptureFromLink.jsx`.
- **Failure handling:** 404/410 → "job no longer exists"; 429/999/403/500, login-wall redirects or a page without a description → plain message to use screenshots or paste. Closed postings add a note.
- **Verified:** 29 unit checks (valid link shapes, look-alike hosts, `user@host` trick, `127.0.0.1`/metadata IP/`file:`/`javascript:` refused before any network call, short-link redirect rules, mocked 999/429/403/500/404/authwall/no-description, network failure) + a real fetch of the user's link (employer `yintercept`, role `Lead_Infrastructure_Engineer`, 2,469 chars, no HTML/entity leftovers) + phone-sized UI test (bad link leaves the form untouched; good link replaces old text; options close each other).
- **Limits:** LinkedIn's terms also discourage scraping public pages — fine for occasional single links the user chooses, not for bulk use. From the **live VPS** (datacenter address) LinkedIn will refuse more often; the laptop worked in testing. Screenshots remain the fallback.

## Also changed
- `jd_api_server.js` no longer logs any part of the API keys at startup (it used to print the first 20 characters).

## Deploy notes (pending)
Needs `app` (new frontend) and `jd-api` (new route, `llmClient.js`, same-host CORS) rebuilt. The live portal needs no other config; Haiku uses the OpenRouter key already on the VPS. Confirm Caddy does not cap request bodies below ~20 MB (default has no cap).
