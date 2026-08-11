import express from 'express';
import fs from 'fs';
import path from 'path';

// Lists onboarded multi-profile candidates (Phase 2, 11 Aug 2026) — scans
// src/data/*/profile.json. Deliberately excludes john_profile.json (a flat
// file, not a <Name>/ folder) — John stays v2/portal-only, everyone else is
// v3/portal2. New, additive — doesn't touch /api/profile (singular, John's
// existing editor route).
export function createProfilesRouter({ projectRoot }) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const dataDir = path.join(projectRoot, 'src', 'data');
    let entries = [];
    try {
      entries = fs.readdirSync(dataDir, { withFileTypes: true });
    } catch {
      return res.json({ profiles: [] });
    }

    const profiles = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const profilePath = path.join(dataDir, entry.name, 'profile.json');
      if (!fs.existsSync(profilePath)) continue;
      try {
        const envelope = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
        const displayName = envelope?.profile?.metadata?.name || entry.name;
        profiles.push({ name: entry.name, displayName });
      } catch {
        // Skip a profile.json that fails to parse rather than failing the whole list.
      }
    }

    res.json({ profiles });
  });

  return router;
}
