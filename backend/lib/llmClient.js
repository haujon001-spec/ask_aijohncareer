// Node-native LLM call for the "Update from Resume" propose step. No Python
// spawn here (unlike jd_scorecard_resume_v2.py's orchestrated 5-call
// pipeline) — this is a single one-shot classification call, so a direct
// fetch() is simpler than a subprocess hop. Mirrors
// scripts/update_profile_from_resume.py's call_llm(): same retry-with-backoff
// set, same defensive ```json fence-stripping, same model triples.
import { resolveUserKey, envVarForProvider } from './llmKeys.js';

const LLM_CONFIGS = {
  sonnet: { model: 'anthropic/claude-sonnet-5', provider: 'openrouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  gemini: { model: 'google/gemini-3.1-flash-lite-preview', provider: 'openrouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  deepseek: { model: 'deepseek-reasoner', provider: 'deepseek', endpoint: 'https://api.deepseek.com/chat/completions' },
};

const RETRYABLE_STATUS_CODES = new Set([403, 408, 425, 429, 500, 502, 503, 504]);
const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 3000;

export class LlmClientError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = 'LlmClientError';
    this.statusCode = statusCode;
  }
}

function resolveModel({ llm, customModel }) {
  if (llm === 'custom') {
    if (!customModel?.model || !customModel?.provider) {
      throw new LlmClientError("llm='custom' requires customModel.{model, provider}", 400);
    }
    const endpoint = customModel.provider === 'deepseek'
      ? 'https://api.deepseek.com/chat/completions'
      : 'https://openrouter.ai/api/v1/chat/completions';
    return { model: customModel.model, provider: customModel.provider, endpoint };
  }
  const config = LLM_CONFIGS[llm];
  if (!config) {
    throw new LlmClientError(`Unknown llm: '${llm}'. Valid: ${Object.keys(LLM_CONFIGS).join(', ')}, custom`, 400);
  }
  return config;
}

function resolveApiKey({ projectRoot, provider }) {
  const userKey = resolveUserKey(projectRoot, provider);
  if (userKey) return userKey;
  const envKey = process.env[envVarForProvider(provider)];
  if (envKey) return envKey;
  throw new LlmClientError(`No API key configured for provider '${provider}' (checked stored key and ${envVarForProvider(provider)})`, 400);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function callLlmJson({ projectRoot, llm, customModel, systemPrompt, userPrompt, maxTokens = 6000, label = '' }) {
  const { model, provider, endpoint } = resolveModel({ llm, customModel });
  const apiKey = resolveApiKey({ projectRoot, provider });

  const payload = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://www.askcareer-ai.com',
    'X-Title': 'John Profile Update',
  };

  let resp;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      resp = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload) });
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await sleep(RETRY_BACKOFF_MS * attempt);
        continue;
      }
      throw new LlmClientError(`${label || 'LLM'} call failed: ${err.message}`);
    }
    if (RETRYABLE_STATUS_CODES.has(resp.status) && attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_BACKOFF_MS * attempt);
      continue;
    }
    break;
  }

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    throw new LlmClientError(`${label || 'LLM'} call failed: ${resp.status} ${resp.statusText} — ${body.slice(0, 300)}`);
  }

  const data = await resp.json();
  const choice = data.choices?.[0];
  const message = choice?.message;
  let content = message?.content;
  const finishReason = choice?.finish_reason;

  if (!content) {
    throw new LlmClientError(`${label || 'LLM'} returned empty content (model=${model}, finish_reason=${finishReason}, refusal=${message?.refusal ?? null})`);
  }
  if (finishReason === 'length') {
    throw new LlmClientError(`${label || 'LLM'} call hit max_tokens (${maxTokens}) before finishing (model=${model})`);
  }

  const stripped = content.trim();
  const fenceMatch = stripped.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonText = fenceMatch ? fenceMatch[1] : stripped;

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    throw new LlmClientError(`${label || 'LLM'} did not return valid JSON: ${err.message}`);
  }
}
