# Authoritative john_profile.json Update Capability — Scoping, 25 Jul 2026

Scoping record for a new JD Portal capability: updating `src/data/john_profile.json` (the candidate profile the scoring/resume pipeline reads) through the portal, with four parts the user specified — (a) manual bullet-point addition, (b) NLP-assisted resume-diff-and-merge, (c) versioned restore, (d) diff/compare view. **Not implemented yet** — investigation and scoping only, per explicit user request. This is the largest of three items scoped in this session; logged per soul.md intake.

## ⚠️ Related finding, addressed as part of this epic's design (not fixed separately, per user decision)

While investigating, found a **live, unauthenticated route already deployed on the production chatbot app** (`POST /api/consolidate` in `backend/server.js`, port 3000, `askcareer-ai.com`) that targets this same file. It is dead code today (no frontend caller — `src/utils/consolidation.js`'s `consolidateResume()`/`consolidateAfterUpload()` are never imported by any component), but if it were ever triggered:
- `backend/consolidation.js`'s `mergeProfileData()` writes new fields onto the **wrong nesting level** — spreads the whole wrapped file (`{timestamp, sourceFile, profile}`) then sets `merged.metadata`/`merged.experience`/`merged.skills`/etc. directly on the top-level object instead of inside `merged.profile.*`, and uses key names (`experience`, `skills`, `education`, `certifications`) that don't match what `jd_scorecard_resume_v2.py` actually reads (`professional_experience`, `technical_skills`, `education_certifications`).
- No auth, no rate limiting (despite `express-rate-limit` being a project dependency used elsewhere), no backup before `fs.writeFileSync`.
- PDF/DOCX resume parsing are unimplemented stubs that throw — only `.txt` resumes would even parse.

**User decision: fold the fix into this epic's design rather than patching it separately.** The new `POST /api/profile/merge-resume` route (see below) supersedes `/api/consolidate` entirely — implementation should either delete `backend/consolidation.js` + `src/utils/consolidation.js` + the route registration in `backend/server.js`, or repurpose the salvageable parts (little, given the correctness bugs) into the new route. Either way, `/api/consolidate` must not still be reachable once this epic ships.

## Confirmed decision: LLM-merged changes require approval before writing

Part (b)'s "feed a resume, compare, convert new valid points, add to profile" must **not** write directly to `john_profile.json`. Matches the original 2026 design spec (`docs/project/PROJECT_PLAN_CLAUDE_CODE.md`'s "NLP classification preview → Approve" step, never built). Flow: LLM proposes changes → portal shows a preview (ideally with the diff view from part (d)) → user explicitly approves → only then is the file written.

## Background: file shape and existing (unfinished) prior art

`src/data/john_profile.json` (974 lines, git-tracked) is a **wrapped** structure:
```json
{ "timestamp": "...", "sourceFile": "...", "profile": { ...13 top-level keys... } }
```
`scripts/jd_scorecard_resume_v2.py`'s `build_profile_context()` only reads 9 of those 13 keys (`metadata`, `summary`, `professional_experience`, `major_achievements`, `ai_projects`, `core_competencies`, `technical_skills`, `education_certifications`, `languages_spoken`) — `linkedin_recommendations`, `soft_skills`, `languages`, `key_topics_for_qa` exist in the file but are invisible to the scoring/resume LLM context today. **Open question:** does this new update feature manage all 13 keys, or only the 9 the pipeline actually uses? (Managing all 13 is more complete; limiting to 9 is simpler and matches what "the profile" functionally means to the pipeline today.)

This was originally planned (never built) as `backend/nlp/update_profile_json.py` in `docs/project/PROJECT_PLAN_CLAUDE_CODE.md` — a Python NLP module, a `POST /api/profile/update` route, and a "Profile Update" frontend page with an approve step. Only a permanent `501` stub exists today: `backend/api/profile_update.js`, mounted at `POST /api/profile/update` on the JD Portal's own API (port 3010, behind `requireAuth`) — this is the safe, correctly-scoped stub, distinct from the broken `/api/consolidate` route above. This epic effectively replaces that stub with a real implementation.

## Design direction (not yet built)

- **Versioned snapshots:** a new `data_processed/profile_history/` directory (not extending the `.bak` convention, which lives under `src/` and nothing serves over HTTP today) — filenames like `john_profile_YYYYMMDD_HHMMSS.json`, matching the user's stated desired portal display of `john_profile_[date].json`. Follows the repo's existing "filesystem is the source of truth, no DB" convention (same as `history.js`).
- **Diff rendering:** no diff library exists in this repo yet (`package.json` has none) — net-new dependency needed (e.g. `diff`/`jsdiff` for text-level diffing of long fields like `summary` and `highlights[]`, plus a structural view for array/object sections). No existing `DiffViewer`-shaped component to build on either — net-new UI.
- **New backend routes** (none exist today, all net-new), following the `settings.js` GET/POST/DELETE router-factory pattern:
  - `GET /api/profile` — current profile (no read route exists at all today; only the Python script reads the file directly off disk).
  - `POST /api/profile/manual` — part (a), append/merge manually-pasted bullets.
  - `POST /api/profile/merge-resume` — part (b), LLM-assisted diff + merge, **returns a preview, does not write** until a separate approve call.
  - `POST /api/profile/merge-resume/approve` (or similar) — commits a previously-previewed merge.
  - `GET /api/profile/versions` — part (c)/(d), list dated snapshots (filesystem-scan pattern, same shape as `history.js`).
  - `GET /api/profile/versions/:id` — part (d), fetch a specific historical version for diffing.
  - `POST /api/profile/versions/:id/restore` — part (c), roll back (should itself snapshot the pre-restore state first, so a restore is also undoable).
  - All new routes reuse `backend/lib/pathGuard.js` for path safety and mount behind `requireAuth`, consistent with every other JD Portal route.

## Open questions for the implementation session

1. **Auto-snapshot cadence:** snapshot only before LLM-assisted merges (part b), or also before manual edits (part a)? A blanket "snapshot before any write" policy is simpler and safer, but creates more history-directory clutter over time — may want a retention/pruning policy (e.g. keep last N, or last N days).
2. **Scope of managed keys:** all 13 top-level `profile.*` keys, or just the 9 the scoring pipeline reads (see Background)?
3. **`/api/consolidate` disposal:** delete `backend/consolidation.js` + `src/utils/consolidation.js` + its route registration outright, or salvage any part of it? Given the correctness bugs found (wrong nesting, wrong key names) and that PDF/DOCX parsing were never finished, recommend deletion rather than reuse — but this is an implementation-time call, not decided here.
4. **Part (b)'s "professional sentence" conversion** — needs a concrete LLM prompt design (system prompt for judging "new valid points" + rewriting into the profile's existing tone/style) — not scoped in this pass, would need its own prompt-engineering iteration during implementation, similar to how `jd_scorecard_resume_v2.py`'s prompts were iterated.
5. **Reconciling with the older backlog line** ("NLP `update_profile_json`" under "Remaining JD Automation Portal phases") — this epic supersedes/absorbs that older, vaguer line item; the implementation session should update the todolist to point at this scoping doc instead of carrying both forward separately.

## Not implemented

No code changes were made for this item in this session — investigation, the security finding, and scoping only.
