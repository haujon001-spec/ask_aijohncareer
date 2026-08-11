# JD Scorecard/Resume/Cover Letter v3 — Multi-Profile Foundation (11 Aug 2026)

## What this is

Phase 1 of the multi-tenant JD Portal epic (requirements captured 10 Aug 2026, deferred until
prioritized 11 Aug 2026): a CLI-only foundation proving the JD scorecard/resume/cover-letter
pipeline works for **any** named profile, not just John Hau. No auth, no portal UI, no
self-service signup — those are later phases.

`scripts/jd_scorecard_resume_v3.py` is a full copy of `scripts/jd_scorecard_resume_v2.py`
(never edited — soul.md's golden rule), with every path and every piece of hardcoded "John Hau"
content parameterized by a new required `--profile=<Name>` flag.

## Usage

```
python scripts/jd_scorecard_resume_v3.py --profile=<Name>
python scripts/jd_scorecard_resume_v3.py --profile=<Name> "data_raw/<Name>/jd/txt/SomeJD.txt"
python scripts/jd_scorecard_resume_v3.py --profile=<Name> --scorecard-only
python scripts/jd_scorecard_resume_v3.py --profile=<Name> --resume-only
python scripts/jd_scorecard_resume_v3.py --profile=<Name> --coverletter-only
python scripts/jd_scorecard_resume_v3.py --profile=<Name> --batch
python scripts/jd_scorecard_resume_v3.py --profile=<Name> --refresh-blueprint
python scripts/jd_scorecard_resume_v3.py --profile=<Name> --llm=sonnet|deepseek|gemini
```

`--profile=<Name>` is required — no default, no fallback to anyone's data. It must be
filename-safe (letters/digits/hyphen/underscore only) and resolve to an existing
`src/data/<Name>/profile.json`, or the script exits immediately with a clear error before
any LLM call.

John Hau himself is **not** migrated to this — `src/data/john_profile.json` stays exactly where
it is, and v2 stays the exclusive pipeline for John's own runs. v3 is additive.

## Profile folder convention

```
src/data/<Name>/profile.json         ← same top-level shape as john_profile.json (tracked in git)
src/data/<Name>/jd/                  ← JD blueprints for this profile (tracked in git)
data_raw/<Name>/jd/txt/              ← raw JD text input for this profile (gitignored, local only)
data_processed/<Name>/<Employer>/... ← generated outputs (gitignored, local only)
```

JD text and blueprints are namespaced per profile, not shared — a shared JD folder would mean
one profile's `--batch` run picks up every other profile's job postings too, since blueprints
are keyed only by JD filename.

## What changed vs. v2 (touch-point summary)

- **`--profile=<Name>` required flag**, validated (filename-safe, path stays under `src/data/`).
- **Every path namespaced per profile**: `PROFILE_PATH`, `DEFAULT_JD_DIR`, `JD_BLUEPRINT_DIR`,
  both `data_processed/<Employer>/...` construction sites (`build_output_targets()` and the
  inline real-run block), and output filename prefixes (`<Name>Resume...`/`<Name>CoverLetter...`).
- **New generic reference template**: `data_raw/resume/txt/GenericStructuralResumeTemplate.md`
  replaces `TEMPLATE_PATH`. v2's template was John's actual real resume content (name, contact,
  achievements) injected verbatim into every LLM prompt as a "format exemplar" — reusing it for
  other profiles would send John's real personal content through the LLM API on every other
  person's generation call. The new template is layout-only: every value is a bracketed
  placeholder, zero real content. Shared across all profiles (it's not the candidate's own data).
- **Profile load + metadata extraction hoisted earlier**, right after CLI/output-path setup,
  instead of deep inside the cover-letter block (where v2 had it, and never at all on a
  `--resume-only` run). All 5 required fields (`name`, `location`, `phone`, `email`, `linkedin`)
  are validated up front — **missing any of them fails loudly** instead of silently falling back
  to John's real phone/email/LinkedIn (v2's cover-letter fallback behavior, only ever safe
  because v2 only loads John's own profile).
- **All hardcoded "John Hau" content replaced** with the loaded profile's own `name`: the
  OpenRouter `X-Title` header, the startup banner, the written-output file headers, the
  `SHARED_SYSTEM_PROMPT`, and the `RESUME_USER`/`COVERLETTER_USER` task strings (which already
  had a `name` variable available and simply didn't use it in v2 — invisible for John's own runs,
  would have been actively wrong for anyone else).
- **Cover-letter `website` field** is no longer hardcoded to `https://askcareer-ai.com` — it
  comes from `profile.metadata.website` if present, and the header rule/instructions drop the
  website line entirely when a profile doesn't have one (most profiles won't).
- **`--batch` mode** needed no code change — `--profile=<Name>` auto-forwards to per-JD
  subprocess children since it isn't in the batch/force flag-exclusion set.

## Verification performed (11 Aug 2026)

- **Fail-loud checks** (no LLM cost): missing `--profile`, path-traversal value
  (`--profile=../../etc`), nonexistent profile folder, and a profile missing a required
  metadata field — all four exit immediately with a clear error before any LLM call.
- **End-to-end run** for a synthetic, fictitious test profile (`src/data/AlexRivera/profile.json`
  — not a real person, deliberately sparse: empty `ai_projects`/`linkedin_recommendations`
  arrays, to also confirm graceful degradation on thin profile data) against a synthetic JD
  (`data_raw/AlexRivera/jd/txt/JD_ExampleCorp_ITDirector.txt`): scorecard, resume, and cover
  letter all generated successfully to `data_processed/AlexRivera/ExampleCorp/...`.
- **Leakage check**: grepped every generated txt output for John's real name/email/phone/
  location/employer/domain (`John Hau`, `johnhau`, `haujon001`, `5722 2007`, `Yuen Long`,
  `Morgan Stanley`, `askcareer-ai`) — zero matches. Manually confirmed the resume/cover-letter
  headers show Alex Rivera's own fictitious contact details.
- **v2 regression check**: `git diff --stat scripts/jd_scorecard_resume_v2.py` showed no output
  (file untouched). Ran `python scripts/jd_scorecard_resume_v2.py --batch --scorecard-only`
  against the full existing 28-JD corpus — 27 already-existing outputs correctly skipped, one
  genuinely new one processed and written to the old flat `data_processed/<Employer>/` path with
  no profile segment, confirming v2's behavior and output layout are completely unchanged.
- **Partial-run modes**: `--resume-only` and `--coverletter-only` both run against `AlexRivera`
  specifically and correctly resolve the candidate's name in each mode (the exact code path that
  was broken/late in v2's original structure).

## Explicitly out of scope (later phases of the multi-tenant epic)

Backend/auth changes, per-user MFA, self-service signup, portal UI, screenshot-to-JD-text
capture, and making `scripts/update_profile_from_resume.py` profile-aware. All still single-user
today — see `docs/todolist/todolist_07Aug2026.md`'s "Multi-Profile / Multi-Tenant JD Portal"
section for the full requirements and locked decisions.
