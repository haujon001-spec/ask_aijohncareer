import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup paths (backend is in /backend dir, need to go up one level)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Load environment variables with fallback chain
// (.env.local → .env.vps → .env)
const envPaths = [
  path.join(projectRoot, '.env.local'),
  path.join(projectRoot, '.env.vps'),
  path.join(projectRoot, '.env')
];

console.log('🔍 Loading environment variables...');
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`  ✓ Found: ${envPath}`);
    dotenv.config({ path: envPath, override: true });
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());

// Custom JSON parser with logging verify callback
app.use(express.json({
  verify: (req, res, buf, encoding) => {
    const rawBody = buf.toString('utf8');
    req.rawBody = rawBody;
    console.log(`📨 ${req.method} ${req.path}`);
    console.log(`   Content-Type: ${req.get('content-type')}`);
    console.log(`   Content-Length: ${req.get('content-length')}`);
    console.log(`   Raw bytes received: ${buf.length}`);
    console.log(`   Raw body: ${rawBody.substring(0, 300)}`);
    console.log(`   First 20 bytes hex: ${buf.toString('hex').substring(0, 40)}`);
  }
}));
app.use(express.urlencoded({ extended: true }));

// Error handler for parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.error('❌ JSON Parse Error:', err.message, 'on', req.method, req.path);
    console.error('   Raw body was:', req.rawBody);
    console.error('   Raw request headers:', req.headers);
    return res.status(400).json({ error: 'Invalid JSON received' });
  }
  next(err);
});

// Serve static frontend files (built by Vite into /dist)
const distPath = path.join(projectRoot, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log(`📁 Serving static frontend from: ${distPath}`);
}

// Load John's profile
const profilePath = path.join(projectRoot, 'src/data/john_profile.json');
let johnProfile;
try {
  johnProfile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
  console.log('✅ Loaded john_profile.json');
} catch (err) {
  console.error('❌ Failed to load john_profile.json:', err.message);
  process.exit(1);
}

// Build system prompt
function buildSystemPrompt() {
  return `You are "John's Career Copilot", an AI assistant that answers questions about John Hau's professional experience, achievements, AI projects, and leadership.

RULES:
1. Use ONLY the provided resume context. If information is missing, say you don't know.
2. Always highlight measurable outcomes (cost savings, % improvements, scale).
3. Emphasize leadership impact, automation adoption, and infrastructure expertise.
4. Keep answers clear, structured, and concise (2-3 paragraphs for chat).
5. Reference specific roles, companies, and dates when relevant.

Resume Context:
${JSON.stringify(johnProfile, null, 2)}`;
}

// LLM Provider Configs - 2 MODELS ONLY: Liquid LFM + DeepSeek R1
// Optimized for best results
// Status: Liquid LFM ✅ (2-7s, cost-effective), DeepSeek R1 ✅ (advanced reasoning)
const llmConfigs = {
  deepseek: {
    name: 'Liquid LFM 2.5 1.2B (Free)',
    apiKey: process.env.OPENROUTER_API_KEY,
    provider: 'openrouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'liquid/lfm-2.5-1.2b-thinking:free',
    costPerToken: { input: 0, output: 0 },
    supportsReasoning: false,
    status: 'working'
  },
  nemotron: {
    name: 'DeepSeek R1',
    apiKey: process.env.DEEPSEEK_API_KEY,
    provider: 'deepseek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-reasoner',
    costPerToken: { input: 0, output: 0 },
    supportsReasoning: true,
    status: 'working'
  }
};

// Generic LLM API caller with fallback
async function callLLM(config, question, includeReasoning = false, maxTokens = 1024) {
  const startTime = Date.now();
  
  try {
    const systemPrompt = buildSystemPrompt();
    
    const payload = {
      model: config.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      max_tokens: maxTokens,
      temperature: 0.7
    };

    // Add reasoning if supported and requested
    if (includeReasoning && config.supportsReasoning) {
      if (config.provider === 'deepseek') {
        payload.reasoning_mode = 'enabled';
      }
    }

    // OpenRouter requires different headers
    let headers = {
      'Content-Type': 'application/json'
    };

    if (config.provider === 'openrouter') {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
      headers['HTTP-Referer'] = 'http://localhost:3000';
      headers['X-Title'] = 'Johns Career Copilot';
    } else {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      timeout: 60000
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorInfo = {
        status: response.status,
        statusText: response.statusText,
        body: errorText.substring(0, 500)
      };
      
      console.error(`API Error from ${config.name}:`, errorInfo);
      
      // Check if it's an auth error (401)
      if (response.status === 401 && config.provider === 'openrouter') {
        throw new Error(`OpenRouter auth failed: Invalid API key or user account issue. Model: ${config.name}`);
      }
      
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const latency = Date.now() - startTime;

    // Extract answer and token counts
    let answer = data.choices[0].message.content;
    const reasoning = data.choices[0].message.reasoning;
    
    // Handle models that put response in reasoning field instead of content
    if (!answer && reasoning) {
      console.log(`ℹ️  ${config.name} using reasoning as content (content was null)`);
      answer = reasoning;
    }
    const inputTokens = data.usage?.prompt_tokens || 0;
    const outputTokens = data.usage?.completion_tokens || 0;

    // Calculate cost
    const inputCost = inputTokens * config.costPerToken.input;
    const outputCost = outputTokens * config.costPerToken.output;
    const totalCost = inputCost + outputCost;

    return {
      model: config.name,
      answer,
      latency_ms: latency,
      cost_estimate: totalCost === 0 ? 'FREE' : `USD $${totalCost.toFixed(6)}`,
      tokens_used: { input: inputTokens, output: outputTokens },
      reasoning_summary: (!answer && reasoning) ? null : (data.choices[0].message.reasoning || null),
      provider: config.provider
    };
  } catch (error) {
    console.error(`❌ ${config.name} API error:`, error.message);
    throw error;
  }
}

// API Routes with intelligent fallback
app.post('/api/:model', async (req, res) => {
  try {
    const { model } = req.params;
    const { question, reasoning, max_tokens } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    let config = llmConfigs[model];
    if (!config) {
      return res.status(400).json({ error: `Unknown model: ${model}` });
    }

    if (!config.apiKey) {
      return res.status(500).json({ error: `API key not configured for ${model}` });
    }

    console.log(`📤 Calling ${config.name} with question: "${question.substring(0, 50)}..."`);
    
    let result;
    let fallbackUsed = false;
    let fallbackReason = '';
    let originalModel = config.name;
    
    try {
      result = await callLLM(config, question, reasoning, max_tokens);
    } catch (error) {
      // Check if model has a configured fallback
      if (config.fallbackTo && llmConfigs[config.fallbackTo]) {
        console.log(`⚠️  ${config.name} failed. Falling back to ${llmConfigs[config.fallbackTo].name}...`);
        const fallbackConfig = llmConfigs[config.fallbackTo];
        result = await callLLM(fallbackConfig, question, reasoning, max_tokens);
        fallbackUsed = true;
        fallbackReason = `${config.name} unavailable (${config.status}) → Using ${fallbackConfig.name}`;
        result.model = `${originalModel} [Using: ${fallbackConfig.name}]`;
      } else if (config.provider === 'openrouter' && error.message.includes('401')) {
        // Auth error - try fallback to DeepSeek
        console.log(`⚠️  ${config.name} auth failed. Falling back to DeepSeek...`);
        const deepseekConfig = llmConfigs.deepseek;
        result = await callLLM(deepseekConfig, question, reasoning, max_tokens);
        fallbackUsed = true;
        fallbackReason = `${config.name} auth failed → Using DeepSeek V3.2`;
        result.model = `${originalModel} [Using: DeepSeek V3.2]`;
      } else {
        throw error;
      }
    }
    
    console.log(`✅ Responded in ${result.latency_ms}ms`);
    
    res.json({ 
      ...result, 
      fallbackUsed,
      fallbackReason: fallbackReason || null 
    });
  } catch (error) {
    console.error('❌ API error:', error.message);
    res.status(500).json({ 
      error: error.message,
      hint: 'Make sure all required API keys are set in .env.local'
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    profile: johnProfile ? 'loaded' : 'missing',
    models: Object.keys(llmConfigs),
    timestamp: new Date().toISOString()
  });
});

// SPA fallback: Serve index.html for any non-API routes
// This allows React Router to handle client-side routing
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend not found. Run: npm run build' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`✅ John's profile loaded with ${johnProfile.ai_projects?.length || 0} AI projects`);
  console.log(`📡 Available models: ${Object.keys(llmConfigs).join(', ')}`);
});
