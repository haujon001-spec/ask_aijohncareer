import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  loadAuthConfig,
  saveAuthConfig,
  isEnrolled,
  hashPassword,
  verifyPassword,
  generateTotpSecret,
  buildOtpAuthUrl,
  verifyTotp,
  issueSessionToken,
  setSessionCookie,
  clearSessionCookie,
  requireAuth,
} from '../lib/auth.js';

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Try again in 15 minutes.' },
});

export function createAuthRouter({ projectRoot }) {
  const router = express.Router();

  router.get('/status', (req, res) => {
    res.json({ enrolled: isEnrolled(projectRoot) });
  });

  // Only usable while no enrollment exists yet — blocks overwriting an
  // existing TOTP secret over the network.
  router.post('/enroll', async (req, res) => {
    if (isEnrolled(projectRoot)) {
      return res.status(409).json({ error: 'Already enrolled' });
    }
    const { password } = req.body || {};
    if (!password || String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const passwordHash = await hashPassword(password);
    const totpSecret = generateTotpSecret();
    const otpauthUrl = buildOtpAuthUrl(totpSecret);

    saveAuthConfig(projectRoot, {
      passwordHash,
      totpSecret,
      totpEnrolled: false,
      createdAt: new Date().toISOString(),
    });

    res.json({ secret: totpSecret, otpauthUrl });
  });

  router.post('/enroll/confirm', (req, res) => {
    const config = loadAuthConfig(projectRoot);
    if (!config || config.totpEnrolled) {
      return res.status(409).json({ error: 'Nothing pending confirmation' });
    }
    const { totpCode } = req.body || {};
    if (!verifyTotp(totpCode, config.totpSecret)) {
      return res.status(401).json({ error: 'Invalid code' });
    }
    saveAuthConfig(projectRoot, { ...config, totpEnrolled: true });
    res.json({ ok: true });
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const config = loadAuthConfig(projectRoot);
    if (!config || !config.totpEnrolled) {
      return res.status(409).json({ error: 'Not enrolled yet' });
    }
    const { password, totpCode } = req.body || {};

    const passwordOk = await verifyPassword(password, config.passwordHash);
    const totpOk = verifyTotp(totpCode, config.totpSecret);

    if (!passwordOk || !totpOk) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = issueSessionToken({ user: 'john' });
    setSessionCookie(req, res, token);
    res.json({ ok: true });
  });

  router.post('/logout', (req, res) => {
    clearSessionCookie(res);
    res.json({ ok: true });
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ authenticated: true, user: req.user.user });
  });

  return router;
}
