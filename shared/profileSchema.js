// Single source of truth describing the shape of the 13 top-level
// `profile.*` sections in src/data/john_profile.json. Imported by both the
// backend (profileOps.js validation, llmClient.js prompt construction) and
// the frontend (ProfileEditForm.jsx's schema-driven sub-editors) so the two
// never drift apart.

export const SECTION_KEYS = [
  'metadata',
  'summary',
  'ai_projects',
  'linkedin_recommendations',
  'major_achievements',
  'professional_experience',
  'core_competencies',
  'technical_skills',
  'languages_spoken',
  'education_certifications',
  'soft_skills',
  'languages',
  'key_topics_for_qa',
];

// metadata, summary: too risky for an LLM to safely append to (contact info,
// tenure math, holistic narrative). linkedin_recommendations: a personal
// resume can never ground a third-party recommendation quote — excluding it
// here is itself part of the anti-hallucination design, not just scoping.
export const LLM_PROPOSABLE_SECTIONS = SECTION_KEYS.filter(
  (k) => !['metadata', 'summary', 'linkedin_recommendations'].includes(k)
);

export const SECTION_SCHEMAS = {
  metadata: {
    kind: 'object',
    label: 'Metadata',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'email', label: 'Email', type: 'text' },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'linkedin', label: 'LinkedIn', type: 'text' },
      { key: 'availability', label: 'Availability', type: 'text' },
      { key: 'years_experience', label: 'Years Experience', type: 'number' },
    ],
    // resume_source, resume_sources, experience_timeline, last_backfilled are
    // maintained by scripts/update_profile_from_resume.py — rendered
    // read-only in the editor, never emitted as an op.
    readonlyFields: ['resume_source', 'resume_sources', 'experience_timeline', 'last_backfilled'],
  },
  summary: {
    kind: 'text',
    label: 'Professional Summary',
  },
  ai_projects: {
    kind: 'objectArray',
    label: 'AI Projects',
    identityFields: ['title'],
    fields: [
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'url', label: 'URL', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'tech_stack', label: 'Tech Stack', type: 'stringArray' },
      { key: 'key_features', label: 'Key Features', type: 'stringArray' },
      { key: 'impact', label: 'Impact', type: 'textarea' },
    ],
  },
  linkedin_recommendations: {
    kind: 'objectArray',
    label: 'LinkedIn Recommendations',
    identityFields: ['recommender_name', 'recommender_company'],
    fields: [
      { key: 'rank', label: 'Rank', type: 'number' },
      { key: 'recommender_name', label: 'Recommender Name', type: 'text', required: true },
      { key: 'recommender_title', label: 'Recommender Title', type: 'text' },
      { key: 'recommender_company', label: 'Recommender Company', type: 'text', required: true },
      { key: 'location', label: 'Location', type: 'text' },
      { key: 'relationship', label: 'Relationship', type: 'text' },
      { key: 'date', label: 'Date', type: 'text' },
      { key: 'recommendation', label: 'Recommendation Text', type: 'textarea' },
    ],
  },
  major_achievements: {
    kind: 'objectArray',
    label: 'Major Achievements',
    identityFields: ['achievement', 'company'],
    fields: [
      { key: 'achievement', label: 'Achievement', type: 'text', required: true },
      { key: 'company', label: 'Company', type: 'text', required: true },
    ],
    // Every other field varies per entry (scale, impact, metric, cost_savings,
    // duration, fte_saved, hours_saved, improvement, tech, count, adoption,
    // security, coverage, savings, sla_compliance, method, ...) — rendered as
    // a repeatable key/value row editor instead of a fixed field list.
    dynamicMetrics: true,
  },
  professional_experience: {
    kind: 'objectArray',
    label: 'Professional Experience',
    identityFields: ['company', 'title', 'period'],
    fields: [
      { key: 'company', label: 'Company', type: 'text', required: true },
      { key: 'title', label: 'Title', type: 'text', required: true },
      { key: 'period', label: 'Period', type: 'text', required: true },
      { key: 'scope', label: 'Scope', type: 'textarea' },
      { key: 'highlights', label: 'Highlights', type: 'stringArray' },
    ],
  },
  core_competencies: {
    kind: 'categoryMap',
    label: 'Core Competencies',
  },
  technical_skills: {
    kind: 'stringArray',
    label: 'Technical Skills',
  },
  languages_spoken: {
    kind: 'stringArray',
    label: 'Languages Spoken',
  },
  education_certifications: {
    kind: 'objectArray',
    label: 'Education & Certifications',
    identityFields: ['credential', 'issuer'],
    fields: [
      { key: 'credential', label: 'Credential', type: 'text', required: true },
      { key: 'issuer', label: 'Issuer', type: 'text', required: true },
      { key: 'year', label: 'Year', type: 'text' },
      { key: 'type', label: 'Type', type: 'text' },
      { key: 'details', label: 'Details', type: 'textarea' },
    ],
  },
  soft_skills: {
    kind: 'stringArray',
    label: 'Soft Skills',
  },
  languages: {
    kind: 'objectArray',
    label: 'Languages',
    identityFields: ['language'],
    fields: [
      { key: 'language', label: 'Language', type: 'text', required: true },
      { key: 'proficiency', label: 'Proficiency', type: 'text' },
    ],
  },
  key_topics_for_qa: {
    kind: 'stringArray',
    label: 'Key Topics for Q&A',
  },
};
