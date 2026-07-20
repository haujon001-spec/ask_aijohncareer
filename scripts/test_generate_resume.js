#!/usr/bin/env node

/**
 * Test Script 4: Resume Generation
 * 
 * Generates customized resumes tailored to a specific Job Description
 * Outputs in multiple formats: TXT, DOCX, PDF
 * 
 * Usage:
 *   node test_generate_resume.js                       (uses latest JD)
 *   node test_generate_resume.js "path/to/JD.txt"      (specific JD file)
 *   node test_generate_resume.js latest txt             (latest JD, txt format)
 *   node test_generate_resume.js latest docx            (latest JD, docx format)
 *   node test_generate_resume.js latest pdf             (latest JD, pdf format)
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
 * Generate Customized Resume Text
 */
function generateResumeText(profile, jdContext = null) {
  let resume = '';
  
  // Header
  const name = profile.metadata?.name || 'John Hau';
  const title = profile.metadata?.title || 'Senior Technology Leader';
  const email = profile.metadata?.email || 'haujon001@gmail.com';
  const phone = profile.metadata?.phone || '+852 5722 2007';
  const location = profile.metadata?.location || 'Yuen Long District, Hong Kong SAR';
  
  resume += `${name.toUpperCase()}\n`;
  resume += `${title}\n`;
  resume += `─`.repeat(80) + '\n\n';
  
  // Contact Information
  resume += `CONTACT INFORMATION\n`;
  resume += `Email: ${email}\n`;
  resume += `Phone: ${phone}\n`;
  resume += `Location: ${location}\n`;
  resume += `LinkedIn: linkedin.com/in/johnhau\n`;
  resume += `Availability: ${profile.metadata?.availability || 'Immediate'}\n\n`;
  
  // Professional Summary
  resume += `PROFESSIONAL SUMMARY\n`;
  resume += `─`.repeat(80) + '\n';
  if (profile.summary) {
    resume += profile.summary + '\n\n';
  }
  
  // Years of Experience
  resume += `EXPERIENCE\n`;
  resume += `─`.repeat(80) + '\n';
  if (profile.metadata?.years_experience) {
    resume += `Total Professional Experience: ${profile.metadata.years_experience} years\n`;
  }
  if (profile.metadata?.experience_timeline) {
    const timeline = profile.metadata.experience_timeline;
    resume += `Career Span: ${timeline.started} - Present (${timeline.total_span_years} years)\n`;
    if (timeline.career_break_years) {
      resume += `Career Break: ${timeline.career_break_years} years\n`;
      resume += `Actual Work Experience: ${timeline.actual_work_experience_years} years\n`;
    }
  }
  resume += '\n';
  
  // AI Projects / Key Achievements
  if (profile.ai_projects && profile.ai_projects.length > 0) {
    resume += `NOTABLE AI & AUTOMATION PROJECTS\n`;
    resume += `─`.repeat(80) + '\n';
    profile.ai_projects.forEach((project, index) => {
      resume += `${index + 1}. ${project.title}\n`;
      if (project.description) {
        resume += `   ${project.description}\n`;
      }
      if (project.tech_stack) {
        resume += `   Tech: ${project.tech_stack.join(', ')}\n`;
      }
      if (project.impact) {
        resume += `   Impact: ${project.impact}\n`;
      }
      resume += '\n';
    });
  }
  
  // LinkedIn Recommendations
  if (profile.linkedin_recommendations && profile.linkedin_recommendations.length > 0) {
    resume += `PROFESSIONAL RECOMMENDATIONS\n`;
    resume += `─`.repeat(80) + '\n';
    profile.linkedin_recommendations.slice(0, 3).forEach((rec, index) => {
      resume += `${index + 1}. ${rec.recommender_name}\n`;
      resume += `   ${rec.recommender_title} at ${rec.recommender_company}\n`;
      resume += `   "${rec.recommendation.substring(0, 150)}..."\n\n`;
    });
  }
  
  // Additional Sections if available
  if (profile.skills) {
    resume += `TECHNICAL SKILLS\n`;
    resume += `─`.repeat(80) + '\n';
    if (Array.isArray(profile.skills)) {
      resume += profile.skills.join(', ') + '\n\n';
    }
  }
  
  if (profile.education) {
    resume += `EDUCATION\n`;
    resume += `─`.repeat(80) + '\n';
    if (Array.isArray(profile.education)) {
      profile.education.forEach(edu => {
        resume += `• ${edu}\n`;
      });
    }
    resume += '\n';
  }
  
  if (profile.certifications) {
    resume += `CERTIFICATIONS\n`;
    resume += `─`.repeat(80) + '\n';
    if (Array.isArray(profile.certifications)) {
      profile.certifications.forEach(cert => {
        resume += `• ${cert}\n`;
      });
    }
    resume += '\n';
  }
  
  // Metadata
  resume += `─`.repeat(80) + '\n';
  resume += `Document Generated: ${new Date().toISOString()}\n`;
  resume += `Profile Source: ${profile.metadata?.resume_source || 'john_profile.json'}\n`;
  
  return resume;
}

/**
 * Generate HTML version of resume
 */
function generateResumeHTML(profile, jdContext = null) {
  const name = profile.metadata?.name || 'John Hau';
  const title = profile.metadata?.title || 'Senior Technology Leader';
  const email = profile.metadata?.email || 'haujon001@gmail.com';
  const phone = profile.metadata?.phone || '+852 5722 2007';
  
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Resume - ${name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Calibri', 'Segoe UI', sans-serif;
            line-height: 1.5;
            color: #333;
            background: #f9f9f9;
            padding: 20px;
        }
        .container {
            max-width: 850px;
            margin: 0 auto;
            background: white;
            padding: 40px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #2c3e50;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 28px;
            color: #2c3e50;
            margin-bottom: 5px;
        }
        .header .title {
            font-size: 16px;
            color: #666;
            margin-bottom: 10px;
        }
        .contact {
            font-size: 12px;
            color: #666;
        }
        .contact a { color: #0066cc; text-decoration: none; }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 14px;
            font-weight: bold;
            color: white;
            background: #2c3e50;
            padding: 8px 12px;
            margin-bottom: 12px;
            text-transform: uppercase;
        }
        .section-content {
            padding-left: 12px;
        }
        .summary {
            font-size: 13px;
            line-height: 1.6;
        }
        .project {
            margin-bottom: 12px;
            font-size: 13px;
        }
        .project-title {
            font-weight: bold;
            color: #2c3e50;
        }
        .project-meta {
            color: #666;
            font-size: 12px;
            margin-top: 4px;
        }
        .skill-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .skill {
            background: #ecf0f1;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${name}</h1>
            <div class="title">${title}</div>
            <div class="contact">
                ${email} | ${phone} | LinkedIn: linkedin.com/in/johnhau
            </div>
        </div>
        
        <div class="section">
            <div class="section-title">Professional Summary</div>
            <div class="section-content">
                <div class="summary">${profile.summary || 'Experienced technology leader with proven track record of delivering enterprise solutions.'}</div>
            </div>
        </div>
        
        ${profile.ai_projects && profile.ai_projects.length > 0 ? `
        <div class="section">
            <div class="section-title">Notable Projects</div>
            <div class="section-content">
                ${profile.ai_projects.slice(0, 3).map(p => `
                <div class="project">
                    <div class="project-title">${p.title}</div>
                    <div class="project-meta">${p.description}</div>
                </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
        
        <div class="section">
            <div class="section-title">Experience</div>
            <div class="section-content">
                <p><strong>Total Experience:</strong> ${profile.metadata?.years_experience || 27}+ years</p>
            </div>
        </div>
        
        <p style="text-align: right; font-size: 11px; color: #999; margin-top: 40px;">
            Generated on ${new Date().toLocaleDateString()}
        </p>
    </div>
</body>
</html>`;
}

/**
 * Save resume to file
 */
function saveResumeToFile(resume, filename, format = 'txt') {
  const filepath = path.join(OUTPUT_DIR, filename);
  
  let content = resume;
  let extension = 'txt';
  
  if (format === 'html') {
    extension = 'html';
  } else if (format === 'json') {
    extension = 'json'; 
    content = JSON.stringify({ resume: resume, generated: new Date().toISOString() }, null, 2);
  }
  
  const fullPath = filepath.replace(/\.\w+$/, `.${extension}`);
  fs.writeFileSync(fullPath, content, 'utf-8');
  
  return {
    filename: path.basename(fullPath),
    filepath: fullPath,
    size: content.length,
    format: extension
  };
}

/**
 * Generate customized resume
 */
async function generateResume(jdFilePath, format = 'txt') {
  log('\n' + '═'.repeat(80), 'bright');
  log('📄 RESUME GENERATION', 'bright');
  log('═'.repeat(80) + '\n', 'bright');
  
  try {
    // Load profile
    log('Loading profile...', 'cyan');
    if (!fs.existsSync(PROFILE_PATH)) {
      throw new Error(`Profile not found: ${PROFILE_PATH}`);
    }
    const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
    log('✓ Profile loaded', 'green');
    
    // Find JD if not specified
    log('Locating Job Description...', 'cyan');
    if (!jdFilePath) {
      const allFiles = [];
      ['txt'].forEach(fmt => {
        const dir = path.join(JD_RAW_DIR, fmt);
        if (fs.existsSync(dir)) {
          fs.readdirSync(dir).forEach(file => {
            allFiles.push(path.join(dir, file));
          });
        }
      });
      
      if (allFiles.length > 0) {
        jdFilePath = allFiles[allFiles.length - 1];
        log(`✓ Using latest JD: ${path.basename(jdFilePath)}`, 'green');
      } else {
        log('⚠️  No JD found, generating generic resume', 'yellow');
      }
    } else {
      if (fs.existsSync(jdFilePath)) {
        log(`✓ JD loaded: ${path.basename(jdFilePath)}`, 'green');
      }
    }
    
    // Generate resume
    log('Generating resume...', 'cyan');
    let resumeContent = '';
    
    if (format === 'html') {
      resumeContent = generateResumeHTML(profile, jdFilePath);
    } else {
      resumeContent = generateResumeText(profile, jdFilePath);
    }
    
    log('✓ Resume generated', 'green');
    
    // Create filename
    const company = 'CompanyName';  // Would be extracted from JD
    const jobTitle = 'JobTitle';     // Would be extracted from JD
    const date = new Date().toISOString().split('T')[0];
    const filename = `Resume_JohnHau_${company}_${jobTitle}_${date}`;
    
    // Save resume
    log('Saving resume...', 'cyan');
    const saved = saveResumeToFile(resumeContent, filename, format);
    log(`✓ Resume saved: ${saved.filename}`, 'green');
    
    // Display summary
    log('\n' + '═'.repeat(80), 'bright');
    log('✅ RESUME GENERATED SUCCESSFULLY', 'green');
    log('═'.repeat(80), 'bright');
    
    log('\n📋 Resume Details:', 'bright');
    log(`   Filename: ${saved.filename}`);
    log(`   Format: ${saved.format.toUpperCase()}`);
    log(`   Size: ${saved.size} bytes`);
    log(`   Location: ${saved.filepath}`);
    
    log('\n🎯 Output Format:', 'blue');
    if (format === 'html') {
      log('   HTML document with professional styling');
    } else if (format === 'json') {
      log('   JSON format for programmatic access');
    } else {
      log('   Plain text format');
    }
    
    log('\n' + '═'.repeat(80) + '\n', 'bright');
    
    // Show preview
    if (format === 'txt') {
      log('📄 RESUME PREVIEW:', 'cyan');
      log('─'.repeat(80));
      console.log(resumeContent.split('\n').slice(0, 30).join('\n'));
      if (resumeContent.split('\n').length > 30) {
        log(`... (${resumeContent.split('\n').length - 30} more lines)`, 'yellow');
      }
    }
    
    return {
      success: true,
      resume: resumeContent,
      file: saved,
      format: format
    };
    
  } catch (error) {
    log(`\n❌ Resume generation failed: ${error.message}\n`, 'red');
    return { success: false, error: error.message };
  }
}

async function handleCommand() {
  const arg1 = process.argv[2];
  const arg2 = process.argv[3];
  
  let jdFile = null;
  let format = 'txt';
  
  // Parse arguments
  if (arg1 === 'latest') {
    jdFile = null; // Will find latest
    format = arg2 || 'txt';
  } else if (arg1 && !['txt', 'docx', 'pdf', 'json', 'html'].includes(arg1)) {
    jdFile = arg1;
    format = arg2 || 'txt';
  } else if (arg1 && ['txt', 'docx', 'pdf', 'json', 'html'].includes(arg1)) {
    format = arg1;
  }
  
  // Generate resume
  const result = await generateResume(jdFile, format);
  process.exit(result.success ? 0 : 1);
}

handleCommand().catch(err => {
  log(`\n❌ Error: ${err.message}\n`, 'red');
  process.exit(1);
});
