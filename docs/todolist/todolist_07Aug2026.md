# Todolist — 7 August 2026

## Intake (per soul.md §8.1)

Read `soul.md` and `todolist_05Aug2026.md` before starting — yesterday's session fixed a
`john_profile.json` JSON syntax bug that was crashing the JD Portal pipeline, tightened the cover
letter's company coverage + length, added Reports-view copy-to-clipboard buttons, committed
(`ab7c31a`), pushed to `origin/main`, and deployed to production (`askcareer-ai.com`). Full record:
`todolist_05Aug2026.md`'s two "New today (6 Aug 2026...)" sections.

## Carried over from 6 Aug 2026 — explicit user instruction to pick up tomorrow

1. **Live-verify the production deploy through the actual portal UI.** Everything so far was
   verified locally (`--llm=sonnet --coverletter-only` run) or via container/health checks
   (`sha256sum`, fix-marker greps, `/`, `/jd-api/api/health`, `/portal` all 200) — not yet exercised
   as a real end-user run through `https://www.askcareer-ai.com/portal`. Confirm:
   - The cover letter's 5-company cap (no Siemens H.K. Ltd. / Alco Plastic Products Ltd), the
     standalone recommendations paragraph, and the shorter overall length all come through in a
     live-generated letter.
   - The new per-section Copy buttons on the Reports view's Strengths/Gaps actually copy to the
     clipboard when clicked in a browser (only build-verified yesterday, never click-tested).
2. **Commit the pending `todolist_05Aug2026.md` doc update.** Yesterday's deploy record (the
   "Deployed to production" section documenting the `scp`/rebuild/verify steps) was written to that
   file but deliberately left uncommitted — user wanted to defer the commit to today rather than
   commit it same-day as the code change.

## Also still open (carried further back, unchanged from 6 Aug 2026 — see `todolist_05Aug2026.md`
## item 10 for full context, not re-actioned yesterday)

3. Live-verify the DeepSeek token-retry + reasoning-effort fix with a real rerun of
   `JD_Invesco_IT_AssociateDirector.txt --refresh-blueprint --llm=deepseek`.
4. Older 31 Jul backlog: LinkedIn automation discovery-path decision, Manulife resume regen
   decision, VPS hardening, dev-env docs, Job Tracker status fields.
5. Cover-letter Para 3 achievement density — flagged 6 Aug as an open nuance (still stacks several
   metrics across 3 companies rather than a strict 2-3-achievements-total count); revisit only if
   today's live read of the letter still feels too dense.

## New today (10 Aug 2026) — Multi-Profile / Multi-Tenant JD Portal (requirements captured, NOT yet
## scoped or implemented)

Context: earlier today's session was a one-off, outside-the-repo deliverable for a different
candidate (Matina Fung — JD match scorecard, tailored resume, cover letter for a JEC role),
produced entirely under `C:\temp\matina\Outputs\` specifically so it would never touch
`src/data/john_profile.json` or any John-Hau-only pipeline path. That one-off surfaced the real
ask below: turn the JD Portal from a single-tenant (John Hau only) tool into a genuine multi-user
product. Captured verbatim from the user, not yet broken into an implementation plan pending the
clarifying-question round (see session notes):

6. **Multiple profiles, not just John Hau.** Ability to create new profiles for other people (e.g.
   Matina Fung, Leslie Cheung), each with their own folder structure, and their own ability to
   convert their existing resume/CV into an authoritative single-source-of-truth profile — the same
   role `src/data/john_profile.json` plays today.
7. **Per-user profile files.** e.g. `src/data/MatinaFung_profile.json`, and so on for each new user
   — implies the pipeline scripts (`jd_scorecard_resume_v2.py` and friends) and the portal backend
   need to resolve "which profile" per request rather than hardcoding
   `src/data/john_profile.json`.
8. **New script + web portal surface for multi-user profiles.** Not a small patch — user explicitly
   frames this as needing new automation (beyond the existing John-Hau-only
   `scripts/jd_scorecard_resume_v2.py`, which per soul.md's golden rule stays untouched/immutable)
   and new portal UI to manage more than one person's data.
9. **Per-user login with their own MFA.** Each user authenticates into their own profile only — an
   extension of the existing password/TOTP MFA gate built for the John Hau `/portal` route (see
   `jd_portal_revamp_22jul2026.md` memory) into a real multi-account auth model, not a single shared
   gate in front of single-tenant data.
10. **Screenshot-to-JD-text capture.** On mobile, LinkedIn does not allow copying/pasting JD text
    out of the app — need the ability to feed in a JD via screenshot (implies OCR or an
    image-understanding step) as an alternative input path to today's paste-JD-text flow.

**Explicitly not yet actioned:** no scoping, architecture decisions, data-model design, or auth
design has been done for items 6-10 — this section only records the requirements as given, pending
the clarifying-question round from the same session.

**Clarifications captured (10 Aug 2026, same session) — decisions only, no implementation yet:**
- **Priority:** deferred. Not the next thing to build — stays behind today's carried-over items
  (live-verify the production deploy, commit the pending `todolist_05Aug2026.md` doc update) until
  explicitly prioritized.
- **Profile onboarding (item 6):** self-service — each new user signs up and uploads their own
  resume directly through the portal (no admin-provisioning step), which then runs through an
  LLM-extraction step (in the spirit of `scripts/update_profile_from_resume.py`) to bootstrap their
  own `<Name>_profile.json`.
- **Per-user auth (item 9):** extend the existing password + TOTP model already proven on the John
  Hau `/portal` route (otplib) — keyed per-user, each person gets their own password and own
  TOTP secret/QR enrollment, strictly scoped to their own profile data only.
- **JD screenshot capture (item 10):** use a vision-capable LLM call (e.g. Claude/Gemini via the
  existing OpenRouter integration) to transcribe JD text directly from a screenshot — no new OCR
  infrastructure, reuses the existing `call_llm()` pattern.

Still open before real scoping can start: self-service signup's data-isolation/PII-handling posture
now that this system would hold other real people's personal information, not just John Hau's.

**Folder/data-model layout decided (10 Aug 2026, later same day):** per-profile sandboxing —
`data_raw/<profilename>/`, `data_processed/<profilename>/`, `src/data/<profilename>/` — mirroring
today's shared top-level trees but namespaced per user. This is scoped for a **new
`scripts/jd_scorecard_resume_v3.py`**, not a v2 change — v2 (`scripts/jd_scorecard_resume_v2.py`)
stays untouched/immutable per soul.md's golden rule (§8.1), same precedent as v1→v2. Still
undecided: exact per-profile sub-tree shape under each namespaced folder (e.g. does
`data_processed/<profilename>/<Employer>/ScoreCard|resume|CoverLetter/` carry over unchanged, just
nested one level deeper?), and how `src/data/<profilename>/` relates to the already-decided
`src/data/<Name>_profile.json` naming from item 7 above (single file vs. a folder). Priority
remains deferred — captured here for when this epic is actually scoped/built.
