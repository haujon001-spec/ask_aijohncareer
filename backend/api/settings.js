import express from 'express';
import { isValidProvider, saveUserKey, clearUserKey, getKeyStatus } from '../lib/llmKeys.js';

const MIN_KEY_LENGTH = 10;

export function createSettingsRouter({ projectRoot }) {
  const router = express.Router();

  router.get('/llm-keys', (req, res) => {
    res.json({ providers: getKeyStatus(projectRoot) });
  });

  router.post('/llm-keys', (req, res) => {
    const { provider, apiKey } = req.body || {};
    if (!isValidProvider(provider)) {
      return res.status(400).json({ error: `Invalid provider: ${provider}. Valid: openrouter, deepseek` });
    }
    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < MIN_KEY_LENGTH) {
      return res.status(400).json({ error: `apiKey is required (min ${MIN_KEY_LENGTH} characters)` });
    }
    saveUserKey(projectRoot, provider, apiKey.trim());
    res.json({ success: true, providers: getKeyStatus(projectRoot) });
  });

  router.delete('/llm-keys/:provider', (req, res) => {
    const { provider } = req.params;
    if (!isValidProvider(provider)) {
      return res.status(400).json({ error: `Invalid provider: ${provider}. Valid: openrouter, deepseek` });
    }
    clearUserKey(projectRoot, provider);
    res.json({ success: true, providers: getKeyStatus(projectRoot) });
  });

  return router;
}
