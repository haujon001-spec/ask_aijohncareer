import express from 'express';
import fs from 'fs';
import path from 'path';
import { resolveWithinRoot, PathGuardError } from '../lib/pathGuard.js';

const CONTENT_TYPES = {
  '.txt': 'text/plain; charset=utf-8',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf',
};

export function createDownloadRouter({ dataProcessedRoot }) {
  const router = express.Router();

  router.get('/*', (req, res) => {
    const relPath = req.params[0];
    let absPath;
    try {
      absPath = resolveWithinRoot(dataProcessedRoot, relPath, { allowedExtensions: Object.keys(CONTENT_TYPES) });
    } catch (err) {
      if (err instanceof PathGuardError) return res.status(err.statusCode).json({ error: err.message });
      throw err;
    }

    if (!fs.existsSync(absPath) || !fs.statSync(absPath).isFile()) {
      return res.status(404).json({ error: 'File not found' });
    }

    const ext = path.extname(absPath).toLowerCase();
    res.setHeader('Content-Type', CONTENT_TYPES[ext]);
    res.download(absPath, path.basename(absPath));
  });

  return router;
}
