# Todolist — 02 April 2026

## Primary Goal
Build a **modern frontend portal** that performs the same work as `scripts/jd_scorecard_resume.py`, but through a visual UI instead of terminal / command-line parameters.

## Objective
A user should be able to:
- upload or paste a JD
- choose the LLM (`Sonnet`, `DeepSeek`, `Gemini`)
- choose what to generate (`Scorecard`, `Resume`, `Cover Letter`, or `All`)
- optionally refresh the JD blueprint JSON
- optionally run batch mode / force mode
- click **Generate** from the UI
- preview results and download `.txt` / `.docx`

No terminal usage should be required for normal operation.

---

## Phase 1 — UX / Product Design

### Priority: HIGH

- [ ] **Define the portal route and page layout**
  - Route: `/jd-portal`
  - Modern, card-based layout with clean spacing and mobile support
  - Left panel: inputs and options
  - Right panel: progress, output preview, and downloads
  - Estimated effort: 1h

- [ ] **Map CLI options to UI controls**

| CLI / Script Behavior | UI Control |
|---|---|
| `JD path` | File upload / paste text / saved JD dropdown |
| `--llm=sonnet|deepseek|gemini` | LLM selector cards or radio buttons |
| `--scorecard-only` | Output selector |
| `--resume-only` | Output selector |
| `--coverletter-only` | Output selector |
| default = all outputs | “All Documents” default option |
| `--refresh-blueprint` | Advanced toggle: “Rebuild JD Blueprint” |
| `--batch` | Batch mode switch |
| `--force` | “Force rerun even if outputs exist” toggle |
| `--no-docx` | DOCX generation on/off toggle |

- [ ] **Create simple user flow**
  1. Select input JD
  2. Choose model
  3. Choose outputs
  4. Toggle advanced options if needed
  5. Click Generate
  6. See progress + generated files
  7. Download results

---

## Phase 2 — Frontend Portal Implementation

### Priority: HIGH

- [ ] **Create new React components**
  - `src/components/JDPortal/JDPortal.jsx`
  - `src/components/JDPortal/JDPortal.css`
  - Optional subcomponents:
    - `JDInputPanel.jsx`
    - `ModelSelectorPanel.jsx`
    - `GenerateOptionsPanel.jsx`
    - `OutputViewerPanel.jsx`
  - Estimated effort: 3h

- [ ] **JD Input Modes**
  - File upload (`.txt`, `.docx` later if supported by backend)
  - Paste JD text directly from LinkedIn / website
  - Existing saved JD selection dropdown from `data_raw/jd/txt/`
  - Validation for empty input and short JD content
  - Estimated effort: 2h

- [ ] **Model Selection UI**
  - `Claude Sonnet 4.6` — best quality / expensive
  - `DeepSeek R1` — reasoning / mid-cost
  - `Gemini 3.1 Flash Lite` — cheaper / default
  - Show small cost + quality badges
  - Default: `Gemini`
  - Estimated effort: 1h

- [ ] **Output Selection UI**
  - Toggle / segmented control:
    - Scorecard only
    - Resume only
    - Cover Letter only
    - All documents
  - Default: All
  - Estimated effort: 1h

- [ ] **Advanced Options Panel**
  - Toggle: `Refresh JD Blueprint`
  - Toggle: `Generate DOCX`
  - Toggle: `Force rerun`
  - Toggle: `Batch mode`
  - Estimated effort: 1h

- [ ] **Generate Action + Progress UI**
  - Button: `Generate Documents`
  - Progress state messages:
    - Reading JD
    - Building blueprint
    - Generating scorecard
    - Generating resume
    - Generating cover letter
    - Writing outputs
  - Use spinner + status bar + terminal-style live log block
  - Estimated effort: 2h

- [ ] **Output Preview Panel**
  - Tabs:
    - Scorecard
    - Resume
    - Cover Letter
  - Show generated text in scrollable preview area
  - Buttons for:
    - Download `.txt`
    - Download `.docx`
    - Open output folder (optional)
  - Estimated effort: 2h

---

## Phase 3 — Backend / API Bridge

### Priority: HIGH

- [ ] **Create API endpoint to run the Python script from the UI**
  - Endpoint idea: `POST /api/jd/generate`
  - Accept payload:
    ```json
    {
      "jd_text": "...",
      "jd_file": "optional saved filename",
      "llm": "gemini",
      "outputMode": "all",
      "refreshBlueprint": false,
      "batch": false,
      "force": false,
      "generateDocx": true
    }
    ```
  - Estimated effort: 3h

- [ ] **Map UI inputs to current script flags**
  - UI → subprocess call for `jd_scorecard_resume.py`
  - Example:
    ```bash
    python scripts/jd_scorecard_resume.py "<jd_path>" --llm=deepseek --refresh-blueprint
    ```
  - Estimated effort: 1.5h

- [ ] **Return generated file paths and content to frontend**
  - JSON response should include:
    - scorecard text
    - resume text
    - cover letter text
    - output paths
    - blueprint path
    - batch summary (if applicable)
  - Estimated effort: 1.5h

---

## Phase 4 — Data / Output Handling

- [ ] **Preserve current folder structure**
  - Inputs remain in `data_raw/jd/txt/`
  - Blueprints remain in `src/data/jd/`
  - Outputs remain in `data_processed/<Employer>/...`
  - Must remain consistent with `soul.md`

- [ ] **Add saved-JD list loader for the UI**
  - Read filenames from `data_raw/jd/txt/`
  - Populate dropdown for quick selection
  - Estimated effort: 1h

- [ ] **Download handler for txt + docx**
  - Frontend downloads files directly from API or output folder mapping
  - Estimated effort: 1h

---

## Phase 5 — QA / Validation

- [ ] **Manual end-to-end test**
  - Run same HK Jockey Club example from the UI instead of terminal
  - Confirm LLM selection works correctly for `DeepSeek`
  - Confirm scorecard header shows correct model
  - Confirm `.docx` downloads open in Word

- [ ] **Test Cases**
  - `Gemini` single JD run
  - `DeepSeek` single JD run
  - Batch run from UI
  - Refresh blueprint toggle on/off
  - Force rerun toggle on/off
  - Existing outputs skip correctly
  - Locked `.docx` file fallback behavior

- [ ] **UI / UX checks**
  - mobile responsive on 375px width
  - clear fonts and readable spacing
  - no horizontal overflow
  - scrollbars and buttons work correctly

---

## Acceptance Criteria
A successful tomorrow build should satisfy all of these:

- [ ] A user can use the portal without typing CLI commands
- [ ] The UI exposes the same important options currently passed via command line
- [ ] The portal can generate `Scorecard`, `Resume`, `Cover Letter`, or `All`
- [ ] The portal can select `Gemini`, `DeepSeek`, or `Sonnet`
- [ ] The portal can optionally rebuild the JD blueprint JSON
- [ ] The portal can generate `.docx` outputs
- [ ] The portal can preview the results in the browser
- [ ] The portal preserves current soul.md folder structure and output conventions

---

## Priority Order for 02APR2026
1. Backend API wrapper around `jd_scorecard_resume.py`
2. Frontend UI with options mapped from current CLI flags
3. Live progress + output preview
4. txt/docx downloads
5. QA and mobile polish

---

## Example User Story
> As a user, I want to select a JD, choose `DeepSeek`, turn on `Refresh Blueprint`, and click `Generate`, so I can receive a scorecard, tailored resume, and cover letter from a modern UI instead of using the terminal.
