#!/usr/bin/env node

/**
 * Test Script 3: Scorecard Generation
 * 
 * Generates a detailed matching scorecard comparing a JD against john_profile
 * Outputs formatted scorecard for review
 * 
 * Usage:
 *   node test_generate_scorecard.js                   (latest JD)
 *   node test_generate_scorecard.js "path/to/JD.txt"  (specific file)
 *   node test_generate_scorecard.js json               (output as JSON)
 *   node test_generate_scorecard.js html               (output as HTML)
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PROFILE_PATH = path.join(projectRoot, 'src/data/john_profile.json');
const JD_RAW_DIR = path.join(projectRoot, 'data_raw/JD');
const OUTPUT_DIR = path.join(projectRoot, 'data/processed/Resume');

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
 * Creates a detailed scorecard object
 */
function createScorecard(jdName, profile, jdRequirements, matchScores) {
  const scorecard = {
    metadata: {
      candidate: profile.metadata?.name || 'Unknown',
      job_description: jdName,
      created_at: new Date().toISOString(),
      match_percentage: matchScores.overall_fit.toFixed(1)
    },
    
    experience_analysis: {
      score: matchScores.experience_fit.toFixed(1),
      required_years: jdRequirements.experience_years,
      candidate_years: profile.metadata?.years_experience || 0,
      assessment: assessExperience(jdRequirements.experience_years, profile.metadata?.years_experience || 0),
      fit_percentage: ((profile.metadata?.years_experience || 0) / (jdRequirements.experience_years || 1) * 100).toFixed(1)
    },
    
    technical_skills: {
      score: matchScores.technical_fit.toFixed(1),
      required_skills: jdRequirements.technical_skills || [],
      matched_skills: matchScores.details?.technical?.matched || [],
      match_percentage: matchScores.details?.technical?.match_percent || '0',
      gaps: (jdRequirements.technical_skills || []).filter(
        skill => !(matchScores.details?.technical?.matched || []).includes(skill)
      )
    },
    
    soft_skills: {
      score: matchScores.soft_skills_fit.toFixed(1),
      required: jdRequirements.soft_skills || [],
      demonstrated: extractSoftSkillsFromProfile(profile),
      leadership: hasLeadership(profile),
      assessment: assessSoftSkills(profile, jdRequirements)
    },
    
    strengths: generateStrengths(profile, jdRequirements, matchScores),
    gaps_and_recommendations: generateGaps(jdRequirements, profile, matchScores),
    
    overall_recommendation: {
      score: matchScores.overall_fit.toFixed(1),
      category: categorizeFit(matchScores.overall_fit),
      recommendation_text: generateRecommendation(matchScores.overall_fit),
      hire_worthiness: assessHireWorthiness(matchScores.overall_fit)
    }
  };
  
  return scorecard;
}

function assessExperience(required, actual) {
  const ratio = actual / (required || 1);
  
  if (ratio >= 1.5) return '⭐⭐⭐ Significantly exceeds requirements';
  if (ratio >= 1) return '⭐⭐ Meets requirements';
  if (ratio >= 0.7) return '⭐ Slightly below requirements';
  return '❌ Significantly below requirements';
}

function extractSoftSkillsFromProfile(profile) {
  const skills = [];
  const summary = (profile.summary || '').toLowerCase();
  
  const softSkillKeywords = {
    'Leadership': ['leader', 'leadership', 'vp ', 'director', 'manager', 'team'],
    'Communication': ['communication', 'articulate', 'communicate', 'presenter', 'engagement'],
    'Problem Solving': ['problem', 'solve', 'solution', 'innovation', 'innovate'],
    'Collaboration': ['collaborate', 'collaboration', 'teamwork', 'team', 'partner'],
    'Strategic Thinking': ['strategic', 'strategy', 'vision', 'roadmap', 'planning']
  };
  
  for (const [skill, keywords] of Object.entries(softSkillKeywords)) {
    if (keywords.some(keyword => summary.includes(keyword))) {
      skills.push(skill);
    }
  }
  
  return skills;
}

function hasLeadership(profile) {
  const title = (profile.metadata?.title || '').toLowerCase();
  return title.includes('vp') || title.includes('director') || title.includes('lead') || title.includes('manager');
}

function assessSoftSkills(profile, jdRequirements) {
  const demonstrated = extractSoftSkillsFromProfile(profile);
  const required = jdRequirements.soft_skills || [];
  
  if (demonstrated.length >= required.length) {
    return '✓ Strong soft skill fit demonstrated';
  } else if (demonstrated.length > 0) {
    return '✓ Some relevant soft skills demonstrated';
  } else {
    return '⚠️  Limited soft skill evidence in profile';
  }
}

function generateStrengths(profile, jdRequirements, matchScores) {
  const strengths = [];
  
  // Experience strength
  if ((profile.metadata?.years_experience || 0) >= (jdRequirements.experience_years || 0)) {
    strengths.push(`✓ Extensive experience: ${profile.metadata.years_experience} years`);
  }
  
  // Technical skills
  const matchedTech = matchScores.details?.technical?.matched || [];
  if (matchedTech.length > 0) {
    strengths.push(`✓ Has ${matchedTech.length} of required technical skills`);
  }
  
  // Leadership
  if (hasLeadership(profile)) {
    strengths.push('✓ Leadership experience in similar domain');
  }
  
  // Industry experience
  if ((profile.summary || '').toLowerCase().includes('financial')) {
    if ((jdRequirements.technical_skills || []).some(s => s.includes('finance'))) {
      strengths.push('✓ Financial industry background');
    }
  }
  
  // AI/Automation projects
  if (profile.ai_projects && profile.ai_projects.length > 0) {
    strengths.push(`✓ ${profile.ai_projects.length} AI/automation projects`);
  }
  
  return strengths;
}

function generateGaps(jdRequirements, profile, matchScores) {
  const gaps = [];
  
  // Experience gap
  const expRatio = (profile.metadata?.years_experience || 0) / (jdRequirements.experience_years || 1);
  if (expRatio < 0.7) {
    gaps.push({
      category: 'Experience',
      gap: `${((1 - expRatio) * 100).toFixed(0)}% below requirement`,
      recommendation: 'Consider supplementary training or mentor relationship'
    });
  }
  
  // Technical skill gaps
  const unmatched = (matchScores.details?.technical?.gap_count || 0);
  if (unmatched > 0) {
    gaps.push({
      category: 'Technical Skills',
      gap: `Missing ${unmatched} required skill(s)`,
      recommendation: 'Provide training or pair with experienced mentor'
    });
  }
  
  return gaps;
}

function categorizeFit(score) {
  if (score >= 80) return '🎯 Excellent Match';
  if (score >= 60) return '✅ Good Match';
  if (score >= 40) return '⚠️  Moderate Match';
  return '❌ Poor Match';
}

function generateRecommendation(score) {
  if (score >= 85) return 'Highly recommended for interview. Strong candidate profile.';
  if (score >= 70) return 'Recommended for interview. Good fit with minor gaps.';
  if (score >= 50) return 'Consider for interview. Some relevant skills/experience.';
  if (score >= 30) return 'May discuss but significant gaps exist.';
  return 'Not recommended. Substantial gaps in requirements.';
}

function assessHireWorthiness(score) {
  if (score >= 80) return 'Strong - Priority Interview';
  if (score >= 60) return 'Good - Schedule Interview';
  if (score >= 40) return 'Fair - Optional Interview';
  return 'Weak - Likely Not Suitable';
}

/**
 * Format scorecard as text
 */
function formatScorecardAsText(scorecard) {
  let output = '';
  
  output += '\n' + '═'.repeat(80) + '\n';
  output += '📋 POSITION MATCH SCORECARD\n';
  output += '═'.repeat(80) + '\n\n';
  
  output += `Candidate: ${scorecard.metadata.candidate}\n`;
  output += `Position: ${scorecard.metadata.job_description}\n`;
  output += `Evaluation Date: ${new Date(scorecard.metadata.created_at).toLocaleDateString()}\n\n`;
  
  // Overall Score
  output += `${colors.bright}OVERALL MATCH SCORE${colors.reset}\n`;
  output += `─`.repeat(40) + '\n';
  const score = scorecard.overall_recommendation.score;
  output += `${score}/100 - ${scorecard.overall_recommendation.category}\n`;
  
  const filled = Math.round(score / 10);
  const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
  output += `${colors.green}${bar}${colors.reset}\n\n`;
  
  // Category Scores
  output += `${colors.bright}CATEGORY BREAKDOWN${colors.reset}\n`;
  output += `─`.repeat(40) + '\n';
  output += `Experience:      ${scorecard.experience_analysis.score}/30\n`;
  output += `Technical Skills: ${scorecard.technical_skills.score}/40\n`;
  output += `Soft Skills:      ${scorecard.soft_skills.score}/20\n\n`;
  
  // Experience Analysis
  output += `${colors.bright}EXPERIENCE ANALYSIS${colors.reset}\n`;
  output += `─`.repeat(40) + '\n';
  output += `Required: ${scorecard.experience_analysis.required_years}+ years\n`;
  output += `Candidate: ${scorecard.experience_analysis.candidate_years} years\n`;
  output += `Assessment: ${scorecard.experience_analysis.assessment}\n\n`;
  
  // Technical Skills
  output += `${colors.bright}TECHNICAL SKILLS${colors.reset}\n`;
  output += `─`.repeat(40) + '\n';
  output += `Match: ${scorecard.technical_skills.match_percentage}%\n`;
  output += `Matched (${scorecard.technical_skills.matched_skills.length}):\n`;
  scorecard.technical_skills.matched_skills.forEach(skill => {
    output += `  ✓ ${skill}\n`;
  });
  
  if (scorecard.technical_skills.gaps.length > 0) {
    output += `\nGaps (${scorecard.technical_skills.gaps.length}):\n`;
    scorecard.technical_skills.gaps.forEach(gap => {
      output += `  ✗ ${gap}\n`;
    });
  }
  output += '\n';
  
  // Soft Skills
  output += `${colors.bright}SOFT SKILLS${colors.reset}\n`;
  output += `─`.repeat(40) + '\n';
  output += `Assessment: ${scorecard.soft_skills.assessment}\n`;
  output += `Leadership: ${scorecard.soft_skills.leadership ? '✓ Yes' : '✗ No'}\n`;
  output += `Demonstrated Skills:\n`;
  scorecard.soft_skills.demonstrated.forEach(skill => {
    output += `  • ${skill}\n`;
  });
  output += '\n';
  
  // Strengths
  output += `${colors.bright}STRENGTHS${colors.reset}\n`;
  output += `─`.repeat(40) + '\n';
  scorecard.strengths.forEach(strength => {
    output += `${strength}\n`;
  });
  output += '\n';
  
  // Gaps & Recommendations
  if (scorecard.gaps_and_recommendations.length > 0) {
    output += `${colors.bright}GAPS & RECOMMENDATIONS${colors.reset}\n`;
    output += `─`.repeat(40) + '\n';
    scorecard.gaps_and_recommendations.forEach(gap => {
      output += `Category: ${gap.category}\n`;
      output += `Gap: ${gap.gap}\n`;
      output += `Recommendation: ${gap.recommendation}\n\n`;
    });
  }
  
  // Overall Recommendation
  output += `${colors.bright}FINAL RECOMMENDATION${colors.reset}\n`;
  output += `═`.repeat(40) + '\n';
  output += `Status: ${scorecard.overall_recommendation.hire_worthiness}\n`;
  output += `Analysis: ${scorecard.overall_recommendation.recommendation_text}\n`;
  output += `═`.repeat(80) + '\n\n';
  
  return output;
}

/**
 * Format scorecard as JSON
 */
function formatScorecardAsJSON(scorecard) {
  return JSON.stringify(scorecard, null, 2);
}

/**
 * Format scorecard as HTML
 */
function formatScorecardAsHTML(scorecard) {
  const htmlDate = new Date(scorecard.metadata.created_at).toLocaleDateString();
  const score = parseFloat(scorecard.overall_recommendation.score);
  const percentage = score.toFixed(1);
  
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Position Match Scorecard - ${scorecard.metadata.candidate}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px;
            margin-bottom: 30px;
        }
        .header h1 { margin: 0 0 10px 0; }
        .header .meta { font-size: 14px; opacity: 0.9; }
        .score-display {
            text-align: center;
            padding: 30px;
            background: white;
            border-radius: 8px;
            margin-bottom: 30px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .score-number {
            font-size: 48px;
            font-weight: bold;
            color: #667eea;
        }
        .score-bar {
            width: 100%;
            height: 30px;
            background: #e0e0e0;
            border-radius: 15px;
            overflow: hidden;
            margin: 15px 0;
        }
        .score-fill {
            height: 100%;
            background: linear-gradient(90deg, #667eea, #764ba2);
            width: ${percentage}%;
            transition: width 0.3s ease;
        }
        .score-label {
            font-weight: bold;
            color: #667eea;
        }
        .section {
            background: white;
            padding: 20px;
            margin-bottom: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .section h2 {
            margin-top: 0;
            color: #667eea;
            border-bottom: 2px solid #667eea;
            padding-bottom: 10px;
        }
        .breakdown {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 15px 0;
        }
        .breakdown-item {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #667eea;
        }
        .breakdown-item .label {
            font-size: 12px;
            color: #999;
            text-transform: uppercase;
        }
        .breakdown-item .value {
            font-size: 24px;
            font-weight: bold;
            color: #667eea;
        }
        .strength, .gap {
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
        }
        .strength {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
        }
        .gap {
            background: #fff3e0;
            border-left: 4px solid #ff9800;
        }
        .recommendation {
            background: #e3f2fd;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2196f3;
            margin: 15px 0;
        }
        .skill-list {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin: 10px 0;
        }
        .skill {
            background: #667eea;
            color: white;
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 13px;
        }
        .skill.gap {
            background: #ff9800;
        }
        footer {
            text-align: center;
            color: #999;
            font-size: 12px;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Position Match Scorecard</h1>
        <div class="meta">
            <strong>${scorecard.metadata.candidate}</strong> | ${scorecard.metadata.job_description}<br>
            Generated: ${htmlDate}
        </div>
    </div>
    
    <div class="score-display">
        <div class="score-number">${percentage}</div>
        <div class="score-bar">
            <div class="score-fill"></div>
        </div>
        <div class="score-label">${scorecard.overall_recommendation.category}</div>
    </div>
    
    <div class="section">
        <h2>Category Breakdown</h2>
        <div class="breakdown">
            <div class="breakdown-item">
                <div class="label">Experience</div>
                <div class="value">${scorecard.experience_analysis.score}</div>
                <div style="font-size: 12px; color: #999;">/30</div>
            </div>
            <div class="breakdown-item">
                <div class="label">Technical Skills</div>
                <div class="value">${scorecard.technical_skills.score}</div>
                <div style="font-size: 12px; color: #999;">/40</div>
            </div>
            <div class="breakdown-item">
                <div class="label">Soft Skills</div>
                <div class="value">${scorecard.soft_skills.score}</div>
                <div style="font-size: 12px; color: #999;">/20</div>
            </div>
        </div>
    </div>
    
    <div class="section">
        <h2>Experience Analysis</h2>
        <p><strong>Required:</strong> ${scorecard.experience_analysis.required_years}+ years</p>
        <p><strong>Candidate:</strong> ${scorecard.experience_analysis.candidate_years} years</p>
        <p><strong>Assessment:</strong> ${scorecard.experience_analysis.assessment}</p>
    </div>
    
    <div class="section">
        <h2>Technical Skills</h2>
        <p><strong>Match:</strong> ${scorecard.technical_skills.match_percentage}%</p>
        <p><strong>Matched Skills:</strong></p>
        <div class="skill-list">
            ${scorecard.technical_skills.matched_skills.map(s => `<span class="skill">${s}</span>`).join('')}
        </div>
        ${scorecard.technical_skills.gaps.length > 0 ? `
        <p><strong>Skill Gaps:</strong></p>
        <div class="skill-list">
            ${scorecard.technical_skills.gaps.map(s => `<span class="skill gap">${s}</span>`).join('')}
        </div>
        ` : ''}
    </div>
    
    <div class="section">
        <h2>Strengths</h2>
        ${scorecard.strengths.map(s => `<div class="strength">${s}</div>`).join('')}
    </div>
    
    <div class="section">
        <h2>Final Recommendation</h2>
        <div class="recommendation">
            <strong>${scorecard.overall_recommendation.hire_worthiness}</strong><br>
            ${scorecard.overall_recommendation.recommendation_text}
        </div>
    </div>
    
    <footer>
        <p>This scorecard was automatically generated based on profile analysis.</p>
    </footer>
</body>
</html>`;
}

/**
 * Save scorecard to file
 */
function saveScorecardToFile(scorecard, format = 'json') {
  const filename = `Scorecard_JohnHau_${scorecard.metadata.job_description.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.${format}`;
  const filepath = path.join(OUTPUT_DIR, filename);
  
  let content = '';
  
  if (format === 'json') {
    content = formatScorecardAsJSON(scorecard);
  } else if (format === 'html') {
    content = formatScorecardAsHTML(scorecard);
  } else {
    content = formatScorecardAsText(scorecard);
  }
  
  fs.writeFileSync(filepath, content, 'utf-8');
  
  return {
    filename: filename,
    filepath: filepath,
    size: content.length
  };
}

async function generateScorecard(jdFilePath, outputFormat = 'text') {
  log('\n' + '═'.repeat(80), 'bright');
  log('📊 SCORECARD GENERATION', 'bright');
  log('═'.repeat(80) + '\n', 'bright');
  
  try {
    // Load profile
    if (!fs.existsSync(PROFILE_PATH)) {
      throw new Error(`Profile not found: ${PROFILE_PATH}`);
    }
    const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
    
    // Find JD if not specified
    if (!jdFilePath) {
      const allFiles = [];
      ['txt'].forEach(format => {
        const dir = path.join(JD_RAW_DIR, format);
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach(file => {
            allFiles.push(path.join(dir, file));
          });
        }
      });
      
      if (allFiles.length === 0) {
        throw new Error('No JD files found');
      }
      
      jdFilePath = allFiles[allFiles.length - 1];
    }
    
    if (!fs.existsSync(jdFilePath)) {
      throw new Error(`JD file not found: ${jdFilePath}`);
    }
    
    // Read JD
    const jdContent = fs.readFileSync(jdFilePath, 'utf-8');
    const jdFileName = path.basename(jdFilePath, path.extname(jdFilePath));
    
    // Extract and calculate (using mock data for now)
    const mockRequirements = {
      experience_years: 15,
      technical_skills: ['python', 'cloud', 'leadership'],
      soft_skills: ['communication', 'leadership']
    };
    
    const mockScores = {
      overall_fit: 78,
      experience_fit: 25,
      technical_fit: 32,
      soft_skills_fit: 18,
      details: {
        technical: {
          matched: ['python', 'leadership'],
          match_percent: '67',
          gap_count: 1
        }
      }
    };
    
    // Create scorecard
    const scorecard = createScorecard(
      jdFileName,
      profile,
      mockRequirements,
      mockScores
    );
    
    // Format output
    let output = '';
    if (outputFormat === 'json') {
      output = formatScorecardAsJSON(scorecard);
    } else if (outputFormat === 'html') {
      output = formatScorecardAsHTML(scorecard);
    } else {
      output = formatScorecardAsText(scorecard);
    }
    
    console.log(output);
    
    // Save to file
    const saved = saveScorecardToFile(scorecard, outputFormat === 'json' ? 'json' : outputFormat === 'html' ? 'html' : 'txt');
    
    log(`\n✅ Scorecard saved`, 'green');
    log(`   File: ${saved.filename}`, 'green');
    log(`   Size: ${saved.size} bytes\n`, 'green');
    
    return {
      success: true,
      scorecard: scorecard,
      file: saved
    };
    
  } catch (error) {
    log(`\n❌ Scorecard generation failed: ${error.message}\n`, 'red');
    return { success: false, error: error.message };
  }
}

async function handleCommand() {
  const format = process.argv[2] || 'text';
  const jdFile = (['json', 'html', 'text'].includes(format)) ? null : format;
  const outputFormat = (['json', 'html', 'text'].includes(format)) ? format : 'text';
  
  const result = await generateScorecard(jdFile, outputFormat);
  process.exit(result.success ? 0 : 1);
}

handleCommand().catch(err => {
  log(`\n❌ Error: ${err.message}\n`, 'red');
  process.exit(1);
});
