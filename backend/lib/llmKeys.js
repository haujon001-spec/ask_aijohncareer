import fs from 'fs';
import path from 'path';

// User-supplied API keys, stored server-side (never in the browser) so they
// persist across sessions without needing localStorage. Optional override on
// top of the server's .env-based keys — if a provider has no stored key here,
// callers fall back to process.env as before.
const PROVIDERS = ['openrouter', 'deepseek'];
const ENV_VAR_FOR_PROVIDER = { openrouter: 'OPENROUTER_API_KEY', deepseek: 'DEEPSEEK_API_KEY' };

function keysPath(projectRoot) {
  return path.join(projectRoot, 'secrets', 'jd_portal_llm_keys.json');
}

export function isValidProvider(provider) {
  return PROVIDERS.includes(provider);
}

export function envVarForProvider(provider) {
  return ENV_VAR_FOR_PROVIDER[provider];
}

function loadKeys(projectRoot) {
  const file = keysPath(projectRoot);
  if (!fs.existsSync(file)) return { openrouter: null, deepseek: null };
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return { openrouter: data.openrouter || null, deepseek: data.deepseek || null };
  } catch {
    return { openrouter: null, deepseek: null };
  }
}

function writeKeys(projectRoot, keys) {
  fs.mkdirSync(path.dirname(keysPath(projectRoot)), { recursive: true });
  fs.writeFileSync(keysPath(projectRoot), JSON.stringify(keys, null, 2));
}

export function saveUserKey(projectRoot, provider, apiKey) {
  const keys = loadKeys(projectRoot);
  keys[provider] = apiKey;
  writeKeys(projectRoot, keys);
}

export function clearUserKey(projectRoot, provider) {
  const keys = loadKeys(projectRoot);
  keys[provider] = null;
  writeKeys(projectRoot, keys);
}

// Never returns the raw key to a caller that might send it to the browser —
// only isSet + a short redacted preview, e.g. "sk-or-v1-6280...".
export function getKeyStatus(projectRoot) {
  const keys = loadKeys(projectRoot);
  const status = {};
  for (const provider of PROVIDERS) {
    const userKey = keys[provider];
    const envKey = process.env[ENV_VAR_FOR_PROVIDER[provider]];
    status[provider] = {
      userKeySet: !!userKey,
      userKeyPreview: userKey ? `${userKey.slice(0, 12)}...` : null,
      envKeySet: !!envKey,
    };
  }
  return status;
}

// The key pythonRunner.js should actually use for this provider: the user's
// stored key if present, otherwise null (caller falls back to its own
// process.env-sourced value, unchanged from today's behavior).
export function resolveUserKey(projectRoot, provider) {
  const keys = loadKeys(projectRoot);
  return keys[provider] || null;
}
