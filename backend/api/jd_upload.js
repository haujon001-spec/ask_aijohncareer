import express from 'express';
import fs from 'fs';
import path from 'path';
import { sanitizeEmployerSlug, sanitizeRoleSlug } from '../lib/jdNaming.js';

// jdTxtDir: either a fixed absolute path (v2's existing usage, unchanged), or
// a `(req) => absolutePath` resolver (Phase 2, 11 Aug 2026 — lets a v3 mount
// derive data_raw/<profileName>/jd/txt per-request from req.body.profileName
// without duplicating this whole route).
export function createJdUploadRouter({ jdTxtDir, projectRoot }) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const { employer, role, jdText, overwrite } = req.body || {};

    if (!employer || typeof employer !== 'string') {
      return res.status(400).json({ error: 'employer is required' });
    }
    if (!jdText || typeof jdText !== 'string' || jdText.trim().length < 50) {
      return res.status(400).json({ error: 'jdText is required and must be at least 50 characters' });
    }

    const resolvedJdTxtDir = typeof jdTxtDir === 'function' ? jdTxtDir(req) : jdTxtDir;
    if (!resolvedJdTxtDir) {
      return res.status(400).json({ error: 'Could not resolve a target JD folder for this request' });
    }

    const employerSlug = sanitizeEmployerSlug(employer);
    if (!employerSlug) {
      return res.status(400).json({ error: 'employer must contain at least one alphanumeric character' });
    }
    const roleSlug = role ? sanitizeRoleSlug(role) : '';

    const filename = roleSlug ? `JD_${employerSlug}_${roleSlug}.txt` : `JD_${employerSlug}.txt`;
    const filePath = path.join(resolvedJdTxtDir, filename);

    fs.mkdirSync(resolvedJdTxtDir, { recursive: true });

    try {
      fs.writeFileSync(filePath, jdText, { flag: overwrite ? 'w' : 'wx' });
    } catch (err) {
      if (err.code === 'EEXIST') {
        const stat = fs.statSync(filePath);
        return res.status(409).json({
          error: 'A JD file with this employer/role already exists. Pass overwrite:true to replace it.',
          existing: { filename, sizeBytes: stat.size, modifiedAt: stat.mtime.toISOString() },
        });
      }
      throw err;
    }

    const stat = fs.statSync(filePath);
    console.log(`✅ [jd-api] Uploaded JD: ${filename} (${stat.size} bytes)`);

    res.status(201).json({
      success: true,
      file: {
        filename,
        path: projectRoot
          ? path.relative(projectRoot, filePath).split(path.sep).join('/')
          : `data_raw/jd/txt/${filename}`,
        employer: employerSlug,
        roleSlug: roleSlug || null,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString(),
      },
    });
  });

  return router;
}
