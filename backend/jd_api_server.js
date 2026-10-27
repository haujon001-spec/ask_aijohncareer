import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './lib/loadEnv.js';
import { requireAuth } from './lib/auth.js';
import { createAuthRouter } from './api/auth.js';
import { createJdUploadRouter } from './api/jd_upload.js';
import { createJdRunRouter } from './api/jd_run.js';
import { createJdRunV3Router } from './api/jd_run_v3.js';
import { createProfileRouter } from './api/profile.js';
import { createProfileViewRouter } from './api/profile_view.js';
import { createProfilesRouter } from './api/profiles.js';
import { createOnboardRouter } from './api/onboard.js';
import { createHistoryRouter } from './api/history.js';
import { createDownloadRouter } from './api/download.js';
import { createViewRouter } from './api/view.js';
import { createSettingsRouter } from './api/settings.js';
import { createPdfRouter } from './api/pdf.js';
import { createSyncRouter } from './api/sync.js';
import { createJdCaptureRouter } from './api/jd_capture.js';
import { isValidProfileName } from './lib/profileName.js';

// Standalone entrypoint for the JD Automation Portal API — separate process
// and port from backend/server.js (the live askcareer-ai.com chatbot app).
// Do not merge these; server.js must remain untouched by this feature.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

loadEnv(projectRoot);

const openrouterKey = process.env.OPENROUTER_API_KEY;
const deepseekKey = process.env.DEEPSEEK_API_KEY;
console.log('✅ [jd-api] API Keys loaded:');
// Report presence only — never log any part of a key (27 Oct 2026).
console.log(`   OpenRouter: ${openrouterKey ? 'set' : 'NOT SET'}`);
console.log(`   DeepSeek: ${deepseekKey ? 'set' : 'NOT SET'}`);

const app = express();
app.set('trust proxy', 1); // behind Caddy in production — req.secure must reflect the real client scheme for the session cookie's `secure` flag
const PORT = process.env.JD_API_PORT || 3010;
const JD_TXT_DIR = path.join(projectRoot, 'data_raw', 'jd', 'txt');
const DATA_PROCESSED_ROOT = path.join(projectRoot, 'data_processed');
const RUN_TIMEOUT_MS = Number(process.env.JD_RUN_TIMEOUT_MS) || 15 * 60 * 1000;
// Comma-separated list supported (JD_PORTAL_FRONTEND_ORIGIN="http://a,http://b")
// so a stray/duplicate Vite dev server landing on a different port (5174, 5175,
// ...) after 5173 was still occupied by an unclosed previous instance doesn't
// silently break login with an opaque "Failed to fetch" — confirmed 25 Jul 2026
// this exact scenario blocked /portal/enroll. Falls back to the common Vite
// dev-server port range when the env var isn't set at all.
const FRONTEND_ORIGINS = (process.env.JD_PORTAL_FRONTEND_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// credentials:true + an explicit origin (not '*') are both required for the
// httpOnly session cookie to be sent/received across the Vite dev origin.
//
// Also allowed (27 Oct 2026, phone -> laptop over Wi-Fi): an Origin whose
// hostname is exactly the host this request was addressed to, e.g. a page at
// http://192.168.1.20:5173 calling http://192.168.1.20:3010. A page served from
// any OTHER host never matches, so this does not open the API to the LAN.
app.use(cors((req, callback) => {
  const origin = req.header('Origin');
  let allowed = !origin || FRONTEND_ORIGINS.includes(origin); // no Origin (curl, same-origin) — allow
  if (!allowed) {
    try {
      allowed = new URL(origin).hostname === req.hostname;
    } catch {
      allowed = false;
    }
  }
  if (allowed) return callback(null, { origin: true, credentials: true });
  callback(new Error(`CORS: origin ${origin} not in JD_PORTAL_FRONTEND_ORIGIN allow-list`));
}));
app.use(cookieParser());
// The screenshot-capture route carries base64 images and installs its own larger
// parser below, so the global 2 MB parser must not run first (it would 413 it).
const jsonParser = express.json({ limit: '2mb' });
app.use((req, res, next) => (req.path.startsWith('/api/jd/capture') ? next() : jsonParser(req, res, next)));
app.use(express.urlencoded({ extended: true }));

// Error handler for parsing errors (mirrors backend/server.js's pattern)
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('❌ [jd-api] JSON Parse Error:', err.message);
    return res.status(400).json({ error: 'Invalid JSON received' });
  }
  next(err);
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'jd-automation-api',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// Auth routes are intentionally unprotected (login/enroll can't require a
// session that doesn't exist yet); every other JD route requires it.
app.use('/api/auth', createAuthRouter({ projectRoot }));

app.use('/api/jd/upload', requireAuth, createJdUploadRouter({ jdTxtDir: JD_TXT_DIR, projectRoot }));
app.use(
  '/api/jd/capture',
  requireAuth,
  express.json({ limit: '40mb' }),
  createJdCaptureRouter({ projectRoot }),
  (err, req, res, next) => {
    // body-parser failures (too large / bad JSON) -> JSON, not Express's HTML page
    res.status(err.status || 400).json({ error: err.type === 'entity.too.large' ? 'Screenshots are too large to upload together' : 'Invalid request body' });
  },
);
app.use('/api/jd/run', requireAuth, createJdRunRouter({ projectRoot, jdTxtDir: JD_TXT_DIR, timeoutMs: RUN_TIMEOUT_MS }));
app.use('/api/profile', requireAuth, createProfileRouter({ projectRoot }));
app.use('/api/profile-view', requireAuth, createProfileViewRouter({ projectRoot }));
app.use('/api/history', requireAuth, createHistoryRouter({ projectRoot }));
app.use('/api/download', requireAuth, createDownloadRouter({ dataProcessedRoot: DATA_PROCESSED_ROOT }));
app.use('/api/view', requireAuth, createViewRouter({ dataProcessedRoot: DATA_PROCESSED_ROOT }));
app.use('/api/settings', requireAuth, createSettingsRouter({ projectRoot }));
app.use('/api/pdf', requireAuth, createPdfRouter({ projectRoot, dataProcessedRoot: DATA_PROCESSED_ROOT }));
app.use('/api/sync', requireAuth, createSyncRouter({ projectRoot }));

// Multi-profile additions (Phase 2, 11 Aug 2026) — additive, mounted
// alongside the routes above without changing any of them.
app.use('/api/profiles', requireAuth, createProfilesRouter({ projectRoot }));
app.use(
  '/api/jd-v3/upload',
  requireAuth,
  createJdUploadRouter({
    jdTxtDir: (req) => {
      const { profileName } = req.body || {};
      return isValidProfileName(profileName)
        ? path.join(projectRoot, 'data_raw', profileName, 'jd', 'txt')
        : null;
    },
    projectRoot,
  }),
);
app.use('/api/onboard', requireAuth, express.json({ limit: '10mb' }), createOnboardRouter({ projectRoot }));
app.use('/api/jd-v3/run', requireAuth, createJdRunV3Router({ projectRoot, timeoutMs: RUN_TIMEOUT_MS }));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 [jd-api] JD Automation API running on http://localhost:${PORT}`);
});
