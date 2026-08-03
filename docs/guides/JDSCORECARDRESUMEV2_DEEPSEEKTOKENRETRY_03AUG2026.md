# jd_scorecard_resume_v2.py — DeepSeek reasoning-token truncation auto-retry (3 Aug 2026)

## The failure

Portal run via the "JD Run" tab (`JD_Invesco_IT_AssociateDirector.txt`, `--llm=deepseek`, mode=all,
`--ResumeAdjustment`) failed on the Resume step:

```
RuntimeError: OpenRouter returned empty content for 'Resume' call
(model=deepseek-reasoner, finish_reason='length', refusal=None). This usually means
the model ran out of max_tokens before producing an answer, or refused the request —
check the values above.
```

DeepSeek usage dashboard for the same window showed 748,852 tokens across 73 requests
for $0.17 — consistent with heavy reasoning-token spend, not a request volume problem.

## Root cause

Unlike the [23 Jul Sonnet-5 truncation fix](JDSCORECARDRESUMEV2_SONNET5TOKENBUDGET_23JUL2026.md)
(where `reasoning_tokens: 0` throughout — Sonnet was simply verbose), `deepseek-reasoner` is an
actual reasoning model: its hidden chain-of-thought is billed against the same `max_tokens`
budget as the visible answer. On a complex JD (Resume call, `max_tokens=20000`), reasoning alone
can consume the entire budget, leaving zero tokens for the visible `content` — `finish_reason`
comes back `"length"` with `content: null`. Reasoning length varies per JD/profile complexity, so
a single static `max_tokens` bump (the 23 Jul fix's approach) isn't reliable for this model the
way it was for Sonnet — the right budget can't be known in advance.

Also noticed in passing: the error message hardcoded "OpenRouter returned..." even though
`--llm=deepseek` calls `api.deepseek.com` directly, not OpenRouter — misleading during triage.

## Fix (`scripts/jd_scorecard_resume_v2.py`, `call_llm()`)

1. **Auto-retry on `finish_reason == "length"`** instead of failing on the first hit: doubles
   `max_tokens` (`LLM_LENGTH_RETRY_MULTIPLIER = 2`) and retries, up to `LLM_LENGTH_RETRY_ATTEMPTS
   = 2` extra attempts, capped at `LLM_MAX_TOKENS_CEILING = 64000`. For the Resume call this means
   20000 → 40000 → 64000 before finally giving up. Retries share the existing
   `LLM_MAX_ATTEMPTS = 3` request-attempt budget already used for connection/status retries (no
   separate attempt counter needed — 2 length-retries exactly consumes the 3 total attempts).
2. **Final error message now generic to the active provider** (`f"{MODEL} returned/truncated..."`
   instead of a hardcoded "OpenRouter"), and reports how many automatic retries were already
   exhausted and the final `max_tokens` reached.
3. Empty-content and `finish_reason == "length"` checks unchanged in spirit from the 23 Jul fix
   (still discards partial/incomplete output rather than shipping it) — they now fire only after
   the retry budget is exhausted.

## Verification (soul.md §3.1 — executed, not just written)

A full real DeepSeek pipeline run wasn't used for verification (would cost real reasoning tokens
to reliably reproduce a multi-thousand-token truncation on demand, and success is
input-dependent). Instead, the actual edited `call_llm()` function was extracted from the file via
`ast` and executed against a mocked HTTP layer reproducing the exact failure shape from the
screenshot (`finish_reason: "length"`, `content: null`, `model: deepseek-reasoner`,
`reasoning_tokens: 19998` of a 20000 budget):

- **Truncate-once-then-succeed**: first call returns the truncated shape, second call (after
  auto-retry) returns valid content. Confirmed the retried request's `max_tokens` was `40000`
  (doubled from `20000`) and the function returned the successful content — the exact recovery
  path a real DeepSeek run hitting this would now take.
- **Truncate-every-attempt**: all 3 calls return the truncated shape. Confirmed `max_tokens`
  escalated `20000 → 40000 → 64000` across the three requests, then the function raised
  `RuntimeError` with a clear, provider-agnostic message (`"deepseek-reasoner returned empty
  content..."`) instead of the misleading "OpenRouter returned..." wording.

Both scenarios passed. `python -c "import ast; ast.parse(...)"` confirmed the full file still
parses cleanly after the edit.

**Not yet verified**: a live rerun of the original failing portal request
(`JD_Invesco_IT_AssociateDirector.txt`, `--llm=deepseek`) end-to-end against the real DeepSeek API,
to confirm this specific JD now succeeds within the new 64000-token ceiling rather than still
exhausting it. Flagged as the next step before considering this closed.

## Backup

`scripts/jd_scorecard_resume_v2.py.20260803_V1.bak` taken before editing, per soul.md safe-edit
workflow.

## Follow-up, same day — the real root cause: DeepSeek's default reasoning effort

A live run surfaced a second, related failure before the truncation-retry fix above could be
verified: `--refresh-blueprint --llm=deepseek` (mode=all → 4 sequential DeepSeek calls) exceeded
the portal's 900s timeout (`JD_RUN_TIMEOUT_MS`, `backend/jd_api_server.js:39`) and was killed
("JD pipeline timed out"). By contrast, the same JD completes via Gemini in under 50s and works
fine with Sonnet too — pointing at something DeepSeek-specific, not a generic pipeline slowness
issue.

**Research (WebSearch/WebFetch against DeepSeek's current API docs, 3 Aug 2026):**
- `deepseek-reasoner` — the model id this script and `backend/lib/llmClient.js` both hardcoded —
  is a **legacy alias retired 24 Jul 2026**. It's still routed transparently to
  `deepseek-v4-flash`'s thinking mode today (explains why the DeepSeek usage dashboard billed
  these runs under "deepseek-v4-flash" despite the script requesting "deepseek-reasoner"), but
  relying on a retired alias is a latent breakage risk.
- DeepSeek's current lineup is exactly two models: `deepseek-v4-flash` (fast/cheap) and
  `deepseek-v4-pro` (quality-focused, ~3x the price, slower) — flash already is the fast tier,
  there is no faster reasoning option to switch to within DeepSeek.
- **Root cause of both bugs**: thinking mode is enabled by default with `reasoning_effort: "high"`
  whenever a request doesn't specify otherwise, and the script never did. High-effort thinking
  generates very large hidden chain-of-thought token counts before any visible answer — slow
  (explains the timeout) and, per the earlier truncation bug, can consume the entire `max_tokens`
  budget outright (explains why `content` came back empty at `finish_reason='length'`).
- Confirmed raw REST fields (not the OpenAI-SDK wrapper syntax) via the DeepSeek docs:
  `{"thinking": {"type": "disabled"}}` to fully disable reasoning, or
  `{"reasoning_effort": "low"|"high"|"max"}` to dial it down ("medium" is not a valid value).
  `v4-pro` currently only supports high/max and treats `"low"` as `"high"` rather than rejecting
  it — so setting `"low"` unconditionally is safe across both DeepSeek models.

**User's decisions (asked before implementing, per soul.md):**
1. Keep thinking mode **enabled** but drop `reasoning_effort` to **"low"** (not fully disabled,
   not left at the slow "high" default) — still a reasoning model, just brought back in line with
   Sonnet/Gemini's latency.
2. **Migrate the model id now** from the retired `"deepseek-reasoner"` alias to the official
   `"deepseek-v4-flash"`, in both `scripts/jd_scorecard_resume_v2.py` and
   `backend/lib/llmClient.js` (kept consistent rather than fixing only the Python path).

**Implemented:**
- `scripts/jd_scorecard_resume_v2.py`: `LLM_CONFIGS["deepseek"]` model id →
  `"deepseek-v4-flash"`; new `LLM_DEEPSEEK_REASONING_EFFORT = "low"` constant; `call_llm()` now
  adds `payload["reasoning_effort"]` whenever `LLM_ENDPOINT` is DeepSeek's (gated so
  OpenRouter-routed Sonnet/Gemini calls never receive an unrecognized field). Backed up first to
  `jd_scorecard_resume_v2.py.20260803_V2.bak`.
- `backend/lib/llmClient.js` (the Node-side "Update from Resume" LLM call — a separate code path,
  same bug class): same model-id migration, and `payload.reasoning_effort = 'low'` added whenever
  `provider === 'deepseek'`. Backed up first to `llmClient.js.20260803_V1.bak`.

**Verification (mocked, not yet live):**
- `python -c "import ast; ast.parse(...)"` and `node --check backend/lib/llmClient.js` both
  confirm clean syntax after the edits.
- Extracted the real, edited `call_llm()` and ran it against mocked HTTP responses: confirmed a
  request against a DeepSeek endpoint includes `reasoning_effort: "low"` in its payload, and a
  request against the OpenRouter endpoint (Sonnet) omits the field entirely — the gating logic
  behaves as intended.
- **Not yet verified**: an actual live DeepSeek rerun of the original failing command
  (`JD_Invesco_IT_AssociateDirector.txt --refresh-blueprint --llm=deepseek`) to confirm it now
  completes within the 900s timeout. This is the open item carried into
  `docs/todolist/todolist_03Aug2026.md`.

## Not fixed / out of scope

- `JD_RUN_TIMEOUT_MS` (900s default) left untouched — the user chose to address the root cause
  (reasoning effort) rather than just extend the timeout window. If a live-verified "low"-effort
  run still exceeds 900s, raising the timeout becomes the next lever to pull.
- `scripts/jd_scorecard_resume.py` (v1) not touched, same as the 23 Jul fix — v1 is no longer
  invoked by the portal.
