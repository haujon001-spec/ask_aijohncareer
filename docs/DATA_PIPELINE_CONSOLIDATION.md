# Data Pipeline & Consolidation System
**Date Created:** March 30, 2026  
**Purpose:** Unified data ingestion, processing, and consolidation workflow

---

## 📂 Folder Structure

### 1. INPUT STAGE - Raw Files (1.A & 1.B)

**Resume Files (1.A):**
```
data_raw/resume/
├── pdf/      → Upload PDF resumes here
├── docx/     → Upload Word documents here
└── txt/      → Upload text resumes here
```

**Job Description Files (1.B):**
```
data_raw/JD/
├── pdf/      → Upload PDF job descriptions here
├── docx/     → Upload Word job descriptions here
└── txt/      → Upload text job descriptions here
```

### 2. OUTPUT STAGE - Processed Files (2.A & 2.B)

**Processed Resumes (2.A):**
```
data/processed/Resume/
├── json/     → Resume_JohnHau_CompanyName_ShortTitle_Date.json
├── docx/     → Resume_JohnHau_CompanyName_ShortTitle_Date.docx
└── pdf/      → Resume_JohnHau_CompanyName_ShortTitle_Date.pdf
```

**Generated Cover Letters (2.B):**
```
data/processed/CoverLetter/
├── json/     → CoverLetter_JohnHau_CompanyName_ShortTitle_Date.json
├── docx/     → CoverLetter_JohnHau_CompanyName_ShortTitle_Date.docx
└── pdf/      → CoverLetter_JohnHau_CompanyName_ShortTitle_Date.pdf
```

### 3. CONSOLIDATION POINT

**Master Profile:**
```
src/data/john_profile.json
```
Consolidates all resume information from input stage (1.A) for use across the portal.

---

## 🔄 Data Flow Workflow

```
INPUT FLOW:
User uploads resume → data_raw/resume/{format}/
User uploads JD → data_raw/JD/{format}/
                    ↓
           PARSING & EXTRACTION
                    ↓
CONSOLIDATION FLOW:
Resume data consolidated → src/data/john_profile.json
                         → Portal uses this for comparisons, dashboards
                    ↓
OUTPUT FLOW:
Processed resume → data/processed/Resume/{format}/
Generated cover letter → data/processed/CoverLetter/{format}/
```

---

## 📋 Consolidation Process (Step 3)

### Current john_profile.json Structure

**Sections:**
- `metadata`: Personal info, contact, title, availability
- `summary`: Professional overview (27+ years IT experience)
- `ai_projects`: Portfolio of AI/automation projects
- `linkedin_recommendations`: Professional endorsements
- *(Additional sections to be expanded)*

### Consolidation Rules

When a new resume is uploaded to `data_raw/resume/{format}/`:

1. **Parse the file** to extract:
   - Contact information
   - Work experience
   - Skills and certifications
   - Education
   - Notable achievements

2. **Compare with existing** john_profile.json:
   - Merge new information
   - Update `resume_source` to latest file
   - Preserve historical data in versioning

3. **Update john_profile.json** with:
   - Enhanced metadata
   - Updated summary (if significant changes)
   - New experience entries
   - Updated years_experience calculations

### Update Triggers

Consolidation can be triggered by:
- [ ] **Manual**: Call endpoint `/api/consolidate` after uploading resume
- [ ] **Automatic**: File watcher detects new files in `data_raw/resume/`
- [ ] **Portal UI**: User clicks "Update Profile" button after upload
- [ ] **Scheduled**: Daily/weekly batch consolidation job

---

## 🛠️ Implementation Checklist

### Backend Tasks
- [ ] Create file parser utilities (pdf-parse, docx, txt)
- [ ] Build `/api/consolidate` endpoint
- [ ] Implement `src/data/john_profile.json` update logic
- [ ] Add file watcher for auto-consolidation (optional)
- [ ] Error handling & validation

### Frontend Tasks
- [ ] File upload component for resume
- [ ] File upload component for JD
- [ ] "Update Profile" button to trigger consolidation
- [ ] Success/error notifications
- [ ] Display current john_profile.json status

### Data Quality
- [ ] Validate file formats (pdf, docx, txt)
- [ ] Test parsing with all 4 current resumes
- [ ] Verify JSON output format
- [ ] Handle edge cases (corrupted files, encoding issues)

---

## 📝 Naming Conventions

### Resume Files
``` 
Resume_JohnHau_{CompanyName}_{ShortTitle}_{Date}.{ext}

Examples:
Resume_JohnHau_MorganStanley_VPEng_2026.txt
Resume_JohnHau_MorganStanley_VPEng_Mar2026.pdf
Resume_JohnHau_TechCorp_SeniorEng_30Mar2026.docx
```

### Job Description Files
```
JD_{CompanyName}_{JobTitle}_{Date}.{ext}

Examples:
JD_TechCorp_SeniorArchitect_30Mar2026.txt
JD_Google_EngineeringLead_Mar2026.pdf
JD_Meta_VPEng_30Mar2026.docx
```

### Output Files
```
Resume_JohnHau_{CompanyName}_{ShortTitle}_{Date}.{ext}
CoverLetter_JohnHau_{CompanyName}_{ShortTitle}_{Date}.{ext}
```

---

## 🔗 Related Documentation

- **JD Comparison Portal:** `/docs/JD_Comparison_portal.md`
- **Portal Architecture:** Ask Questions / Resume Upload tabs
- **LLM Integration:** Uses Gemini 3.1 Flash Lite + DeepSeek R1 fallback

---

## ✅ Status

**Created:** March 30, 2026  
**Folder Structure:** ✅ Complete  
**Consolidation Logic:** ⏳ Pending Implementation  
**Integration with Portal:** ⏳ Pending
