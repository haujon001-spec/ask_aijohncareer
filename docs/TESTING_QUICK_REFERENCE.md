# ⚡ Testing Quick Reference Card
**Print this or bookmark it!**

---

## 🎯 The 4 Tests (Copy & Paste Commands)

### 1️⃣ BACKUP & CONSOLIDATION TEST
```bash
cd scripts
node test_consolidation.js
```
**What it does:** Creates backup, tests resume parsing, updates john_profile.json  
**Success:** Exit code 0, "✅ TEST RESULTS" shown

---

### 2️⃣ JD COMPARISON TEST
```bash
cd scripts
node test_jd_comparison.js latest
```
**What it does:** Analyzes job description, calculates match score (0-100)  
**Success:** Shows "📊 Match Score: XX.X / 100"

---

### 3️⃣ SCORECARD GENERATION TEST
```bash
cd scripts
node test_generate_scorecard.js
node test_generate_scorecard.js json
node test_generate_scorecard.js html
```
**What it does:** Creates detailed matching reports (text, JSON, HTML)  
**Success:** Files created in `data/processed/Resume/`

---

### 4️⃣ RESUME GENERATION TEST
```bash
cd scripts
node test_generate_resume.js
node test_generate_resume.js latest html
node test_generate_resume.js json
```
**What it does:** Creates customized resumes (text, HTML, JSON)  
**Success:** Files created in `data/processed/Resume/`

---

## 🚀 Run Full Test Suite (5 mins)

```bash
# Copy test resume
Copy-Item data_raw\JohnHauResume2026_MorganStanley.txt `
  data_raw\resume\txt\Resume_JohnHau_Test_30Mar2026.txt

# Run tests
cd scripts
node test_consolidation.js
node test_jd_comparison.js latest
node test_generate_scorecard.js
node test_generate_scorecard.js json
node test_generate_scorecard.js html
node test_generate_resume.js
```

**Expected Result:** All exit code 0 ✅

---

## 📁 Key Folders

| Folder | Purpose | Read/Write |
|--------|---------|-----------|
| `backup/` | Backups (timestamped) | Write |
| `data_raw/resume/txt/` | Test resumes | Read |
| `data_raw/JD/txt/` | Job descriptions | Read |
| `data/processed/Resume/` | Generated outputs | Write |
| `src/data/` | john_profile.json | Read/Write |

---

## 🔧 Useful Commands

### Create Backup
```bash
node test_consolidation.js
```

### Restore Backup
```bash
node test_consolidation.js restore
```

### List All Backups
```bash
node test_consolidation.js list-backups
```

### List JD Files
```bash
node test_jd_comparison.js list
```

### Get Help
```bash
node test_*.js help
```

### Debug Mode
```bash
node test_consolidation.js debug
```

---

## ✅ Success Signs

```
✅ Backup created       → backup-*.json file in backup/
✅ Consolidation works  → john_profile.json updated
✅ JD comparison works  → "Match Score: XX.X / 100" shown
✅ Scorecard works      → Files in data/processed/Resume/
✅ Resume works         → Files in data/processed/Resume/
```

---

## ❌ Troubleshooting

| Problem | Fix |
|---------|-----|
| "Profile not found" | Check `src/data/john_profile.json` exists |
| "No resume files" | Copy to `data_raw/resume/txt/` |
| "No JD files" | Create test JD in `data_raw/JD/txt/` |
| Exit code 1 | Check console error message |
| Backup failed | Check `backup/` folder permissions |

---

## 📊 Expected Outputs

### After Consolidation
```
✅ john_profile.json updated
✅ backup/backup-*.json created
✅ Metadata extracted (email, phone)
```

### After JD Comparison
```
📊 Match Score: 75.3 / 100
✅ GOOD MATCH
```

### After Scorecard Generation
```
data/processed/Resume/
├── Scorecard_*.txt
├── Scorecard_*.json
└── Scorecard_*.html
```

### After Resume Generation
```
data/processed/Resume/
├── Resume_*.txt
├── Resume_*.html
└── Resume_*.json
```

---

## 📒 Test Summary Form

```
Date: _________
Tester: _________

Test 1 - Consolidation:    [ ] PASS [ ] FAIL
Test 2 - JD Comparison:    [ ] PASS [ ] FAIL
Test 3 - Scorecard:        [ ] PASS [ ] FAIL
Test 4 - Resume:           [ ] PASS [ ] FAIL

All tests passed? [ ] YES  [ ] NO
Ready for portal? [ ] YES  [ ] NO

Issues found: _______________________
_____________________________________
```

---

## 🎯 Test Frequency

- **Daily:** Before making any changes
- **Before Deployment:** Full test suite
- **After Updates:** Verify no regression
- **Weekly:** Cleanup old backups

---

## 📞 Support

**For detailed guide:** See `docs/TESTING_WORKFLOW.md`  
**For QA checklist:** See `docs/TESTING_AND_QA_GUIDE.md`  
**For architecture:** See `docs/DATA_CONSOLIDATION_GUIDE.md`

---

## ⚡ One-Liner Test Suite

Run this to test everything at once:

```bash
cd scripts && \
node test_consolidation.js && \
node test_jd_comparison.js latest && \
node test_generate_scorecard.js && \
node test_generate_resume.js && \
echo "✅ ALL TESTS PASSED" || echo "❌ SOME TESTS FAILED"
```

---

## 💡 Pro Tips

1. **Always check exit code:** `$LASTEXITCODE` (PowerShell)
2. **Keep recent backups:** Run `node test_consolidation.js list-backups`
3. **Review HTML output:** Open in browser for formatted view
4. **Check timestamps:** Verify last_updated in john_profile.json
5. **Test with multiple files:** Copy different resumes to test/

---

**Save this card. Reference it while testing. Success! 🚀**
