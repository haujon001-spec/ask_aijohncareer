import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './lib/loadEnv.js';
import { createJdUploadRouter } from './api/jd_upload.js';
import { createJdRunRouter } from './api/jd_run.js';
import { createProfileUpdateRouter } from './api/profile_update.js';
import { createHistoryRouter } from './api/history.js';
import { createDownloadRouter } from './api/download.js';

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
console.log(`   OpenRouter: ${openrouterKey ? openrouterKey.substring(0, 20) + '...' : 'NOT SET'}`);
console.log(`   DeepSeek: ${deepseekKey ? deepseekKey.substring(0, 20) + '...' : 'NOT SET'}`);

const app = express();
const PORT = process.env.JD_API_PORT || 3010;
const JD_TXT_DIR = path.join(projectRoot, 'data_raw', 'jd', 'txt');
const DATA_PROCESSED_ROOT = path.join(projectRoot, 'data_processed');
const RUN_TIMEOUT_MS = Number(process.env.JD_RUN_TIMEOUT_MS) || 15 * 60 * 1000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
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

app.use('/api/jd/upload', createJdUploadRouter({ jdTxtDir: JD_TXT_DIR }));
app.use('/api/jd/run', createJdRunRouter({ projectRoot, jdTxtDir: JD_TXT_DIR, timeoutMs: RUN_TIMEOUT_MS }));
app.use('/api/profile/update', createProfileUpdateRouter());
app.use('/api/history', createHistoryRouter({ projectRoot }));
app.use('/api/download', createDownloadRouter({ dataProcessedRoot: DATA_PROCESSED_ROOT }));

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 [jd-api] JD Automation API running on http://localhost:${PORT}`);
});
