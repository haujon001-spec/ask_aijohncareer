# JD Portal — Phase C Follow-up: Textarea UX + Pipeline Retry Fix, 25 Jul 2026

Same-day follow-up after `docs/guides/JDPORTALV2PHASEC_25JUL2026.md` (step-wizard + theme toggle). User exercised the new wizard for a real run and reported two issues: the Configure step's JD-paste textarea felt cramped, and a real run against Manulife's JD (`--refresh-blueprint --ResumeAdjustment --llm=sonnet`, mode=all) failed with "JD pipeline exited with a non-zero status."

## 1. Configure step — taller JD textarea

`.jd-field textarea` (`src/components/JDPortal/JDPortal.css`) was `min-height: 140px` — a leftover from when Configure shared the screen with the Run panel below it. Now that Configure is its own wizard step with the full card to itself, there's no reason to keep it small. Raised to `min-height: 360px` on desktop, with responsive overrides (`260px` at ≤768px, `200px` at ≤480px) so it doesn't dominate smaller screens. Still `resize: vertical`, so users can expand further if needed.

## 2. JD pipeline non-zero-status failure — root cause + fix

**Not a code bug in the wizard/backend wiring.** Reproduced the exact failing command directly against the script:

```
python scripts/jd_scorecard_resume_v2.py "data_raw/jd/txt/JD_Manulife_AVP_Technology_Architecture_and_Operations.txt" --refresh-blueprint --ResumeAdjustment --llm=sonnet
```

Failed with `requests.exceptions.HTTPError: 403 Client Error: Forbidden` on the Scorecard call to OpenRouter. Tested the exact same key/model directly against OpenRouter moments later — it returned `200 OK` with a real completion (response `provider: "Amazon Bedrock"`). Confirmed: this was a transient failure in OpenRouter's multi-provider routing, not an invalid key, not a code defect, and not something introduced by yesterday's wizard restructure — `call_llm()` in `scripts/jd_scorecard_resume_v2.py` had **zero retry logic**, so any single transient error (network blip, 429, 5xx, or an intermittent 403 like this one) killed the entire 5-call pipeline outright, discarding whatever had already succeeded.

**Fix:** `call_llm()` now retries up to 3 attempts with linear backoff (3s, 6s) on connection/timeout errors and on `{403, 408, 425, 429, 500, 502, 503, 504}` status codes — the set of codes plausibly transient on OpenRouter's routing layer. Non-retryable errors (e.g. 400 bad request, 401 invalid key) still fail immediately via `resp.raise_for_status()` on the first attempt, no wasted retries. Each retry prints a warning to stdout so it's visible in the portal's progress log, not silent.

`scripts/jd_scorecard_resume_v2.py` backed up first per soul.md (`.20260725_V1.bak`).

### Separate finding: stale Windows User env var

While diagnosing, found `OPENROUTER_API_KEY` set as a **Windows User-level environment variable** to a dead key (`sk-or-v1-91398d...` — OpenRouter returns `401 "User not found"` for it), different from the working key in `.env.local`/`.env.vps` (`sk-or-v1-628083...`). This didn't cause the observed failure (the Node backend's dotenv-loaded value wins over it, and the script's own printed log confirmed the correct key was used), but it's a latent landmine: anything reading `os.environ` directly without loading `.env` first (e.g. running the CLI script from a fresh terminal without the Node backend in front of it) would silently pick up the dead key instead. **Removed** per user decision (`[Environment]::SetEnvironmentVariable('OPENROUTER_API_KEY', $null, 'User')`, confirmed removed) — a system-level Windows setting, not a repo change, so no file diff for this part.

## Verification (soul.md §3.1/§14)

- **Retry fix:** re-ran the exact failing command (same JD, same flags, same key) end-to-end after the fix — completed successfully, all 6 output files written (scorecard/resume/cover-letter × txt/docx) under `data_processed/Manulife/`. No retries were actually triggered this run (confirming the original failure really was a one-off), but the safety net is now in place for the next one. `py_compile` clean.
- **Textarea:** Playwright screenshot against the live dev stack (same throwaway-password MFA technique as prior sessions, re-approved this round, `secrets/jd_portal_auth.json` backed up and restored — confirmed byte-identical after) confirms `#jd-text`'s rendered height is exactly `360px` at desktop (1440px) and `200px` at mobile (420px), matching the CSS. Checked in both themes.
- `npm run build` clean (same pre-existing unrelated `ChatWindow.css` brace-imbalance warning as yesterday, confirmed untouched by this session).

## Not in scope

- The stale env var's removal only affects new terminal sessions going forward (already-open shells retain the old value until restarted) — not a code issue, no further action needed here.
