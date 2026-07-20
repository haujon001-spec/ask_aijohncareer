# 📋 Todo List - March 27, 2026
**Focus: JD Comparison Portal Feasibility Assessment**

---

## 🎯 JD Comparison Portal - Feasibility Study

### Phase 1: Technical Feasibility (Today)
- [ ] **Assess File Parsing Libraries**
  - Evaluate `pdf-parse` npm for PDF extraction
  - Review `docx` npm for Word document parsing
  - Test `.txt` parsing
  - Verify compatibility with existing Node.js 18 environment
  - Estimated effort: 2 hours

- [ ] **Review LLM Prompt Design**
  - Design comparison prompt for Gemini 3.1 Flash Lite
  - Design fall-back prompt for DeepSeek R1
  - Test prompt structure with sample JD + resume
  - Verify JSON response format parsing
  - Estimated effort: 1.5 hours

- [ ] **API Endpoint Architecture**
  - Design `/api/jd/compare` POST endpoint
  - Plan request/response structure
  - Add input validation (file size, type)
  - Estimate: Can reuse existing LLM provider pattern
  - Estimated effort: 1 hour

### Phase 2: UI/UX Design (Tomorrow)
- [ ] **File Upload Component**
  - Design file input UI (drag-and-drop optional)
  - Display file metadata (name, size)
  - Add preview of extracted text
  - Error handling for unsupported formats
  - Estimated effort: 2 hours

- [ ] **Scorecard Component**
  - Design score display (visual gauge or percentage)
  - Layout for strengths/gaps bullet lists
  - Summary paragraph presentation
  - Recommendations section
  - Color-coding for score ranges
  - Estimated effort: 2 hours

- [ ] **Tab Navigation**
  - Add "Job Description Match" as third tab
  - Maintain consistency with existing Ask Questions / Resume Upload tabs
  - Responsive design on mobile
  - Estimated effort: 0.5 hours

### Phase 3: Implementation Planning
- [ ] **Dependency Review**
  - List all required npm packages
  - Check for security vulnerabilities
  - Verify no conflicts with existing packages
  - Estimated effort: 0.5 hours

- [ ] **Soul.md Compliance Check**
  - Verify no API keys exposed
  - Confirm folder structure follows standards
  - Plan file naming conventions
  - Review security guidelines
  - Estimated effort: 1 hour

- [ ] **Integration Points**
  - How to pass resume JSON to comparison engine
  - Hook into existing `useChatEngine.js`
  - Reuse theme/styling system
  - Estimated effort: 1 hour

### Phase 4: Implementation Timeline
- [ ] **Estimate Total Effort**
  - File parsing backend: 3-4 hours
  - API endpoint: 2 hours
  - Frontend components: 4 hours
  - Testing & debugging: 3 hours
  - Total: **12-13 hours** (~2 development days)

- [ ] **Prioritization Decision**
  - High impact? Career fit evaluation is valuable
  - Medium complexity? File parsing is straightforward
  - Recommend: Implement after mobile optimizations stabilize
  - Estimated effort: 0.5 hours (decision)

### Phase 5: Risk Assessment
- [ ] **Potential Issues**
  - File upload size limits (set backend limits)
  - Memory usage for large PDFs (implement streaming?)
  - LLM context length (JD + resume might exceed limits)
  - User data privacy (ensure no file logging)
  - Estimated effort: 1 hour (analysis)

- [ ] **Testing Strategy**
  - Test with 10+ sample JDs from different industries
  - Verify scorecard accuracy
  - Test file upload edge cases
  - Mobile responsiveness testing
  - Estimated effort: 2 hours

---

## 📊 Summary
**Total Estimated Effort:** 2 days of development
**Recommendation:** Green light for implementation
**Next Steps:** Start Phase 1 technical assessment tomorrow morning

---

## 🔗 Reference
**Spec Document:** `/docs/JD_Comparison_portal.md`
**Related Feature:** Resume Upload (existing, can be model for architecture)
