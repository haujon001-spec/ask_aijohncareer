# Todolist — 12 August 2026

## Intake (per soul.md §8.1)

Read `soul.md` and the latest 3-4 todolists (`todolist_11Aug2026.md`,
`todolist_07Aug2026.md`, `todolist_05Aug2026.md`, `todolist_03Aug2026.md`)
before starting. 11 Aug closed with the multi-profile epic Phase 1+2 shipped
(`2dccb72`, `bcc504b`), the master resume generator shipped (`a911303`), and
the DeepSeek retry-fix live-verified (`9daa6a6`). Working tree was clean at
close. Two items were explicitly carried to today: the `/portal2` browser
click-through (needs the user's real portal password), and — new as of this
session — a Reports-view width fix.

Naming note: this feature was first raised against `todolist_11Aug2026.md`
(user pointed at that file directly); per soul.md's per-session dated-doc
convention it's re-filed here as the current day's open item instead. The
original note in `todolist_11Aug2026.md` is left as-is as the historical
record of when/how it was first scoped.

## New today (12 Aug 2026) — Reports view width resize (scoped, not yet built)

**Feature request:** widen the "View" modal (Scorecard/Resume/Cover Letter
popup) opened from New JD Run → Reports, on both desktop and mobile, to
better use the available horizontal space. User flagged via screenshot that
the popup renders as a narrow fixed column even on a wide desktop viewport.

Root cause: `src/components/JDPortal/DocViewer.css` — `.doc-viewer-modal` is
hard-capped at `max-width: 760px` (line 15) with no wider-breakpoint
override, unlike the outer portal shell (`PortalShell.css`) which already
scales its content column up to 1800px/2000px/2400px at wide breakpoints.
Rendered from `src/components/JDPortal/DocViewer.jsx`, opened via the "View"
buttons in `src/components/JDPortal/JDReportsStep.jsx`.

Decisions confirmed with user before implementation:
- **Desktop width:** viewport-relative (`~90vw`), not a wide fixed pixel cap
  — so it keeps scaling with the window/monitor size rather than plateauing.
- **Mobile width:** also move closer to full-bleed — reduce the current
  12-24px overlay padding further so the modal uses nearly the full mobile
  screen width, not just leave existing `@media (max-width: 768px/480px)`
  behavior unchanged.
- **Scope:** modal only. The Reports card itself (Strengths/Gaps panels,
  download-button row in `JDPortal.css`) already inherits the wide
  1800px+ shell width and is not part of this change.

Implementation plan: adjust `.doc-viewer-modal` in `DocViewer.css` to
`max-width: 90vw` at the default/desktop tier, then tighten
`.doc-viewer-overlay` padding and widen `.doc-viewer-modal` further inside
the existing `@media (max-width: 768px)` / `@media (max-width: 480px)`
blocks for near full-bleed mobile. No JS/component changes expected — CSS
only.

**Status: implemented and user-verified on `/portal` (desktop, 12 Aug
2026).** `DocViewer.css`/`DocViewer.jsx` are shared, unmodified-by-v3 code —
`JDWizardV3.jsx` imports `JDReportsStep` directly (profile-agnostic reuse,
per its own code comment), and there is exactly one `.doc-viewer-modal`
class in the codebase — so `/portal2` (the v3/multi-profile UI) should
already render the same wide modal with no extra change needed.

**Open for next session:** click-confirm the wide modal on `/portal2`
specifically (e.g. via Matina Fung's profile or a fresh onboarded profile).
Not yet done — deferred because it requires the local-MFA
credential-swap-and-restore Playwright technique (see
`jd_portal_bugfixes_23jul2026` memory), and the user chose to check it
themselves next time rather than have that done today. Guide:
`docs/guides/JDREPORTSVIEWWIDTHFIX_12AUG2026.md`.

## Carried over from 11 Aug 2026 (still open, not actioned since)

- **Immediate next step:** user to click through `/portal2` themselves (real
  password required) — login → profile picker shows Matina Fung → run her
  Richemont JD (or onboard a fresh profile via `ResumeUpload`) → confirm the
  Reports step renders and downloads work. Backend routes and the v3
  pipeline are already verified via CLI/`node --check`/`npm run build`; only
  the actual UI click-path is unconfirmed.
- Backend/auth: extend the existing password+TOTP model to per-user identity
  (today: one shared credential set, JWT hardcoded to `{user: 'john'}`).
- Screenshot-to-JD-text capture (vision-LLM call via existing OpenRouter
  `call_llm()` pattern).
- `/api/profile/update-from-resume/propose`+`/approve` still not
  profile-aware (separate from the Python-script extension shipped 11 Aug).
- Data-isolation/PII-handling posture beyond "minimal" if the user base
  grows beyond a handful of known people.
- Older 31 Jul backlog (still unactioned): LinkedIn automation discovery-path
  decision, Manulife resume regen decision, VPS hardening, dev-env docs, Job
  Tracker status fields.
- Cover-letter Para 3 achievement density — open nuance, revisit only if a
  live read still feels too dense.
