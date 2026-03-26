# 🤖 John's Career Copilot

**An AI-Powered Interactive Resume Experience**

Transform how people learn about your professional journey. Instead of scrolling through a traditional resume, visitors have a conversation with an AI-powered copilot that knows everything about your career, projects, and achievements.

---

## ✨ What is This?

John's Career Copilot is a **next-generation professional portfolio** that combines:

- 🎯 **Interactive AI Assistant** – Ask anything about John's experience, skills, or projects
- 💡 **Smart Responses** – Powered by AI models (Google Gemini 3.1 Flash Lite + DeepSeek R1)
- 🎨 **Modern UI/UX** – Clean, responsive interface with dark/light themes
- ⚡ **Production Ready** – Deployed on VPS with Docker, Caddy, and HTTPS
- 📱 **Mobile Optimized** – Works perfectly on phones, tablets, and desktops

**Live at:** https://www.askcareer-ai.com

---

## 🚀 Features

### Core Features
✅ **14 Quick Questions** – Pre-built queries about cybersecurity, AI projects, leadership, and more  
✅ **Dual LLM Models** – Mistral 7B Instruct + DeepSeek R1 for diverse reasoning  
✅ **Day/Night Theme Toggle** – Switch between light and dark modes (localStorage persisted)  
✅ **Real-time Chat** – Stream responses from AI models  
✅ **Mobile Responsive** – Works on all devices  
✅ **Profile Data Integration** – Loaded with John's actual career data  

### Recent UI/UX Improvements (March 2026)
✅ **Hero Component** – Eye-catching header with "🤖 John's Career Copilot" title  
✅ **Social Links** – Quick access to LinkedIn and email  
✅ **Light Theme** – Beautiful light mode with better contrast  
✅ **Grammar Corrections** – All 14 questions professionally polished  
✅ **New Cybersecurity Question** – Added relevant security expertise showcase  
✅ **Optimized Build** – 48.82 kB gzipped for lightning-fast loads  

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + Vite 5.4.21
- **Styling:** CSS Modules (no Tailwind)
- **Theme System:** React Context API with CSS Variables
- **Build:** 150.30 kB JavaScript (48.82 kB gzipped)

### Backend
- **Runtime:** Node.js 18 (Alpine)
- **Server:** Express.js
- **Static Files:** Served from `/dist`
- **Health Checks:** Built-in container health monitoring

### AI Models
- **Primary:** Google Gemini 3.1 Flash Lite (fast, reliable)
- **Secondary:** DeepSeek R1 (advanced reasoning)
- **Provider:** OpenRouter API

### Deployment
- **Containerization:** Docker + Docker Compose
- **Reverse Proxy:** Caddy 2 (auto HTTPS via Let's Encrypt)
- **VPS Provider:** Custom VPS
- **Domain:** askcareer-ai.com
- **CI/CD:** GitHub with staging/main branches

---

## 📊 Performance Metrics

| Metric | Value |
|--------|-------|
| Frontend JS | 150.30 kB (48.82 kB gzipped) |
| Frontend CSS | 15.20 kB (3.64 kB gzipped) |
| HTML | 0.60 kB (0.37 kB gzipped) |
| Build Time | 2.15 seconds |
| Docker Build | 20-30 seconds (cached) |
| Page Load | <2 seconds (production) |

---

## 🔧 Getting Started

### Local Development

```bash
# 1. Clone repository
git clone https://github.com/haujon001-spec/ask_aijohncareer.git
cd ask_aijohncareer

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys:
# - OPENROUTER_API_KEY=sk-or-v1-...
# - DEEPSEEK_API_KEY=sk-...

# 4. Start development server
npm run dev

# 5. Open in browser
# Frontend: http://localhost:5173
# Backend: http://localhost:3000
```

### Production Deployment

```bash
# Build frontend
npm run build

# Deploy with Docker
docker-compose up -d

# Access at: https://www.askcareer-ai.com
```

---

## 📁 Project Structure

```
ask_aijohncareer/
├── src/
│   ├── components/
│   │   ├── Hero.jsx           # Hero section with title & buttons
│   │   ├── ChatWindow.jsx      # Main chat interface
│   │   ├── MessageBubble.jsx   # Individual messages
│   │   ├── ModelSelector.jsx   # AI model picker
│   │   └── SidebarIntro.jsx    # Sidebar with quick questions
│   ├── context/
│   │   └── ThemeContext.jsx    # Day/night theme management
│   ├── hooks/
│   │   └── useChatEngine.js    # Chat API integration
│   ├── utils/
│   │   ├── buildPrompt.js      # Prompt engineering
│   │   └── modelConfig.js      # Model configuration
│   ├── App.jsx                 # Main app component
│   └── main.jsx                # Entry point
├── backend/
│   └── server.js               # Express server
├── dist/                       # Production build (generated)
├── docker-compose.yml          # Container orchestration
├── Dockerfile                  # Multi-stage Node build
├── Caddyfile                   # Reverse proxy config
└── README.md                   # This file
```

---

## 🌐 Deployment

### VPS Setup

The application is deployed on a production VPS with:

1. **Docker Containers**
   - `john-career-copilot`: Node.js backend + frontend
   - `caddy`: Reverse proxy with auto-HTTPS

2. **SSL/HTTPS**
   - Auto-renewal via Let's Encrypt
   - Configured for both `askcareer-ai.com` and `www.askcareer-ai.com`

3. **Environment Configuration**
   - API keys stored in `.env` (never in repo)
   - Git branches: `dev` → `staging` → `main` (production)

### Deployment Commands

See [DEPLOYMENT_COMMANDS_26MAR2026.md](scripts/DEPLOYMENT_COMMANDS_26MAR2026.md) for step-by-step instructions.

**Quick Deploy:**
```bash
git push origin main
ssh root@askcareer-ai.com
cd /root/ask_aijohncareer
git pull origin main
npm run build
docker-compose down && docker-compose up -d
```

---

## 🎨 Theming System

The app includes a sophisticated theming system:

### CSS Variables (Light Mode)
```css
--bg-primary: #ffffff           /* White background */
--text-primary: #1f2937         /* Dark text */
--accent-blue: #2563eb          /* Clickable elements */
--border-color: #e5e7eb         /* Light borders */
```

### CSS Variables (Dark Mode)
```css
--bg-primary: #111827           /* Dark background */
--text-primary: #f3f4f6         /* Light text */
--accent-blue: #3b82f6          /* Brighter blue */
--border-color: #374151         /* Dark borders */
```

Toggle in UI with 🌙/☀️ button. Preference saved to `localStorage`.

---

## 🤖 AI Integration

### Model Selection

Users can choose between two LLM models:

1. **Mistral 7B Instruct** ⚡
   - Fast, concise responses
   - Great for quick questions
   - Low latency

2. **DeepSeek R1** 🧠
   - Advanced reasoning
   - Longer, detailed responses
   - Best for complex questions

### Prompt Engineering

See [buildPrompt.js](src/utils/buildPrompt.js) for the system prompt that gives the AI context about John's profile, projects, and expertise.

---

## 🔒 Security

### Best Practices
✅ API keys stored in `.env` files (never in git)  
✅ `.env` files in `.gitignore` and `.dockerignore`  
✅ SSH key-based authentication for VPS  
✅ HTTPS enforced via Caddy  
✅ No sensitive data in documentation  
✅ Health checks and container monitoring  

### API Key Rotation

Use the provided script for secure key rotation:
```bash
python scripts/rotate_keys_vps.py
```

---

## 📝 Recent Updates (March 26, 2026)

### Version 1.1.0 - UI/UX Redesign
- ✨ **Hero Component**: New eye-catching header
- 🎨 **Light Theme**: Complete light mode styling
- 🌙 **Theme Toggle**: Day/night mode with localStorage
- 📝 **Grammar Fixes**: All 14 questions professionally edited
- 🔒 **Cybersecurity Q**: New question about security expertise
- 📈 **Performance**: Optimized build (48.82 kB gzipped)

### Deployment Status
- ✅ Staging branch deployed to production VPS
- ✅ API keys configured via key rotation script
- ✅ Docker containers running and healthy
- ✅ SSL certificates renewed from Let's Encrypt
- ✅ All models (Gemini 3.1 Flash, DeepSeek R1) verified

---

## 📚 Documentation

- [Deployment Commands](scripts/DEPLOYMENT_COMMANDS_26MAR2026.md)
- [Staging Deployment Procedure](docs/STAGING_DEPLOYMENT_PROCEDURE_26MAR2026.md)
- [VPS Backup & Restore](docs/VPS_BACKUP_AND_RESTORE_26MAR2026.md)
- [Deployment Status](docs/DEPLOYMENT_STATUS_26MAR2026.md)
- [Project Plan](docs/project/PROJECTPLAN_25MAR2026.md)

---

## 🔗 Links

- **Live Site**: https://www.askcareer-ai.com
- **GitHub**: https://github.com/haujon001-spec/ask_aijohncareer
- **LinkedIn**: https://www.linkedin.com/in/john-hau/
- **OpenRouter Docs**: https://openrouter.ai/docs

---

## 📄 License

This project is the professional portfolio of John Hau. All rights reserved.

---

## 🙋 Questions?

Feel free to ask in the chat! The AI copilot is trained on John's profile and can answer questions about:
- Professional experience
- AI projects and innovations
- Leadership philosophy
- Cybersecurity expertise
- Technical skills and certifications

**Ask anything – that's what John's Career Copilot is for!** 🚀
