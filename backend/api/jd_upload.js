import express from 'express';
import fs from 'fs';
import path from 'path';
import { sanitizeEmployerSlug, sanitizeRoleSlug } from '../lib/jdNaming.js';

export function createJdUploadRouter({ jdTxtDir }) {
  const router = express.Router();

  router.post('/', (req, res) => {
    const { employer, role, jdText, overwrite } = req.body || {};

    if (!employer || typeof employer !== 'string') {
      return res.status(400).json({ error: 'employer is required' });
    }
    if (!jdText || typeof jdText !== 'string' || jdText.trim().length < 50) {
      return res.status(400).json({ error: 'jdText is required and must be at least 50 characters' });
    }

    const employerSlug = sanitizeEmployerSlug(employer);
    if (!employerSlug) {
      return res.status(400).json({ error: 'employer must contain at least one alphanumeric character' });
    }
    const roleSlug = role ? sanitizeRoleSlug(role) : '';

    const filename = roleSlug ? `JD_${employerSlug}_${roleSlug}.txt` : `JD_${employerSlug}.txt`;
    const filePath = path.join(jdTxtDir, filename);

    fs.mkdirSync(jdTxtDir, { recursive: true });

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
        path: `data_raw/jd/txt/${filename}`,
        employer: employerSlug,
        roleSlug: roleSlug || null,
        sizeBytes: stat.size,
        createdAt: stat.birthtime.toISOString(),
      },
    });
  });

  return router;
}
