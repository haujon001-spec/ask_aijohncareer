# Status — 22 July 2026

## JD Portal Revamp — MFA-gated fintech portal

**Status: Built and verified locally. Not deployed to the VPS.**

- JD Automation Portal moved from a tab inside the public chat app to its own route (`/portal`), gated by password + TOTP MFA, with a dedicated dark navy/metallic-blue theme and an in-browser docx view mode.
- Full build record, verification log, and file list: `docs/guides/JDPORTALREVAMP_22JUL2026.md`.
- Public chat app (`/`) confirmed unaffected — same UI, same backend, verified via a live message send/reply in a real browser.
- Deploy to `askcareer-ai.com` (VPS `152.42.214.111`) remains **not done**, same reasons as Phase 2's VPS deploy (`docker-compose.prod.yml` has no `jd-api` service, no Python in the runtime image) — this is a Phase 5/7 JD Automation Portal roadmap item, not in scope for this session.

## `--ResumeAdjustment` flag + explainer deck (earlier today, 22 Jul 2026)

Carried over from this morning's session — see `docs/todolist/todolist_21Jul2026.md` for the full record. Both closed out before the JD Portal revamp work started.

## Known open items (unchanged, carried forward)

- Bring-your-own-key + dynamic LLM selection (OpenRouter, Claude Sonnet 5 model-slug confirmation) — still outstanding.
- JD Automation Portal Phases 3-7 (NLP profile-update, Docker, VPS deploy) — still outstanding, now includes wiring the new auth/view routes into the prod stack whenever that phase starts.
- LinkedIn job-search automation scoping — not started.
