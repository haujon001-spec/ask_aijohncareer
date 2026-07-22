import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticator } from 'otplib';

const SESSION_COOKIE_NAME = 'jd_portal_session';
const SESSION_TTL = '12h';
const BCRYPT_ROUNDS = 12;

export function getAuthConfigPath(projectRoot) {
  return path.join(projectRoot, 'secrets', 'jd_portal_auth.json');
}

export function loadAuthConfig(projectRoot) {
  const configPath = getAuthConfigPath(projectRoot);
  if (!fs.existsSync(configPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveAuthConfig(projectRoot, config) {
  const configPath = getAuthConfigPath(projectRoot);
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

export function isEnrolled(projectRoot) {
  const config = loadAuthConfig(projectRoot);
  return !!(config && config.totpEnrolled);
}

export async function hashPassword(plain) {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain, hash) {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

export function generateTotpSecret() {
  return authenticator.generateSecret();
}

export function buildOtpAuthUrl(secret, accountLabel = 'John', issuer = 'AskCareerAI Portal') {
  return authenticator.keyuri(accountLabel, issuer, secret);
}

export function verifyTotp(token, secret) {
  if (!token || !secret) return false;
  try {
    return authenticator.verify({ token: String(token).trim(), secret });
  } catch {
    return false;
  }
}

function getJwtSecret() {
  const secret = process.env.JD_PORTAL_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'JD_PORTAL_JWT_SECRET is not set. Generate one (e.g. `node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"`) and add it to .env.local/.env.vps.'
    );
  }
  return secret;
}

export function issueSessionToken(payload = { user: 'john' }) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_TTL });
}

export function verifySessionToken(token) {
  return jwt.verify(token, getJwtSecret());
}

export function setSessionCookie(req, res, token) {
  // Derived from the actual request scheme (req.secure), not NODE_ENV — this
  // repo's env-file chain (.env.local -> .env.vps -> .env, all merged) means
  // NODE_ENV=production from .env.vps leaks into local dev too, which would
  // otherwise wrongly mark the cookie Secure and break it over plain HTTP.
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: req.secure,
    maxAge: 12 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

export function requireAuth(req, res, next) {
  const token = req.cookies && req.cookies[SESSION_COOKIE_NAME];
  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    req.user = verifySessionToken(token);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

export { SESSION_COOKIE_NAME };
