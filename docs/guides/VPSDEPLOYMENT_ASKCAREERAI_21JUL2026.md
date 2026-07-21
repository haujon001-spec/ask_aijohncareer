# askcareer-ai.com VPS Deployment — 21 July 2026

## Summary

Deployed the John Career Copilot app (this repo) to `152.42.214.111` under `askcareer-ai.com`, closing out the fix carried over from `todolist_20260519.md`. This VPS was previously dedicated to the trading-algo project (`aitradealgo-demo.com`) and was repurposed per user decision on 21 Jul 2026.

## What was actually broken

`docs/status/status_20Jul2026.md` had claimed the Caddyfile/docker-compose fix existed as uncommitted local changes. That was inaccurate — `git status` showed those files clean. The real, already-committed state (since commit `1fa97ef`, 30 Mar 2026) was:

- `Caddyfile` → `reverse_proxy john-career-copilot-app:3000`
- `docker-compose.prod.yml` → service `app`, `container_name: john-career-copilot-app`

These two already matched each other correctly. The actual bug was in `scripts/deploy-to-staging.sh`, which:
1. Ran plain `docker-compose` (no `-f` flag) — targeting the *other*, unrelated root `docker-compose.yml` (service `john-career-copilot`, no `container_name`, so its network alias never matched the Caddyfile).
2. Grepped the Caddyfile for the wrong string (`john-career-copilot:3000` instead of the actual `john-career-copilot-app:3000`).

## Fix applied

`scripts/deploy-to-staging.sh` (backup: `scripts/deploy-to-staging.sh.20260721_V1.bak`):
- All `docker-compose` calls now explicitly use `-f docker-compose.prod.yml`.
- The Caddyfile grep check now looks for `john-career-copilot-app:3000` (matching actual file content).
- Log-tailing on failure now references the correct service name `app` (was `john-career-copilot`, which doesn't exist as a service name in `docker-compose.prod.yml`).

Root `docker-compose.yml` was intentionally left untouched (user decision) — it's simply not used by the deploy path anymore.

## DNS

User swapped the A records: `askcareer-ai.com` moved from `187.127.118.219` → `152.42.214.111`; `aitradealgo-demo.com` now resolves to `187.127.118.219`. Verified propagated via public resolver (`nslookup askcareer-ai.com 8.8.8.8` → `152.42.214.111`) before deploying — a local/corporate resolver on the dev machine still cached the old answer, which is not a real blocker.

## VPS state before changes (inspected read-only first)

`152.42.214.111` (Ubuntu 24.04, DigitalOcean droplet `ubuntu-s-2vcpu-4gb-amd-sgp1-01`) was not a fresh box:
- nginx on :80 serving only the default Ubuntu placeholder page.
- `/root/trading/dashboard.py` (Flask) on :5000, monitored every 5 min by a cron job (`health_monitor.py`) — left **untouched** throughout this deployment.
- A system `caddy.service` that had been crash-looping for ~2 months (`bind: address already in use` against nginx).
- No Docker installed, no Let's Encrypt certs.

## Actions taken on the VPS

1. `systemctl stop nginx && systemctl disable nginx` — freed :80/:443. Confirmed the trading dashboard on :5000 was unaffected before and after.
2. `systemctl stop caddy && systemctl disable caddy` — removed the dead system Caddy unit so it can't fight the Dockerized Caddy for the ports.
3. Installed Docker Engine + Compose plugin via `get.docker.com`. Added a `/usr/local/bin/docker-compose` shim (`exec docker compose "$@"`) since only the `docker compose` plugin form was installed, and existing scripts/docs use the hyphenated `docker-compose` invocation.
4. Transferred the app (tarball over scp, excluding `node_modules`, `.git`, `.venv`, `data*`, `backup`, `logs`, `dist`, `.env*`, `secrets`) to `/opt/john-career-copilot/`, plus `.env.vps` renamed to `.env` (mode 600) for the real `OPENROUTER_API_KEY` / `DEEPSEEK_API_KEY`.
5. `docker compose -f docker-compose.prod.yml build --no-cache` then `up -d`.

## Verification (all passed)

- `docker compose ps` — both containers `Up`/`healthy`, no name conflicts.
- Internal routing: `docker compose exec caddy wget -qO- http://john-career-copilot-app:3000/api/health` → `{"status":"ok",...}`.
- `caddy validate --config /etc/caddy/Caddyfile` → `Valid configuration`.
- Let's Encrypt certs obtained for both `askcareer-ai.com` and `www.askcareer-ai.com` (ACME tls-alpn-01, confirmed in Caddy logs).
- External, from outside the VPS:
  - `https://www.askcareer-ai.com/api/health` → `200`, `{"status":"ok","profile":"loaded",...}`
  - `https://askcareer-ai.com` → `301` → `https://www.askcareer-ai.com/`
  - `http://www.askcareer-ai.com` → `301` → `https://www.askcareer-ai.com/`
  - Homepage HTML title: `John Hau - Career Copilot`
- Restart resilience: `docker compose restart` → both containers came back `Up`/`healthy` with no name conflicts.
- Trading dashboard on :5000 confirmed unaffected (same pre-existing `500` before and after, i.e. no new breakage introduced).

## Known follow-ups (not done in this session)

- `docker-compose.prod.yml` still has the obsolete `version: '3.8'` key (Compose plugin warns on every invocation) — harmless, cosmetic cleanup only.
- The trading dashboard's own `500` error on :5000 predates this work and is out of scope for askcareer-ai.com.
- JD Automation Portal Phase 7 deploy target updated to reuse this same VPS under `askcareer-ai.com` once its own Docker phase (Phase 5) is built — not yet started.
