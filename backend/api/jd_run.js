import express from 'express';
import fs from 'fs';
import path from 'path';
import { resolveWithinRoot, PathGuardError } from '../lib/pathGuard.js';
import { deriveJdMetadata } from '../lib/jdNaming.js';
import { runJdPipeline, discoverOutputs, isValidLlm, requiredKeyEnvFor } from '../lib/pythonRunner.js';

const VALID_MODES = ['all', 'scorecard', 'resume', 'coverletter'];

export function createJdRunRouter({ projectRoot, jdTxtDir, timeoutMs }) {
  const router = express.Router();
  let runInProgress = false;

  router.post('/', async (req, res) => {
    const { jdFile, llm = 'sonnet', mode = 'all', refreshBlueprint = false, generateDocx = true } = req.body || {};

    if (!jdFile || typeof jdFile !== 'string') {
      return res.status(400).json({ error: 'jdFile is required' });
    }
    if (!VALID_MODES.includes(mode)) {
      return res.status(400).json({ error: `Invalid mode: ${mode}. Valid: ${VALID_MODES.join(', ')}` });
    }
    if (!isValidLlm(llm)) {
      return res.status(400).json({ error: `Invalid llm: ${llm}. Valid: sonnet, deepseek, gemini` });
    }

    let jdAbsPath;
    try {
      jdAbsPath = resolveWithinRoot(jdTxtDir, jdFile, { allowedExtensions: ['.txt'] });
    } catch (err) {
      if (err instanceof PathGuardError) return res.status(err.statusCode).json({ error: err.message });
      throw err;
    }
    if (!fs.existsSync(jdAbsPath)) {
      return res.status(404).json({ error: `JD file not found: ${jdFile}` });
    }

    const requiredEnv = requiredKeyEnvFor(llm);
    if (!process.env[requiredEnv]) {
      return res.status(400).json({ error: `${requiredEnv} is not configured. Set it in .env.local before running llm=${llm}.` });
    }

    if (runInProgress) {
      return res.status(409).json({ error: 'Another JD run is already in progress. Try again shortly.' });
    }

    runInProgress = true;
    const runStartedAtMs = Date.now();
    const jdStem = path.basename(jdFile, '.txt');
    const { employer } = deriveJdMetadata(jdStem);

    try {
      console.log(`🚀 [jd-api] Running JD pipeline: ${jdFile} (llm=${llm}, mode=${mode})`);
      const result = await runJdPipeline({ projectRoot, jdAbsPath, llm, mode, refreshBlueprint, generateDocx, timeoutMs });

      if (result.timedOut) {
        return res.status(500).json({ error: 'JD pipeline timed out', killed: true });
      }
      if (result.spawnError) {
        return res.status(500).json({
          error: `Failed to start python process: ${result.spawnError}`,
          hint: 'Check PYTHON_BIN / .venv setup.',
        });
      }
      if (result.exitCode !== 0) {
        return res.status(500).json({
          error: 'JD pipeline exited with a non-zero status',
          exitCode: result.exitCode,
          stderrTail: result.stderr.slice(-2000),
          stdoutTail: result.stdout.slice(-2000),
        });
      }

      const outputs = discoverOutputs({ projectRoot, employer, mode, runStartedAtMs });
      if (Object.keys(outputs).length === 0) {
        return res.status(500).json({
          error: 'Script succeeded but expected output files were not found',
          stdoutTail: result.stdout.slice(-2000),
        });
      }

      const downloadUrls = {};
      for (const [type, entry] of Object.entries(outputs)) {
        if (entry.txt) downloadUrls[`${type}Txt`] = `/api/download/${entry.txt.replace(/^data_processed\//, '')}`;
        if (entry.docx) downloadUrls[`${type}Docx`] = `/api/download/${entry.docx.replace(/^data_processed\//, '')}`;
      }

      const durationMs = Date.now() - runStartedAtMs;
      console.log(`✅ [jd-api] JD pipeline completed in ${durationMs}ms`);

      res.json({ success: true, jdFile, employer, llm, durationMs, outputs, downloadUrls });
    } finally {
      runInProgress = false;
    }
  });

  return router;
}
