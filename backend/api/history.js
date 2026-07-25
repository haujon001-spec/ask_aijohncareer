import express from 'express';
import fs from 'fs';
import path from 'path';
import { parseMatchScore, toRepoRelativePath, getCurrentRunStatus } from '../lib/pythonRunner.js';
import { deriveJdMetadata } from '../lib/jdNaming.js';
import { resolveWithinRoot, PathGuardError } from '../lib/pathGuard.js';

/**
 * Filesystem-scan based history, no DB — matches the repo's existing
 * "filesystem is the source of truth" convention (see backend/backup.js).
 */
export function createHistoryRouter({ projectRoot }) {
  const router = express.Router();
  const dataProcessedRoot = path.join(projectRoot, 'data_processed');

  router.get('/', (req, res) => {
    const { employer: employerFilter, limit } = req.query;
    const { count, history } = scanHistory({ projectRoot, dataProcessedRoot, employerFilter, limit });
    res.json({ success: true, count, history });
  });

  // Soft-delete: moves data_processed/<employer>/ into a timestamped trash
  // folder rather than removing it outright — no undo mechanism exists
  // anywhere else in this codebase, and a move is nearly as cheap as a
  // permanent delete. Only touches generated outputs; source JD text
  // (data_raw/jd/txt/) and the blueprint cache (src/data/jd/) are left
  // alone since other reruns of the same role may still depend on them.
  router.delete('/:employer', async (req, res) => {
    const { employer } = req.params;

    const status = getCurrentRunStatus();
    if (status.running) {
      const runningEmployer = deriveJdMetadata(status.jdFile.replace(/\.txt$/, '')).employer;
      if (runningEmployer === employer) {
        return res.status(409).json({
          error: `A run for ${employer} is currently in progress — try again once it finishes.`,
        });
      }
    }

    let target;
    try {
      target = resolveWithinRoot(dataProcessedRoot, employer);
    } catch (err) {
      if (err instanceof PathGuardError) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      throw err;
    }

    if (!fs.existsSync(target) || !fs.statSync(target).isDirectory()) {
      return res.status(404).json({ error: `No history found for ${employer}` });
    }

    const trashDir = path.join(dataProcessedRoot, '.trash', new Date().toISOString().replace(/[:.]/g, '-'));
    fs.mkdirSync(trashDir, { recursive: true });

    // A plain fs.renameSync reliably EPERMs here — confirmed (25 Jul 2026)
    // that something on this Windows dev box (most likely Vite's dev-server
    // file watcher holding a directory-change handle on the just-written
    // output folder) blocks the atomic rename, even though reads, copies,
    // and deletes of the same files all succeed. Copy-then-delete sidesteps
    // it entirely. Each step still gets a short retry for genuinely
    // transient locks (e.g. AV scanning a freshly-written .docx).
    const destination = path.join(trashDir, employer);
    let lastErr = null;
    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        fs.cpSync(target, destination, { recursive: true });
        fs.rmSync(target, { recursive: true, force: true });
        lastErr = null;
        break;
      } catch (err) {
        lastErr = err;
        if (err.code !== 'EPERM' && err.code !== 'EBUSY') throw err;
        if (attempt < 5) await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
      }
    }
    if (lastErr) {
      return res.status(500).json({
        error: `Could not move ${employer}'s history to trash — a file may still be in use. Try again in a moment. (${lastErr.code})`,
      });
    }

    const { count, history } = scanHistory({ projectRoot, dataProcessedRoot });
    res.json({ success: true, employer, count, history });
  });

  return router;
}

function scanHistory({ projectRoot, dataProcessedRoot, employerFilter, limit }) {
  if (!fs.existsSync(dataProcessedRoot)) {
    return { count: 0, history: [] };
  }

  const employerDirs = fs.readdirSync(dataProcessedRoot).filter((name) => {
    if (name === '.trash') return false;
    const full = path.join(dataProcessedRoot, name);
    if (!fs.statSync(full).isDirectory()) return false;
    // Skip legacy flat dirs (e.g. data_processed/resume/) whose own immediate
    // children are txt/docx/pdf, rather than per-employer type folders.
    const children = fs.readdirSync(full);
    if (children.includes('txt') || children.includes('docx')) return false;
    return true;
  });

  const entries = [];
  for (const employer of employerDirs) {
    if (employerFilter && employer !== employerFilter) continue;

    const scorecardDir = path.join(dataProcessedRoot, employer, 'ScoreCard', 'txt');
    if (!fs.existsSync(scorecardDir)) continue;

    for (const filename of fs.readdirSync(scorecardDir)) {
      if (!filename.endsWith('.txt')) continue;
      const match = filename.match(/^JD_SCORECARD_(.+)_(\d{2}[A-Z]{3}\d{4})\.txt$/);
      if (!match) continue;

      const [, employerAndRole, date] = match;
      const roleTag = employerAndRole.startsWith(employer)
        ? employerAndRole.slice(employer.length).replace(/^_/, '')
        : employerAndRole;

      const scorecardPath = path.join(scorecardDir, filename);
      const stat = fs.statSync(scorecardPath);
      const content = fs.readFileSync(scorecardPath, 'utf-8');

      entries.push({
        employer,
        roleTag: roleTag || null,
        date,
        generatedAt: stat.mtime.toISOString(),
        mtimeMs: stat.mtimeMs,
        scorecard: {
          txt: toRepoRelativePath(projectRoot, scorecardPath),
          docx: findSibling(projectRoot, employer, 'ScoreCard', filename),
          matchScore: parseMatchScore(content),
        },
        resume: findPaired(projectRoot, employer, 'resume', 'JohnHauResume', roleTag, date),
        coverLetter: findPaired(projectRoot, employer, 'CoverLetter', 'JohnHauCoverLetter', roleTag, date),
      });
    }
  }

  entries.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const limited = (limit ? entries.slice(0, Number(limit)) : entries).map((e) => {
    const { mtimeMs, ...rest } = e;
    return rest;
  });

  return { count: limited.length, history: limited };
}

function findPaired(projectRoot, employer, typeDir, prefix, roleTag, date) {
  const dir = path.join(projectRoot, 'data_processed', employer, typeDir, 'txt');
  if (!fs.existsSync(dir)) return null;

  const suffix = roleTag ? `${employer}_${roleTag}_${date}` : `${employer}_${date}`;
  const match = fs.readdirSync(dir).find((f) => f.startsWith(prefix) && f.includes(suffix));
  if (!match) return null;

  return {
    txt: toRepoRelativePath(projectRoot, path.join(dir, match)),
    docx: findSibling(projectRoot, employer, typeDir, match),
  };
}

function findSibling(projectRoot, employer, typeDir, txtFilename) {
  const docxPath = path.join(projectRoot, 'data_processed', employer, typeDir, 'docx', txtFilename.replace(/\.txt$/, '.docx'));
  return fs.existsSync(docxPath) ? toRepoRelativePath(projectRoot, docxPath) : null;
}
