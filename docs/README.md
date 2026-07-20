# John's Career Copilot 🤖

AI-powered chatbot showcasing John's professional experience, career achievements, and expertise. Deployed at **www.askcareer-ai.com**.

## ✅ Deployment Status (March 30, 2026)

### Live Features
- **Backend**: Node.js Express server with dual LLM support
- **Frontend**: React + Vite with real-time chat interface
- **Infrastructure**: Docker Compose + Caddy reverse proxy on Ubuntu VPS
- **SSL/HTTPS**: Let's Encrypt (automatic renewal)

### LLM Models (Working)
1. **Google Gemini 3.1 Flash Lite** (OpenRouter)
   - Ultra-fast responses (~2-3s)
   - FREE tier
   - Best for quick answers
   - Multimodal capable
   
2. **DeepSeek R1** (Native API)
   - Advanced reasoning with explanations
   - ~4-5s latency with reasoning enabled
   - Best for complex questions
   - Supports reasoning mode for deeper analysis

### Recent Updates (March 30)
✅ Upgraded to Google Gemini 3.1 Flash Lite (more reliable than Liquid LFM)  
✅ DeepSeek R1 with reasoning mode support  
✅ Both LLM APIs responding correctly  
✅ Consolidated multi-model testing framework  

## 🚀 Architecture

```
www.askcareer-ai.com (HTTPS)
    ↓
Caddy Reverse Proxy (Port 80/443)
    ↓
Docker Container (Node.js + React)
    ├── Backend: Express server (Port 3000)
    │   ├── /api/deepseek → Google Gemini 3.1 Flash Lite
    │   └── /api/nemotron → DeepSeek R1
    └── Frontend: Static React app (Vite-built dist/)
        └── Relative URLs (/api/...) for API calls
```

## 📋 Tomorrow's Work (March 26)

### Priority: Mobile UI/UX Improvement

**Task: Convert "Quick Questions" Sidebar to Dropdown Menu**

#### Current State
- Quick questions displayed as button list in sidebar
- Takes up vertical space on mobile
- Reduces chat window visibility

#### Required Changes
1. **File**: `src/components/SidebarIntro.jsx`
   - Replace quick questions buttons with a dropdown/select menu
   - Show label "Quick Questions ▼" by default
   - Expand on click to show options
   - Click option → populate message input & submit

2. **File**: `src/components/SidebarIntro.css`
   - Style dropdown to look clean/modern
   - Ensure mobile-friendly spacing

3. **Testing**
   - Test on mobile (iOS Safari, Chrome Android)
   - Verify dropdown animations smooth
   - Confirm quick question selection fills input correctly

#### Expected Outcome
- Frees up ~40-60px of vertical space on mobile
- Improves chat window prominence
- Better mobile UX flow

## 🔧 Development

### Setup
```bash
npm install
npm run build  # Frontend only
npm run dev    # Local dev server

# Docker (production)
docker-compose up -d --build
```

### Environment Variables
- `.env.local` - Local development (NOT committed to git)
- `.env.vps` - VPS production (loaded via .env.local chain)
- `.env.example` - Template for reference

⚠️ **Security**: API keys in `.env.local` are in `.gitignore` - never commit!

### Testing APIs
```bash
# Google Gemini 3.1 Flash Lite (deepseek endpoint)
curl -X POST https://www.askcareer-ai.com/api/deepseek \
  -H 'Content-Type: application/json' \
  -d '{"question":"Tell me about Johns achievements"}'

# DeepSeek R1 (nemotron endpoint)
curl -X POST https://www.askcareer-ai.com/api/nemotron \
  -H 'Content-Type: application/json' \
  -d '{"question":"What is Johns email?"}'
```

## 📁 Key Files

**Frontend**
- `src/App.jsx` - Main component (message state, model selection)
- `src/components/ChatWindow.jsx` - Chat interface
- `src/components/ModelSelector.jsx` - Model switcher
- `src/components/SidebarIntro.jsx` - Quick questions intro panel
- `src/App.css`, `src/components/*.css` - Mobile-optimized styling

**Backend**
- `backend/server.js` - Express API server
- `Dockerfile` - Multi-stage build (frontend → backend)
- `Caddyfile` - Reverse proxy config
- `docker-compose.yml` - Services orchestration

**Data**
- `src/data/john_profile.json` - John's profile data
- `data_raw/JohnHauResume2026_MorganStanley.txt` - Resume source

## 🐛 Known Issues / Notes

- CSS warning during build: "Unexpected }" at line 398 (harmless, style works correctly)
- `.env.local` must be loaded before running backend
- Mobile viewport: Uses `content="width=device-width, initial-scale=1.0"`

## 📝 Commit History (Today)

```
085d577 docs: Add debug logging to useChatEngine for API troubleshooting
4bf2bf3 fix: Mobile scrolling layout and model display names
741b79f fix: Update model names and add display mapping
[earlier commits...]
```

---

**Last Updated**: March 30, 2026  
**Deployed**: www.askcareer-ai.com ✅  
**LLMs**: Google Gemini 3.1 Flash Lite + DeepSeek R1
