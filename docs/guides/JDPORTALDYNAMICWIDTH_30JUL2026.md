# JD Portal — Dynamic Width Further Enhancement (30 Jul 2026)

**Requested:** 23 Jul 2026, carried forward as medium priority through 25/30 Jul as todolist item 8. Explicitly flagged to need "a proper look at a few real intermediate widths (e.g. 1440px, 1600px laptop panels) before picking values" rather than guessing.

**Status: Done and verified.**

## Context

`PortalShell.css`'s `.portal-main` used one flat rule for all desktop widths: `width: calc(100% - 48px); max-width: 1800px`. The 23 Jul fixed-gutter change was confirmed a big improvement over the prior `max-width: 960px` cap, but the user still saw unused space on desktop and asked for per-breakpoint gutter/max-width tuning rather than one constant.

## Measurement before picking values

No project skill exists yet for launching this app (none found under `.claude/skills/`); used the `run` skill's browser-driven fallback pattern. `chromium-cli` isn't installed, so drove the already-running Vite dev server (`localhost:5173`) directly with `playwright-core`'s `chromium` launcher instead (project has `playwright-core` + `playwright` CLI installed, confirmed via `npx playwright --version`). No portal login needed — `PortalShell` (and its `.portal-main` container) wraps `/portal/login` too, so the unauthenticated login route was enough to measure the real box model.

Measured `.portal-main`'s actual bounding box vs. viewport width, before any change (old flat `max-width: 1800px`):

| Viewport | Content width | Gutter/side |
|---|---|---|
| 1440px | 1392px | 24px |
| 1600px | 1552px | 24px |
| 1920px | 1800px | 60px |
| 2560px | 1800px | **380px** |

Confirmed the complaint precisely: the two laptop-panel widths named by the user (1440/1600) were already tight and fine — the real problem was the flat 1800px cap not scaling for wide/ultrawide monitors, ballooning to 380px of dead margin per side at 2560px.

## Change made (`src/components/JDPortal/PortalShell.css`)

Kept the existing `width: calc(100% - 48px); max-width: 1800px` base rule untouched (it's correct for ≤1920px) and layered two new `min-width` breakpoints on top, raising only the cap:

```css
@media (min-width: 1921px) {
  .portal-main { max-width: 2000px; }
}
@media (min-width: 2560px) {
  .portal-main { max-width: 2400px; }
}
```

Tablet/mobile breakpoints (`@media (max-width: 768px)` / `480px`, padding-only) were left untouched per the user's own framing of the ask ("current behavior kept for tablet/mobile").

## Verification (soul.md §3.1 + §14)

Re-measured the same way after the change:

| Viewport | Content width | Gutter/side | vs. before |
|---|---|---|---|
| 480px | 432px | 24px | unchanged |
| 768px | 720px | 24px | unchanged |
| 1440px | 1392px | 24px | unchanged (already good) |
| 1600px | 1552px | 24px | unchanged (already good) |
| 1920px | 1800px | 60px | unchanged (already good) |
| 2200px | 2000px | 100px | was 200px |
| 2560px | 2400px | **80px** | was 380px |
| 3440px (ultrawide, not in original ask) | 2400px | 520px | was 820px — better but still large; out of scope for this pass, flagged below |

Screenshot at 2560px confirmed the header/content still renders correctly (dark theme, no layout shift), `console --errors` equivalent (Playwright console listener) showed zero console errors on load.

**Not addressed, flagged for a future pass if relevant:** true ultrawide monitors (≥3000px, e.g. 3440×1440) still see a large gutter (520px/side) since no breakpoint exists above 2560px — wasn't part of the original 1440/1600/"very wide desktop" ask, left out to avoid guessing at a cap for a resolution nobody reported using.
