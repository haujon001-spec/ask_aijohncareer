# LLM model refresh — 26 Oct 2026

## What changed (local repo only — NOT yet deployed to the VPS)
Checked the portal presets against OpenRouter's public catalog (`https://openrouter.ai/api/v1/models`, no key needed). Prices are $ per 1M tokens, input / output.

| Preset (portal dropdown) | Before | After | Price |
|---|---|---|---|
| Sonnet | `anthropic/claude-sonnet-5` | `anthropic/claude-sonnet-5.5` | 2.00 / 10.00 (unchanged price, newer) |
| Haiku (cheapest) — replaces Gemini in the UI | `google/gemini-3.1-flash-lite-preview` | `anthropic/claude-haiku-5.5` (new key `haiku`) | 0.10 / 0.50 |
| DeepSeek | `deepseek-v4-flash` | unchanged — still cheapest output; v4.1-flash has dearer output (1.00) | 0.091 / 0.182 |
| Chat slot `deepseek` (legacy id) | Gemini 3.1 Flash Lite | Claude Haiku 5.5 | |
| Chat slot `nemotron` (legacy id) | `deepseek-reasoner` (retired alias) | `deepseek-v4-flash`, `reasoning_effort: low` | |

`gemini` is still accepted by the CLI/API for backward compatibility but is no longer in any dropdown.

Files: `scripts/jd_scorecard_resume_v2.py`, `_v3.py`, `scripts/update_profile_from_resume.py`, `backend/lib/{pythonRunner,llmClient}.js`, `backend/api/jd_run{,_v3}.js`, `backend/server.js`, `src/components/{ChatPage,ModelSelector}.jsx`, `src/components/JDPortal/{JDRunStep,JDRunStepV3,ProfileUpdateFromResume}.jsx`. Backups: `archive/*.20261026_V3.bak`.

## Verification (real runs, throwaway JD, outputs deleted afterwards)
- Haiku 5.5: scorecard 21 KB (2m44s), resume 17 KB, cover letter ~2.9 KB — all OK.
- Sonnet 5.5: scorecard 23 KB (1m50s), resume 17 KB (4m48s) — OK.
- Chat slot `deepseek` (Haiku 5.5): live answer OK.
- Chat slot `nemotron` (DeepSeek V4 Flash): request reaches DeepSeek but returns **402 Insufficient Balance** — the DeepSeek API account needs credit. Not a code fault.

## Findings worth knowing
- **Both new Claude models are reasoning models.** They spend hidden "thinking" tokens: the resume call hit `finish_reason=length` and needed the pipeline's length-retry (Haiku went 20k -> 40k -> 64k, ~37k reasoning tokens; Sonnet 20k -> 40k). Works, but real cost/latency is above sticker price — Haiku is still far cheaper than Sonnet.
- Sonnet 5.5 emits Markdown `#` headings in the scorecard; these appear literally in the DOCX (22 paragraphs). DeepSeek scorecards already did the same — pre-existing, not a regression.
- Test JD was outside the project tree, so blueprint generation was skipped (`not in the subpath` warning); portal runs use in-project JDs and are unaffected.
- `backend/server.js` logs the first 30 characters of the DeepSeek key at startup — worth trimming (soul.md §4).

## Production status
VPS still runs the old model ids. Deploy together with the `/portal2` epic (the local `pythonRunner.js` already contains `/portal2` changes, so a partial scp would ship them unintentionally).

## Addendum — DeepSeek: Flash (cheap) vs Pro (deep thinking), 26 Oct 2026
Source: https://api-docs.deepseek.com/quick_start/pricing (and /guides/thinking_mode). Your account's `/models` lists `deepseek-flash` and `deepseek-v4-pro`.
- The portal had been calling `deepseek-v4-flash`, which DeepSeek now documents as a **legacy alias** served by DeepSeek-V4.1-Flash-1017 at Flash prices (no retirement date given). Moved to the official id `deepseek-flash` before it can be retired like `deepseek-reasoner` was.
- DeepSeek's own prices, $ per 1M tokens, off-peak / peak (peak = 01-04 and 06-10 UTC, Mon-Fri; off-peak is half): Flash input 0.15/0.30, output 0.60/1.20; Pro input 0.66/1.32, output 1.98/3.96. (The OpenRouter figures quoted earlier were the reseller's, not DeepSeek's.)
- Both models support thinking on/off (default on) and effort `low|high|max` via `reasoning_effort` and `{"thinking":{"type":"enabled|disabled"}}`.

| Portal / CLI option | Model id | Effort | Real test (scorecard, same JD) |
|---|---|---|---|
| `deepseek` — "DeepSeek Flash (cheap)" | `deepseek-flash` | low | 76 s, 23.5 KB |
| `deepseekpro` — "DeepSeek Pro (deep thinking)" | `deepseek-v4-pro` | high | 264 s, 22.5 KB |

CLI: `--llm=deepseek` or `--llm=deepseekpro` (v2, v3, update_profile_from_resume). Chat backend DeepSeek slot now `deepseek-flash`. Effort for Pro is set by `LLM_DEEPSEEK_REASONING_EFFORT` in the Python scripts and `reasoningEffort` in `backend/lib/llmClient.js`. Not yet used: `max` effort and thinking-disabled mode (cheapest of all) — easy follow-ups. Backups: `archive/*.20261026_V4.bak`. DeepSeek account topped up ($20, balance 19.78 after tests). Still local only — not deployed.
