import express from 'express';
import fs from 'fs';
import path from 'path';
import { resolveWithinRoot, PathGuardError } from '../lib/pathGuard.js';
import { deriveJdMetadata } from '../lib/jdNaming.js';
import { isValidProfileName } from '../lib/profileName.js';
import {
  runJdPipelineV3, discoverOutputsV3, isValidLlm, requiredKeyEnvFor, hasUsableKey,
  getCurrentRunStatus, cancelCurrentRun, isPipelineBusy,
} from '../lib/pythonRunner.js';
import { isValidProvider } from '../lib/llmKeys.js';

const VALID_MODES = ['all', 'scorecard', 'resume', 'coverletter'];

// Profile-aware sibling of jd_run.js — near-identical body, but requires
// profileName and resolves data_raw/<profileName>/jd/txt per-request instead
// of a fixed constructor-time directory (each profile has its own JD corpus,
// see jd_scorecard_resume_v3.py's own path-forking rationale). jd_run.js
// itself is untouched; /status and /cancel share pythonRunner.js's single
// currentRun state with v2's router, per the shared-lock decision.
export function createJdRunV3Router({ projectRoot, timeoutMs }) {
  const router = express.Router();

  router.get('/status', (req, res) => {
    res.json(getCurrentRunStatus());
  });

  router.post('/cancel', (req, res) => {
    const result = cancelCurrentRun();
    if (!result.cancelled) {
      return res.status(409).json({ error: result.reason || 'No run in progress to cancel' });
    }
    res.json(result);
  });

  router.post('/', async (req, res) => {
    const {
      profileName, jdFile, llm = 'sonnet', mode = 'all', refreshBlueprint = false,
      generateDocx = true, resumeAdjustment = false, customModel = null,
    } = req.body || {};

    if (!isValidProfileName(profileName)) {
      return res.status(400).json({ error: 'profileName is required and must be filename-safe' });
    }
    if (!jdFile || typeof jdFile !== 'string') {
      return res.status(400).json({ error: 'jdFile is required' });
    }
    if (!VALID_MODES.includes(mode)) {
      return res.status(400).json({ error: `Invalid mode: ${mode}. Valid: ${VALID_MODES.join(', ')}` });
    }
    if (!isValidLlm(llm)) {
      return res.status(400).json({ error: `Invalid llm: ${llm}. Valid: sonnet, deepseek, gemini, custom` });
    }
    if (llm === 'custom') {
      if (!customModel || !isValidProvider(customModel.provider) || !customModel.slug || typeof customModel.slug !== 'string') {
        return res.status(400).json({ error: 'llm=custom requires customModel: { provider: "openrouter"|"deepseek", slug: "<model id>" }' });
      }
    }

    const jdTxtDir = path.join(projectRoot, 'data_raw', profileName, 'jd', 'txt');
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

    if (!hasUsableKey({ projectRoot, llm, customModel })) {
      const requiredEnv = requiredKeyEnvFor(llm, customModel);
      return res.status(400).json({
        error: `No API key available for this provider (${requiredEnv}). Set it in .env.local, or save your own key under API Keys in the portal.`,
      });
    }

    if (isPipelineBusy()) {
      return res.status(409).json({ error: 'Another JD run is already in progress. Try again shortly.' });
    }

    const runStartedAtMs = Date.now();
    const jdStem = path.basename(jdFile, '.txt');
    const { employer } = deriveJdMetadata(jdStem);

    console.log(`🚀 [jd-api] Running v3 JD pipeline for '${profileName}': ${jdFile} (llm=${llm}, mode=${mode})`);
    const result = await runJdPipelineV3({ projectRoot, profileName, jdAbsPath, llm, mode, refreshBlueprint, generateDocx, resumeAdjustment, customModel, timeoutMs });

    if (result.timedOut) {
      return res.status(500).json({ error: 'JD pipeline timed out', killed: true });
    }
    if (result.spawnError) {
      return res.status(500).json({
        error: `Failed to start python process: ${result.spawnError}`,
        hint: 'Check PYTHON_BIN / .venv setup.',
      });
    }
    if (result.cancelled) {
      console.log(`⏹️ [jd-api] v3 JD pipeline cancelled by user: ${jdFile}`);
      return res.json({ success: false, cancelled: true, jdFile, employer });
    }
    if (result.exitCode !== 0) {
      return res.status(500).json({
        error: 'JD pipeline exited with a non-zero status',
        exitCode: result.exitCode,
        stderrTail: result.stderr.slice(-2000),
        stdoutTail: result.stdout.slice(-2000),
      });
    }

    const outputs = discoverOutputsV3({ projectRoot, profileName, employer, mode, runStartedAtMs });
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
    console.log(`✅ [jd-api] v3 JD pipeline completed in ${durationMs}ms`);

    res.json({ success: true, jdFile, employer, llm, durationMs, outputs, downloadUrls });
  });

  return router;
}
