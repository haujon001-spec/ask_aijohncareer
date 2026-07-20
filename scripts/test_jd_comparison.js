#!/usr/bin/env node

/**
 * Test Script 2: JD Comparison Testing
 * 
 * Compares a Job Description against john_profile.json
 * Analyzes skills match, experience fit, and suitability
 * 
 * Usage:
 *   node test_jd_comparison.js                          (use test JD)
 *   node test_jd_comparison.js "path/to/JD.txt"        (specific file)
 *   node test_jd_comparison.js list                     (list available JDs)
 *   node test_jd_comparison.js latest                   (use latest JD uploaded)
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PROFILE_PATH = path.join(projectRoot, 'src/data/john_profile.json');
const JD_RAW_DIR = path.join(projectRoot, 'data_raw/JD');

// Color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Extract keywords from text
 */
function extractKeywords(text, minLength = 3) {
  if (!text) return [];
  
  // Common words to exclude
  const stopWords = new Set([
    'the', 'and', 'for', 'with', 'will', 'able', 'work', 'team', 'provide',
    'experience', 'knowledge', 'skills', 'required', 'preferred', 'candidate',
    'must', 'should', 'need', 'have', 'from', 'your', 'our', 'be', 'or',
    'to', 'in', 'that', 'this', 'an', 'is', 'are', 'at', 'by', 'of', 'as'
  ]);
  
  const keywords = text
    .toLowerCase()
    .match(/\b[\w]+\b/g)
    .filter(word => 
      word.length >= minLength && 
      !stopWords.has(word) &&
      !/^\d+$/.test(word)  // exclude pure numbers
    )
    .reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
  
  return Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)  // Top 20
    .map(([word, count]) => word);
}

/**
 * Extract requirements from JD
 */
function extractJDRequirements(jdText) {
  const requirements = {
    technical_skills: [],
    experience_years: 0,
    certifications: [],
    soft_skills: [],
    education: [],
    responsibilities: []
  };
  
  // Extract years of experience
  const yearsMatch = jdText.match(/(\d+)\+?\s*(?:years?|years of)\s*(?:experience|exp)/i);
  if (yearsMatch) {
    requirements.experience_years = parseInt(yearsMatch[1]);
  }
  
  // Extract technical skills (common keywords)
  const techKeywords = ['java', 'python', 'javascript', 'sql', 'aws', 'azure', 'gcp',
    'docker', 'kubernetes', 'microservices', 'api', 'rest', 'graphql', 'react', 'vue',
    'node', 'golang', 'c++', 'scala', 'spark', 'hadoop', 'kafka', 'elasticsearch',
    'mongodb', 'postgresql', 'mysql', 'oracle', 'dynamo', 'redis', 'jenkins',
    'terraform', 'ansible', 'ci/cd', 'devops', 'linux', 'unix', 'windows',
    'networking', 'security', 'encryption', 'oauth', 'ssl', 'tls', 'https'];
  
  const foundTech = techKeywords.filter(tech => 
    jdText.toLowerCase().includes(tech)
  );
  requirements.technical_skills = foundTech;
  
  // Extract certifications
  const certPatterns = [
    /aws\s+(?:certified|certification|certifications)?[^\n.]*/gi,
    /azure\s+(?:certified|certification|certifications)?[^\n.]*/gi,
    /pmp|cispm|ccna|ccnp|scrum|comptia/gi
  ];
  
  certPatterns.forEach(pattern => {
    const matches = jdText.match(pattern);
    if (matches) {
      requirements.certifications.push(...matches);
    }
  });
  
  // Extract soft skills
  const softSkillKeywords = ['communication', 'leadership', 'teamwork', 'problem solving',
    'analytical', 'creative', 'adaptable', 'detail-oriented', 'organized', 'collaborative'];
  
  const foundSoft = softSkillKeywords.filter(skill =>
    jdText.toLowerCase().includes(skill)
  );
  requirements.soft_skills = foundSoft;
  
  return requirements;
}

/**
 * Extract profile strengths
 */
function extractProfileStrengths(profile) {
  const strengths = {
    years_experience: profile.metadata?.years_experience || 0,
    technical_skills: [],
    industry_experience: [],
    ai_projects: [],
    leadership_experience: false,
    certifications: []
  };
  
  // Check for leadership
  if (profile.metadata?.title?.toLowerCase().includes('vp') ||
      profile.metadata?.title?.toLowerCase().includes('director') ||
      profile.metadata?.title?.toLowerCase().includes('manager') ||
      profile.metadata?.title?.toLowerCase().includes('lead')) {
    strengths.leadership_experience = true;
  }
  
  // Extract from summary
  if (profile.summary) {
    const techKeywords = ['infrastructure', 'virtualization', 'vdi', 'performance',
      'automation', 'python', 'ai', 'ml', 'cloud', 'aws', 'azure', 'vmware'];
    
    const foundTech = techKeywords.filter(tech =>
      profile.summary.toLowerCase().includes(tech)
    );
    strengths.technical_skills = foundTech;
    
    const industryKeywords = ['morgan stanley', 'bank of america', 'financial',
      'trading', 'infrastructure', 'enterprise'];
    
    const foundIndustry = industryKeywords.filter(ind =>
      profile.summary.toLowerCase().includes(ind)
    );
    strengths.industry_experience = foundIndustry;
  }
  
  // AI projects
  if (profile.ai_projects && Array.isArray(profile.ai_projects)) {
    strengths.ai_projects = profile.ai_projects.map(p => p.title);
  }
  
  return strengths;
}

/**
 * Calculate match score
 */
function calculateMatchScore(jdRequirements, profileStrengths) {
  const scores = {
    experience_fit: 0,
    technical_fit: 0,
    soft_skills_fit: 0,
    overall_fit: 0,
    details: {}
  };
  
  // Experience fit (0-30 points)
  if (jdRequirements.experience_years > 0) {
    const experienceMatch = Math.min(100, (profileStrengths.years_experience / jdRequirements.experience_years) * 100);
    scores.experience_fit = (experienceMatch / 100) * 30;
    scores.details.experience = {
      required: jdRequirements.experience_years,
      actual: profileStrengths.years_experience,
      match_percent: experienceMatch.toFixed(1)
    };
  }
  
  // Technical skills fit (0-40 points)
  if (jdRequirements.technical_skills.length > 0) {
    const matchedSkills = jdRequirements.technical_skills.filter(skill =>
      profileStrengths.technical_skills.some(pSkill =>
        pSkill.toLowerCase().includes(skill) ||
        skill.toLowerCase().includes(pSkill)
      )
    );
    
    const technicalMatch = (matchedSkills.length / jdRequirements.technical_skills.length) * 100;
    scores.technical_fit = (technicalMatch / 100) * 40;
    scores.details.technical = {
      required: jdRequirements.technical_skills,
      matched: matchedSkills,
      match_percent: technicalMatch.toFixed(1)
    };
  }
  
  // Soft skills fit (0-20 points)
  if (jdRequirements.soft_skills.length > 0) {
    const matchedSoft = jdRequirements.soft_skills.filter(skill =>
      profileStrengths.leadership_experience ||
      profile.summary?.toLowerCase().includes(skill)
    );
    
    const softMatch = (matchedSoft.length / jdRequirements.soft_skills.length) * 100;
    scores.soft_skills_fit = (softMatch / 100) * 20;
    scores.details.soft_skills = {
      required: jdRequirements.soft_skills,
      matched: matchedSoft,
      match_percent: softMatch.toFixed(1)
    };
  }
  
  // Overall score (0-100)
  scores.overall_fit = scores.experience_fit + scores.technical_fit + scores.soft_skills_fit;
  
  return scores;
}

/**
 * Find latest JD file
 */
function findLatestJD() {
  const allFiles = [];
  
  ['txt', 'docx', 'pdf'].forEach(format => {
    const dir = path.join(JD_RAW_DIR, format);
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        allFiles.push(path.join(dir, file));
      });
    }
  });
  
  if (allFiles.length === 0) return null;
  
  // Get most recently modified
  return allFiles.reduce((a, b) => {
    const aStat = fs.statSync(a);
    const bStat = fs.statSync(b);
    return aStat.mtime > bStat.mtime ? a : b;
  });
}

/**
 * List available JDs
 */
function listAvailableJDs() {
  const files = [];
  
  ['txt', 'docx', 'pdf'].forEach(format => {
    const dir = path.join(JD_RAW_DIR, format);
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(file => {
        files.push({
          filename: file,
          path: path.join(dir, file),
          format: format
        });
      });
    }
  });
  
  return files;
}

/**
 * Read JD file
 */
function readJDFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    if (ext === '.txt') {
      return fs.readFileSync(filePath, 'utf-8');
    }
    
    if (ext === '.pdf') {
      throw new Error('PDF parsing not yet implemented. Please use .txt format.');
    }
    
    if (ext === '.docx') {
      throw new Error('DOCX parsing not yet implemented. Please use .txt format.');
    }
    
    throw new Error(`Unsupported format: ${ext}`);
  } catch (error) {
    throw error;
  }
}

/**
 * Format match score display
 */
function displayMatchScore(scores) {
  const overallScore = scores.overall_fit.toFixed(1);
  
  let scoreBar = '';
  const filled = Math.round(scores.overall_fit / 10);
  scoreBar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  
  let scoreColor = 'red';
  if (scores.overall_fit >= 70) scoreColor = 'green';
  else if (scores.overall_fit >= 50) scoreColor = 'yellow';
  
  log(`\n📊 Match Score: ${colors[scoreColor]}${overallScore}${colors.reset} / 100`, 'bright');
  log(`${colors[scoreColor]}${scoreBar}${colors.reset}\n`, scoreColor);
}

async function compareJDToProfile(jdFilePath) {
  log('\n' + '═'.repeat(80), 'bright');
  log('🔍 JD COMPARISON ANALYSIS', 'bright');
  log('═'.repeat(80) + '\n', 'bright');
  
  try {
    // Load profile
    log('Loading profile...', 'cyan');
    if (!fs.existsSync(PROFILE_PATH)) {
      throw new Error(`Profile not found: ${PROFILE_PATH}`);
    }
    const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
    log(`✓ Profile loaded`, 'green');
    
    // Find JD file
    log('Looking for JD file...', 'cyan');
    if (!jdFilePath) {
      const latestJD = findLatestJD();
      if (!latestJD) {
        throw new Error('No JD files found in data_raw/JD/');
      }
      jdFilePath = latestJD;
    }
    
    // Resolve relative paths to projectRoot
    if (!path.isAbsolute(jdFilePath)) {
      jdFilePath = path.join(projectRoot, jdFilePath);
    }
    
    if (!fs.existsSync(jdFilePath)) {
      throw new Error(`JD file not found: ${jdFilePath}`);
    }
    log(`✓ JD found: ${path.basename(jdFilePath)}`, 'green');
    
    // Read JD
    log('Parsing JD content...', 'cyan');
    const jdContent = readJDFile(jdFilePath);
    log(`✓ JD loaded (${jdContent.length} characters)`, 'green');
    
    // Extract requirements
    log('Extracting JD requirements...', 'cyan');
    const jdRequirements = extractJDRequirements(jdContent);
    log(`✓ Extracted: ${jdRequirements.technical_skills.length} tech skills, ${jdRequirements.experience_years}+ years exp`, 'green');
    
    // Extract profile strengths
    log('Analyzing profile strengths...', 'cyan');
    const profileStrengths = extractProfileStrengths(profile);
    log(`✓ Profile has ${profileStrengths.years_experience} years experience`, 'green');
    
    // Calculate match
    log('Calculating match score...', 'cyan');
    const scores = calculateMatchScore(jdRequirements, profileStrengths);
    log('✓ Match score calculated', 'green');
    
    // Display results
    log('\n' + '═'.repeat(80), 'magenta');
    log('📋 JOB DESCRIPTION ANALYSIS', 'magenta');
    log('═'.repeat(80), 'magenta');
    
    log('\n📍 Required Background:', 'blue');
    if (jdRequirements.experience_years > 0) {
      log(`  • Experience: ${jdRequirements.experience_years}+ years`);
    }
    if (jdRequirements.technical_skills.length > 0) {
      log(`  • Technical Skills: ${jdRequirements.technical_skills.join(', ')}`);
    }
    if (jdRequirements.soft_skills.length > 0) {
      log(`  • Soft Skills: ${jdRequirements.soft_skills.join(', ')}`);
    }
    
    log('\n💼 Profile Match:', 'blue');
    log(`  • Years Experience: ${profileStrengths.years_experience}`);
    log(`  • Leadership: ${profileStrengths.leadership_experience ? '✓ Yes' : '✗ No'}`);
    log(`  • Technical Skills: ${profileStrengths.technical_skills.join(', ') || 'N/A'}`);
    
    displayMatchScore(scores);
    
    log('═'.repeat(80) + '\n', 'magenta');
    
    // Recommendation
    let recommendation = '';
    if (scores.overall_fit >= 80) {
      recommendation = '🎯 EXCELLENT MATCH - Strong candidate';
      log(recommendation, 'green');
    } else if (scores.overall_fit >= 60) {
      recommendation = '✅ GOOD MATCH - Competitive candidate';
      log(recommendation, 'yellow');
    } else if (scores.overall_fit >= 40) {
      recommendation = '⚠️  MODERATE MATCH - May require additional skills';
      log(recommendation, 'yellow');
    } else {
      recommendation = '❌ POOR MATCH - Significant gaps';
      log(recommendation, 'red');
    }
    
    log('\n' + '═'.repeat(80) + '\n', 'bright');
    
    return {
      success: true,
      jd_file: path.basename(jdFilePath),
      jd_requirements: jdRequirements,
      profile_strengths: profileStrengths,
      match_scores: scores,
      recommendation: recommendation
    };
    
  } catch (error) {
    log(`\n❌ Comparison failed: ${error.message}\n`, 'red');
    return { success: false, error: error.message };
  }
}

async function handleCommand() {
  const command = process.argv[2];
  
  if (command === 'list') {
    log('\n📋 Available Job Descriptions:\n', 'cyan');
    const jds = listAvailableJDs();
    if (jds.length === 0) {
      log('No JD files found in data_raw/JD/', 'yellow');
      process.exit(0);
    }
    
    jds.forEach((jd, i) => {
      log(`${i + 1}. ${jd.filename} (${jd.format})`);
      log(`   Path: ${jd.path}\n`);
    });
    process.exit(0);
  }
  
  if (command === 'latest') {
    const latestJD = findLatestJD();
    if (!latestJD) {
      log('No JD files found', 'red');
      process.exit(1);
    }
    const result = await compareJDToProfile(latestJD);
    process.exit(result.success ? 0 : 1);
  }
  
  if (command && command !== 'help') {
    // Treat as file path
    const result = await compareJDToProfile(command);
    process.exit(result.success ? 0 : 1);
  }
  
  // Default or help
  log('\n📚 JD Comparison Test Script Usage:\n', 'bright');
  log('Commands:', 'cyan');
  log('  (default)      Compare latest JD to profile', 'green');
  log('  list           List available JD files', 'green');
  log('  latest         Use most recent JD file', 'green');
  log('  <filepath>     Compare specific JD file', 'green');
  log('  help           Show this message', 'green');
  log('\nExamples:', 'cyan');
  log('  node test_jd_comparison.js', 'green');
  log('  node test_jd_comparison.js list', 'green');
  log('  node test_jd_comparison.js "data_raw/JD/txt/my_jd.txt"\n', 'green');
  
  process.exit(0);
}

handleCommand().catch(err => {
  log(`\n❌ Unexpected error: ${err.message}\n`, 'red');
  process.exit(1);
});
