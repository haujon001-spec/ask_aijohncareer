To add a feature on the existing askcareer-ai.com portal .
To follow the soul.md strict rules. 

# 📄 **job-description-matching.md**

```markdown
# Job Description Matching Module  
**AskCareer‑AI — Feature Specification**

## 🎯 Objective
Add a new **Job Description (JD) Upload** capability to the existing AskCareer‑AI web UI.  
Users will upload a `.txt`, `.docx`, or `.pdf` file, and the system will:

1. Extract JD text  
2. Compare it against **John’s resume JSON**  
3. Generate a **match scorecard**  
4. Summarize alignment, strengths, and gaps  

This enables ATS‑style evaluation directly inside the portal.

---

## 🧩 UI Additions

### **New Tab: “Job Description Match”**
Add a third tab to the existing interface:

```
[ Ask Questions ] [ Resume Upload ] [ Job Description Match ]
```

### **Inside the JD Match Tab**
Components required:

- **File Upload Box**
  - Accepts: `.txt`, `.docx`, `.pdf`
  - Shows filename + file size
  - Shows extracted text preview (optional)

- **Button: “Compare with My Resume”**
  - Triggers backend API call

- **Scorecard Panel**
  - Overall Match Score (0–100)
  - Skills Match
  - Leadership Match
  - Technical Match
  - Domain Match
  - Strengths (bullets)
  - Gaps (bullets)
  - Summary (150 words)
  - Recommendations

---

## 🏗️ Backend Architecture

### **1. File Parsing**
Backend extracts text depending on file type:

- `.pdf` → `pdf-parse`
- `.docx` → `docx` npm library
- `.txt` → direct read

Output: clean JD text.

---

### **2. Resume JSON Loader**
Load the existing structured resume JSON:

```json
{
  "experience": [...],
  "skills": [...],
  "achievements": [...],
  "leadership": [...],
  "education": [...],
  "certifications": [...]
}
```

---

### **3. LLM Comparison Engine**
Send both JD text + resume JSON to the model (DeepSeek or Gemini Flash Lite).

**Prompt Structure:**

```
You are an ATS-grade evaluator. Compare the following:

1. Job Description (JD)
2. Candidate Resume (JSON)

Produce:
- Overall Match Score (0–100)
- Skills Match Score
- Leadership Match Score
- Technical Match Score
- Domain Experience Match Score
- Strengths (bullet points)
- Gaps (bullet points)
- Summary (150 words)
- Recommendations
```

---

### **4. Scorecard Response Format**

```json
{
  "overall_score": 87,
  "skills_score": 92,
  "leadership_score": 95,
  "technical_score": 84,
  "domain_score": 78,
  "strengths": [...],
  "gaps": [...],
  "summary": "...",
  "recommendations": "..."
}
```

---

## 🧪 API Endpoint

### **POST `/api/jd/compare`**
Payload:

```json
{
  "jd_text": "extracted JD text...",
  "resume_json": { ... }
}
```

Response: Scorecard JSON (above).

---

## 📊 Rendering the Scorecard
Use your existing UI style:

- Card layout  
- Section headers  
- Color-coded scores  
- Bullet lists  
- Summary paragraph  

---

## 🚀 Future Enhancements (Optional)
- Multi‑JD comparison  
- Role suitability ranking  
- Auto‑rewrite resume to match JD  
- Gap‑filling suggestions  
- Export scorecard as PDF  

---

## 📁 File Placement (Recommended)
```
/docs/job-description-matching.md
/components/JDUpload.tsx
/components/Scorecard.tsx
/pages/api/jd/compare.ts
/lib/parsers/
```


