// Shared --profile=<Name> validation (Phase 2, 11 Aug 2026), mirrors the same
// regex jd_scorecard_resume_v3.py and update_profile_from_resume.py enforce
// on the Python side — filename-safe, no path separators/dots.
const PROFILE_NAME_RE = /^[A-Za-z0-9_-]+$/;

export function isValidProfileName(name) {
  return typeof name === 'string' && PROFILE_NAME_RE.test(name);
}
