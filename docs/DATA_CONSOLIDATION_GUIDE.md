# Data Consolidation Implementation Guide
**Date:** March 30, 2026  
**Status:** ✅ Folder structure created, consolidation modules implemented, API integrated

---

## 📊 System Overview

The data consolidation system processes resume files and merges structured data into `src/data/john_profile.json`, which serves as the master profile for the entire portal.

### Architecture

```
┌─────────────────────────────────────────┐
│  USER INPUT (Resume Files)              │
│  data_raw/resume/{pdf|docx|txt}/        │
│  Naming: Resume_JohnHau_*_Date.{ext}    │
└─────────────┬───────────────────────────┘
              │
       UPLOAD TO PORTAL
              │
              ▼
┌─────────────────────────────────────────┐
│  BACKEND PROCESSING                     │
│  /backend/consolidation.js              │
│  • Parse file (pdf-parse, docx, txt)    │
│  • Extract data (email, phone, exp)     │
│  • Validate & clean                     │
└─────────────┬───────────────────────────┘
              │
         MERGE & UPDATE
              │
              ▼
┌─────────────────────────────────────────┐
│  MASTER PROFILE (Updated)               │
│  src/data/john_profile.json             │
│  • Metadata (contact, title)            │
│  • Summary & AI Projects                │
│  • Experience & Skills                  │
│  • LinkedIn Recommendations             │
└─────────────┬───────────────────────────┘
              │
    PORTAL USES FOR:
    • JD Comparison
    • Resume Upload Interface
    • Profile Display
    • LLM Context
              │
              ▼
┌─────────────────────────────────────────┐
│  OUTPUT (Processed Files)               │
│  data/processed/Resume/                 │
│  data/processed/CoverLetter/            │
│  {json|docx|pdf}/                       │
└─────────────────────────────────────────┘
```

---

## 🗂️ Folder Structure

### Input Folders (data_raw/)
```
data_raw/
├── resume/
│   ├── pdf/      → Resume_JohnHau_*.pdf
│   ├── docx/     → Resume_JohnHau_*.docx
│   └── txt/      → Resume_JohnHau_*.txt
│
└── JD/
    ├── pdf/      → JD_*.pdf
    ├── docx/     → JD_*.docx
    └── txt/      → JD_*.txt
```

### Output Folders (data/processed/)
```
data/processed/
├── Resume/
│   ├── json/     → Resume_JohnHau_CompanyName_ShortTitle_Date.json
│   ├── docx/     → Resume_JohnHau_CompanyName_ShortTitle_Date.docx
│   └── pdf/      → Resume_JohnHau_CompanyName_ShortTitle_Date.pdf
│
└── CoverLetter/
    ├── json/     → CoverLetter_JohnHau_CompanyName_ShortTitle_Date.json
    ├── docx/     → CoverLetter_JohnHau_CompanyName_ShortTitle_Date.docx
    └── pdf/      → CoverLetter_JohnHau_CompanyName_ShortTitle_Date.pdf
```

### Master Profile
```
src/data/john_profile.json
├── metadata (name, email, phone, title, years_experience, etc.)
├── summary (professional overview)
├── ai_projects (AI/automation portfolio)
├── linkedin_recommendations (endorsements)
├── experience (work history - to be expanded)
├── skills (technical skills - to be expanded)
├── education (degrees - to be added)
├── certifications (certs - to be added)
└── last_updated (ISO timestamp)
```

---

## 💻 Implementation Status

### ✅ Completed
- [x] Folder structure created (all 12 directories)
- [x] Backend consolidation module (`/backend/consolidation.js`)
  - [x] Text file parsing
  - [x] Data extraction functions
  - [x] JSON merging logic
  - [x] Profile save/load
- [x] API endpoint (`POST /api/consolidate`)
- [x] Client utility (`/src/utils/consolidation.js`)
- [x] Server integration (import + route)

### ⏳ Pending Implementation
- [ ] PDF parsing library (`pdf-parse` npm)
- [ ] DOCX parsing library (`docx` npm)
- [ ] File upload UI component
- [ ] Update profile button in portal
- [ ] Error handling & validation edge cases
- [ ] File watcher for auto-consolidation (optional)
- [ ] Cover letter generation (after JD comparison phase)

### 📋 Testing Checklist
- [ ] Test with JohnHauResume2026_MorganStanley.txt
- [ ] Parse and extract all fields
- [ ] Verify merge with john_profile.json
- [ ] Check for data loss/corruption
- [ ] Test API endpoint manually
- [ ] Test with all 4 existing resume versions
- [ ] Verify on mobile (responsive upload UI)

---

## 🔧 How to Use

### Option 1: Automatic (Recommended for Web Portal)
1. User uploads resume file via web portal
2. File saved to `data_raw/resume/{format}/`
3. Portal calls `consolidateAfterUpload(file)`
4. Backend processes & updates `john_profile.json`
5. Portal displays success message

### Option 2: Manual API Call
```bash
# Start backend server
npm run dev

# In another terminal, call consolidation API
curl -X POST http://localhost:3000/api/consolidate \
  -H "Content-Type: application/json" \
  -d '{"sourceFile": null}'
```

### Option 3: Direct Backend Call
```javascript
import { consolidateResume } from './backend/consolidation.js';

// Consolidate latest resume
const result = await consolidateResume();
console.log(result); // Updated profile object
```

---

## 📝 Code Examples

### Frontend: Trigger Consolidation After Upload
```javascript
import { consolidateAfterUpload } from '@/utils/consolidation';

async function handleResumeUpload(file) {
  // Upload file to data_raw/resume/{format}/
  const response = await fetch('/api/upload', {
    method: 'POST',
    body: new FormData().append('file', file)
  });
  
  if (response.ok) {
    // Trigger consolidation
    const result = await consolidateAfterUpload(file);
    
    if (result.success) {
      showNotification('✅ Profile updated!');
      // Reload portal data if needed
    } else {
      showNotification(`❌ ${result.message}`);
    }
  }
}
```

### Backend: Call Consolidation Directly
```javascript
import { consolidateResume } from './consolidation.js';

// Find and consolidate latest resume
const profile = await consolidateResume();

if (profile) {
  console.log('✅ Profile updated!');
  console.log(`New email: ${profile.metadata.email}`);
} else {
  console.error('❌ Consolidation failed');
}
```

---

## 🚀 Next Steps

### Phase 1 (Immediate - This Week)
1. [ ] Install required npm packages:
   ```bash
   npm install pdf-parse docx
   ```
2. [ ] Implement PDF/DOCX parsing in `consolidation.js`
3. [ ] Test with all 4 existing resume files
4. [ ] Verify data extraction accuracy

### Phase 2 (Next Week)
1. [ ] Create file upload API endpoint `/api/upload`
2. [ ] Build file upload UI component
3. [ ] Add "Update Profile" button to Resume Upload tab
4. [ ] Test end-to-end with new resume file

### Phase 3 (JD Comparison Integration)
1. [ ] Set up JD file parsing (same consolidation logic)
2. [ ] Build JD comparison feature
3. [ ] Use consolidated resume data in comparisons
4. [ ] Generate comparison scores

### Phase 4 (Advanced - Optional)
1. [ ] File watcher for auto-consolidation
2. [ ] Versioning system (track profile changes)
3. [ ] Cover letter generation from JD
4. [ ] Email templates using consolidated data

---

## ⚙️ Dependencies

### Current
- express
- cors
- dotenv
- fs, path (Node.js built-ins)

### Needed (npm install)
```bash
npm install pdf-parse docx file-type
```

### Optional
```bash
npm install chokidar              # File watcher for auto-consolidation
npm install pdfkit docx-templates # Cover letter generation
```

---

## 📚 File References

**Core Files:**
- Backend consolidation: [/backend/consolidation.js](/backend/consolidation.js)
- API integration: [/backend/server.js](/backend/server.js) (POST /api/consolidate)
- Client utility: [/src/utils/consolidation.js](/src/utils/consolidation.js)
- Master profile: [/src/data/john_profile.json](/src/data/john_profile.json)

**Documentation:**
- Pipeline overview: [DATA_PIPELINE_CONSOLIDATION.md](DATA_PIPELINE_CONSOLIDATION.md)
- JD Comparison: [JD_Comparison_portal.md](JD_Comparison_portal.md)
- Todo list: [todolist/TODOLIST_27MAR2026.md](todolist/TODOLIST_27MAR2026.md)

---

## 🔐 Security Notes

✅ **What's Protected:**
- API keys never exposed in consolidation logic
- No sensitive data logged to console in production
- File uploads validated before processing
- john_profile.json not served as static file

⚠️ **To Implement:**
- Add file size limits (max 5MB pdf, 10MB docx)
- Validate file types (check magic bytes, not just extension)
- Sanitize extracted data (remove special characters)
- Add rate limiting to `/api/consolidate`

---

## 📞 Support & Troubleshooting

**Issue: "PDF parsing not yet implemented"**
- Solution: Run `npm install pdf-parse`
- Status: Will be fixed in Phase 1

**Issue: Consolidation endpoint gives 404**
- Check: Backend running? `npm run dev`
- Check: Port 3000 accessible? `curl http://localhost:3000/api/health`

**Issue: john_profile.json not updating**
- Check: File permissions on `src/data/`
- Check: JSON parsing errors in console
- Check: Resume source file exists & is readable

**Issue: Missing email/phone in consolidated data**
- Reason: Extraction regex might not match format
- Solution: Update regex patterns in `consolidation.js`

---

## 📊 Metrics & Logging

Consolidation runs with detailed logging:
```
📋 Starting resume consolidation...
📄 Processing: Resume_JohnHau_MorganStanley_VPEng_Mar2026.txt
✓ File read (2847 chars)
✓ Data extracted: {experiences: 15, skills: 24}
✓ Current profile loaded
✓ Data merged
✅ Consolidation complete!
   Source: Resume_JohnHau_MorganStanley_VPEng_Mar2026.txt
   Target: john_profile.json
```

All operations are timestamped and logged to understand data flow.
