# JD Portal Profile-Update Epic — 30 July 2026

**Requested:** 25 Jul 2026 (scoping + paused plan, `sprightly-enchanting-hare.md`), widened in scope later that day, picked up and fully built 30 Jul 2026.

**Status: Done, verified end-to-end, real LLM calls, real MFA auth.**

Full plan: `C:\Users\haujo\.claude\plans\ancient-dancing-rocket.md`. Scoping doc: `docs/guides/JOHNPROFILEUPDATE_SCOPING_25JUL2026.md`.

## What shipped

A proper JD Portal capability for managing `src/data/john_profile.json` — the authoritative career profile that feeds `jd_scorecard_resume_v2.py`'s scoring/resume pipeline — replacing ad-hoc manual JSON editing (which caused a real syntax error and several duplicate-content mistakes earlier in this same session) with four parts, plus a folded-in security fix.

### Security fix
Deleted `backend/consolidation.js`, `src/utils/consolidation.js`, `scripts/test_consolidation.js` (confirmed dead/broken: wrong nesting level, wrong key names, no backup, no auth, no rate limit) and the `POST /api/consolidate` route + import in `backend/server.js` (the public chat backend, port 3000). **Verified:** the URL now falls through to the generic `POST /api/:model` chat-completion route (pre-existing, unrelated), which rejects `consolidate` as an unknown model — the dangerous write path is fully unreachable. Not a bare 404 as originally assumed; functionally equivalent (no way to trigger a write).

### Shared foundation
- `shared/profileSchema.js` (new top-level dir) — single source of truth for the 13 `profile.*` sections: `SECTION_KEYS`, `LLM_PROPOSABLE_SECTIONS` (10 of 13 — excludes `metadata`, `summary`, `linkedin_recommendations` per user decision), and `SECTION_SCHEMAS` (kind/fields/identityFields per section, `major_achievements` flagged `dynamicMetrics: true` for its irregular per-entry extra fields).
- `backend/lib/profileOps.js` — the shared operation engine (`replaceText`/`updateObject`/`upsertEntry`/`removeEntry`/`appendStrings`/`removeStrings`). Both the manual editor and the LLM merge-approve step funnel through the identical `applyProfileOps()` reducer so the two paths can never diverge. Immutable (clones, never mutates input). Verified with 11 standalone test cases against the real profile data before any route was built.
- `backend/lib/textSimilarity.js` — JS-native bigram/Dice-coefficient near-duplicate detector, a dependency-free equivalent of Python's `difflib.SequenceMatcher.ratio()` (used by `scripts/update_profile_from_resume.py`'s existing safety net). Verified against real duplicate/non-duplicate pairs from earlier in this session.
- `backend/lib/llmClient.js` — Node-native LLM call (OpenRouter/DeepSeek fetch, retry-with-backoff on `{403,408,425,429,500,502,503,504}`, `` ```json `` fence-stripping) mirroring `scripts/update_profile_from_resume.py`'s `call_llm()`. No Python spawn — this is a single one-shot call, unlike the JD-scorecard pipeline's orchestrated 5-call flow.
- `backend/backup.js` — additive only: exported `BACKUP_DIR`/`PROFILE_PATH` (were private), added `getBackup(filename)` for the diff view, wired `cleanupOldBackups(keepCount=10)` to run after every `ensureBackup()` (writes are now far more frequent than the occasional Python backfill this default was sized for).

### Backend routes — `backend/api/profile.js` (new, replaces the retired `backend/api/profile_update.js` 501 stub)
Mounted at `/api/profile` (sibling to, not nested under, the untouched `/api/profile-view`):
- `POST /manual` — part (a). Optimistic-concurrency guard via `expectedTimestamp` (409 on conflict).
- `POST /update-from-resume/propose` — part (b). Calls the LLM with the full current profile + labeled source texts, validates every proposal server-side (section allowlist, operation allowlist, `groundingQuote` must be a verbatim substring of the source text, near-duplicate filter), writes survivors to `backup/.pending-proposals/<id>.json`. **Never writes to `john_profile.json`.**
- `POST /update-from-resume/approve` — commit step, partial approval supported, funnels through the same `applyProfileOps()` path as `/manual`.
- `GET /versions`, `GET /versions/:filename`, `POST /versions/:filename/restore` — parts (c)/(d). Path-guarded via `resolveWithinRoot`.

### Frontend
- `JDProfile.jsx` (new container) resolves the coexistence with the pre-existing, untouched, read-only `ProfileView.jsx` — a nested sub-tab bar (`View`/`Edit`/`Update from Resume`/`History`) inside the Profile tab, rather than modifying `ProfileView.jsx` itself.
- `ProfileEditForm.jsx` — schema-driven typed editors per `SECTION_SCHEMAS` kind (text/object/stringArray/categoryMap/objectArray), `major_achievements` gets a repeatable key/value row editor for its irregular extra fields (reusing the existing `.jd-key-row` CSS class).
- `ProfileUpdateFromResume.jsx` — multi-source paste-text form, sonnet/deepseek/gemini picker (matching `JDRunStep.jsx`'s pattern), propose → checklist of proposals (section, content, grounding quote, rationale) with a collapsed "Rejected (N)" section, partial-approve.
- `ProfileVersionHistory.jsx` + `ProfileDiff.jsx` (new `diff` npm dependency, `^7.0.0`) — version list with restore (reusing `JDHistoryTrash.jsx`'s confirm-banner pattern), two-version picker (including "Current") rendering a client-side word/entry-level diff.
- `JDPortal.jsx` — swapped `<ProfileView/>` for `<JDProfile/>`, deleted the now-fully-superseded disabled `profile-update-stub` placeholder button and its CSS rule.
- `TabBar.css` — added `.tab-bar--sub-nested`, a slightly more compact variant so the nested Profile sub-tabs don't visually compete with JD Portal's own top-level tab bar.

## Verification (soul.md §3.1 — real dev stack, real MFA auth, real LLM calls, throwaway data, no mocks)

Used the established credential-swap + live-TOTP technique (back up `secrets/jd_portal_auth.json`, swap in a known throwaway password + the same TOTP secret, test, restore byte-identical afterward — confirmed via `diff`).

- **Backend curl pass** (before any frontend existed): route-collision check (`/api/profile-view`, `/api/profile-view/export`, `/api/profile/versions` all resolve independently), auth negative test (401 without a session), path-traversal negative test (400 on `..%2f..%2f`), manual-edit round-trip (append → confirm on-disk + `/api/profile-view` reflects it → restore → confirm removed + pre-restore backup + auto-prune held at 10).
  - **Real mistake made and caught, disclosed here:** first restore test targeted the *oldest* backup in the list instead of the one just created by the test op, which reverted the working file to a 25-Jul snapshot — silently wiping this session's earlier Morgan Stanley dedup and Edge/BofA backfill work in the working tree. Caught immediately by checking `git diff` after the "successful" restore, fixed via `git show HEAD:... > file` (confirmed 0-line diff afterward), and the lesson (always restore-test against a backup the test itself created, never an arbitrary list entry) is logged in memory for reuse.
- **Playwright pass, parts (a)/(c)/(d):** real browser login, Profile → Edit → add a uniquely-tagged throwaway skill → Save (real backend write, real backup) → History sub-tab shows the new version → Compare Current vs. that version correctly highlights the added skill → Restore removes it → confirmed gone in Edit tab → confirmed the untouched `ProfileView` "View" sub-tab still renders correctly. Zero console errors throughout.
- **Backend curl pass, part (b):** real LLM call (`anthropic/claude-sonnet-5`) against a fabricated-but-plausible throwaway resume paragraph (K8s deployment + ITIL cert) produced 6 well-grounded, semantically-routed proposals across 6 different profile sections (not just the 3 the CLI backfill script covers) — confirming cross-section semantic routing genuinely works, not just on paper. Confirmed the profile file was byte-for-byte unchanged after propose. Approved 2 of 6 (partial approval) — confirmed exactly those 2 landed, the other 4 did not. A second propose call against an already-fully-captured fact correctly returned 0 proposals (the LLM itself recognized the dedup instruction, no server-side rejection needed). Directly unit-tested the three validation gates (excluded-section rejection, fabricated-groundingQuote rejection, valid-proposal pass) to prove the safety net works even if an LLM misbehaves.
- **Playwright pass, part (b):** real browser flow — paste a throwaway resume snippet, Propose Changes (real LLM call), uncheck 3 of 4 proposals, Approve Selected → confirmed exactly 1 of 4 facts landed on disk. Zero console errors.
- **Security-fix regression:** confirmed above.
- **Cleanup:** all test backups, pending-proposal files, and profile-file test writes removed; `git diff src/data/john_profile.json` confirmed 0 lines before finishing; `secrets/jd_portal_auth.json` restored and confirmed byte-identical to the pre-test original; all test server processes (ports 3000/3010/5174) and the temporary `playwright` npm install (`--no-save`) cleaned up.
- `npm run build` clean throughout (83 modules, no new warnings beyond a pre-existing CSS minify warning unrelated to this work).

## Not part of this session's commit

`src/data/jd/JD_Manulife_AVP_Technology_Architecture_and_Operations.json` had an unrelated pre-existing modification in the working tree (not touched by anything in this epic) and an untracked `src/data/jd/JD_DBS_IT_SVP_HeadOfTechnology_OpsRisk.json` blueprint — both left as-is per this session's established practice of never committing the user's own in-progress JD/profile work.
