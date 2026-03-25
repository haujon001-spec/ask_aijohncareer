# John Hau Multi-LLM Career Copilot — Project Plan

**Version:** 1.0  
**Date:** 25 MAR 2026  
**Status:** Active Planning  
**Author:** John Hau  
**Governance:** soul.md compliant

---

## 📋 Executive Summary

A **public AI chat portal** enabling users to ask questions about John Hau's professional experience, AI projects, leadership achievements, and automation impact. The system demonstrates practical AI engineering through:

- **Multi-LLM orchestration** (DeepSeek-R1, Llama 3.1, Qwen 2.5)
- **Resume-grounded answers** (structured knowledge base from john_profile.json)
- **Cost transparency** (model used, latency, estimated cost per query)
- **Casual conversation mode** (DM-style questions with optional reasoning)
- **Static hosting** on here.now with lightweight backend proxy

---

## 🎯 Core Features

### 1. Multi-LLM Switching
Users select from:

| Model | Provider | Use Case | Cost |
|-------|----------|----------|------|
| **DeepSeek-R1** | DeepSeek | Best reasoning per dollar | ⭐⭐ |
| **Llama 3.1 (70B/8B)** | Together AI | Balanced, natural language | ⭐⭐⭐ |
| **Qwen 2.5** | Together AI | Budget-friendly alternative | ⭐⭐⭐⭐ |
| **Mixtral 8x7B** | Together AI | Balanced quality/cost | ⭐⭐⭐ |

Each response displays: **model name, latency (ms), estimated cost (USD)**.

### 2. Resume-Grounded Answers
All responses derived from **john_profile.json** structured context:

- **AI Projects:** Next.js portal, trading bot, economic dashboard, automation pipelines
- **Leadership:** VP Morgan Stanley, Associate Director AIA, team scaling across APAC/EMEA/NA
- **Cost Savings:** $1.4M OPEX reduction, $640K vendor avoidance, HK$3.5M in device migrations
- **Automation Wins:** 7 FTE saved, 144 man-days/year, 70% efficiency gains
- **Infrastructure:** VDI (120K desktops), backup systems (99% reliability), global escalation lead

### 3. Casual Conversation Mode
Examples of supported queries:

- *"Tell me about John's AI work in simple terms"*
- *"What makes John strong in hybrid AI + infra roles?"*
- *"How did John save money at Bank of America?"*
- *"Explain John's leadership style"*

### 4. Explainable Reasoning (Optional)
Toggle reveals:

- Reasoning summary from the LLM
- Which resume facts were selected
- How the question was interpreted
- Confidence score

---

## 🏗️ Architecture

### Frontend (Static, hosted on here.now)
- **Framework:** React + Vite
- **Components:** ChatWindow, MessageBubble, ModelSelector, ReasoningToggle, SidebarIntro
- **Data:** john_profile.json (loaded client-side for instant search)
- **API:** Calls backend proxy endpoints

### Backend (Lightweight Proxy)
- **Platforms:** Vercel, Fly.io, Cloudflare Workers, or VPS
- **Responsibilities:**
  - Store API keys safely (.env/.secrets)
  - Route requests to LLM providers
  - Inject resume context into system prompt
  - Track latency + cost metadata
  - Return structured JSON to frontend
- **Security:** Never expose keys to frontend; .env hierarchy (local → vps → default)

---

## 📁 Folder Structure (soul.md Compliant)

```
project-root/
│
├── src/
│   ├── components/
│   │   ├── ChatWindow.jsx
│   │   ├── MessageBubble.jsx
│   │   ├── ModelSelector.jsx
│   │   ├── ReasoningToggle.jsx
│   │   └── SidebarIntro.jsx
│   │
│   ├── data/
│   │   └── john_profile.json          [Structured resume knowledge base]
│   │
│   ├── hooks/
│   │   └── useChatEngine.js           [Multi-LLM API orchestration]
│   │
│   ├── utils/
│   │   ├── buildPrompt.js             [System prompt generation]
│   │   ├── modelConfig.js             [LLM routing configuration]
│   │   └── costCalculator.js          [Cost tracking per request]
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── public/
│   ├── favicon.ico
│   └── index.html
│
├── config/
│   └── llm_providers_YYYYMMDD.yaml    [Provider configs, dated]
│
├── data_raw/
│   └── JohnHauResume2026_MorganStanley.txt
│
├── data_processed/
│   └── john_profile_vectorized_YYYYMMDD.json  [Optional: embeddings for semantic search]
│
├── etl/
│   └── extract_resume_profile_YYYYMMDD.py     [ETL pipeline to update john_profile.json]
│
├── models/
│   └── README.md                      [Embeddings, indices, trained models]
│
├── dashboards/
│   └── chat_analytics_YYYYMMDD.html   [Usage, cost, model popularity]
│
├── reports_html/
│   └── deployment_YYYYMMDD.html       [Pre-deployment validation report]
│
├── qa/
│   └── test_responses_YYYYMMDD.json   [QA test cases and responses]
│
├── scripts/
│   ├── deploy_frontend.sh
│   ├── deploy_backend.sh
│   ├── validate_structure.sh
│   └── run_qa_checks.sh
│
├── secrets/                           [NEVER COMMITTED — .gitignored]
│   ├── .env.local (development)
│   ├── .env.vps (production)
│   └── api_keys_YYYYMMDD.yml
│
├── docs/
│   ├── setup/
│   │   ├── INSTALLATION_YYYYMMDD.md
│   │   └── ENV_CONFIGURATION.md
│   │
│   ├── guides/
│   │   ├── BACKEND_SETUP.md
│   │   ├── FRONTEND_BUILD.md
│   │   └── LLM_ROUTING.md
│   │
│   ├── architecture/
│   │   ├── SYSTEM_DESIGN_YYYYMMDD.md
│   │   └── DATA_FLOW_DIAGRAM.md
│   │
│   ├── api/
│   │   └── BACKEND_API_SPEC_YYYYMMDD.md
│   │
│   ├── project/
│   │   ├── PROJECTPLAN_YYYYMMDD.md    [This file]
│   │   └── README.md
│   │
│   └── status/
│       ├── CHANGELOG_YYYYMMDD.md
│       └── DEPLOYMENT_STATUS_YYYYMMDD.md
│
├── logs/
│   ├── build_YYYYMMDD.log             [.gitignored]
│   ├── api_YYYYMMDD.log               [.gitignored]
│   └── qe_YYYYMMDD.log                [.gitignored]
│
├── .env.local                         [.gitignored — local development]
├── .env.vps                           [.gitignored — production]
├── .env                               [.gitignored — fallback] 
├── .gitignore                         [Includes /secrets, .env*, /logs]
├── .pre-commit-config.yaml            [Pre-commit hooks: lint, secrets, structure]
├── package.json
├── vite.config.js
└── soul.md                            [Universal project governance]
```

---

## 🧠 System Prompt Template

**File:** `src/utils/buildPrompt.js`

```javascript
export function buildSystemPrompt(context) {
  return `
You are "John's Career Copilot", an AI assistant that answers questions about John Hau's professional experience, achievements, AI projects, and leadership.

RULES:
1. Use ONLY the provided resume context. If information is missing, say you don't know.
2. Always highlight measurable outcomes (cost savings, % improvements, scale).
3. Emphasize leadership impact, automation adoption, and infrastructure expertise.
4. Keep answers clear, structured, and concise (2-3 paragraphs for chat).
5. Reference specific roles, companies, and dates when relevant.

Resume Context (john_profile.json):
${JSON.stringify(context, null, 2)}
  `;
}
```

---

## 🔄 Multi-LLM Routing Configuration

**File:** `src/utils/modelConfig.js`

```javascript
export const MODELS = {
  deepseek: {
    name: "DeepSeek-R1",
    provider: "deepseek",
    endpoint: "/api/deepseek",
    reasoning: true,
    costPerToken: { input: 0.00000548, output: 0.0000164 },
  },
  llama: {
    name: "Llama 3.1 (70B)",
    provider: "together",
    endpoint: "/api/llama",
    reasoning: false,
    costPerToken: { input: 0.00000088, output: 0.00000088 },
  },
  qwen: {
    name: "Qwen 2.5 (32B)",
    provider: "together",
    endpoint: "/api/qwen",
    reasoning: false,
    costPerToken: { input: 0.00000088, output: 0.00000088 },
  },
  mixtral: {
    name: "Mixtral 8x7B",
    provider: "together",
    endpoint: "/api/mixtral",
    reasoning: false,
    costPerToken: { input: 0.00000060, output: 0.00000060 },
  }
};
```

---

## 🔌 Backend API Specification

**File:** `docs/api/BACKEND_API_SPEC_YYYYMMDD.md`

Each endpoint:

1. **Load resume** from john_profile.json
2. **Build system prompt** with user context
3. **Call selected LLM** provider
4. **Calculate cost** + measure latency
5. **Return JSON** response

### Endpoints:

```
POST /api/deepseek    → DeepSeek-R1
POST /api/llama       → Llama 3.1
POST /api/qwen        → Qwen 2.5
POST /api/mixtral     → Mixtral 8x7B
```

### Request Body:
```json
{
  "question": "Tell me about John's AI work",
  "reasoning": false,
  "max_tokens": 1024
}
```

### Response Body:
```json
{
  "model": "DeepSeek-R1",
  "answer": "John has built several production AI systems...",
  "latency_ms": 812,
  "cost_estimate": "USD $0.0003",
  "tokens_used": {
    "input": 450,
    "output": 280
  },
  "reasoning_summary": "Selected resume facts about AI projects and Morgan Stanley achievements...",
  "timestamp": "2026-03-25T10:30:00Z"
}
```

---

## ✅ QA & Validation Checklist

### Pre-Deployment QA (soul.md §3.1)

| Task | Validation | Owner | Status |
|------|------------|-------|--------|
| **Frontend Build** | `npm run build` completes, no errors | FE Engineer | [ ] |
| **API Routes Test** | All endpoints respond correctly | Backend Eng | [ ] |
| **Resume Profile** | john_profile.json loads, no missing fields | Data Eng | [ ] |
| **System Prompt** | Context injected correctly, no escaping issues | LLM Eng | [ ] |
| **Model Routing** | All 4 LLMs reachable, fallback works | Infrastructure | [ ] |
| **Cost Calculator** | Cost estimates match provider pricing | Finance | [ ] |
| **Latency Test** | Average response < 3s for all models | QA | [ ] |
| **Security Scan** | No secrets in FE code, .env protected | Security | [ ] |
| **User Experience** | Chat flows smoothly, model selector works | QA/UX | [ ] |
| **Documentation** | All docs updated, deployment guide ready | Tech Writer | [ ] |
| **Regression Test** | Sample Q&A responses match expected format | QA Agent | [ ] |
| **Dashboard Deploy** | Usage analytics dashboard generated | Analytics | [ ] |
| **Logs Validation** | No errors in API/build logs | SRE | [ ] |

### Automated QA Script
**File:** `qa/run_qa_checks.sh`

```bash
#!/bin/bash
set -e

echo "🔍 Running full QA suite..."
echo "① Frontend build..."
npm run build

echo "② Validating folder structure..."
python scripts/validate_structure.py

echo "③ Loading john_profile.json..."
python qa/validate_profile.py

echo "④ Testing LLM endpoints..."
python qa/test_api_endpoints.py

echo "⑤ Running cost calculator tests..."
python qa/test_cost_calculator.py

echo "⑥ Security scan..."
gitleaks detect --source . || true

echo "✅ QA suite complete!"
```

---

## 🔐 Security & Secrets Management

### Secret Storage (.env Hierarchy)

Per user memory: **dotenv fallback chain**

1. **`.env.local`** (Development, highest priority)
2. **`.env.vps`** (Production VPS)
3. **`.env`** (Fallback/default)

All **MUST be .gitignored**.

**File:** `docs/setup/ENV_CONFIGURATION.md`

Example `.env.local`:
```
DEEPSEEK_API_KEY=sk-xxxxx
TOGETHER_API_KEY=xxxxx
OPENROUTER_API_KEY=xxxxx
LLM_TIMEOUT_MS=5000
```

Production `.env.vps`:
```
DEEPSEEK_API_KEY=<prod-key>
TOGETHER_API_KEY=<prod-key>
OPENROUTER_API_KEY=<prod-key>
LLM_TIMEOUT_MS=3000
```

### Rules (soul.md §4)
- ✅ Secrets in `/secrets/` (gitignored)
- ✅ Use `dotenv` with `override=True`
- ✅ Never echo secrets in logs or errors
- ✅ Rotate keys quarterly
- ✅ Use environment variables at runtime (never hardcode)

---

## 🚀 Deployment Workflow

### Frontend Deployment (here.now)

```bash
# Build static files
npm run build

# Deploy to here.now
./scripts/publish.sh dist/

# Output: https://{slug}.here.now
```

### Backend Deployment (Vercel/Fly.io)

```bash
# Option A: Vercel
vercel deploy --prod

# Option B: Fly.io
fly deploy --config fly.toml

# Option C: VPS
./scripts/deploy_backend.sh
```

### Post-Deployment

1. ✅ Test all LLM endpoints live
2. ✅ Validate cost tracking in logs
3. ✅ Generate dashboard snapshot
4. ✅ Archive deployment report to reports_html/
5. ✅ Update DEPLOYMENT_STATUS_YYYYMMDD.md

---

## 📊 Analytics & Monitoring

### Dashboard
**File:** `dashboards/chat_analytics_YYYYMMDD.html`

Tracks:
- Queries per model
- Average response time by model
- Total cost per day/week
- User retention
- Top questions
- Error rate

### Logs
**Directory:** `/logs/` (gitignored)

- `api_YYYYMMDD.log` — Request/response logs
- `build_YYYYMMDD.log` — Build process
- `qa_YYYYMMDD.log` — QA validation results

---

## 📈 Success Metrics

- **Latency:** < 3s average response time
- **Accuracy:** ≥ 95% relevant resume-grounded answers
- **Cost:** < $0.001 per query
- **Uptime:** 99.9% backend availability
- **Users:** Initial goal: 100 active monthly users

---

## 🔗 Cross-References

- **Resume Data:** [data_raw/JohnHauResume2026_MorganStanley.txt](../../data_raw/JohnHauResume2026_MorganStanley.txt)
- **Profile JSON:** [src/data/john_profile.json](../../src/data/john_profile.json)
- **LLM Config:** [src/utils/modelConfig.js](../../src/utils/modelConfig.js)
- **System Prompt:** [src/utils/buildPrompt.js](../../src/utils/buildPrompt.js)
- **API Spec:** [docs/api/BACKEND_API_SPEC_YYYYMMDD.md](../api/BACKEND_API_SPEC_YYYYMMDD.md)
- **Environment Setup:** [docs/setup/ENV_CONFIGURATION.md](../setup/ENV_CONFIGURATION.md)
- **Governance:** [soul.md](../../soul.md)

---

## ✔️ Next Steps (Prioritized)

1. **[ ] Environment Setup**
   - Create `.env.local`, `.env.vps`, `.env` with fallback chain
   - Store in `/secrets/` (gitignored)
   - Test dotenv loading with `override=True`

2. **[ ] Backend API Implementation**
   - Set up endpoint routers for all 4 LLMs
   - Implement cost calculator
   - Add logging + error handling

3. **[ ] Frontend Build**
   - Implement ChatWindow, ModelSelector components
   - Load john_profile.json into client-side search
   - Test API calls to backend

4. **[ ] QA & Validation**
   - Run full QA checklist
   - Generate deployment report
   - Create analytics dashboard

5. **[ ] Deployment**
   - Deploy frontend to here.now
   - Deploy backend to Vercel/Fly.io
   - Monitor live metrics

6. **[ ] Post-Launch**
   - Gather user feedback
   - Optimize LLM routing based on latency/cost
   - Add reasoning explainability toggle

---

## 📝 Version History

| Date | Change | Author |
|------|--------|--------|
| 2026-03-25 | Initial PROJECTPLAN v1.0 — soul.md compliant | John Hau |

---

**End of Project Plan** — Managed per soul.md §1-§10 governance.
