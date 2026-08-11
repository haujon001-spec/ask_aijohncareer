# JD Portal Phase 2 — Resume Onboarding + `/portal2` (11 Aug 2026)

## What this is

Phase 2 of the multi-tenant JD Portal epic. Phase 1 (10-11 Aug 2026) shipped a CLI-only
foundation (`scripts/jd_scorecard_resume_v3.py`) proving the pipeline works for any profile.
Phase 2 adds:

1. A way to bootstrap a brand-new profile from a raw resume file (`.docx`/`.txt`) —
   `scripts/update_profile_from_resume.py --profile=<Name> --create-new-profile`.
2. A parallel web UI, `/portal2`, for picking an onboarded profile, uploading a new resume to
   onboard one on the spot, and running the v3 JD-matching pipeline through the browser —
   without touching the existing `/portal` (v2, John-only).

A real second profile — Matina Fung — was onboarded and verified end-to-end as part of this work.
**Her data is intentionally never committed** (see Privacy below).

## Privacy: this repo is public

`gh repo view` confirmed `ask_aijohncareer` is a **public** GitHub repo. Any non-John profile
containing real PII must never be pushed. Two protections now exist:

- `.gitignore` ignores `/src/data/*/` by default (any new `src/data/<Name>/` folder), with explicit
  allow-lists for `src/data/jd/` (John's own blueprints) and `src/data/AlexRivera/` (the Phase 1
  synthetic test fixture — fictitious, safe to be public). A brand-new fictitious profile meant to
  stay public must be allow-listed the same way.
- `data_raw/<Name>/` and `data_processed/<Name>/` were already covered by the pre-existing
  `/data_raw/` / `/data_processed/` rules.

Verify with `git check-ignore -v src/data/<Name>/profile.json` before ever running `git add` near
a real profile.

## `scripts/update_profile_from_resume.py` — what changed

Backed up first (`update_profile_from_resume.py.20260811_V1.bak`), then extended in place (per
the user's choice — not forked like v2→v3, since this is a genuine extension of the same tool's
job, not a golden-engine change):

- **`--profile=<Name>`** — optional. Omitted → John's own flat `src/data/john_profile.json`,
  zero behavior change for existing manual usage. Given → `src/data/<Name>/profile.json`.
- **`--create-new-profile`** — new mode. Requires `--profile=<Name>`; hard-errors if that profile
  already exists (bootstrap-only). A new function (`create_new_profile()`) does a single holistic
  LLM extraction of an entire resume into the full `profile.json` shape — fundamentally different
  from the existing employer-scoped diff mode (`process_file()`), which only ever adds one
  employer's delta to something that already exists and can't bootstrap from nothing.
- **`.docx` input support** (`read_resume_text()`) — both modes. Walks paragraphs and table cells
  (including nested tables, since `Cell.text` already recurses into them) — needed because modern
  resume templates are often table-laid-out, not plain paragraphs.
- **`ai_projects` guidance tightened** — the extraction prompt now explicitly distinguishes
  "candidate personally built this software/AI system" from "candidate used an AI-powered vendor
  tool in a non-technical role." The first live extraction run populated `ai_projects` with HR
  initiatives that merely used AI assessment tools — not the field's intended meaning elsewhere in
  the schema (e.g. John's own trading platform). Fixed before the real write.
- **Fail-loud on missing metadata** — same 5 required fields as v3 (`name`/`location`/`phone`/
  `email`/`linkedin`); a genuinely incomplete source resume produces a clear error naming exactly
  which fields are missing, never a silently-incomplete profile.
- **Retired `deepseek-reasoner` alias fixed** — this script still had the pre-24-Jul-2026 retired
  model id; migrated to `deepseek-v4-flash` (same fix already applied to v2/v3 on 3 Aug 2026).
- **Genericized the diff-mode `SYSTEM_PROMPT`'s hardcoded "John Hau"** — same class of fix as v3,
  now derives the candidate's name from the loaded profile.

## Backend — additive, `/api/jd/*` and `/api/profile/*` (v2/portal) untouched

- **`backend/lib/pythonRunner.js`**: `runJdPipelineV3()`/`discoverOutputsV3()` are new siblings of
  the existing v2 functions (untouched) — spawn `jd_scorecard_resume_v3.py` with `--profile=`, and
  read from `data_processed/<Name>/<Employer>/...`. New `isPipelineBusy()` exposes the shared
  `currentRun` state.
- **Shared run-lock** (user decision): `/api/jd/run` and the new `/api/jd-v3/run` block each other
  — `jd_run.js`'s old router-local `runInProgress` boolean was replaced with a check against the
  same `isPipelineBusy()` both routers now share, so a v2 run and a v3 run can never execute
  concurrently and race on the same process-tracking state.
- **New routes**, all `requireAuth`-gated exactly like existing ones:
  - `GET /api/profiles` — lists onboarded profiles (scans `src/data/*/profile.json`, excludes
    John's flat file).
  - `POST /api/onboard` — spawns the extended Python script from an uploaded resume (base64-JSON
    body, not multipart — consistent with this codebase's existing paste-a-string upload pattern,
    no new dependency; route-scoped `express.json({limit:'10mb'})` override since the app-level
    limit is 2MB and applies globally).
  - `POST /api/jd-v3/run` (+ `/status`, `/cancel`) — profile-aware sibling of `/api/jd/run`.
  - `POST /api/jd-v3/upload` — reuses `jd_upload.js`'s existing router body, extended so
    `jdTxtDir` can be a per-request resolver function (not just a fixed string), avoiding a
    duplicate file.
- `backend/api/download.js`/`view.js` needed **no changes** — already root-relative and
  profile-path-agnostic.

## Frontend — new `/portal2` route, `/portal` untouched

- **`src/App.jsx`**: `/portal2/*` mirrors `/portal/*`, reusing `PortalAuthProvider`/`PortalShell`/
  `ProtectedRoute`/`PortalLogin`/`PortalEnroll` — same single shared password+TOTP gate as
  `/portal` (no per-user accounts; a profile **picker**, not separate logins).
- **`basePath` prop** threaded through `ProtectedRoute`, `PortalLogin`, `PortalEnroll`, `PortalShell`
  (6 hardcoded `/portal`-literal navigate/link targets fixed across these 4 files — 3 more than
  originally scoped, found by direct inspection) so both routes' auth flows work independently.
- **New**: `ProfilePicker.jsx` (dropdown, `GET /api/profiles`), `ResumeUpload.jsx` (file input →
  base64 → `POST /api/onboard`, nothing existing to adapt since no upload UI existed anywhere in
  this codebase before), `JDRunStepV3.jsx` (copy of `JDRunStep.jsx` targeting `/api/jd-v3/*`),
  `JDWizardV3.jsx`, `JDPortal2.jsx`.
- **Reused as-is**: `JDReportsStep.jsx` (verified purely driven by `result.outputs`/
  `result.downloadUrls`, zero hardcoded paths), `JDUploadForm.jsx` (given an optional `uploadFn`/
  `extraParams` prop pair, defaulting to the exact existing v2 behavior).

## Verification performed

- **v2/v3 parity**: `diff` confirmed every hunk falls into 5 expected buckets (docstring, `--profile=`
  resolution, path constants, name-literal→f-string, output headers) — no content-logic differences.
- **Matina Fung onboarding**: her CV's original header/contact block was missing entirely from the
  extractable text (no name, email, phone, LinkedIn anywhere — checked paragraphs, all table cells
  including nested tables, headers/footers, embedded images, text boxes, document properties);
  user manually added the header to the source docx, then supplied location + LinkedIn after a
  second gap was found. Final extraction: all 5 required metadata fields present, 8
  `professional_experience` entries, `ai_projects: []` (correctly empty — no personally-built
  software/AI systems in her background).
- **CLI pipeline**: `jd_scorecard_resume_v3.py --profile=MatinaFung` against her real Richemont JD
  — all three documents generated; `grep -ri "john hau"` swept the output, zero matches.
- **v2 regression**: `git diff --stat scripts/jd_scorecard_resume_v2.py` — no output (untouched).
- **Backend**: `node --check` on every new/modified file; jd-api dev server restarted cleanly with
  no startup errors; `GET /api/profiles` and `GET /api/jd/run/status` both return `401 Not
  authenticated` (not `404`), confirming the new routes mount correctly and auth gating is intact.
- **Frontend**: `npm run build` succeeds (88 modules transformed, no new errors — a pre-existing
  CSS minify warning unrelated to any file touched here).
- **Not yet done**: a live browser click-through of `/portal2` (login → pick/onboard a profile →
  run a JD → confirm Reports render) requires the portal's actual password, which this session
  doesn't have — left for the user to confirm.

## Explicitly out of scope (still deferred)

Real per-user login/MFA (portal2 reuses the single shared gate), making
`/api/profile/update-from-resume/propose`+`/approve` (the existing pure-JS diff-mode route)
profile-aware, and screenshot-to-JD-text capture.
