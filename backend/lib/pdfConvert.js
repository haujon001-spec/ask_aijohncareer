import { spawn, spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { resolvePythonBin } from './pythonRunner.js';

const SCRIPT_REL_PATH = path.join('scripts', 'jd_scorecard_resume_v2.py');
const CONVERT_TIMEOUT_MS = 3 * 60 * 1000;

let capabilityCache = null;
let converting = false;

/**
 * Which PDF engine this host has. Word (laptop) is preferred because the PDF
 * then matches the docx exactly; LibreOffice is the fallback. The production
 * jd-api container (alpine) has neither, so there the portal hides "Convert to
 * PDF" and relies on PDFs made on the laptop arriving via Sync.
 */
export function getPdfCapability() {
  if (capabilityCache) return capabilityCache;

  if (process.platform === 'win32') {
    const word = spawnSync('reg', ['query', 'HKCR\\Word.Application', '/ve'], { windowsHide: true });
    if (word.status === 0) {
      capabilityCache = { available: true, engine: 'word' };
      return capabilityCache;
    }
  }

  const finder = process.platform === 'win32' ? 'where' : 'which';
  const lo = spawnSync(finder, ['soffice'], { windowsHide: true });
  if (lo.status === 0) {
    capabilityCache = { available: true, engine: 'libreoffice' };
    return capabilityCache;
  }

  capabilityCache = {
    available: false,
    engine: null,
    reason: 'No Word or LibreOffice on this server. Generate PDFs on the laptop and bring them over with Sync.',
  };
  return capabilityCache;
}

export function isPdfConversionBusy() {
  return converting;
}

/** Sibling pdf/ path for a docx under .../<Type>/docx/<name>.docx */
export function pdfPathForDocx(absDocx) {
  return path.join(path.dirname(path.dirname(absDocx)), 'pdf', `${path.basename(absDocx, '.docx')}.pdf`);
}

/**
 * Convert one existing docx via the pipeline script's standalone
 * --docx-to-pdf= mode (no LLM call, no API key needed).
 */
export function convertDocxToPdf({ projectRoot, absDocx }) {
  return new Promise((resolve) => {
    converting = true;
    const startedAtMs = Date.now();
    const pythonBin = resolvePythonBin(projectRoot);
    const scriptPath = path.join(projectRoot, SCRIPT_REL_PATH);
    const child = spawn(pythonBin, [scriptPath, `--docx-to-pdf=${absDocx}`], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      converting = false;
      resolve(result);
    };
    const timer = setTimeout(() => {
      child.kill();
      finish({ ok: false, error: 'PDF conversion timed out' });
    }, CONVERT_TIMEOUT_MS);

    child.stdout.on('data', (c) => { stdout += c.toString(); });
    child.stderr.on('data', (c) => { stderr += c.toString(); });
    child.on('error', (err) => finish({ ok: false, error: `Failed to start python: ${err.message}` }));
    child.on('close', (code) => {
      const pdf = pdfPathForDocx(absDocx);
      // "No hallucinated success": trust the file on disk, not the exit code alone.
      const fresh = fs.existsSync(pdf) && fs.statSync(pdf).mtimeMs >= startedAtMs - 2000;
      if (code === 0 && fresh) return finish({ ok: true, absPdf: pdf });
      finish({
        ok: false,
        error: 'PDF conversion failed',
        detail: (stdout + stderr).slice(-1500),
      });
    });
  });
}
