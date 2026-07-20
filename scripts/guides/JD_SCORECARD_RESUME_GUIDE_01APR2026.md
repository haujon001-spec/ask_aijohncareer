# JD Scorecard / Resume / Cover Letter Guide — 01APR2026

## Purpose
`scripts/jd_scorecard_resume.py` is the all-in-one generator for:
- JD Match Scorecard
- Tailored Resume
- Cover Letter
- Auto-generated JD Blueprint JSON
- `.docx` export for all generated text outputs

It uses:
- `src/data/john_profile.json` as the single source of truth
- `data_raw/resume/txt/JohnHauResume2026_MorganStanley.md` as the preferred resume template
- lower-cost or premium LLMs via `--llm=`

---

## Input Locations
### Job Descriptions
Place JD text files in:
```text
data_raw/jd/txt/
```

Recommended naming format:
```text
JD_<CompanyName>_<JobTitle>.txt
```

Example:
```text
JD_MandarinOriental_ClusterDirectorOfIT.txt
```

### Candidate Profile
Source of truth:
```text
src/data/john_profile.json
```

### Resume Template
Preferred template:
```text
data_raw/resume/txt/JohnHauResume2026_MorganStanley.md
```
Fallback template:
```text
data_raw/resume/txt/JohnHauResume2026_MorganStanley.txt
```

---

## LLM Options
```bash
--llm=sonnet    # Claude Sonnet 4.6 (best quality, most expensive)
--llm=gemini    # Gemini 3.1 Flash Lite (recommended lower-cost default)
--llm=deepseek  # DeepSeek R1 (reasoning alternative)
```

Recommended day-to-day option:
```bash
--llm=gemini
```

---

## Common Commands
### 1) Run for one JD
```bash
python scripts/jd_scorecard_resume.py "data_raw/jd/txt/JD_MandarinOriental_ClusterDirectorOfIT.txt" --llm=gemini
```

### 2) Scorecard only
```bash
python scripts/jd_scorecard_resume.py "data_raw/jd/txt/JD_MandarinOriental_ClusterDirectorOfIT.txt" --llm=gemini --scorecard-only
```

### 3) Resume only
```bash
python scripts/jd_scorecard_resume.py "data_raw/jd/txt/JD_MandarinOriental_ClusterDirectorOfIT.txt" --llm=gemini --resume-only
```

### 4) Cover letter only
```bash
python scripts/jd_scorecard_resume.py "data_raw/jd/txt/JD_MandarinOriental_ClusterDirectorOfIT.txt" --llm=gemini --coverletter-only
```

### 5) Refresh an existing JD blueprint JSON
```bash
python scripts/jd_scorecard_resume.py "data_raw/jd/txt/JD_MandarinOriental_ClusterDirectorOfIT.txt" --llm=gemini --refresh-blueprint
```

### 6) Batch process all JD files
```bash
python scripts/jd_scorecard_resume.py --batch --llm=gemini
```

### 7) Force re-run all JD files in batch mode
```bash
python scripts/jd_scorecard_resume.py --batch --llm=gemini --force
```

### 8) Disable docx generation if needed
```bash
python scripts/jd_scorecard_resume.py --batch --llm=gemini --no-docx
```

---

## What the Script Does
For each JD, the script will:
1. Read the JD text file
2. Load `john_profile.json`
3. Load the resume template
4. Check for a matching JD blueprint in:
   ```text
   src/data/jd/<JD_STEM>.json
   ```
5. If missing, automatically generate the JD blueprint JSON
6. Create the scorecard, resume, and cover letter
7. Save `.txt` outputs
8. Convert them to `.docx`

---

## Output Locations
For a company such as `MandarinOriental`, outputs are saved to:

```text
data_processed/MandarinOriental/ScoreCard/txt/
data_processed/MandarinOriental/ScoreCard/docx/
data_processed/MandarinOriental/resume/txt/
data_processed/MandarinOriental/resume/docx/
data_processed/MandarinOriental/CoverLetter/txt/
data_processed/MandarinOriental/CoverLetter/docx/
```

Example filenames:
```text
JD_SCORECARD_MandarinOriental_ClusterDirectorOfIT_01APR2026.txt
JohnHauResume2026_MandarinOriental_ClusterDirectorOfIT_01APR2026.txt
JohnHauCoverLetter_MandarinOriental_ClusterDirectorOfIT_01APR2026.txt
```

---

## Batch Mode Summary Report
At the end of batch mode, the script prints a summary report showing:
- JD file name
- status (`DONE`, `SKIPPED`, `FAILED`)
- blueprint status
- note / output hint

This makes it easy to audit which files were newly processed and which were skipped because outputs already existed.

---

## Notes on Matching Logic
The script is designed to:
- maximize JD relevance without hallucinating
- use semantic alignment between JD wording and `john_profile.json`
- preserve the `AI & AUTOMATION HIGHLIGHTS` section in every resume
- avoid claiming direct hands-on experience with hotel/PMS/POS/PCI or other domain-specific items unless they are explicitly supported by the profile

---

## Standalone DOCX Conversion
If needed, a separate helper is also available:
```bash
python scripts/convert_txt_to_docx.py "path/to/file.txt"
```

---

## Troubleshooting
### Sonnet blocked / region restriction
Use:
```bash
--llm=gemini
```
or
```bash
--llm=deepseek
```

### Rebuild a bad blueprint
```bash
python scripts/jd_scorecard_resume.py "path/to/JD.txt" --refresh-blueprint --llm=gemini
```

### Force regeneration of all outputs
```bash
python scripts/jd_scorecard_resume.py --batch --force --llm=gemini
```
