import express from 'express';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';
import { resolveWithinRoot, PathGuardError } from '../lib/pathGuard.js';

export function createViewRouter({ dataProcessedRoot }) {
  const router = express.Router();

  router.get('/*', async (req, res) => {
    const relPath = req.params[0];
    let absPath;
    try {
      absPath = resolveWithinRoot(dataProcessedRoot, relPath, { allowedExtensions: ['.docx'] });
    } catch (err) {
      if (err instanceof PathGuardError) return res.status(err.statusCode).json({ error: err.message });
      throw err;
    }

    if (path.basename(absPath).startsWith('~$')) {
      return res.status(400).json({ error: 'Not viewable (Word lock file)' });
    }

    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }

    try {
      const result = await mammoth.convertToHtml({ path: absPath });
      res.json({ html: result.value, warnings: result.messages });
    } catch (err) {
      console.error('❌ [jd-api] view conversion failed:', err.message);
      res.status(500).json({ error: 'Failed to convert document' });
    }
  });

  return router;
}
