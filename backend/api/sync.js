import express from 'express';
import { getSyncInfo, isSyncEnabled, isSyncing, buildPlan, runSync } from '../lib/syncEngine.js';
import { isPipelineBusy } from '../lib/pythonRunner.js';

const VALID_DIRECTIONS = ['both', 'push', 'pull'];
const VALID_RESOLUTIONS = ['local', 'remote', 'skip'];

// Laptop-only feature: the production container reports enabled:false and
// refuses everything else, so the VPS portal never shows or runs a sync.
export function createSyncRouter({ projectRoot }) {
  const router = express.Router();

  router.get('/status', (req, res) => {
    res.json(getSyncInfo());
  });

  router.use((req, res, next) => {
    if (!isSyncEnabled()) return res.status(404).json({ error: 'Sync is only available from the laptop portal' });
    next();
  });

  // Dry run: compares both sides by sha256 and returns the per-company plan.
  router.post('/preview', async (req, res) => {
    if (isSyncing()) return res.status(409).json({ error: 'A sync is already running' });
    try {
      const { companies, totals } = await buildPlan(projectRoot);
      res.json({ success: true, companies, totals });
    } catch (err) {
      res.status(502).json({ error: err.message });
    }
  });

  router.post('/run', async (req, res) => {
    const { direction = 'both', resolutions = {}, companies = null, confirm } = req.body || {};
    if (companies !== null && (!Array.isArray(companies) || !companies.every((c) => typeof c === 'string'))) {
      return res.status(400).json({ error: 'companies must be an array of company names' });
    }
    if (confirm !== true) return res.status(400).json({ error: 'confirm:true is required (run the preview first)' });
    if (!VALID_DIRECTIONS.includes(direction)) {
      return res.status(400).json({ error: `Invalid direction. Valid: ${VALID_DIRECTIONS.join(', ')}` });
    }
    if (typeof resolutions !== 'object' || resolutions === null || Array.isArray(resolutions)) {
      return res.status(400).json({ error: 'resolutions must be an object { company: "local"|"remote"|"skip" }' });
    }
    for (const [company, choice] of Object.entries(resolutions)) {
      if (!VALID_RESOLUTIONS.includes(choice)) {
        return res.status(400).json({ error: `Invalid resolution for ${company}: ${choice}` });
      }
    }
    if (isSyncing()) return res.status(409).json({ error: 'A sync is already running' });
    if (isPipelineBusy()) {
      return res.status(409).json({ error: 'A JD run is in progress — wait for it to finish, then sync.' });
    }

    try {
      const summary = await runSync({ projectRoot, direction, resolutions, companies });
      res.json({ success: summary.failed.length === 0 && summary.errors.length === 0, ...summary });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
