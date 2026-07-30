import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { ensureBackup, restoreProfile, listBackups, getBackup, PROFILE_PATH, BACKUP_DIR } from '../backup.js';
import { applyProfileOps, ProfileOpsError } from '../lib/profileOps.js';
import { resolveWithinRoot, PathGuardError } from '../lib/pathGuard.js';
import { callLlmJson, LlmClientError } from '../lib/llmClient.js';
import { isNearDuplicate, normalize } from '../lib/textSimilarity.js';
import { SECTION_KEYS, SECTION_SCHEMAS, LLM_PROPOSABLE_SECTIONS } from '../../shared/profileSchema.js';

const PENDING_DIR_NAME = '.pending-proposals';
const PENDING_TTL_MS = 24 * 60 * 60 * 1000;

const PROPOSE_SYSTEM_PROMPT = `You are an expert resume writer and career-data analyst helping maintain John Hau's single \
authoritative career profile (a JSON file that powers an automated JD-matching scorecard and resume-generation system).

You are given:
1. The COMPLETE current profile (JSON) — everything already captured across all its sections.
2. Raw, unedited resume text, possibly from multiple labeled source documents.

Your job: find facts, responsibilities, skills, achievements, or projects in the raw text that are NOT \
already reflected — even loosely or differently worded — anywhere in the current profile, and propose \
ONLY those new items as structured additions.

Rules:
- Every proposal MUST include a "section" field naming exactly which profile section it belongs to, \
chosen ONLY from this list: ${LLM_PROPOSABLE_SECTIONS.join(', ')}. Never propose metadata, summary, or \
linkedin_recommendations — those are excluded entirely.
- Every proposal MUST include a "groundingQuote" — a short VERBATIM excerpt (copy exact words, do not \
paraphrase) from the raw text proving this fact was actually stated. Never invent, estimate, round, or \
embellish any fact or number not explicitly present in the raw text.
- You may only ADD new information. Never propose editing, replacing, or removing anything already in \
the current profile.
- Every proposal's "operation" must be either "upsertEntry" (for objectArray sections: professional_experience, \
major_achievements, ai_projects, education_certifications, languages) or "appendStrings" (for stringArray \
sections: technical_skills, soft_skills, languages_spoken, key_topics_for_qa; for core_competencies, include \
a "field" naming the category; for a new highlight inside an EXISTING professional_experience entry, use \
appendStrings with section="professional_experience", field="highlights", and "identity" matching that \
entry's company/title/period exactly as it appears in the current profile).
- When proposing a new professional_experience highlight, write it as one SMART-form bullet (Specific, \
Measurable, Achievable, Realistic, Time-bound), third person implied, past tense, with the single most \
important metric or standout phrase wrapped in **double asterisks** — matching the exact style already \
used in professional_experience[].highlights.
- Deduplicate semantically against the current profile — if the current profile already covers a fact, \
even in different words, do not propose it again. If the raw text itself repeats a fact, propose it only once.
- Include a one-sentence "rationale" on every proposal explaining why it's new/valuable, for a human reviewer.
- Output strict JSON only, no prose, matching exactly the schema in the user message.`;

function buildProposeUserPrompt({ profile, sources }) {
  const sourceBlock = sources.map((s) => `=== Resume source: ${s.label} ===\n${s.text}`).join('\n\n');
  return `${sourceBlock}

=== Current authoritative profile (JSON) ===
${JSON.stringify(profile, null, 2)}

=== Output schema (JSON only) ===
{
  "proposals": [
    {
      "section": "<one of: ${LLM_PROPOSABLE_SECTIONS.join(', ')}>",
      "operation": "upsertEntry" | "appendStrings",
      "identity": { "...": "only for upsertEntry on an objectArray section, or appendStrings targeting a nested field inside an existing entry" },
      "field": "only for core_competencies (category name) or a nested stringArray field like professional_experience.highlights",
      "entry": { "...": "only for upsertEntry — the new object to add" },
      "items": ["...", "only for appendStrings"],
      "groundingQuote": "verbatim excerpt from the raw text",
      "rationale": "why this is new and worth adding"
    }
  ]
}`;
}

function pendingDir() {
  return path.join(BACKUP_DIR, PENDING_DIR_NAME);
}

function pruneStalePending() {
  const dir = pendingDir();
  if (!fs.existsSync(dir)) return;
  const now = Date.now();
  for (const filename of fs.readdirSync(dir)) {
    const filePath = path.join(dir, filename);
    const stats = fs.statSync(filePath);
    if (now - stats.mtimeMs > PENDING_TTL_MS) {
      fs.unlinkSync(filePath);
    }
  }
}

function validateProposal(proposal, { profile, normalizedSourceText }) {
  const reasons = [];
  const { section, operation, field, identity, entry, items, groundingQuote } = proposal;

  if (!SECTION_KEYS.includes(section) || !LLM_PROPOSABLE_SECTIONS.includes(section)) {
    reasons.push(`section '${section}' is not LLM-proposable`);
  }
  if (!['upsertEntry', 'appendStrings'].includes(operation)) {
    reasons.push(`operation '${operation}' is not allowed (only upsertEntry/appendStrings)`);
  }
  if (!groundingQuote || typeof groundingQuote !== 'string' || !normalize(groundingQuote) || !normalizedSourceText.includes(normalize(groundingQuote))) {
    reasons.push('groundingQuote is missing or not found verbatim in the source text');
  }

  if (reasons.length > 0) return reasons;

  const schema = SECTION_SCHEMAS[section];
  if (operation === 'upsertEntry') {
    if (schema.kind !== 'objectArray') {
      reasons.push(`upsertEntry does not apply to section '${section}' (kind: ${schema.kind})`);
    } else if (!entry || typeof entry !== 'object') {
      reasons.push('upsertEntry requires an entry object');
    } else {
      const existingList = profile[section] || [];
      const existingTexts = existingList.map((e) => JSON.stringify(e));
      if (isNearDuplicate(JSON.stringify(entry), existingTexts, 0.72)) {
        reasons.push('near-duplicate of an existing entry');
      }
    }
  } else if (operation === 'appendStrings') {
    if (!Array.isArray(items) || items.length === 0) {
      reasons.push('appendStrings requires a non-empty items array');
    } else {
      let existingList = [];
      if (schema.kind === 'stringArray') {
        existingList = profile[section] || [];
      } else if (schema.kind === 'categoryMap') {
        if (!field) reasons.push("'field' (category name) is required for core_competencies");
        else existingList = (profile[section] || {})[field] || [];
      } else if (schema.kind === 'objectArray') {
        if (!field || !identity) {
          reasons.push("'field' and 'identity' are required to append into an objectArray entry's nested array");
        } else {
          const list = profile[section] || [];
          const match = list.find((e) => schema.identityFields.every((f) => normalize(e[f]) === normalize(identity[f])));
          if (!match) reasons.push(`no matching ${section} entry found for identity ${JSON.stringify(identity)}`);
          else existingList = match[field] || [];
        }
      } else {
        reasons.push(`appendStrings does not apply to section '${section}' (kind: ${schema.kind})`);
      }
      if (reasons.length === 0 && items.every((item) => isNearDuplicate(item, existingList, 0.72))) {
        reasons.push('all items are near-duplicates of existing content');
      }
    }
  }

  return reasons;
}

// Real write/version-management routes for src/data/john_profile.json,
// replacing the permanent 501 stub that used to live at POST /api/profile/update
// (backend/api/profile_update.js, now deleted). Sibling to, not nested
// under, the existing read-only backend/api/profile_view.js (mounted at
// /api/profile-view) — that router is untouched by this feature.
export function createProfileRouter({ projectRoot }) {
  const router = express.Router();

  function readEnvelope() {
    return JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
  }

  function writeEnvelope(profile) {
    const envelope = {
      timestamp: new Date().toISOString(),
      sourceFile: PROFILE_PATH,
      profile,
    };
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(envelope, null, 2), 'utf-8');
    return envelope;
  }

  // Manual edit — part (a). Body: { ops: [...], expectedTimestamp }.
  router.post('/manual', async (req, res) => {
    const { ops, expectedTimestamp } = req.body || {};
    if (!Array.isArray(ops) || ops.length === 0) {
      return res.status(400).json({ success: false, error: 'ops must be a non-empty array' });
    }

    const envelope = readEnvelope();
    if (expectedTimestamp && envelope.timestamp !== expectedTimestamp) {
      return res.status(409).json({
        success: false,
        error: 'The profile was changed by someone else since you loaded it. Reload and reapply your edit.',
        currentTimestamp: envelope.timestamp,
      });
    }

    let nextProfile;
    try {
      nextProfile = applyProfileOps(envelope.profile, ops);
    } catch (err) {
      if (err instanceof ProfileOpsError) {
        return res.status(err.statusCode).json({ success: false, error: err.message });
      }
      throw err;
    }

    const backup = await ensureBackup();
    const newEnvelope = writeEnvelope(nextProfile);
    res.json({ success: true, timestamp: newEnvelope.timestamp, profile: newEnvelope.profile, backup: backup.filename });
  });

  // "Update from Resume" — part (b). Propose step: calls the LLM, validates
  // every proposal server-side (allowlist, grounding, near-dup), writes
  // survivors to a pending-proposals file. NEVER writes to john_profile.json.
  router.post('/update-from-resume/propose', async (req, res) => {
    const { sources, llm, customModel } = req.body || {};
    if (!Array.isArray(sources) || sources.length === 0 || sources.some((s) => !s?.text?.trim())) {
      return res.status(400).json({ success: false, error: 'sources must be a non-empty array of {label, text}' });
    }

    pruneStalePending();
    const envelope = readEnvelope();
    const profile = envelope.profile;
    const normalizedSourceText = normalize(sources.map((s) => s.text).join(' '));

    let result;
    try {
      result = await callLlmJson({
        projectRoot,
        llm: llm || 'sonnet',
        customModel,
        systemPrompt: PROPOSE_SYSTEM_PROMPT,
        userPrompt: buildProposeUserPrompt({ profile, sources }),
        maxTokens: 8000,
        label: 'Profile Update Propose',
      });
    } catch (err) {
      if (err instanceof LlmClientError) {
        return res.status(err.statusCode).json({ success: false, error: err.message });
      }
      throw err;
    }

    const rawProposals = Array.isArray(result.proposals) ? result.proposals : [];
    const kept = [];
    const rejected = [];
    for (const proposal of rawProposals) {
      const reasons = validateProposal(proposal, { profile, normalizedSourceText });
      if (reasons.length === 0) {
        kept.push({ id: crypto.randomUUID(), ...proposal });
      } else {
        rejected.push({ ...proposal, reasons });
      }
    }

    const proposalId = crypto.randomUUID();
    fs.mkdirSync(pendingDir(), { recursive: true });
    fs.writeFileSync(
      path.join(pendingDir(), `${proposalId}.json`),
      JSON.stringify({ proposalId, createdAt: new Date().toISOString(), items: kept }, null, 2),
      'utf-8'
    );

    res.json({ success: true, proposalId, items: kept, rejected });
  });

  // Approve step — converts the approved subset of a previously-proposed
  // batch into profileOps ops and funnels through the exact same
  // ensureBackup() -> applyProfileOps() -> write path as /manual.
  router.post('/update-from-resume/approve', async (req, res) => {
    const { proposalId, approvedItemIds } = req.body || {};
    if (!proposalId || !Array.isArray(approvedItemIds) || approvedItemIds.length === 0) {
      return res.status(400).json({ success: false, error: 'proposalId and a non-empty approvedItemIds array are required' });
    }

    let resolvedPending;
    try {
      resolvedPending = resolveWithinRoot(pendingDir(), `${proposalId}.json`, { allowedExtensions: ['.json'] });
    } catch (err) {
      if (err instanceof PathGuardError) {
        return res.status(err.statusCode).json({ success: false, error: err.message });
      }
      throw err;
    }
    if (!fs.existsSync(resolvedPending)) {
      return res.status(404).json({ success: false, error: `No pending proposal found: ${proposalId}` });
    }

    const pending = JSON.parse(fs.readFileSync(resolvedPending, 'utf-8'));
    const approvedSet = new Set(approvedItemIds);
    const approvedItems = pending.items.filter((item) => approvedSet.has(item.id));
    if (approvedItems.length === 0) {
      return res.status(400).json({ success: false, error: 'None of the given approvedItemIds matched this proposal' });
    }

    const ops = approvedItems.map((item) => {
      if (item.operation === 'upsertEntry') {
        return { kind: 'upsertEntry', section: item.section, identity: item.identity, entry: item.entry };
      }
      return { kind: 'appendStrings', section: item.section, field: item.field, identity: item.identity, items: item.items };
    });

    const envelope = readEnvelope();
    let nextProfile;
    try {
      nextProfile = applyProfileOps(envelope.profile, ops);
    } catch (err) {
      if (err instanceof ProfileOpsError) {
        return res.status(err.statusCode).json({ success: false, error: err.message });
      }
      throw err;
    }

    const backup = await ensureBackup();
    const newEnvelope = writeEnvelope(nextProfile);
    fs.unlinkSync(resolvedPending);
    res.json({ success: true, timestamp: newEnvelope.timestamp, profile: newEnvelope.profile, backup: backup.filename });
  });

  // Version history — parts (c)/(d).
  router.get('/versions', (req, res) => {
    const backups = listBackups().map(({ path: _p, ...rest }) => rest); // don't leak absolute fs paths to the client
    res.json({ success: true, versions: backups });
  });

  router.get('/versions/:filename', (req, res) => {
    let resolved;
    try {
      resolved = resolveWithinRoot(BACKUP_DIR, req.params.filename, { allowedExtensions: ['.json'] });
    } catch (err) {
      if (err instanceof PathGuardError) {
        return res.status(err.statusCode).json({ success: false, error: err.message });
      }
      throw err;
    }
    const filename = path.basename(resolved);
    const backup = getBackup(filename);
    if (!backup) {
      return res.status(404).json({ success: false, error: `Backup not found: ${filename}` });
    }
    res.json({ success: true, timestamp: backup.timestamp, profile: backup.profile });
  });

  router.post('/versions/:filename/restore', async (req, res) => {
    let resolved;
    try {
      resolved = resolveWithinRoot(BACKUP_DIR, req.params.filename, { allowedExtensions: ['.json'] });
    } catch (err) {
      if (err instanceof PathGuardError) {
        return res.status(err.statusCode).json({ success: false, error: err.message });
      }
      throw err;
    }
    const filename = path.basename(resolved);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ success: false, error: `Backup not found: ${filename}` });
    }

    // Snapshot the current state first, so a restore is itself undoable.
    const preRestoreBackup = await ensureBackup();
    const result = await restoreProfile(filename);
    if (!result.success) {
      return res.status(500).json({ success: false, error: result.message });
    }
    const envelope = readEnvelope();
    res.json({ success: true, timestamp: envelope.timestamp, profile: envelope.profile, preRestoreBackup: preRestoreBackup.filename });
  });

  return router;
}
