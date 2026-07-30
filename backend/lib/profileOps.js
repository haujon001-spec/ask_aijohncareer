// Shared operation engine for mutating profile.* data. Both the manual
// editor (POST /api/profile/manual) and the LLM merge-approve step
// (POST /api/profile/update-from-resume/approve) funnel through the exact
// same applyProfileOps() reducer with the exact same {ops: [...]} shape, so
// the two paths can never diverge. Pure/immutable: never mutates the input
// profile object, always returns a new one.

import { SECTION_KEYS, SECTION_SCHEMAS } from '../../shared/profileSchema.js';
import { isNearDuplicate } from './textSimilarity.js';

export class ProfileOpsError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ProfileOpsError';
    this.statusCode = 400;
  }
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function requireSection(section) {
  if (!SECTION_KEYS.includes(section)) {
    throw new ProfileOpsError(`Unknown profile section: '${section}'. Valid sections: ${SECTION_KEYS.join(', ')}`);
  }
  return SECTION_SCHEMAS[section];
}

function normalizeIdentityValue(v) {
  return String(v ?? '').trim().toLowerCase();
}

function matchesIdentity(entry, identityFields, identity) {
  return identityFields.every((f) => normalizeIdentityValue(entry[f]) === normalizeIdentityValue(identity[f]));
}

function findEntryIndex(list, identityFields, identity) {
  return list.findIndex((entry) => matchesIdentity(entry, identityFields, identity));
}

// ── Op handlers ─────────────────────────────────────────────────────────────

function applyReplaceText(profile, { section, value }) {
  const schema = requireSection(section);
  if (schema.kind !== 'text') {
    throw new ProfileOpsError(`replaceText only applies to 'text' sections, got '${section}' (kind: ${schema.kind})`);
  }
  if (typeof value !== 'string') {
    throw new ProfileOpsError(`replaceText requires a string 'value' for section '${section}'`);
  }
  profile[section] = value;
}

function applyUpdateObject(profile, { section, patch }) {
  const schema = requireSection(section);
  if (schema.kind !== 'object' && schema.kind !== 'categoryMap') {
    throw new ProfileOpsError(`updateObject only applies to 'object'/'categoryMap' sections, got '${section}' (kind: ${schema.kind})`);
  }
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new ProfileOpsError(`updateObject requires an object 'patch' for section '${section}'`);
  }
  const readonlyFields = schema.readonlyFields || [];
  for (const key of Object.keys(patch)) {
    if (readonlyFields.includes(key)) {
      throw new ProfileOpsError(`Field '${key}' in section '${section}' is read-only and cannot be edited (maintained by scripts/update_profile_from_resume.py)`);
    }
  }
  profile[section] = { ...(profile[section] || {}), ...patch };
}

function applyUpsertEntry(profile, { section, identity, entry }) {
  const schema = requireSection(section);
  if (schema.kind !== 'objectArray') {
    throw new ProfileOpsError(`upsertEntry only applies to 'objectArray' sections, got '${section}' (kind: ${schema.kind})`);
  }
  if (!entry || typeof entry !== 'object') {
    throw new ProfileOpsError(`upsertEntry requires an 'entry' object for section '${section}'`);
  }
  const identityFields = schema.identityFields;
  const list = profile[section] || (profile[section] = []);
  const idx = findEntryIndex(list, identityFields, identity || entry);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...entry };
  } else {
    for (const f of identityFields) {
      if (!entry[f]) {
        throw new ProfileOpsError(`New entry in section '${section}' is missing required identity field '${f}'`);
      }
    }
    list.push(entry);
  }
}

function applyRemoveEntry(profile, { section, identity }) {
  const schema = requireSection(section);
  if (schema.kind !== 'objectArray') {
    throw new ProfileOpsError(`removeEntry only applies to 'objectArray' sections, got '${section}' (kind: ${schema.kind})`);
  }
  const list = profile[section] || [];
  const idx = findEntryIndex(list, schema.identityFields, identity);
  if (idx < 0) {
    throw new ProfileOpsError(`No matching entry found to remove in section '${section}' for identity ${JSON.stringify(identity)}`);
  }
  list.splice(idx, 1);
}

// Resolves the target array for appendStrings/removeStrings, covering all
// three shapes: top-level stringArray, a categoryMap's category, or a
// nested stringArray field inside a matched objectArray entry.
function resolveStringArrayTarget(profile, { section, identity, field }) {
  const schema = requireSection(section);
  if (schema.kind === 'stringArray') {
    if (!Array.isArray(profile[section])) profile[section] = [];
    return profile[section];
  }
  if (schema.kind === 'categoryMap') {
    if (!field) throw new ProfileOpsError(`'field' (category name) is required for categoryMap section '${section}'`);
    const map = profile[section] || (profile[section] = {});
    if (!Array.isArray(map[field])) map[field] = [];
    return map[field];
  }
  if (schema.kind === 'objectArray') {
    if (!field) throw new ProfileOpsError(`'field' (nested array field name) is required for objectArray section '${section}'`);
    const fieldDef = (schema.fields || []).find((f) => f.key === field);
    if (!fieldDef || fieldDef.type !== 'stringArray') {
      throw new ProfileOpsError(`'${field}' is not a stringArray field on section '${section}'`);
    }
    const list = profile[section] || [];
    const idx = findEntryIndex(list, schema.identityFields, identity);
    if (idx < 0) {
      throw new ProfileOpsError(`No matching entry found in section '${section}' for identity ${JSON.stringify(identity)}`);
    }
    if (!Array.isArray(list[idx][field])) list[idx][field] = [];
    return list[idx][field];
  }
  throw new ProfileOpsError(`appendStrings/removeStrings do not apply to section '${section}' (kind: ${schema.kind})`);
}

function applyAppendStrings(profile, { section, identity, field, items, dedupe = true }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ProfileOpsError(`appendStrings requires a non-empty 'items' array for section '${section}'`);
  }
  const target = resolveStringArrayTarget(profile, { section, identity, field });
  for (const item of items) {
    if (typeof item !== 'string' || !item.trim()) continue;
    if (dedupe && isNearDuplicate(item, target)) continue;
    target.push(item);
  }
}

function applyRemoveStrings(profile, { section, identity, field, items }) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new ProfileOpsError(`removeStrings requires a non-empty 'items' array for section '${section}'`);
  }
  const target = resolveStringArrayTarget(profile, { section, identity, field });
  const toRemove = new Set(items);
  const filtered = target.filter((v) => !toRemove.has(v));
  target.length = 0;
  target.push(...filtered);
}

const HANDLERS = {
  replaceText: applyReplaceText,
  updateObject: applyUpdateObject,
  upsertEntry: applyUpsertEntry,
  removeEntry: applyRemoveEntry,
  appendStrings: applyAppendStrings,
  removeStrings: applyRemoveStrings,
};

export function applyProfileOps(profile, ops) {
  if (!Array.isArray(ops) || ops.length === 0) {
    throw new ProfileOpsError('ops must be a non-empty array');
  }
  const next = clone(profile);
  for (const op of ops) {
    if (!op || typeof op !== 'object' || !op.kind) {
      throw new ProfileOpsError(`Each op requires a 'kind' field. Got: ${JSON.stringify(op)}`);
    }
    const handler = HANDLERS[op.kind];
    if (!handler) {
      throw new ProfileOpsError(`Unknown op kind: '${op.kind}'. Valid kinds: ${Object.keys(HANDLERS).join(', ')}`);
    }
    handler(next, op);
  }
  return next;
}
