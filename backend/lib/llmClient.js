// Node-native LLM call for the "Update from Resume" propose step. No Python
// spawn here (unlike jd_scorecard_resume_v2.py's orchestrated 5-call
// pipeline) — this is a single one-shot classification call, so a direct
// fetch() is simpler than a subprocess hop. Mirrors
// scripts/update_profile_from_resume.py's call_llm(): same retry-with-backoff
// set, same defensive ```json fence-stripping, same model triples.
import { resolveUserKey, envVarForProvider } from './llmKeys.js';

// "deepseek-reasoner" was a legacy alias DeepSeek retired 24 Jul 2026 (still
// routed transparently to deepseek-v4-flash's thinking mode, but reliance on a
// retired alias risked breaking without notice) — migrated to the current
// official model id 3 Aug 2026, alongside the same fix in
// scripts/jd_scorecard_resume_v2.py's call_llm().
const LLM_CONFIGS = {
  sonnet: { model: 'anthropic/claude-sonnet-5.5', provider: 'openrouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  haiku: { model: 'anthropic/claude-haiku-5.5', provider: 'openrouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  gemini: { model: 'google/gemini-3.1-flash-lite-preview', provider: 'openrouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions' },
  deepseek: { model: 'deepseek-flash', provider: 'deepseek', endpoint: 'https://api.deepseek.com/chat/completions' },
  // "deep thinking" option (26 Oct 2026): DeepSeek's default high reasoning effort.
  deepseekpro: { model: 'deepseek-v4-pro', provider: 'deepseek', endpoint: 'https://api.deepseek.com/chat/completions', reasoningEffort: 'high' },
};

// DeepSeek defaults to thinking mode enabled with reasoning_effort="high" when
// unspecified — "low" keeps reasoning on but brings latency/token spend back
// in line with the other providers (see scripts/jd_scorecard_resume_v2.py's
// LLM_DEEPSEEK_REASONING_EFFORT for the full rationale). Safe for v4-pro too:
// it currently treats "low" as "high" rather than rejecting it.
const DEEPSEEK_REASONING_EFFORT = 'low';

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

// One chat-completions round trip with the shared retry/backoff policy; returns
// the raw message text. Both callLlmJson (text) and callLlmVisionJson (images)
// go through here so retry behaviour and error wording stay identical.
async function requestChatContent({ endpoint, headers, payload, label, model, maxTokens }) {
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
  const content = message?.content;
  const finishReason = choice?.finish_reason;

  if (!content) {
    throw new LlmClientError(`${label || 'LLM'} returned empty content (model=${model}, finish_reason=${finishReason}, refusal=${message?.refusal ?? null})`);
  }
  if (finishReason === 'length') {
    throw new LlmClientError(`${label || 'LLM'} call hit max_tokens (${maxTokens}) before finishing (model=${model})`);
  }
  return content;
}

function parseJsonContent(content, label) {
  const stripped = content.trim();
  const fenceMatch = stripped.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const jsonText = fenceMatch ? fenceMatch[1] : stripped;

  try {
    return JSON.parse(jsonText);
  } catch (err) {
    throw new LlmClientError(`${label || 'LLM'} did not return valid JSON: ${err.message}`);
  }
}

export async function callLlmJson({ projectRoot, llm, customModel, systemPrompt, userPrompt, maxTokens = 6000, label = '' }) {
  const { model, provider, endpoint, reasoningEffort } = resolveModel({ llm, customModel });
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
  if (provider === 'deepseek') {
    payload.reasoning_effort = reasoningEffort || DEEPSEEK_REASONING_EFFORT;
  }

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://www.askcareer-ai.com',
    'X-Title': 'John Profile Update',
  };

  const content = await requestChatContent({ endpoint, headers, payload, label, model, maxTokens });
  return parseJsonContent(content, label);
}

/**
 * Vision variant (27 Oct 2026, JD screenshot capture): same JSON contract as
 * callLlmJson, but the user turn carries images. `images` is an ordered array of
 * { mediaType, data } where data is raw base64 (no data: prefix). OpenRouter
 * models only — DeepSeek's endpoint has no image input.
 */
export async function callLlmVisionJson({ projectRoot, llm = 'haiku', systemPrompt, userText, images, maxTokens = 12000, label = '' }) {
  const { model, provider, endpoint } = resolveModel({ llm });
  if (provider !== 'openrouter') {
    throw new LlmClientError(`Image input needs an OpenRouter model (got ${provider})`, 400);
  }
  const apiKey = resolveApiKey({ projectRoot, provider });

  const userContent = [{ type: 'text', text: userText }];
  images.forEach((img, i) => {
    userContent.push({ type: 'text', text: `Image ${i + 1} of ${images.length}:` });
    userContent.push({ type: 'image_url', image_url: { url: `data:${img.mediaType};base64,${img.data}` } });
  });

  const payload = {
    model,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
  };

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://www.askcareer-ai.com',
    'X-Title': 'JD Screenshot Capture',
  };

  const content = await requestChatContent({ endpoint, headers, payload, label, model, maxTokens });
  return parseJsonContent(content, label);
}
