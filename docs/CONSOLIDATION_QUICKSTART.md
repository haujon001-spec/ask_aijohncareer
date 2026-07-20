# 🚀 Consolidation Quick Start
**Last Updated:** March 30, 2026

---

## ⚡ Quick Commands

### Test Consolidation (Manual)
```bash
# Activate Python environment
.\.venv\Scripts\Activate.ps1

# Or test with Node directly
cd backend
node -e "import('./consolidation.js').then(m => m.consolidateResume())"
```

### API Call
```bash
# Consolidate latest resume
curl -X POST http://localhost:3000/api/consolidate \
  -H "Content-Type: application/json" \
  -d '{}'
  
# Specify source file
curl -X POST http://localhost:3000/api/consolidate \
  -H "Content-Type: application/json" \
  -d '{"sourceFile": "data_raw/resume/txt/Resume_JohnHau_2026.txt"}'
```

---

## 📁 File Locations

| Purpose | Location | Naming Convention |
|---------|----------|-------------------|
| **Input Resumes** | `data_raw/resume/{pdf\|docx\|txt}/` | `Resume_JohnHau_CompanyName_Title_Date.ext` |
| **Input Job Descriptions** | `data_raw/JD/{pdf\|docx\|txt}/` | `JD_CompanyName_JobTitle_Date.ext` |
| **Master Profile** | `src/data/john_profile.json` | (auto-generated) |
| **Processed Resumes** | `data/processed/Resume/{json\|docx\|pdf}/` | `Resume_JohnHau_CompanyName_Title_Date.ext` |
| **Processed Cover Letters** | `data/processed/CoverLetter/{json\|docx\|pdf}/` | `CoverLetter_JohnHau_CompanyName_Title_Date.ext` |

---

## 🔄 How It Works

```
Upload Resume File
    ↓
Save to data_raw/resume/{format}/
    ↓
Call consolidateResume() or POST /api/consolidate
    ↓
Parse & Extract (email, phone, experience, skills)
    ↓
Merge with existing john_profile.json
    ↓
Save updated profile
    ↓
✅ Portal has latest resume data
```

---

## 📋 Consolidation Checklist

When adding a new resume version:

- [ ] Save to: `data_raw/resume/{pdf|docx|txt}/`
- [ ] Use naming: `Resume_JohnHau_{Company}_{Title}_{Date}.{ext}`
- [ ] Call consolidation: `POST /api/consolidate`
- [ ] Check logs for errors
- [ ] Verify `src/data/john_profile.json` updated
- [ ] Check latest_updated timestamp

---

## 🧪 Testing Files

**Available Test Resumes:**
- `JohnHauResume2017.txt`
- `JohnHauResume2020.txt`
- `JohnHauResume2023.txt`
- `JohnHauResume2026_MorganStanley.txt` ← Current

To test with these:
```bash
# Copy to new input folder
Copy-Item data_raw/JohnHauResume2026_MorganStanley.txt `
  data_raw/resume/txt/Resume_JohnHau_MorganStanley_VPEng_30Mar2026.txt

# Trigger consolidation
curl -X POST http://localhost:3000/api/consolidate ...
```

---

## ✅ What Gets Consolidated

```javascript
john_profile.json will include:
├── metadata
│   ├── name ← extracted from resume
│   ├── email ← extracted from resume
│   ├── phone ← extracted from resume
│   ├── resume_source ← filename
│   └── last_updated ← timestamp
│
├── experience ← extracted work history
├── skills ← extracted skills list
├── education ← extracted degrees
├── certifications ← extracted certs
│
└── (preserved from previous)
    ├── summary
    ├── ai_projects
    └── linkedin_recommendations
```

---

## ⚠️ Troubleshooting

| Error | Solution |
|-------|----------|
| "No resume files found" | Place file in `data_raw/resume/{pdf\|docx\|txt}/` |
| "PDF parsing not implemented" | `npm install pdf-parse` |
| "DOCX parsing not implemented" | `npm install docx` |
| "Failed to load current profile" | Check `src/data/john_profile.json` exists |
| "Failed to save profile" | Check folder permissions on `src/data/` |
| 404 on /api/consolidate | Ensure backend running: `npm run dev` |

---

## 🔗 See Also

- [DATA_CONSOLIDATION_GUIDE.md](DATA_CONSOLIDATION_GUIDE.md) - Full implementation guide
- [DATA_PIPELINE_CONSOLIDATION.md](DATA_PIPELINE_CONSOLIDATION.md) - Pipeline overview
- [JD_Comparison_portal.md](JD_Comparison_portal.md) - Portal features
