import express from 'express';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

// Read-only view + export of john_profile.json — deliberately separate from
// backend/api/profile_update.js (the disabled "Update Profile from JD"
// NLP-write stub, part of a different, still-paused epic). This router never
// writes to john_profile.json.

function resolvePythonBin(projectRoot) {
  if (process.env.PYTHON_BIN) return process.env.PYTHON_BIN;
  const venvPython = process.platform === 'win32'
    ? path.join(projectRoot, '.venv', 'Scripts', 'python.exe')
    : path.join(projectRoot, '.venv', 'bin', 'python');
  if (fs.existsSync(venvPython)) return venvPython;
  return process.platform === 'win32' ? 'python' : 'python3';
}

function line(text = '') {
  return `${text}\n`;
}

function bullet(text) {
  return line(`• ${text}`);
}

// Renders the profile into the same plain-text conventions
// scripts/convert_txt_to_docx.py already knows how to format:
// ALL-CAPS lines -> bold section headers, "Label — value" -> bold label,
// "• " lines -> bulleted list items.
function renderProfileText(profile) {
  let out = '';
  const m = profile.metadata || {};

  out += line(m.name || 'John Hau');
  out += line(m.title || '');
  out += line([m.location, m.email, m.phone, m.linkedin].filter(Boolean).join(' | '));
  out += line();

  if (profile.summary) {
    out += line('SUMMARY');
    out += line(profile.summary);
    out += line();
  }

  if (Array.isArray(profile.professional_experience)) {
    out += line('PROFESSIONAL EXPERIENCE');
    for (const exp of profile.professional_experience) {
      out += line(`${exp.company} — ${exp.title} (${exp.period})`);
      if (exp.scope) out += line(exp.scope);
      for (const h of exp.highlights || []) out += bullet(h.replace(/\*\*/g, ''));
      out += line();
    }
  }

  if (Array.isArray(profile.major_achievements)) {
    out += line('MAJOR ACHIEVEMENTS');
    for (const a of profile.major_achievements) {
      const extras = Object.entries(a)
        .filter(([k]) => !['achievement', 'company'].includes(k))
        .map(([, v]) => v)
        .join(' | ');
      out += bullet(`${a.achievement} (${a.company})${extras ? ' — ' + extras : ''}`);
    }
    out += line();
  }

  if (profile.core_competencies && typeof profile.core_competencies === 'object') {
    out += line('CORE COMPETENCIES');
    for (const [category, items] of Object.entries(profile.core_competencies)) {
      const label = category.replace(/_/g, ' ').toUpperCase();
      out += line(`${label} — ${Array.isArray(items) ? items.join(', ') : items}`);
    }
    out += line();
  }

  if (Array.isArray(profile.technical_skills)) {
    out += line('TECHNICAL SKILLS');
    out += line(profile.technical_skills.join(', '));
    out += line();
  }

  if (Array.isArray(profile.soft_skills)) {
    out += line('SOFT SKILLS');
    out += line(profile.soft_skills.join(', '));
    out += line();
  }

  if (Array.isArray(profile.languages) && profile.languages.length) {
    out += line('LANGUAGES');
    out += line(profile.languages.map((l) => (typeof l === 'string' ? l : `${l.language} (${l.proficiency})`)).join(', '));
    out += line();
  } else if (Array.isArray(profile.languages_spoken)) {
    out += line('LANGUAGES');
    out += line(profile.languages_spoken.join(', '));
    out += line();
  }

  if (Array.isArray(profile.education_certifications)) {
    out += line('EDUCATION & CERTIFICATIONS');
    for (const e of profile.education_certifications) {
      out += bullet(typeof e === 'string' ? e : [e.credential, e.issuer].filter(Boolean).join(' — '));
    }
    out += line();
  }

  if (Array.isArray(profile.ai_projects)) {
    out += line('AI PROJECTS');
    for (const p of profile.ai_projects) {
      out += line(`${p.title}`);
      if (p.description) out += line(p.description);
      if (p.impact) out += line(`Impact — ${p.impact}`);
      out += line();
    }
  }

  if (Array.isArray(profile.linkedin_recommendations)) {
    out += line('LINKEDIN RECOMMENDATIONS');
    for (const r of profile.linkedin_recommendations) {
      out += line(`${r.recommender_name} — ${r.recommender_title || ''} ${r.recommender_company ? 'at ' + r.recommender_company : ''}`.trim());
      if (r.recommendation) out += line(r.recommendation);
      out += line();
    }
  }

  if (Array.isArray(profile.key_topics_for_qa)) {
    out += line('KEY TOPICS FOR Q&A');
    out += line(profile.key_topics_for_qa.join(', '));
  }

  return out;
}

export function createProfileViewRouter({ projectRoot }) {
  const router = express.Router();
  const PROFILE_PATH = path.join(projectRoot, 'src', 'data', 'john_profile.json');

  router.get('/', (req, res) => {
    if (!fs.existsSync(PROFILE_PATH)) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const envelope = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
    res.json({ success: true, timestamp: envelope.timestamp, profile: envelope.profile });
  });

  router.get('/export', (req, res) => {
    const format = String(req.query.format || 'txt').toLowerCase();
    if (!['txt', 'docx'].includes(format)) {
      return res.status(400).json({ error: 'format must be txt or docx' });
    }
    if (!fs.existsSync(PROFILE_PATH)) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const envelope = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
    const text = renderProfileText(envelope.profile);

    const tmpDir = path.join(projectRoot, 'backup', '.profile-export-tmp');
    fs.mkdirSync(tmpDir, { recursive: true });
    const stem = `JohnHau_Profile_${new Date().toISOString().replace(/[:.]/g, '-')}`;
    const txtPath = path.join(tmpDir, `${stem}.txt`);
    fs.writeFileSync(txtPath, text, 'utf-8');

    if (format === 'txt') {
      return res.download(txtPath, 'JohnHau_Profile.txt', () => {
        fs.rmSync(txtPath, { force: true });
      });
    }

    const pythonBin = resolvePythonBin(projectRoot);
    const result = spawnSync(
      pythonBin,
      [path.join(projectRoot, 'scripts', 'convert_txt_to_docx.py'), '--output-dir', tmpDir, txtPath],
      // PYTHONIOENCODING/PYTHONUTF8: without these, Python inherits the
      // console's cp1252 codepage as a piped child process on Windows and
      // crashes encoding the script's emoji print output (confirmed same
      // issue as pythonRunner.js's runJdPipeline()).
      { cwd: projectRoot, env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' } }
    );

    const docxPath = path.join(tmpDir, `${stem}.docx`);
    if (result.status !== 0 || !fs.existsSync(docxPath)) {
      fs.rmSync(txtPath, { force: true });
      return res.status(500).json({
        error: 'Docx conversion failed',
        detail: result.stderr ? result.stderr.toString() : `exit code ${result.status}`,
      });
    }

    res.download(docxPath, 'JohnHau_Profile.docx', () => {
      fs.rmSync(txtPath, { force: true });
      fs.rmSync(docxPath, { force: true });
    });
  });

  return router;
}
