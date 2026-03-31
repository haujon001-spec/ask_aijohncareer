#!/usr/bin/env python3
"""
All-in-One JD Application Generator
=====================================
Generates three documents from a Job Description + john_profile.json:
  1. JD Match Scorecard  — detailed scoring with gaps, strengths, verdict
  2. Tailored Resume     — ATS-optimised, formatted like MorganStanley template
                          (first 3 companies: 10 bullets each;
                           4th and 5th companies: 8 bullets each)
  3. Cover Letter        — executive-level, role-specific, personalised

Usage:
  python scripts/jd_scorecard_resume.py
      -> uses default JD: data_raw/jd/txt/JD_MandarinOriental_ClusterDirectorOfIT.txt

  python scripts/jd_scorecard_resume.py "path/to/AnotherJD.txt"
      -> uses specified JD file

  python scripts/jd_scorecard_resume.py --scorecard-only
  python scripts/jd_scorecard_resume.py --resume-only
  python scripts/jd_scorecard_resume.py --coverletter-only

LLM selection (add flag, default is sonnet):
  python scripts/jd_scorecard_resume.py --llm=sonnet        (Claude Sonnet 4.6 - smart, OpenRouter)
  python scripts/jd_scorecard_resume.py --llm=deepseek      (DeepSeek R1 - reasoning, DeepSeek API)
  python scripts/jd_scorecard_resume.py --llm=gemini        (Gemini 3.1 Flash Lite - fast/cheap, OpenRouter)

Outputs go to: data_processed/<Employer>/
  ScoreCard/txt/JD_SCORECARD_<Employer>_<DATE>.txt
  resume/txt/JohnHauResume2026_<Employer>_<DATE>.txt
  CoverLetter/txt/JohnHauCoverLetter_<Employer>_<DATE>.txt

Source: src/data/john_profile.json  (single source of truth — no hallucination)
"""

import json
import os
import re
import sys
import requests
from pathlib import Path
from datetime import datetime

# ── Project root (one level up from scripts/) ─────────────────────────────────
ROOT = Path(__file__).resolve().parent.parent

# ── Fixed paths ────────────────────────────────────────────────────────────────
PROFILE_PATH  = ROOT / "src/data/john_profile.json"
TEMPLATE_PATH = ROOT / "data_raw/resume/txt/JohnHauResume2026_MorganStanley.txt"
DEFAULT_JD    = ROOT / "data_raw/jd/txt/JD_MandarinOriental_ClusterDirectorOfIT.txt"

DATE_STAMP    = datetime.now().strftime("%d%b%Y").upper()   # e.g. 31MAR2026

# ── Parse CLI arguments ────────────────────────────────────────────────────────
args = [a for a in sys.argv[1:] if not a.startswith("-")]
flags = [a for a in sys.argv[1:] if a.startswith("-")]

jd_path = Path(args[0]) if args else DEFAULT_JD
if not jd_path.is_absolute():
    jd_path = ROOT / jd_path
if not jd_path.exists():
    sys.exit(f"ERROR: JD file not found: {jd_path}")

run_scorecard    = "--resume-only" not in flags and "--coverletter-only" not in flags
run_resume       = "--scorecard-only" not in flags and "--coverletter-only" not in flags
run_coverletter  = "--scorecard-only" not in flags and "--resume-only" not in flags

# ── LLM selection via --llm=<name> flag ───────────────────────────────────────
llm_flag = next((f for f in flags if f.startswith("--llm=")), "--llm=sonnet")
llm_choice = llm_flag.split("=", 1)[1].lower()   # sonnet | deepseek | gemini

# ── Derive employer slug from JD filename for output naming ───────────────────
jd_stem    = jd_path.stem                               # e.g. JD_MandarinOriental_ClusterDirectorOfIT
jd_parts   = jd_stem.replace("JD_", "").split("_")
employer   = jd_parts[0] if jd_parts else "Employer"   # e.g. MandarinOriental
role_slug  = "_".join(jd_parts[1:]) if len(jd_parts) > 1 else "Role"

# ── Output directories: data_processed/<Employer>/<Type>/txt/ ─────────────────
OUT_BASE          = ROOT / "data_processed" / employer
OUT_DIR_SCORECARD = OUT_BASE / "ScoreCard" / "txt"
OUT_DIR_RESUME    = OUT_BASE / "resume"    / "txt"
OUT_DIR_COVER     = OUT_BASE / "CoverLetter" / "txt"
OUT_SCORECARD     = OUT_DIR_SCORECARD / f"JD_SCORECARD_{employer}_{DATE_STAMP}.txt"
OUT_RESUME        = OUT_DIR_RESUME    / f"JohnHauResume2026_{employer}_{DATE_STAMP}.txt"
OUT_COVERLETTER   = OUT_DIR_COVER     / f"JohnHauCoverLetter_{employer}_{DATE_STAMP}.txt"

# ── Load env (.env.local → .env.vps → .env) — file always wins over stale shell ──
def load_env(path):
    if not path.exists():
        return False
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, _, v = line.partition("=")
            os.environ[k.strip()] = v.strip()
    return True

for env_file in [ROOT / ".env.local", ROOT / ".env.vps", ROOT / ".env"]:
    if load_env(env_file):
        break

# ── Resolve API key and model based on LLM selection ─────────────────────────
LLM_CONFIGS = {
    # name          model_id                                     api_key_env            base_url
    "sonnet":  ("anthropic/claude-sonnet-4.6",              "OPENROUTER_API_KEY",  "https://openrouter.ai/api/v1/chat/completions"),
    "deepseek":("deepseek-reasoner",                        "DEEPSEEK_API_KEY",    "https://api.deepseek.com/chat/completions"),
    "gemini":  ("google/gemini-3.1-flash-lite-preview",     "OPENROUTER_API_KEY",  "https://openrouter.ai/api/v1/chat/completions"),
}

if llm_choice not in LLM_CONFIGS:
    sys.exit(f"ERROR: Unknown --llm value '{llm_choice}'. Valid: sonnet, deepseek, gemini")

MODEL, api_key_env, LLM_ENDPOINT = LLM_CONFIGS[llm_choice]

API_KEY = os.environ.get(api_key_env, "")
if not API_KEY:
    sys.exit(f"ERROR: {api_key_env} not found in .env.local / .env.vps / .env")

HEADERS = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "HTTP-Referer": "https://www.askcareer-ai.com",
    "X-Title": "JD Application Generator - John Hau",
}

# ── Read source files ──────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print("  JD APPLICATION GENERATOR — John Hau")
print(f"{'='*60}")
print(f"  JD File     : {jd_path.name}")
print(f"  Profile     : src/data/john_profile.json")
print(f"  Model       : {MODEL}")
print(f"  API Key     : {API_KEY[:25]}...")
print(f"  Date        : {DATE_STAMP}")
print(f"  LLM         : {llm_choice} ({MODEL})")
print(f"  Generating  : {'Scorecard ' if run_scorecard else ''}{'Resume ' if run_resume else ''}{'CoverLetter' if run_coverletter else ''}")
print(f"{'='*60}\n")

print("📂  Reading source files...")
jd_text      = jd_path.read_text(encoding="utf-8")
profile_raw  = json.loads(PROFILE_PATH.read_text(encoding="utf-8"))
template_txt = TEMPLATE_PATH.read_text(encoding="utf-8")

# Unwrap nested "profile" key if present
profile = profile_raw.get("profile", profile_raw)

# Build a compact profile context — metadata + summary + experience + achievements
# Stays within ~12K chars to avoid token overrun while keeping all key facts
def build_profile_context(profile):
    sections = {}
    for key in ["metadata", "summary", "professional_experience", "major_achievements",
                "ai_projects", "core_competencies", "technical_skills",
                "education_certifications", "languages_spoken"]:
        if key in profile:
            sections[key] = profile[key]
    return json.dumps(sections, indent=2, ensure_ascii=False)[:14000]

profile_context = build_profile_context(profile)

# ── LLM call helper ────────────────────────────────────────────────────────────
def call_llm(system_prompt, user_prompt, max_tokens=6000, label=""):
    if label:
        print(f"  ↳ Calling OpenRouter ({MODEL}) — {label}")
    payload = {
        "model": MODEL,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt},
        ],
    }
    resp = requests.post(
        LLM_ENDPOINT,
        headers=HEADERS,
        json=payload,
        timeout=180,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]

# ══════════════════════════════════════════════════════════════════════════════
# TASK 1 — JD SCORECARD
# ══════════════════════════════════════════════════════════════════════════════
scorecard_text = ""
if run_scorecard:
    print("🔍  [1/3] Generating JD Scorecard...")

    SCORECARD_SYS = (
        "You are an expert executive recruiter and talent analyst. "
        "Produce a detailed, honest, structured scorecard comparing the candidate to the JD. "
        "Be evidence-based and professional. Never invent facts not present in the profile data. "
        "Use plain text with clear section headers. Score each criterion out of 10."
    )

    SCORECARD_USER = f"""
=== JOB DESCRIPTION ===
{jd_text}

=== CANDIDATE PROFILE (source of truth — do not invent facts outside this data) ===
{profile_context}

=== INSTRUCTIONS ===
Produce a comprehensive JD Match Scorecard with ALL of these sections:

1. ROLE & COMPANY SUMMARY
   Brief overview of the role and what the employer is seeking (3-4 sentences).

2. OVERALL MATCH SCORE
   Format:  XX/100 — [STRONG MATCH / GOOD MATCH / PARTIAL MATCH / WEAK MATCH]
   Followed by one honest paragraph verdict.

3. SCORING CRITERIA  (score each out of 10, with Evidence and Gap sub-bullets)
   a) Technology Leadership & Strategy
   b) IT Operations Management (budget, governance, standards)
   c) Infrastructure & Network Management
   d) Cybersecurity & Compliance (PCI DSS, audits, risk management)
   e) Industry Experience (hospitality / hotel sector)
   f) Vendor & Contract Management
   g) Team Leadership & People Development
   h) Project & Programme Management (IT transformations, capital planning)
   i) Audio Visual Technology
   j) Years of Experience vs Minimum Required
   k) Education & Certifications
   l) Communication & Interpersonal Skills

4. KEY STRENGTHS
   Bullet list — what clearly matches or exceeds the JD requirements.

5. GAPS & RISKS
   Honest, specific gaps between the candidate profile and JD expectations.

6. TAILORING RECOMMENDATIONS
   a) Resume adjustments — specific wording and framing suggestions
   b) Interview preparation — topics to research, answers to rehearse
   c) Certifications to pursue — quick wins before applying

7. VERDICT
   Should the candidate apply? Competitive positioning. Recommended approach.
"""

    scorecard_text = call_llm(SCORECARD_SYS, SCORECARD_USER, max_tokens=6000, label="Scorecard")
    print("  ✓  Scorecard complete")

# ══════════════════════════════════════════════════════════════════════════════
# TASK 2 — TAILORED RESUME
# ══════════════════════════════════════════════════════════════════════════════
resume_text = ""
if run_resume:
    print("📝  [2/3] Generating Tailored Resume...")

    RESUME_SYS = (
        "You are a professional executive resume writer specialising in senior IT leadership roles. "
        "Rules you MUST follow:\n"
        "1. ALL facts, figures, dates, and claims come ONLY from the candidate profile — never invent or embellish.\n"
        "2. Mirror the reference template layout EXACTLY: same section headers, same ___ separators, same bullet style.\n"
        "3. Tailor bullet wording to echo the JD language without distorting facts.\n"
        "4. Output ONLY the resume text — no preamble, no explanation, no markdown code fences."
    )

    RESUME_USER = f"""
=== REFERENCE RESUME TEMPLATE (replicate this layout exactly) ===
{template_txt}

=== JOB DESCRIPTION (tailor content for this role) ===
{jd_text}

=== CANDIDATE PROFILE (single source of truth — all facts from here only) ===
{profile_context}

=== INSTRUCTIONS ===
Write a complete tailored resume for John Hau targeting the role above.

Layout rules:
- Keep the identical header format, ________ separators, and bullet style from the reference template
- Replace the Professional Summary to foreground: cluster/multi-property IT leadership, operational excellence,
  cybersecurity & compliance, budget governance, vendor management, guest-facing technology, digital transformation
- Add a "HOTEL & HOSPITALITY RELEVANCE" section immediately before PROFESSIONAL EXPERIENCE, bridging
  John's enterprise experience to hospitality IT context using only facts from the profile
- BULLET COUNT RULES (non-negotiable):
    * 1st company (most recent):  exactly 10 bullets
    * 2nd company:                exactly 10 bullets
    * 3rd company:                exactly 10 bullets
    * 4th company:                exactly 8 bullets
    * 5th company:                exactly 8 bullets
    * Any earlier roles:          3-4 bullets combined
- Choose the bullets most relevant to the JD — reword to echo JD language without distorting facts
- Keep EDUCATION & CERTIFICATIONS, LANGUAGES, and AVAILABILITY sections unchanged from profile data
- Total length: equivalent to the reference template (~2 pages of content)
"""

    resume_text = call_llm(RESUME_SYS, RESUME_USER, max_tokens=4500, label="Resume")
    print("  ✓  Resume complete")

# ══════════════════════════════════════════════════════════════════════════════
# TASK 3 — COVER LETTER
# ══════════════════════════════════════════════════════════════════════════════
coverletter_text = ""
if run_coverletter:
    print("✉️   [3/3] Generating Cover Letter...")

    # Extract contact details from profile metadata for the letter header
    meta     = profile.get("metadata", {})
    name     = meta.get("name", "John Hau")
    location = meta.get("location", "Hong Kong SAR")
    phone    = meta.get("phone", "+852 5722 2007")
    email    = meta.get("email", "haujon001@gmail.com")
    linkedin = meta.get("linkedin", "linkedin.com/in/johnhau")
    today    = datetime.now().strftime("%d %B %Y")

    COVERLETTER_SYS = (
        "You are a professional executive cover letter writer with deep expertise in luxury hospitality "
        "and senior technology leadership roles. "
        "Rules:\n"
        "1. ALL claims and achievements must come ONLY from the candidate profile data provided — no fabrication.\n"
        "2. Write in first person, confident executive tone, not generic or templated.\n"
        "3. The letter must be 4-5 substantive paragraphs:\n"
        "   Para 1 — Why this role at this company (show genuine knowledge of Mandarin Oriental).\n"
        "   Para 2 — Most relevant leadership & operational experience (quantified from profile).\n"
        "   Para 3 — How enterprise IT background translates to hospitality IT (bridge the gap).\n"
        "   Para 4 — Digital innovation and AI capability as competitive differentiator.\n"
        "   Para 5 — Closing: call to action, enthusiasm, availability.\n"
        "4. Do NOT use generic phrases like 'I am writing to apply for'. Open with impact.\n"
        "5. Output ONLY the cover letter text — no preamble, no commentary."
    )

    # Derive employer display name from employer slug (e.g. MandarinOriental -> Mandarin Oriental)
    import re as _re
    employer_display = _re.sub(r'(?<=[a-z])(?=[A-Z])', ' ', employer)  # CamelCase -> spaced
    role_display     = role_slug.replace('_', ' ')                      # slug -> readable

    COVERLETTER_USER = f"""
=== JOB DESCRIPTION ===
{jd_text}

=== CANDIDATE PROFILE (single source of truth — all facts from here only) ===
{profile_context}

=== LETTER HEADER DETAILS ===
Name     : {name}
Location : {location}
Phone    : {phone}
Email    : {email}
LinkedIn : {linkedin}
Date     : {today}
Hiring Company : {employer_display}
Role     : {role_display}

=== INSTRUCTIONS ===
Write a formal executive cover letter for John Hau applying for the {role_display} role
at {employer_display}.

Structure:
- Letter header block (candidate contact details, date, company)
- Salutation: Dear Hiring Manager,
- 4-5 focused paragraphs as described in the system instructions
- Professional sign-off

Key themes to hit (using only profile facts):
- Multi-property / cluster IT leadership mindset (HK, SG, AU experience at Edge Tech / BoA)
- 27+ years at tier-1 institutions with zero-downtime, high-availability technology delivery
- Compliance track record (HKMA, ISO 27001, SFC EDSP, financial-grade security)
- Budget governance and OPEX savings (US$1.4M at Morgan Stanley, HK$3.5M at AIA)
- Team building and talent development across APAC
- AI/automation innovation as unique differentiator for a luxury brand seeking digital edge
- Immediate availability, Hong Kong-based, Cantonese-speaking
"""

    coverletter_text = call_llm(COVERLETTER_SYS, COVERLETTER_USER, max_tokens=2500, label="Cover Letter")
    print("  ✓  Cover Letter complete")

# ══════════════════════════════════════════════════════════════════════════════
# WRITE OUTPUT FILES
# ══════════════════════════════════════════════════════════════════════════════
# Create all output dirs (txt only — docx/pdf require separate conversion)
for d in [OUT_DIR_SCORECARD, OUT_DIR_RESUME, OUT_DIR_COVER]:
    d.mkdir(parents=True, exist_ok=True)
# Ensure sibling docx/pdf dirs also exist for future use
for subtype in ["ScoreCard", "resume", "CoverLetter"]:
    for fmt in ["docx", "pdf"]:
        (OUT_BASE / subtype / fmt).mkdir(parents=True, exist_ok=True)

generated_at = datetime.now().strftime("%Y-%m-%d %H:%M")
print("\n💾  Writing output files...")

if run_scorecard and scorecard_text:
    header = (
        f"JD MATCH SCORECARD — {employer.upper()} | {role_slug.upper()}\n"
        f"Generated : {generated_at}  |  Model: {MODEL}\n"
        f"Source JD : {jd_path.name}\n"
        f"Profile   : src/data/john_profile.json\n"
        f"Candidate : John Hau\n"
        + "=" * 72 + "\n\n"
    )
    OUT_SCORECARD.write_text(header + scorecard_text, encoding="utf-8")
    print(f"  ✅  Scorecard   → {OUT_SCORECARD.relative_to(ROOT)}")

if run_resume and resume_text:
    resume_header = (
        f"TAILORED RESUME — {employer.upper()}\n"
        f"Generated : {generated_at}  |  Model: {MODEL}\n"
        f"Profile   : src/data/john_profile.json\n"
        + "=" * 72 + "\n\n"
    )
    OUT_RESUME.write_text(resume_header + resume_text, encoding="utf-8")
    print(f"  ✅  Resume      → {OUT_RESUME.relative_to(ROOT)}")

if run_coverletter and coverletter_text:
    cl_header = (
        f"COVER LETTER — {employer.upper()} | {role_slug.upper()}\n"
        f"Generated : {generated_at}  |  Model: {MODEL}\n"
        f"Profile   : src/data/john_profile.json\n"
        + "=" * 72 + "\n\n"
    )
    OUT_COVERLETTER.write_text(cl_header + coverletter_text, encoding="utf-8")
    print(f"  ✅  Cover Letter → {OUT_COVERLETTER.relative_to(ROOT)}")

print(f"\n  Output folder: data_processed/{employer}/")

print(f"\n{'='*60}")
print("  ALL DONE")
print(f"{'='*60}")
print(f"\n  How to run this script:")
print(f"  python scripts/jd_scorecard_resume.py")
print(f"  python scripts/jd_scorecard_resume.py \"data_raw/jd/txt/AnotherJD.txt\"")
print(f"  python scripts/jd_scorecard_resume.py --scorecard-only")
print(f"  python scripts/jd_scorecard_resume.py --resume-only")
print(f"  python scripts/jd_scorecard_resume.py --coverletter-only")
print(f"  python scripts/jd_scorecard_resume.py --llm=sonnet    (default, Claude Sonnet 4.6)")
print(f"  python scripts/jd_scorecard_resume.py --llm=deepseek  (DeepSeek R1)")
print(f"  python scripts/jd_scorecard_resume.py --llm=gemini    (Gemini Flash Lite - cheaper)")
