import express from 'express';
import rateLimit from 'express-rate-limit';
import { fetchLinkedInJob, LinkError } from '../lib/jdLink.js';

// Behind the MFA session already; the limiter just stops a runaway client
// from hammering LinkedIn from this server's address.
const linkLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many job-link lookups this hour. Try again later.' },
});

export function createJdLinkRouter() {
  const router = express.Router();

  router.post('/', linkLimiter, async (req, res) => {
    const { url } = req.body || {};
    if (!url || typeof url !== 'string' || url.length > 2000) {
      return res.status(400).json({ error: 'url is required' });
    }
    const startedAt = Date.now();
    try {
      const result = await fetchLinkedInJob(url);
      console.log(`🔗 [jd-api] JD link: LinkedIn job ${result.jobId} -> ${result.jdText.length} chars in ${Date.now() - startedAt}ms`);
      res.json({ success: true, durationMs: Date.now() - startedAt, ...result });
    } catch (err) {
      if (err instanceof LinkError) return res.status(err.statusCode).json({ error: err.message });
      console.error('❌ [jd-api] JD link lookup failed:', err.message);
      res.status(500).json({ error: 'Job link lookup failed' });
    }
  });

  return router;
}
