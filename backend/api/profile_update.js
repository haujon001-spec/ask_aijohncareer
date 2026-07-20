import express from 'express';

export function createProfileUpdateRouter() {
  const router = express.Router();

  router.post('/', (req, res) => {
    const { rawText } = req.body || {};
    if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
      return res.status(400).json({ error: 'rawText is required' });
    }

    res.status(501).json({
      success: false,
      implemented: false,
      message: 'Profile update via NLP is not implemented in this phase. Planned for a later phase (backend/nlp/update_profile_json.py).',
    });
  });

  return router;
}
