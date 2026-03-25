Here’s a clean, production‑ready **Markdown file** you can drop directly into a new VS Code project as your project’s starting point. It’s structured, modular, and aligned with your engineering style: clear sections, reproducible workflow, and agent‑friendly.

This file sets up the entire project vision, folder structure, LLM routing logic, and implementation plan — so you can start coding immediately.

---

# **README.md — John Hau Multi‑LLM Career Copilot**

## 🚀 Overview  
This project builds a **public AI chat portal** that allows users to ask questions about **John Hau’s professional experience, AI projects, leadership achievements, and automation impact**.

The portal demonstrates:

- **Multi‑LLM orchestration** (DeepSeek, Llama, Qwen, Mixtral)  
- **Cost‑efficient reasoning**  
- **LLM agility** (switching models instantly)  
- **Resume‑grounded answers**  
- **Modern, intuitive chat UX**  
- **Static hosting on here.now** with a lightweight backend proxy  

The goal is to showcase **practical AI engineering**, not just UI.

---

## 🧠 Core Features

### 1. **Multi‑LLM Switching**
Users can choose between:

- **DeepSeek‑R1** → best reasoning per dollar  
- **Llama 3.1 (70B or 8B)** → balanced, natural language  
- **Qwen 2.5 / Mixtral 8x7B** → budget‑friendly, good enough  

Each response displays:

- Model used  
- Latency  
- Estimated cost  

### 2. **Resume‑Grounded Answers**
All responses are generated using structured context extracted from John’s resume:

- AI projects  
- Leadership roles  
- Cost savings  
- Automation achievements  
- Infrastructure & security expertise  

### 3. **Casual Conversation Mode**
Users can talk to the AI like a DM:

- “Tell me about John’s AI work in simple terms.”  
- “What makes John strong in hybrid AI + infra roles.”  

### 4. **Explainable Reasoning (Optional)**
A toggle reveals:

- Reasoning summaries  
- Why the model selected certain resume facts  
- How the question was interpreted  

---

## 🏗️ Architecture

### **Frontend (Static, hosted on here.now)**
- React + Vite (recommended)  
- Chat UI  
- Model selector  
- Reasoning toggle  
- Resume context loader  
- API request builder  

### **Backend (Tiny Proxy)**
Hosted on:

- Vercel  
- Fly.io  
- Cloudflare Workers  
- Your VPS  

Responsibilities:

- Store API keys safely  
- Route requests to DeepSeek / Together / OpenRouter  
- Inject resume context  
- Add cost + latency metadata  
- Return clean JSON to frontend  

---

## 📁 Folder Structure

```
project-root/
│
├── public/
│   └── favicon.ico
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
│   │   └── john_profile.json
│   │
│   ├── hooks/
│   │   └── useChatEngine.js
│   │
│   ├── utils/
│   │   ├── buildPrompt.js
│   │   └── modelConfig.js
│   │
│   ├── App.jsx
│   └── main.jsx
│
├── .env.local (ignored)
├── package.json
├── vite.config.js
└── README.md
```

---

## 🧩 Resume Knowledge Base (JSON)

Create `src/data/john_profile.json`:

```json
{
  "summary": "Seasoned IT infrastructure executive with extensive experience across AIA, Bank of America, Morgan Stanley, Merrill Lynch, and Edge Technology Group.",
  "ai_projects": [
    "Built production Next.js AI portal with LLM chatbot and 12-language support.",
    "Developing agentic AI trading prototype using multi-LLM ensembles.",
    "Built interactive macro-economic dashboard (GDP, Population, Debt, AI insights)."
  ],
  "achievements": [
    "Saved 7 FTE by automating ETL and BMC Remedy workflows.",
    "Led Windows 11 migration for 3,400 devices, saving HK$3.5M.",
    "Improved backup success from 40–68% to 99% using 3-tier HPE Sure storage.",
    "Achieved 99% audit pass rate for APAC patching cycles."
  ],
  "roles": [
    {
      "company": "AIA International Ltd",
      "title": "Associate Director Infrastructure Services",
      "highlights": [
        "Supervised 50+ staff across EUS, Service Desk, ITDR, Production Control.",
        "Resolved 2-year patching backlog (58% → 100%).",
        "Automated ITSM workflows saving 144 man-days annually."
      ]
    }
  ]
}
```

---

## 🧠 System Prompt Template

Create `src/utils/buildPrompt.js`:

```js
export function buildSystemPrompt(context) {
  return `
You are "John’s Career Copilot", an AI assistant that answers questions about John Hau’s professional experience, achievements, AI projects, and leadership.

Use ONLY the provided resume context. If something is not in the context, say you don’t know.

Always highlight:
- measurable outcomes (savings, % improvements, scale of users)
- leadership impact
- automation and AI adoption

Keep answers clear, structured, and concise.

Resume Context:
${JSON.stringify(context, null, 2)}
  `;
}
```

---

## 🔄 Multi‑LLM Routing Config

Create `src/utils/modelConfig.js`:

```js
export const MODELS = {
  deepseek: {
    name: "DeepSeek-R1",
    provider: "deepseek",
    endpoint: "/api/deepseek"
  },
  llama: {
    name: "Llama 3.1",
    provider: "together",
    endpoint: "/api/llama"
  },
  qwen: {
    name: "Qwen 2.5",
    provider: "together",
    endpoint: "/api/qwen"
  }
};
```

---

## 🔌 Backend API (Pseudo‑Code)

Your backend routes:

```
/api/deepseek
/api/llama
/api/qwen
```

Each endpoint:

1. Loads resume JSON  
2. Builds system prompt  
3. Calls the selected LLM  
4. Returns:

```json
{
  "model": "DeepSeek-R1",
  "latency_ms": 812,
  "cost_estimate": "USD $0.0003",
  "answer": "..."
}
```

---

## 🎨 UI Behavior

### Sidebar
- Quick prompts  
- Model selector  
- Reasoning toggle  
- “DM John on LinkedIn” button  

### Chat Window
- User messages (right)  
- AI messages (left)  
- Model badge  
- Cost + latency  

---

## 🚀 Deployment

### Frontend
- Build static files with Vite  
- Upload to here.now  

### Backend
- Deploy to Vercel / Fly.io / Cloudflare / VPS  
- Set API URL in `.env.local`  

---

## ✔️ Next Steps

1. Create the project folder  
2. Add this README.md  
3. Generate `john_profile.json`  
4. Build the chat UI  
5. Implement backend routing  
6. Deploy frontend to here.now  
7. Deploy backend to Vercel/Fly.io  


