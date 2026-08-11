import express from 'express';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { isValidProfileName } from '../lib/profileName.js';
import { resolvePythonBin } from '../lib/pythonRunner.js';

const ALLOWED_EXTENSIONS = new Set(['.docx', '.txt']);

// Onboards a brand-new profile from an uploaded resume (Phase 2, 11 Aug
// 2026) — spawns the now-multi-profile-aware
// scripts/update_profile_from_resume.py --profile=<Name> --create-new-profile
// as a subprocess, mirroring pythonRunner.js's spawn pattern rather than
// reimplementing the extraction in JS (that logic already lives in the
// Python script and stays the single source of truth for it).
export function createOnboardRouter({ projectRoot }) {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const { profileName, filename, contentBase64 } = req.body || {};

    if (!isValidProfileName(profileName)) {
      return res.status(400).json({ error: 'profileName is required and must be filename-safe (letters, digits, hyphen, underscore only)' });
    }
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'filename is required' });
    }
    const ext = path.extname(filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(400).json({ error: `Unsupported file type: ${ext || '(none)'} — only .docx and .txt are accepted` });
    }
    if (!contentBase64 || typeof contentBase64 !== 'string') {
      return res.status(400).json({ error: 'contentBase64 is required' });
    }

    const existingProfilePath = path.join(projectRoot, 'src', 'data', profileName, 'profile.json');
    if (fs.existsSync(existingProfilePath)) {
      return res.status(409).json({ error: `A profile named '${profileName}' already exists.` });
    }

    let buffer;
    try {
      buffer = Buffer.from(contentBase64, 'base64');
    } catch {
      return res.status(400).json({ error: 'contentBase64 could not be decoded' });
    }

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jd-onboard-'));
    const tempFile = path.join(tempDir, `resume${ext}`);
    fs.writeFileSync(tempFile, buffer);

    try {
      const pythonBin = resolvePythonBin(projectRoot);
      const scriptPath = path.join(projectRoot, 'scripts', 'update_profile_from_resume.py');
      const args = [scriptPath, tempFile, `--profile=${profileName}`, '--create-new-profile'];

      console.log(`🐍 [jd-api] Onboarding profile '${profileName}': ${pythonBin} ${args.join(' ')}`);

      const { exitCode, stdout, stderr } = await new Promise((resolve) => {
        const child = spawn(pythonBin, args, {
          cwd: projectRoot,
          env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        });
        let out = '';
        let err = '';
        child.stdout.on('data', (c) => { out += c.toString(); });
        child.stderr.on('data', (c) => { err += c.toString(); });
        child.on('close', (code) => resolve({ exitCode: code, stdout: out, stderr: err }));
        child.on('error', (spawnErr) => resolve({ exitCode: null, stdout: out, stderr: `${err}\n${spawnErr.message}` }));
      });

      if (exitCode !== 0) {
        return res.status(500).json({
          error: 'Profile creation failed',
          stdoutTail: stdout.slice(-2000),
          stderrTail: stderr.slice(-2000),
        });
      }

      if (!fs.existsSync(existingProfilePath)) {
        return res.status(500).json({
          error: 'Script exited successfully but no profile.json was found',
          stdoutTail: stdout.slice(-2000),
        });
      }

      const envelope = JSON.parse(fs.readFileSync(existingProfilePath, 'utf-8'));
      const profile = envelope.profile || {};
      console.log(`✅ [jd-api] Onboarded profile '${profileName}' (${(profile.professional_experience || []).length} experience entries)`);

      res.status(201).json({
        success: true,
        profile: {
          name: profileName,
          displayName: profile.metadata?.name || profileName,
          experienceCount: (profile.professional_experience || []).length,
          achievementCount: (profile.major_achievements || []).length,
        },
      });
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  return router;
}
