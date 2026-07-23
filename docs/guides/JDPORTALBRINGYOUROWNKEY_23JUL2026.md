# JD Portal — Bring-Your-Own-Key + Dynamic Model Selection (23 Jul 2026)

Closes out the "Bring-your-own-key + dynamic LLM selection" item carried forward since 21 Jul 2026 (the model-slug half — `claude-sonnet-4.6` → `claude-sonnet-5` — was already done earlier today; this is the remaining user-supplied-key + dynamic-model half).

## Decisions (confirmed by user before implementing)

1. **Key storage**: server-side, gitignored file (`secrets/jd_portal_llm_keys.json`), matching the existing `jd_portal_auth.json` convention — not localStorage, not session-only.
2. **Model selection**: keep the existing Sonnet/DeepSeek/Gemini dropdown as quick defaults, add a **Custom** option with a free-text model-id field + provider selector, rather than fetching OpenRouter's full live catalog.
3. **Key precedence**: optional override — a saved personal key is used if present, otherwise falls back to the server's existing `.env.local`/`.env.vps` key. Nothing breaks for current usage if no key is ever saved.
4. **CLI scope**: covers both the portal UI and `jd_scorecard_resume_v2.py` directly (`--api-key=`, `--model=`, `--provider=` flags), per the original 21 Jul spec wording ("from the web portal UI or via a Python script").

## What was built

### Backend
- **`backend/lib/llmKeys.js`** (new) — `loadKeys`/`saveUserKey`/`clearUserKey`/`getKeyStatus`/`resolveUserKey`. Status responses only ever return `isSet` + a short redacted preview (`sk-or-v1-6280...`) — the raw key is never sent back to the browser once saved.
- **`backend/api/settings.js`** (new) — `GET /api/settings/llm-keys` (status), `POST /api/settings/llm-keys` (save, min 10 chars), `DELETE /api/settings/llm-keys/:provider` (revert to server default). Mounted at `/api/settings`, `requireAuth`-gated like every other JD route.
- **`backend/lib/pythonRunner.js`**: `isValidLlm`/`requiredKeyEnvFor` now accept `"custom"`; new `hasUsableKey()` checks *either* the server `.env` key *or* a stored user key before rejecting a run. `buildRunArgs` emits `--llm=custom --model=<slug> --provider=<provider>` when applicable. `runJdPipeline` resolves the effective provider, looks up any stored personal key, and — if present — injects it into **only the spawned child process's environment** (never written to `process.env` itself, never logged, never appears in the `console.log` of the spawned command since it goes through env, not argv).
- **`backend/api/jd_run.js`**: accepts `customModel: { provider, slug }` in the request body, validates it when `llm === "custom"`, and swaps the old `if (!process.env[requiredEnv])` check for `hasUsableKey(...)` so a saved personal key satisfies the requirement even with no server-side key configured at all.

### Python (`scripts/jd_scorecard_resume_v2.py`)
- New CLI flags: `--model=<id>` + `--provider=openrouter|deepseek` (used together when `--llm=custom`), and `--api-key=<key>` (works with **any** `--llm` choice, preset or custom — overrides the resolved key for that run only, no `.env` file changes needed).
- `LLM_CONFIGS` resolution extended with a `PROVIDER_ENDPOINTS` map so `custom` can construct `(MODEL, api_key_env, LLM_ENDPOINT)` from the CLI flags instead of a fixed preset.
- Usage docstring and the trailing "How to run this script" printout updated with both new flag examples.

### Frontend
- **`src/components/JDPortal/ApiKeySettings.jsx`** (new) — a `CollapsibleCard` (default collapsed) with one row per provider: password-style input, Save, and a Clear button that only appears once a key is actually saved. Shows "Using your saved key (...)" / "Using the server's default key" status per provider, refreshed after every save/clear.
- **`src/utils/jdApi.js`**: `fetchLlmKeyStatus()`, `saveLlmKey()`, `clearLlmKey()`; `runJd()` now also sends `customModel`.
- **`src/components/JDPortal/JDRunPanel.jsx`**: LLM dropdown gained a **Custom…** option; selecting it reveals a Provider select + Model ID text field. Command preview and the Run button's disabled logic both account for the new fields (Run is disabled if Custom is selected with no model id yet).
- **`src/components/JDPortal/JDPortal.jsx`**: `ApiKeySettings` mounted once, above the tab content (applies regardless of New JD Run vs. History, since keys aren't tab-specific).
- New `.jd-key-row` CSS (input + Save/Clear buttons in a row, wraps on mobile).

## Verification (soul.md §3.1/§14 — executed and confirmed, not just written)

**CLI, direct (not through the portal):**
- `--llm=custom --model=google/gemini-3.1-flash-lite-preview --provider=openrouter --scorecard-only`: succeeded, behaves identically to the existing `--llm=gemini` preset (same underlying model).
- `--llm=gemini --api-key=sk-or-v1-intentionally-invalid-test-key`: **failed with a real `401 Unauthorized` from OpenRouter** — proves the CLI override is actually honored (not silently falling back to the valid `.env` key), confirmed via the API Key line printed in the console header showing the deliberately-bad test value.

**Portal, full Playwright pass against the live dev stack** (same temp-credential-swap + live-TOTP technique used throughout today, user-approved; `secrets/jd_portal_auth.json` backed up and restored immediately after):
1. Confirmed initial state: `GET /api/settings/llm-keys` → both providers `userKeySet: false`, `envKeySet: true` — UI correctly showed "Using the server's default key" for both.
2. Saved the **real** OpenRouter key (read from `.env.local` at test time, never hardcoded into the test script) via the UI — status updated live to "Using your saved key (sk-or-v1-628...)".
3. Selected LLM = Custom, Provider = OpenRouter, Model ID = `google/gemini-3.1-flash-lite-preview`, mode = Scorecard-only. Command preview showed the exact expected CLI string.
4. Clicked Run — **a real API call succeeded end-to-end** through the full new path (portal → `hasUsableKey` validation → `runJdPipeline` resolving and injecting the stored key into the child's env → Python script's `--llm=custom` resolution → real OpenRouter call) — Match Score `62 / 100 — PARTIAL MATCH` rendered, no error banner.
5. Cleared the saved key via the UI — status reverted to "Using the server's default key" for both providers; confirmed `secrets/jd_portal_llm_keys.json` on disk shows `{ "openrouter": null, "deepseek": null }` afterward — no real key left persisted after the test.
6. Zero console errors across the entire pass.

## Not in scope

- Live-fetching OpenRouter's model catalog for a dropdown — deliberately deferred per user decision (free-text override chosen instead).
- Per-provider rate limiting or usage tracking for personally-supplied keys — out of scope, not requested.
- JD Portal v2 Phase C (step-wizard redesign + light/dark theme) — unaffected, still pending.
