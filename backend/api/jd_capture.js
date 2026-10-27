import express from 'express';
import rateLimit from 'express-rate-limit';
import { extractJdFromImages, CaptureError, MAX_IMAGES, MAX_IMAGE_BYTES } from '../lib/jdCapture.js';
import { LlmClientError } from '../lib/llmClient.js';

// Each call is a paid vision request, so cap it per client even though the
// route is already behind the MFA session.
const captureLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many screenshot captures this hour. Try again later.' },
});

export function createJdCaptureRouter({ projectRoot }) {
  const router = express.Router();

  router.get('/limits', (req, res) => {
    res.json({ maxImages: MAX_IMAGES, maxImageBytes: MAX_IMAGE_BYTES });
  });

  router.post('/', captureLimiter, async (req, res) => {
    const { images, llm = 'haiku' } = req.body || {};
    const startedAt = Date.now();
    try {
      const result = await extractJdFromImages({ projectRoot, images, llm });
      console.log(`📷 [jd-api] JD capture: ${result.imagesRead} screenshot(s) -> ${result.jdText.length} chars in ${Date.now() - startedAt}ms (llm=${llm})`);
      res.json({ success: true, llm, durationMs: Date.now() - startedAt, ...result });
    } catch (err) {
      if (err instanceof CaptureError || err instanceof LlmClientError) {
        return res.status(err.statusCode || 500).json({ error: err.message });
      }
      console.error('❌ [jd-api] JD capture failed:', err.message);
      res.status(500).json({ error: 'Screenshot capture failed' });
    }
  });

  return router;
}
