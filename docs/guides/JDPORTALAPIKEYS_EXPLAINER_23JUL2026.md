# What Happens When You Supply an API Key in the JD Portal

Plain-language walkthrough of the "API Keys" panel added 23 Jul 2026 (technical build/verification record: `docs/guides/JDPORTALBRINGYOUROWNKEY_23JUL2026.md`). This explains the actual behavior, step by step, for your own reference before relying on it.

## 1. Where your key goes when you paste it

The "API Keys" card (collapsed by default, above the New JD Run / History tabs) has one row per provider: OpenRouter and DeepSeek. When you paste a key and click **Save**:

- The key is sent once to the JD API server (`localhost:3010`), over your existing authenticated session.
- The server writes it to `secrets/jd_portal_llm_keys.json` on disk — a new file, gitignored (never committed to GitHub, same as `secrets/jd_portal_auth.json`).
- The browser never keeps a copy. After you click Save, the input field clears itself and the page only shows a short redacted preview (e.g. `sk-or-v1-628...`) — never the full key again.

## 2. What changes on your next Run

Nothing changes about *how* you run a JD — same "New JD Run" form, same Run button. But behind the scenes, when you click Run:

- The server checks: **do you have a personal key saved for the provider this run needs?**
  - **Yes** → your key is used for that run, and only that run.
  - **No** → the server falls back to its own key from `.env.local`/`.env.vps`, exactly like every run before this feature existed. Nothing breaks if you never touch the API Keys panel at all.
- Your key is never written into the server's own configuration, never logged to the console, and never appears in the "Command Preview" text (the preview only ever shows flags like `--llm=sonnet`, never a key).

## 3. What "Custom" model selection adds

The LLM dropdown now has a **Custom…** option alongside Sonnet/DeepSeek/Gemini. Picking it reveals:
- **Provider**: OpenRouter or DeepSeek — decides which API key (yours or the server's) and which endpoint gets used.
- **Model ID**: any model identifier that provider's key can actually access (e.g. `anthropic/claude-opus-4-8` via OpenRouter, or a DeepSeek model name). There's no dropdown of "all available models" — you type the exact id yourself.

This is independent of the key feature: you can use Custom with the server's default key, or with your own key, or use one of the three presets (Sonnet/DeepSeek/Gemini) with your own key. Any combination works.

## 4. What happens if the key you saved is wrong

The run will fail with a real error from OpenRouter/DeepSeek — e.g. `401 Unauthorized` — surfaced in the portal's error banner with the "Debug output" details expandable, same as any other run failure. The portal does **not** validate a key when you click Save; it only gets tested the next time you actually run something with it. If a run suddenly starts failing right after you save a key, that's the first thing to suspect.

## 5. What "Clear" does

Each provider row only shows a **Clear** button once a personal key is actually saved for it. Clicking Clear:
- Deletes your saved key from `secrets/jd_portal_llm_keys.json` (sets it back to `null`).
- The status text reverts to "Using the server's default key."
- Future runs immediately go back to using the server's `.env`-based key for that provider — no restart needed.

## 6. Scope — what this does and doesn't cover

- **Per-provider, independent**: saving an OpenRouter key doesn't affect DeepSeek, and vice versa.
- **Portal + CLI, not just the UI**: the same override is available from the command line — `python scripts/jd_scorecard_resume_v2.py --llm=sonnet --api-key=<key>`, or `--llm=custom --model=<id> --provider=openrouter|deepseek` for a model outside the three presets. The CLI's `--api-key=` doesn't read from or write to the saved `secrets/jd_portal_llm_keys.json` file — it's a separate, one-off override for that single terminal invocation.
- **v1 script unaffected**: `scripts/jd_scorecard_resume.py` (the older version) has none of this — no key override, no Custom model option. It's no longer used by the portal, so this doesn't matter unless you run v1 directly yourself.
- **Not implemented**: there's no UI to test/validate a key before running a real job, no usage/cost tracking per key, and no way to browse OpenRouter's live model catalog from within the portal (you type the model id yourself, deliberately, per the 23 Jul decision to avoid an extra network dependency).
