import express from 'express';
import fs from 'fs';
import path from 'path';
import { resolveWithinRoot, PathGuardError } from '../lib/pathGuard.js';
import { isPipelineBusy, toRepoRelativePath } from '../lib/pythonRunner.js';
import { getPdfCapability, isPdfConversionBusy, convertDocxToPdf, pdfPathForDocx } from '../lib/pdfConvert.js';

// Accepts the three path shapes the UI holds: "data_processed/X/...",
// "/api/download/X/..." and a bare "X/..." (relative to data_processed/).
function normalizeRel(p) {
  return String(p || '').replace(/^\/api\/download\//, '').replace(/^data_processed\//, '');
}

export function createPdfRouter({ projectRoot, dataProcessedRoot }) {
  const router = express.Router();

  router.get('/capabilities', (req, res) => {
    res.json(getPdfCapability());
  });

  // Convert ONE existing docx under data_processed/<...>/docx/ to a sibling
  // pdf/ file. Same path guard as /api/download and /api/view.
  router.post('/convert', async (req, res) => {
    let absDocx;
    try {
      absDocx = resolveWithinRoot(dataProcessedRoot, normalizeRel(req.body?.path), { allowedExtensions: ['.docx'] });
    } catch (err) {
      if (err instanceof PathGuardError) return res.status(err.statusCode).json({ error: err.message });
      throw err;
    }
    if (path.basename(path.dirname(absDocx)).toLowerCase() !== 'docx') {
      return res.status(400).json({ error: 'Only files inside a docx/ folder can be converted' });
    }
    if (!fs.existsSync(absDocx) || !fs.statSync(absDocx).isFile()) {
      return res.status(404).json({ error: 'docx file not found' });
    }

    const capability = getPdfCapability();
    if (!capability.available) {
      return res.status(501).json({ error: capability.reason });
    }
    // Word is a single shared COM instance; never run two conversions, or a
    // conversion alongside a pipeline run that may itself be producing PDFs.
    if (isPdfConversionBusy() || isPipelineBusy()) {
      return res.status(409).json({ error: 'Another PDF conversion or JD run is in progress. Try again shortly.' });
    }

    const result = await convertDocxToPdf({ projectRoot, absDocx });
    if (!result.ok) {
      return res.status(500).json({ error: result.error, detail: result.detail });
    }
    const pdf = toRepoRelativePath(projectRoot, result.absPdf);
    res.json({
      success: true,
      engine: capability.engine,
      pdf,
      downloadUrl: `/api/download/${pdf.replace(/^data_processed\//, '')}`,
    });
  });

  // Is there already a pdf next to this docx? (cheap check for the UI)
  router.get('/exists', (req, res) => {
    let absDocx;
    try {
      absDocx = resolveWithinRoot(dataProcessedRoot, normalizeRel(req.query.path), { allowedExtensions: ['.docx'] });
    } catch (err) {
      if (err instanceof PathGuardError) return res.status(err.statusCode).json({ error: err.message });
      throw err;
    }
    const pdf = pdfPathForDocx(absDocx);
    res.json({ exists: fs.existsSync(pdf), pdf: fs.existsSync(pdf) ? toRepoRelativePath(projectRoot, pdf) : null });
  });

  return router;
}
