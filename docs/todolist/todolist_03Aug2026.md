# Todolist — 3 August 2026

## Intake (per soul.md §8.1)

Read `soul.md`, `todolist_31Jul2026.md`, `todolist_30Jul2026.md`, `todolist_25Jul2026.md`, and
`status_30Jul2026.md` before starting.

Carried over from `todolist_31Jul2026.md`, still open:
1. Live-verify the DeepSeek token-retry fix (below) with a rerun of the original failing JD.
2. Resolve the two untracked JD blueprint files (DBS, HKEX) — confirm commit-worthy or discard.
3. LinkedIn automation discovery-path decision.
4. Real JD run through the live production portal.
5. Manulife resume regeneration decision.
6. Minor VPS hardening items (`ufw`, `app` port publish, `JD_RUN_TIMEOUT_MS` tuning — now directly relevant, see below).
7. Dev-env docs for the JD Automation Portal.
8. Job Tracker status fields in Portal History section — scoped, not built.

## New today (3 Aug 2026) — DeepSeek pipeline timing out, not just truncating

Earlier today's session added an auto-retry-on-truncation fix to `call_llm()` in
`scripts/jd_scorecard_resume_v2.py` for the `finish_reason='length'` empty-content crash (see
`docs/guides/JDSCORECARDRESUMEV2_DEEPSEEKTOKENRETRY_03AUG2026.md`) — not yet live-verified.

Before that verification happened, a second, related DeepSeek failure surfaced from a real run:

```
C:\Users\haujo\projects\DEV\ask_aijohncareer\.venv\Scripts\python.exe
  C:\Users\haujo\projects\DEV\ask_aijohncareer\scripts\jd_scorecard_resume_v2.py
  C:\Users\haujo\projects\DEV\ask_aijohncareer\data_raw\jd\txt\JD_Invesco_IT_AssociateDirector.txt
  --refresh-blueprint --llm=deepseek
```
→ "JD pipeline timed out" after >900s (`JD_RUN_TIMEOUT_MS` default, `backend/jd_api_server.js:39`).

User's request, verbatim (A–G):
- A. Follow the soul.md strict rules.
- B. Review `todolist_31Jul2026.md` and log this request into today's todolist (this file).
- C. Identify why DeepSeek is taking >900s on this exact command and timing out.
- D. How to optimize the run with large token context?
- E. Any faster, strong-reasoning DeepSeek model available instead of the existing "v4-flash" model?
- F. Note: Gemini finishes within 50s; Sonnet also works fine — only DeepSeek is slow.
- G. Ask clarifying questions before proceeding further.

### Research done (WebSearch/WebFetch, not yet acted on in code)

- `deepseek-reasoner` (the model id hardcoded in both `scripts/jd_scorecard_resume_v2.py` and
  `backend/lib/llmClient.js`) is a **retired legacy alias** as of 24 Jul 2026, currently still
  routed transparently to **`deepseek-v4-flash`'s thinking mode** (confirms the DeepSeek usage
  dashboard billing the run under "deepseek-v4-flash", not a separate model) — but reliance on a
  retired alias is a latent breakage risk, not just a naming mismatch.
- DeepSeek's current lineup is exactly two models: `deepseek-v4-flash` (fast/cheap,
  1M context / 384K max output) and `deepseek-v4-pro` (quality-focused, slower, ~3x the price).
  **There is no faster reasoning model than flash** — flash already is the fast tier; v4-pro is
  slower, not faster.
- Root cause of both the truncation bug (earlier today) and this timeout: **thinking mode is
  enabled by default with `reasoning_effort: "high"`**, and the script never sets `thinking` or
  `reasoning_effort` in the request payload. High-effort thinking mode generates very large hidden
  chain-of-thought token counts before any visible answer, which is slow (large wall-clock cost per
  call) and, per the earlier truncation bug, can consume the entire `max_tokens` budget outright.
  This is almost certainly *why* DeepSeek is dramatically slower than Sonnet/Gemini for the same
  task (point F) — those models aren't running extended reasoning at this depth for a
  structured-content-generation task (blueprint/scorecard/resume/cover-letter).
- DeepSeek's raw REST fields (confirmed against the current API docs, not the OpenAI-SDK wrapper
  syntax): `{"thinking": {"type": "disabled"}}` to turn reasoning off entirely, or
  `{"reasoning_effort": "low"|"high"|"max"}` to dial it down without fully disabling (flash
  supports all three; "medium" is not a valid value).
- `--refresh-blueprint` + default `mode=all` means this run chains **4 sequential** DeepSeek calls
  (blueprint refresh, scorecard, resume, cover letter) — each independently slow under high-effort
  thinking mode, and now each also eligible for up to 2 additional retry-attempts under today's new
  truncation-retry fix, which trades a fast failure for an even slower eventual success. This
  interaction needs to be weighed before enabling both fixes together.
- Related, not yet touched: `backend/lib/llmClient.js` (the Node-side "Update from Resume" LLM
  call) has its own separate `deepseek-reasoner`-hardcoded call, with the same no-retry
  immediate-throw-on-truncation behavior as the pre-fix Python code. Flagged, not fixed — out of
  today's scope unless asked, per soul.md golden rule.

### Decided and implemented (same session, after clarifying questions)

1. Reasoning effort: keep DeepSeek thinking mode **enabled**, drop `reasoning_effort` to
   **"low"** (not fully disabled, not left at slow default "high").
2. Migrate off the retired `"deepseek-reasoner"` alias to `"deepseek-v4-flash"` now, in both
   `scripts/jd_scorecard_resume_v2.py` and `backend/lib/llmClient.js`.

Both implemented and mocked-verified (payload correctly includes `reasoning_effort` for
DeepSeek-endpoint calls, omits it for OpenRouter-routed Sonnet/Gemini calls). Backups taken:
`jd_scorecard_resume_v2.py.20260803_V2.bak`, `llmClient.js.20260803_V1.bak`. Full record:
`docs/guides/JDSCORECARDRESUMEV2_DEEPSEEKTOKENRETRY_03AUG2026.md`.

**Still open — not yet live-verified:** rerun the original failing command
(`JD_Invesco_IT_AssociateDirector.txt --refresh-blueprint --llm=deepseek`) against the real
DeepSeek API to confirm it now completes within the 900s timeout. `JD_RUN_TIMEOUT_MS` deliberately
left untouched pending that result — user chose to fix the root cause (reasoning effort) first
rather than just extend the timeout window.

## Committed and deployed (same session, after the fixes above)

- Committed locally: `eab9dfa` (the DeepSeek fix itself) and `7630a2a` (two `--refresh-blueprint`
  test-run JD blueprint JSONs — Invesco, FWD — validated as well-formed before including). Not yet
  pushed to `origin/main`.
- Deployed to production (`askcareer-ai.com`): `jd-api` image rebuilt (both changed files are
  baked in at build time, not bind-mounted) and container recreated; `app`/`caddy` untouched.
  Checksums + fix markers verified inside the running container; live health checks 200 on both
  `/` and `/jd-api/api/health`. Full record in the guide's new "Deployed to production" section.

## Priority order for today

1. **Live-verify the DeepSeek fix functionally** — a real pipeline run (locally or through the
   production portal) with `--llm=deepseek` on `JD_Invesco_IT_AssociateDirector.txt
   --refresh-blueprint`, confirming it completes within the timeout and the Resume step doesn't
   truncate. Deployment is verified at the code level; a live functional result is still open.
2. Decide whether to `git push` the two local commits to `origin/main`.
3. Carry forward items 2–8 from `todolist_31Jul2026.md`'s priority order (listed above under
   Intake) — unchanged, none actioned today.

## Note

A new session opened 5 Aug 2026 — logged and carried forward in `todolist_05Aug2026.md` per
soul.md's one-dated-file-per-session convention (an earlier pass briefly appended it here first,
at the user's literal instruction, then moved it out on the user's follow-up decision).
