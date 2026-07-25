# JD Portal — Login Password Rotation, 25 Jul 2026

How to rotate the password used to sign in at `/portal` (the MFA-gated JD Automation Portal). Covers both the credential file's mechanics and the two practical rotation paths — there is currently no in-app "change password" UI (see Limitations).

## Background: how the credential is stored

`secrets/jd_portal_auth.json` (gitignored, never committed — see `.gitignore`'s `secrets/` entry and soul.md §4) holds:

```json
{
  "passwordHash": "<bcrypt hash>",
  "totpSecret": "<base32 TOTP secret>",
  "totpEnrolled": true,
  "createdAt": "<ISO timestamp>"
}
```

- `passwordHash` — bcrypt, 12 rounds (`backend/lib/auth.js`, `BCRYPT_ROUNDS = 12`).
- `totpSecret` — the authenticator-app secret (Google Authenticator, Authy, etc.), independent of the password.
- Login (`POST /api/auth/login`, `backend/api/auth.js`) requires **both** the password and a valid 6-digit TOTP code — rotating the password alone does not affect the authenticator enrollment.
- The backend reads this file fresh from disk on every request (`loadAuthConfig()` in `backend/lib/auth.js` — no caching), so **no server restart is needed** after rotating the password — the very next login attempt sees the new hash immediately.

## Method A (recommended): rotate the password only, keep TOTP enrollment intact

Use this for routine rotation — you keep using the same authenticator-app entry, no QR re-scan needed.

1. **Back up the current file first** (soul.md safe-edit workflow):
   ```powershell
   cd C:\Users\haujo\projects\DEV\ask_aijohncareer
   Copy-Item secrets\jd_portal_auth.json "secrets\jd_portal_auth.json.$(Get-Date -Format yyyyMMdd)_V1.bak"
   ```
   (If a backup with that name already exists today, bump to `_V2`, `_V3`, etc., per the project's existing `.bak` convention.)

2. **Generate the new hash and write it in**, using the same `bcryptjs` library the backend itself uses (already a project dependency, no install needed). Pick a strong password of your own choosing — this script does not enforce the 8-character minimum the `/enroll` API route does, so choose deliberately:
   ```powershell
   node -e "
   const bcrypt = require('bcryptjs');
   const fs = require('fs');
   const newPassword = 'PASTE_YOUR_NEW_PASSWORD_HERE';
   const hash = bcrypt.hashSync(newPassword, 12);
   const cfg = JSON.parse(fs.readFileSync('secrets/jd_portal_auth.json', 'utf8'));
   cfg.passwordHash = hash;
   fs.writeFileSync('secrets/jd_portal_auth.json', JSON.stringify(cfg, null, 2));
   console.log('Password rotated. totpSecret untouched:', !!cfg.totpSecret);
   "
   ```
   Edit `newPassword` in the script before running it. Clear your PowerShell history afterward if the machine is shared (`Clear-History`), since the plaintext password is briefly visible in the command.

3. **Verify**: sign in at `/portal/login` with the new password and your existing authenticator code. If it fails, restore the backup from step 1 and try again.

4. **Delete the backup** once you've confirmed the new password works (it contains the *old* bcrypt hash, not a plaintext password, but there's no reason to keep it once rotation is confirmed).

## Method B: full reset (rotates password AND authenticator enrollment)

Use this if you also want a fresh TOTP secret (e.g. lost the authenticator app, suspect the whole credential file was exposed) — it goes through the same one-time setup flow as the very first enrollment.

1. Back up and then delete `secrets/jd_portal_auth.json`:
   ```powershell
   cd C:\Users\haujo\projects\DEV\ask_aijohncareer
   Copy-Item secrets\jd_portal_auth.json "secrets\jd_portal_auth.json.$(Get-Date -Format yyyyMMdd)_prereset.bak"
   Remove-Item secrets\jd_portal_auth.json
   ```
2. Visit `http://localhost:5173/portal` — with no auth file present, `/portal/enroll`'s status check (`GET /api/auth/status` → `{ enrolled: false }`) redirects you there automatically (`PortalLogin.jsx`'s `useEffect`).
3. Set a new password (min. 8 characters, enforced by the `/enroll` route this time), scan the new QR code with your authenticator app, confirm with the 6-digit code.
4. Delete the pre-reset backup once confirmed working.

**This invalidates the old authenticator entry** — remove the old "AskCareerAI Portal" entry from your authenticator app after confirming the new one works, so you don't have two stale entries.

## VPS note

`secrets/jd_portal_auth.json` provisioning on the VPS is still an outstanding item (see `docs/todolist/todolist_25Jul2026.md` — remaining JD Automation Portal phases, deploy). Once the portal is deployed there, the same two methods apply — just run the commands against the VPS's copy of the file (over SSH) instead of the local one, and restart is still not required there either, for the same fresh-read-per-request reason.

## Limitations

- **No in-app "change password while logged in" UI exists today.** Both methods above are manual/file-level. If self-service in-portal rotation becomes worth building, it would need a new authenticated `POST /api/auth/change-password` route (verify current password + TOTP, then `hashPassword()` the new one) and a form in the portal — not built here since this guide was scoped as documentation only, not a feature request.
- Method A's script does not enforce a minimum password length (the `/enroll` route's 8-character check is bypassed since this writes the file directly) — pick a strong password deliberately.
