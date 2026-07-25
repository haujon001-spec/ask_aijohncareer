# JD Portal — v2 Phase C: Step-Wizard Redesign + Light/Dark Theme, 25 Jul 2026

Third and final phase of the JD Portal v2 round scoped 23 Jul 2026 (see `docs/todolist/todolist_23Jul2026.md` "JD Portal v2" section; Phase A backend repoint in `docs/guides/JDPORTALV2BACKEND_23JUL2026.md`, Phase B company-grouped History in `docs/guides/JDPORTALV2PHASEB_23JUL2026.md`). Restructures the "New JD Run" tab from a flat two-panel stack into a 3-step wizard (**Configure → JD Run → Reports**) and adds a light/dark theme toggle to the previously dark-only fintech portal.

Scoping decisions confirmed with the user before implementation (this session): Configure = JD paste only, JD Run = CLI params + command preview + run/progress/force-stop, Reports = finished output; History stays a separate top-level tab, untouched; theme toggle defaults to dark.

## Changes

**New components** (`src/components/JDPortal/`):
- `JDWizard.jsx` — owns wizard state (`step`, `lastUpload`, `runResult`), renders `WizardSteps` nav + the active step's content. Auto-advances Configure → JD Run on successful JD save, and JD Run → Reports on run completion; the stepper itself is never gated — all three steps are clickable at any time.
- `WizardSteps.jsx` + `.css` — numbered-circle stepper (① Configure ② JD Run ③ Reports), modeled on the reference project's (`trading/web_portal/Unify_portal_20260628.py`) numbered-tab pattern. New component rather than an extension of the generic `TabBar` (which stays untouched for the New-JD-Run/History top-level switch).
- `JDRunStep.jsx` — `JDRunPanel.jsx` minus the finished-report block; on success calls `onComplete(result)` instead of holding `result` locally.
- `JDReportsStep.jsx` — the report-rendering block extracted verbatim from the old `JDRunPanel.jsx` (match score, strengths/gaps, download links, `DocViewer` wiring), plus an empty state ("No report yet") with a button back to JD Run when `result` is null.

**Removed:** `JDRunPanel.jsx` (backed up `.20260725_V1.bak` first, then deleted once both split components were verified working — nothing still imports it).

**`JDPortal.jsx`:** `view === 'new'` now renders `<JDWizard />` instead of `<JDUploadForm/><JDRunPanel/>` directly. `ApiKeySettings` unchanged (still rendered above both tabs — account-level settings, not part of the run wizard).

**Theme toggle:** `PortalShell.jsx` replaces its hardcoded `data-portal-theme="fintech"` with local state (`useState` seeded from `localStorage.getItem('jdPortalTheme')`, default `'fintech'`) plus a new sun/moon button in `.portal-header-actions`. Deliberately not the chat app's `ThemeContext`/`data-theme` — `src/index.css` already documents the portal's theme scoping as isolated from the chat app's toggle "in either direction," and this needed to be a separate bespoke palette per the user's decision.

**New light palette + variable cleanup** (`src/index.css`): added `[data-portal-theme="daylight"]` with full parity to the existing `[data-portal-theme="fintech"]` block (same ~20 variable names). Also added two new shared variables to both theme blocks so components don't need per-theme overrides of their own:
- `--portal-sunken-rgb` — the "recessed surface" color (form inputs, command preview, history cards, doc-viewer content) as a space-separated triplet, consumed via `rgb(var(--portal-sunken-rgb) / X)` so each of the 8 call sites keeps its own alpha.
- `--portal-glow-1`/`--portal-glow-2` — the shell's decorative background radial gradients.

Converted every hardcoded `rgba(5, 7, 13, X)` "sunken surface" occurrence across `JDPortal.css` (6), `PortalShell.css` (1), `DocViewerInline.css` (1), and `PortalAuth.css` (1, login/enroll input fields — found during the light-theme sweep, wasn't in the original hardcode list) to the shared variable. Also fixed two `color: #fff` rules (`DocViewer.css`, `DocViewerInline.css` — bold text inside rendered document content) to `var(--portal-text-primary)`; these would have gone unreadable against the new light theme's surfaces. Left untouched by design: `DocViewer.css`'s modal scrim (`rgba(2, 4, 9, 0.75)` — scrims stay dark in both themes) and the QR code's fixed light backdrop in `PortalEnroll.jsx` (needs to stay light for scannability regardless of theme).

All edited files backed up first per soul.md (`.20260725_V1.bak`, `PortalAuth.css`'s backup pulled from git HEAD after the fact since that file's need only surfaced mid-sweep — confirmed byte-identical to the pre-edit version).

No backend changes — the wizard steps call the same `runJd`/`fetchRunStatus`/`cancelRun`/`uploadJd` functions in `src/utils/jdApi.js` against the same `/api/jd/*` endpoints; `backend/lib/pythonRunner.js` untouched.

## Verification (soul.md §3.1/§14 — executed and confirmed, not just written)

Full local dev stack (`npm run dev:all`) driven with Playwright (installed ad hoc into the scratchpad per the established pattern), authenticated via the same temporary-credential-swap + live-TOTP technique used on 23 Jul (approved by user this session; `secrets/jd_portal_auth.json` backed up and restored immediately after — confirmed byte-identical to the original both times it was used).

- **Wizard flow:** pasted a real JD (Configure) → confirmed auto-advance to JD Run with the file prefilled and command preview correct → manually clicked all three stepper entries to confirm free navigation → confirmed the Reports empty state and its "Go to JD Run" button before any run existed.
- **Real run:** submitted a genuine `--scorecard-only --llm=sonnet` run from the JD Run step against a live-generated test JD; confirmed auto-advance to Reports on completion with a real match score (76/100), strengths/gaps, and download links rendered — not a mocked response.
- **Theme toggle:** toggled fintech ↔ daylight and screenshotted Reports, History, and the wizard's Configure step at both desktop (1440px) and mobile (420px) widths in both themes; visually confirmed readable contrast throughout, no leftover dark-only surfaces, numbered stepper's active-state gradient renders correctly in both themes.
- **DocViewerInline regression check:** opened a real history entry's scorecard inline view post-split — renders identically to pre-split behavior, bold headers still readable (this is what the `#fff` → `var(--portal-text-primary)` fix specifically protects).
- **Unaffected surfaces confirmed:** History tab and `ApiKeySettings` work exactly as before in both themes; the `.jd-portal { overflow-y: auto }` scroll fix from `JDPORTALBUGFIXES_23JUL2026.md` still holds (no regression to the `.portal-shell { height: 100vh; overflow: hidden }` bounding).
- **Responsive:** checked 1440px/760px/420px — stepper's number-badges collapse to icon-only at 480px, labels reappear at 768px, matching the existing header/main breakpoint conventions.
- **Console:** zero unexpected errors across all runs (only the expected pre-auth 401s and one intentional 409 from re-saving the same test JD twice).
- **Cleanup:** all test artifacts (`data_raw/jd/txt/JD_PhaseCVerification_*.txt`, `data_processed/PhaseCVerification/`, `src/data/jd/JD_PhaseCVerification_*.json`) removed after verification — none of it was real user data.

## Not in scope for this session

- Dynamic-width per-breakpoint enhancement (still carried forward, medium priority — see `docs/todolist/todolist_23Jul2026.md`).
- Remaining JD Automation Portal phases (NLP profile-update, Docker, VPS deploy).
- LinkedIn automation scoping.
