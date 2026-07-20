# Todo List — 31 March 2026
**Focus: JD Comparison Web Portal Development**

---

## CARRY-OVER: Completed Today
- [x] All-in-one JD Application Generator script (`scripts/jd_scorecard_resume.py`)
- [x] Output folder structure: `data_processed/<Employer>/ScoreCard|resume|CoverLetter/txt|docx|pdf`
- [x] LLM selection: Sonnet 4.6, DeepSeek R1, Gemini Flash Lite
- [x] Resume bullet rules: top 3 companies = 10 bullets, 4th & 5th = 8 bullets
- [x] `.gitignore` updated to exclude `data/`, `data_raw/`, `data_processed/`

---

## NEXT SPRINT: JD Comparison Web Portal

### Overview
Build a modern, mobile + desktop responsive web portal that wraps the JD Application Generator pipeline with a clean UI. Users upload a JD file, select an LLM, and generate Scorecard / Resume / Cover Letter on demand.

---

### Phase 1 — Backend API (Node.js / Express)

- [ ] **JD Upload Endpoint** `POST /api/jd/upload`
  - Accept `.txt` and `.docx` file formats
  - Accept paste text into the chat as jd 
  - Save to `data_raw/jd/txt/` (txt) or `data_raw/jd/docx/` (docx) depending on format
  - Save a blueprint of the jd as JSON file to be used for LLM scorecard rating
  - Return: saved file path, extracted text preview
  - Input validation: max file size 2MB, allowed types only
  - Estimated effort: 2h

- [ ] **Generate Endpoint** `POST /api/jd/generate`
  - Parameters: `jdFilePath`, `outputType` (scorecard | resume | coverletter | all), `llm` (sonnet | deepseek | gemini)
  - Calls Python script: `python scripts/jd_scorecard_resume.py <jdPath> --llm=<llm> --<type>-only`
  - Returns: generated file paths or streamed text
  - Estimated effort: 3h

- [ ] **Download Endpoint** `GET /api/jd/download?file=<path>`
  - Serve generated `.txt` files from `data_processed/`
  - Future: serve `.docx` / `.pdf` when conversion is added
  - Estimated effort: 1h

---

### Phase 2 — Frontend React UI

- [ ] **JD Input Component** *(two input modes)*
  - **Mode A — File Upload**: Drag-and-drop zone + click-to-browse
    - Accepts `.txt` and `.docx`
    - Shows file name, size, extracted text preview (first 300 chars)
    - Saves to `data_raw/jd/txt/` or `data_raw/jd/docx/` based on format
    - Error handling: unsupported format, oversized file (>2MB)
  - **Mode B — Direct Paste** *(NEW — req 4b)*
    - Large textarea: "Paste JD text here (e.g. copy directly from LinkedIn)"
    - Minimum 100 chars validation
    - Auto-derives company name from pasted text (or user enters manually)
    - Saves as `.txt` to `data_raw/jd/txt/` with auto-generated filename
    - Character count indicator
  - Toggle switcher between File Upload / Paste Text modes
  - Estimated effort: 4h

- [ ] **LLM Selector Component**
  - 3 options displayed as radio cards with descriptions:
    - **Claude Sonnet 4.6** — Smart & accurate (OpenRouter) — recommended for final applications
    - **DeepSeek R1** — Deep reasoning (DeepSeek API) — good for detailed analysis
    - **Gemini Flash Lite** — Fast & economical (OpenRouter) — quick drafts
  - Estimated effort: 1.5h

- [ ] **Output Selector Component**
  - 4 checkboxes / buttons: Scorecard | Resume | Cover Letter | All 3
  - Visual icons for each type
  - Estimated effort: 1h

- [ ] **Generate Button + Progress Indicator**
  - Calls `/api/jd/generate`
  - Shows per-document status: Generating... / Done / Error
  - Estimated effort: 1.5h

- [ ] **Results Display Panel**
  - Tabs: Scorecard | Resume | Cover Letter
  - Full text shown in a scrollable panel per tab
  - Download button per document — **`.docx` format** *(NEW — req 7)*
  - Estimated effort: 2h

- [ ] **DOCX Download — Backend** *(NEW — req 7)*
  - Install `python-docx` (Python) for conversion OR `docx` npm package
  - `POST /api/jd/convert-docx` — accepts plain text, returns `.docx` file
  - Apply professional formatting: font (Calibri 11pt), section headers bold, bullet indentation
  - Save to `data_processed/<Employer>/<Type>/docx/` alongside `.txt` output
  - Estimated effort: 3h

---

### Phase 3 — UI/UX & Responsive Design

- [ ] **Mobile-first layout**
  - Single-column stack on mobile, two-column on desktop
  - Consistent with existing `askcareer-ai.com` design language (dark/light theme toggle)
  - Estimated effort: 2h

- [ ] **Modern design system**
  - Clean card-based layout
  - Subtle gradient headers
  - Loading skeletons while generating
  - Toast notifications for success/error
  - Estimated effort: 2h

---

### Phase 4 — Integration & QA

- [ ] **End-to-end test**: upload JD → select LLM → generate all 3 → download
- [ ] **Error handling**: API key missing, LLM timeout, file parse failure
- [ ] **Mobile UI check**: confirm layout, fonts, scroll on mobile viewport
- [ ] **LLM key validation**: confirm each LLM API key is working before generating
- [ ] **Output file validation**: confirm file written to correct `data_processed/<Employer>/` path
- [ ] **Security check**: sanitise uploaded file paths, reject path traversal attempts

---

### Phase 5 — Docker & Deployment (Future)

- [ ] Add `/api/jd/*` routes to existing Express backend (`backend/server.js`)
- [ ] Add portal page/route to existing React frontend
- [ ] Confirm Docker volume mounts include `data_raw/` and `data_processed/`
- [ ] Add `data_raw/jd/docx/` and `data_raw/jd/txt/` to volume mounts

---

## Technical Notes
- Portal route: `/jd-portal` within existing React app (or separate route)
- File storage: `data_raw/jd/txt/` and `data_raw/jd/docx/` for inputs
- **JD Paste input**: auto-saved as `JD_<CompanyName>_<DATE>.txt` to `data_raw/jd/txt/`
- Output: `data_processed/<Employer>/` auto-created per company
- **DOCX output**: generated alongside `.txt` in `data_processed/<Employer>/<Type>/docx/`
- LLM keys: loaded from `.env.local` — never exposed to frontend
- No hallucination: all content sourced from `src/data/john_profile.json`

## New Requirements Added (31 Mar — evening)
| # | Requirement | Source |
|---|------------|--------|
| 4b | JD direct text paste input (copy from LinkedIn etc.) | ProjectPlan2 update |
| 7 | Download generated outputs as `.docx` from the portal | ProjectPlan2 update |

---

## Priority Order
1. Backend upload + generate endpoints
2. Frontend upload + LLM selector + generate button
3. Results display panel
4. Responsive polish
5. Docker integration
