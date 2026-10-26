# Todolist — 26 October 2026

## Intake
Latest todolist read: `todolist_26Aug2026.md`. No `docs/todolist/next_session.md` exists.
Carried top priority from 26 Aug: deploy the `/portal2` multi-profile epic to the VPS.

## SSH access — FIXED
`Permission denied (publickey)` on `root@152.42.214.111`. Local key `id_ed25519`
(MD5 `38:f7:…:d3:9d`) matched the DigitalOcean account key `www.askcareer-ai.com`, but
DO only injects account keys at droplet creation, so the droplet's `authorized_keys`
lacked it. Fixed by the user via the DO web console (appended the public key).

## Security alerts (DigitalOcean emails, 22-23 Oct 2026)
- **PHP (CVE-2026-115560):** PHP is not installed on the host or in any container
  (no `/etc/php`, no php packages/processes). Nothing to do.
- **Node.js (CVE-2026-111497, Brotli RCE):** Node runs only in the `app` and `jd-api`
  containers, both `node:18-alpine` (v18.20.8, **EOL since Apr 2025**, will not be patched).
  Decision: move to `node:22-alpine`. **DONE 26 Oct 2026** (see below).
  Scope narrowed by user: Node 22 + v3 COPY only; the `/portal2` epic deploy is NOT started.

## OS patching — DONE 26 Oct 2026
- Backup first: `/root/backup_pre_patch_20261026.tar.gz` (787 entries, 5 MB).
- `apt-get upgrade`: 61 packages incl. Docker 29.6.2 -> 29.9.2; reboot for apparmor.
- Rebooted. After reboot: 0 pending upgrades, no reboot-required flag, all three
  containers up (jd-api/app healthy, caddy up), `https://www.askcareer-ai.com` and
  `/portal` return 200.

## Node 22 rollout — DONE 26 Oct 2026
- Backups: `archive/Dockerfile*.20261026_V1.bak` (local); `Dockerfile*.20261026_pre_deploy.bak`
  and image tags `john-career-copilot-{app,jd-api}:pre_node22` on the VPS (rollback).
- `Dockerfile` + `Dockerfile.jd-api` -> `node:22-alpine`; jd-api now also `COPY`s `jd_scorecard_resume_v3.py`.
- Local: frontend build + both backends on Node 22.22 OK, `/` and `/portal` 200, bad login 401.
- VPS: scp (sha256 identical), `docker compose -f docker-compose.prod.yml build app jd-api` + `up -d`.
  Both containers healthy on Node v22.23.4, v3 script present/compiles, `/`, `/portal`,
  `/jd-api/api/health`, `/api/health` all 200. Caddy untouched.
- Not changed: VPS `backend/` code (still the 26 Aug state), so `/portal2` is still undeployed.

## Node 24 alignment — DONE 26 Oct 2026 (supersedes the Node 22 target above)
User decision: latest/safest and identical everywhere, no downgrades.
- Laptop: winget upgrade (after reboot cleared installer error 1618) 24.13.0 -> **v24.22.1** (npm 11.19.1).
  `npm run dev:all` verified: :3000, :3010, :5173 and `/portal` all 200.
- VPS: `Dockerfile` + `Dockerfile.jd-api` -> `node:24-alpine`; backups `*.20261026_pre_node24.bak`
  + rollback tags `john-career-copilot-{app,jd-api}:pre_node24` (Node 22 images); sha256 identical on transfer.
- Result: laptop, `app` and `jd-api` all report **v24.22.1**. Public `/`, `/portal`, `/api/health`,
  `/jd-api/api/health` 200; bad login 401; live chat 200; logs clean; containers healthy, 0 restarts.
- Local backups: `archive/Dockerfile*.20261026_V2.bak`.
- Still untested: a real portal login (password + MFA) and one real JD run — user to do once.

## Next (in order)
1. (Done above: Node 22 Dockerfiles + v3 COPY.)
2. Decide whether any real profile data (e.g. Matina Fung's) ships to production.
3. Deploy `/portal2` epic to VPS (scp-based; backup first; rebuild both `app` and `jd-api`). Not started, per user.
4. (Done: Dockerfile changes committed as `f07cfd9` and `b4a52f1`.)
5. Held items: unpushed local commits (do not push without asking); untracked
   `JD_HospitalAuthority_IT_Manager_Systems.json` needs a decision.
