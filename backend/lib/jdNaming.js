/**
 * Shared JD filename conventions, mirroring derive_jd_metadata() in
 * scripts/jd_scorecard_resume.py so upload/run/history all agree on naming.
 */

export function deriveJdMetadata(jdStem) {
  const parts = jdStem.replace(/^JD_/, '').split('_').filter(Boolean);
  const employer = parts[0] || 'Employer';
  const roleSlug = parts.length > 1 ? parts.slice(1).join('_') : 'Role';
  const roleTag = roleSlug && roleSlug !== 'Role' ? `_${roleSlug}` : '';
  return { employer, roleSlug, roleTag };
}

export function sanitizeEmployerSlug(input) {
  return String(input || '').trim().replace(/[^A-Za-z0-9]+/g, '');
}

export function sanitizeRoleSlug(input) {
  return String(input || '')
    .trim()
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}
