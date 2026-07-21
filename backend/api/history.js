import express from 'express';
import fs from 'fs';
import path from 'path';
import { parseMatchScore, toRepoRelativePath } from '../lib/pythonRunner.js';

/**
 * Filesystem-scan based history, no DB — matches the repo's existing
 * "filesystem is the source of truth" convention (see backend/backup.js).
 */
export function createHistoryRouter({ projectRoot }) {
  const router = express.Router();
  const dataProcessedRoot = path.join(projectRoot, 'data_processed');

  router.get('/', (req, res) => {
    const { employer: employerFilter, limit } = req.query;

    if (!fs.existsSync(dataProcessedRoot)) {
      return res.json({ success: true, count: 0, history: [] });
    }

    const employerDirs = fs.readdirSync(dataProcessedRoot).filter((name) => {
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

    res.json({ success: true, count: limited.length, history: limited });
  });

  return router;
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
