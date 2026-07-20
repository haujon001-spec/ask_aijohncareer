# Todolist — 01 April 2026

## Primary Goal
Build and deploy the JD Application Portal — web UI for Scorecard, Resume, and Cover Letter generation with docx download support.

## Context
- Python backend script is complete: `scripts/jd_scorecard_resume.py`  
- Three LLMs configured: Claude Sonnet 4.6, DeepSeek R1, Gemini Flash Lite  
- Output paths verified: `data_processed/<Employer>/ScoreCard|resume|CoverLetter/txt/`  
- All new requirements from ProjectPlan2 carried forward

---

## Phase 1 — Backend API (Node.js/Express or Python FastAPI)

### Priority: HIGH

- [ ] **Set up API server structure**
  - New file: `backend/jd_api.py` (FastAPI) OR extend `backend/server.js` (Express)
  - Routes: `POST /api/jd/generate`, `POST /api/jd/convert-docx`
  - CORS configured for local dev and production domains
  - Estimated effort: 2h

- [ ] **`POST /api/jd/generate` endpoint**
  - Accepts:
    - `jd_text` (string — pasted directly) **OR** `jd_file` (multipart upload)
    - `employer` (string — company name, auto-derived if not provided)
    - `output_type`: `scorecard` | `resume` | `coverletter` | `all`
    - `llm`: `sonnet` | `deepseek` | `gemini`
  - Calls `scripts/jd_scorecard_resume.py` as subprocess OR imports as module
  - Returns JSON: `{ scorecard, resume, coverletter, paths: {...} }`
  - Estimated effort: 3h

- [ ] **`POST /api/jd/convert-docx` endpoint** *(req 7 — docx download)*
  - Accepts: `{ text, type, employer }` — plain text content
  - Converts to styled `.docx` using `python-docx` (`pip install python-docx`)
  - Formatting rules:
    - Font: Calibri 11pt
    - Section headers: Bold, 12pt
    - Bullet items: indented 0.5in
    - Margins: 1in all sides
  - Saves to `data_processed/<Employer>/<Type>/docx/<filename>_01APR2026.docx`
  - Returns file as download (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`)
  - Estimated effort: 3h

- [ ] **`GET /api/jd/status`** — health check endpoint for portal
  - Returns: `{ llms_available, profile_loaded, version }`
  - Estimated effort: 0.5h

---

## Phase 2 — Frontend React Portal

### Priority: HIGH

- [ ] **New Route: `/jd-portal`**
  - Add to existing React app in `src/`
  - Component: `src/components/JDPortal/JDPortal.jsx`
  - Estimated effort: 1h

- [ ] **JD Input Component** *(two modes)*

  **Mode A — File Upload:**
  - Drag-and-drop zone + click-to-browse
  - Accepts `.txt` and `.docx`
  - File preview: name, size, first 300 chars of extracted text
  - Saves to `data_raw/jd/txt/` (processed on backend)
  - Error: unsupported format, file size >2MB

  **Mode B — Direct Text Paste** *(req 4b — NEW)*
  - Large textarea: "Paste your JD here — copy directly from LinkedIn or any source"
  - Company name field (auto-derived if blank)
  - Character count: min 100, max 15,000
  - Text saved as `JD_<Company>_<DATE>.txt` to `data_raw/jd/txt/` via API

  - Toggle between File Upload / Paste modes (tab switcher or radio buttons)
  - Estimated effort: 4h

- [ ] **Output Selector**
  - Checkboxes: `☐ Scorecard` `☐ Resume` `☐ Cover Letter` `☑ All`
  - Default: All selected
  - Estimated effort: 1h

- [ ] **LLM Selector**
  - Radio group: `● Claude Sonnet 4.6` `○ DeepSeek R1` `○ Gemini Flash Lite`
  - Badge: Cost indicator (Smart | Fast | Cheap)
  - Default: Sonnet 4.6
  - Estimated effort: 1h

- [ ] **Generate Button + Progress Indicator**
  - Disabled until JD input is valid
  - Shows spinner + live status: "Generating scorecard... (1/3)"
  - Estimated effort: 1.5h

- [ ] **Results Display Panel**
  - Tabs: Scorecard | Resume | Cover Letter
  - Full text in scrollable panel per tab
  - Character count + word count per document
  - Estimated effort: 1.5h

- [ ] **Download Buttons — docx format** *(req 7 — NEW)*
  - Download button per document: "⬇ Download as .docx"
  - Calls `/api/jd/convert-docx` then triggers browser download
  - Loading state per button
  - Estimated effort: 2h

---

## Phase 3 — Python to Backend Integration

- [ ] **Refactor `jd_scorecard_resume.py` for API use**
  - Extract `generate_all()` as importable function
  - Accept `jd_text` string as input (not just file path)
  - Return dict `{ scorecard, resume, coverletter }` instead of writing files
  - Keep CLI flags working (backward-compatible)
  - Estimated effort: 2h

- [ ] **`python-docx` integration**
  - `pip install python-docx`
  - New module: `scripts/docx_converter.py`
  - Function: `text_to_docx(text, doc_type, employer)` → returns file path
  - Tested for: Scorecard, Resume, Cover Letter formats
  - Estimated effort: 2h

---

## Phase 4 — QA / Testing

- [ ] **Manual QA Checklist**
  - File upload: `.txt` file → all 3 docs generated
  - Paste mode: copy JD from LinkedIn → all 3 docs generated
  - LLM switch: verify Sonnet / DeepSeek / Gemini all respond
  - Output selector: individual doc generation (not just All)
  - docx download: opens correctly in Microsoft Word
  - Mobile layout: input + results usable on 375px screen width

- [ ] **Edge Cases**
  - Empty JD input (disabled button validation)
  - JD < 100 characters (error message)
  - API timeout >30s (timeout error with retry option)
  - Unknown employer name (fallback to "Employer")

---

## Phase 5 — Deployment

- [ ] **Docker: add `python-docx` to Dockerfile**
  ```
  RUN pip install python-docx
  ```
- [ ] **Update `docker-compose.yml`** with any new env vars or ports
- [ ] **Deploy to VPS staging** — test end-to-end
- [ ] **Smoke test** on staging URL
- [ ] **`docs/project/completed_01APR2026.md`** — document what was built

---

## Daily Notes

### Requirements Reference
| # | Requirement | Status |
|---|-------------|--------|
| 1 | Resume: 10 bullets (companies 1-3), 8 bullets (4-5) | ✅ Done |
| 2 | Output to `data_processed/<Employer>/ScoreCard\|resume\|CoverLetter/txt\|docx\|pdf` | ✅ Done |
| 3 | Exclude `data/`, `data_raw/`, `data_processed/` from GitHub | ✅ Done |
| 4 | Web portal — JD input via file upload (txt/docx) | ⏳ Today |
| 4b | **Web portal — JD input via direct text paste (LinkedIn etc.)** | ⏳ Today |
| 5 | Output selector: Scorecard / Resume / CoverLetter / All | ⏳ Today |
| 6 | LLM selector: Sonnet 4.6 / DeepSeek R1 / Cheap model | ⏳ Today |
| 7 | **Download output files as `.docx` from portal** | ⏳ Today |

### Carry-Over From 31 Mar
- `scripts/jd_scorecard_resume.py` — fully working, needs refactor for API import
- `data_processed/MandarinOriental/` — sample outputs validated
- `.gitignore` updated

### Priority Order
1. Backend API (`/api/jd/generate`) — everything depends on this
2. docx converter (`/api/jd/convert-docx`) — req 7
3. Frontend Portal UI — JD input (both modes), results + download
4. QA + deploy

### Estimated Total
| Phase | Hours |
|-------|-------|
| Phase 1 — API | ~8.5h |
| Phase 2 — Frontend | ~12h |
| Phase 3 — Integration | ~4h |
| Phase 4 — QA | ~3h |
| Phase 5 — Deploy | ~2h |
| **Total** | **~29.5h** |
