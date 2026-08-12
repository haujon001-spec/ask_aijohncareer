# JD Portal — Reports "View" Modal Width Fix (12 Aug 2026)

## What changed

The "View" popup opened from New JD Run → Reports (Scorecard/Resume/Cover
Letter buttons) was hard-capped at `max-width: 760px`, rendering as a
noticeably narrow column even on wide desktop monitors. The outer portal
shell already scales its content column up to 1800-2400px at wide
breakpoints, so this modal was the actual bottleneck, not the page layout.

## Fix

`src/components/JDPortal/DocViewer.css`:

- `.doc-viewer-modal` default `max-width` changed from a fixed `760px` to
  viewport-relative `90vw`, so it keeps scaling with window/monitor size.
- `@media (max-width: 768px)`: overlay padding reduced `12px → 6px`, modal
  `max-width` raised to `98vw`.
- `@media (max-width: 480px)`: overlay padding reduced `24px → 4px`, modal
  `max-width` raised to `99vw`.

No JS/component changes — CSS only. `.jd-portal-card` (the Reports card
holding Strengths/Gaps text and the download-button row, in `JDPortal.css`)
was deliberately left untouched — it already inherits the shell's wide
column and was out of scope per the user's confirmed decision.

## Why these values

Confirmed with user (`docs/todolist/todolist_12Aug2026.md`) before
implementation:
- Desktop: viewport-relative, not a wide fixed pixel cap.
- Mobile: move closer to full-bleed, not left as-is.
- Scope: modal only, not the Reports card's internal panels.

## Verification status

CSS-only change, applied under Vite HMR against the already-running local
dev server. **User-confirmed working on `/portal` desktop, 12 Aug 2026.**

`/portal2` (the multi-profile UI backed by `jd_scorecard_resume_v3.py`)
reuses `JDReportsStep.jsx`/`DocViewer.jsx`/`DocViewer.css` unmodified —
`JDWizardV3.jsx` imports `JDReportsStep` directly, and there is exactly one
`.doc-viewer-modal` class in the codebase — so it should already inherit
the same wide modal with no extra change. **Not yet click-confirmed on
`/portal2` itself** — deferred to next session per user request (see
`docs/todolist/todolist_12Aug2026.md`), since confirming it would require
the local-MFA credential-swap Playwright technique and the user preferred
to check it themselves.
