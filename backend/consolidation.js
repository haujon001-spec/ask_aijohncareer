/**
 * Resume Consolidation Utility
 * Processes resume files and consolidates data into src/data/john_profile.json
 * 
 * Supports: PDF, DOCX, TXT formats
 * Triggered by: File upload, API endpoint, scheduled job
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Paths
const DATA_RAW_RESUME = path.join(projectRoot, 'data_raw/resume');
const PROFILE_PATH = path.join(projectRoot, 'src/data/john_profile.json');

/**
 * Parse resume from text content
 * Extracts key fields: name, title, contact, experience, skills, etc.
 */
function parseResumeText(content) {
  const extracted = {
    metadata: {
      name: 'John Hau',
      email: extractEmail(content) || undefined,
      phone: extractPhone(content) || undefined,
    },
    experience: extractExperience(content),
    skills: extractSkills(content),
    education: extractEducation(content),
    certifications: extractCertifications(content),
  };

  return cleaned(extracted);
}

/**
 * Extract email from resume content
 */
function extractEmail(content) {
  const emailMatch = content.match(/[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return emailMatch ? emailMatch[0] : null;
}

/**
 * Extract phone from resume content
 */
function extractPhone(content) {
  const phoneMatch = content.match(/\+?[\d\s\-()]{10,}/);
  return phoneMatch ? phoneMatch[0].trim() : null;
}

/**
 * Extract work experience sections
 */
function extractExperience(content) {
  // Look for common patterns: "Company - Title" or "Title at Company"
  const experiences = [];
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Patterns for experience entries
    if (line.includes(' - ') || line.includes(' at ')) {
      experiences.push({
        raw: line,
        line_number: i
      });
    }
  }
  
  return experiences.length > 0 ? experiences : null;
}

/**
 * Extract skills section
 */
function extractSkills(content) {
  const skillsMatch = content.match(/Skills?:?\s*([\s\S]*?)(?=\n\n|Education|Certif|$)/i);
  if (skillsMatch) {
    return skillsMatch[1]
      .split(/[,\n]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  return null;
}

/**
 * Extract education section
 */
function extractEducation(content) {
  const eduMatch = content.match(/Education:?\s*([\s\S]*?)(?=\n\n|Certif|Skills|$)/i);
  if (eduMatch) {
    return eduMatch[1].split('\n').filter(line => line.trim());
  }
  return null;
}

/**
 * Extract certifications section
 */
function extractCertifications(content) {
  const certMatch = content.match(/Certifications?:?\s*([\s\S]*?)(?=\n\n|$)/i);
  if (certMatch) {
    return certMatch[1].split('\n').filter(line => line.trim());
  }
  return null;
}

/**
 * Remove null/undefined values from object
 */
function cleaned(obj) {
  const clean = {};
  Object.keys(obj).forEach(key => {
    if (obj[key] !== null && obj[key] !== undefined) {
      if (typeof obj[key] === 'object') {
        clean[key] = cleaned(obj[key]);
      } else {
        clean[key] = obj[key];
      }
    }
  });
  return clean;
}

/**
 * Read and process resume file
 */
async function readResumeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  try {
    switch (ext) {
      case '.txt':
        return fs.readFileSync(filePath, 'utf-8');
      
      case '.pdf':
        return await readPdfContent(filePath);
      
      case '.docx':
        return await readDocxContent(filePath);
      
      default:
        throw new Error(`Unsupported file format: ${ext}`);
    }
  } catch (error) {
    console.error(`❌ Error reading ${filePath}:`, error.message);
    throw error;
  }
}

/**
 * Read PDF content (requires pdf-parse library)
 * Placeholder - implement when pdf-parse is installed
 */
async function readPdfContent(filePath) {
  // TODO: Install pdf-parse and implement
  // const pdfParse = require('pdf-parse');
  // const dataBuffer = fs.readFileSync(filePath);
  // const data = await pdfParse(dataBuffer);
  // return data.text;
  
  throw new Error('PDF parsing not yet implemented. Install pdf-parse npm package.');
}

/**
 * Read DOCX content (requires docx library)
 * Placeholder - implement when docx is installed
 */
async function readDocxContent(filePath) {
  // TODO: Install docx and implement
  // const { Document } = require('docx');
  // const document = await Document.load(filePath);
  // Extract text from document
  
  throw new Error('DOCX parsing not yet implemented. Install docx npm package.');
}

/**
 * Load current profile
 */
function loadCurrentProfile() {
  try {
    const content = fs.readFileSync(PROFILE_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Error loading john_profile.json:', error.message);
    return null;
  }
}

/**
 * Save updated profile
 */
function saveProfile(profile) {
  try {
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(profile, null, 2), 'utf-8');
    console.log('✅ Profile saved to:', PROFILE_PATH);
    return true;
  } catch (error) {
    console.error('❌ Error saving profile:', error.message);
    return false;
  }
}

/**
 * Merge extracted data into existing profile
 */
function mergeProfileData(currentProfile, extractedData, sourceFile) {
  const merged = { ...currentProfile };
  
  // Update metadata
  if (extractedData.metadata) {
    merged.metadata = {
      ...merged.metadata,
      ...extractedData.metadata,
      resume_source: path.basename(sourceFile),
      last_updated: new Date().toISOString(),
    };
  }
  
  // Add experience if extracted
  if (extractedData.experience) {
    merged.experience = extractedData.experience;
  }
  
  // Update skills if available
  if (extractedData.skills) {
    merged.skills = extractedData.skills;
  }
  
  // Update education if available
  if (extractedData.education) {
    merged.education = extractedData.education;
  }
  
  // Update certifications if available
  if (extractedData.certifications) {
    merged.certifications = extractedData.certifications;
  }
  
  return merged;
}

/**
 * Find latest resume in data_raw/resume
 */
function findLatestResume() {
  const files = [];
  
  ['txt', 'docx', 'pdf'].forEach(format => {
    const dir = path.join(DATA_RAW_RESUME, format);
    if (fs.existsSync(dir)) {
      const dirFiles = fs.readdirSync(dir);
      dirFiles.forEach(f => {
        files.push(path.join(dir, f));
      });
    }
  });
  
  if (files.length === 0) {
    console.log('⚠️  No resume files found in data_raw/resume');
    return null;
  }
  
  // Get most recently modified file
  const latest = files.reduce((a, b) => {
    const aStat = fs.statSync(a);
    const bStat = fs.statSync(b);
    return aStat.mtime > bStat.mtime ? a : b;
  });
  
  return latest;
}

/**
 * Consolidate resume data into john_profile.json
 * @param {string} sourceFile - Resume file path (optional, uses latest if not provided)
 */
export async function consolidateResume(sourceFile) {
  console.log('\n📋 Starting resume consolidation...\n');
  
  try {
    // Find source file
    sourceFile = sourceFile || findLatestResume();
    
    if (!sourceFile) {
      console.log('❌ No resume file found to consolidate');
      return false;
    }
    
    console.log(`📄 Processing: ${path.basename(sourceFile)}`);
    
    // Read resume content
    const content = await readResumeFile(sourceFile);
    console.log(`✓ File read (${content.length} chars)`);
    
    // Parse content
    const extractedData = parseResumeText(content);
    console.log(`✓ Data extracted:`, {
      fields: Object.keys(extractedData),
      experiences: extractedData.experience? extractedData.experience.length : 0,
      skills: extractedData.skills ? extractedData.skills.length : 0,
    });
    
    // Load current profile
    const currentProfile = loadCurrentProfile();
    if (!currentProfile) {
      console.log('❌ Failed to load current profile');
      return false;
    }
    console.log(`✓ Current profile loaded`);
    
    // Merge data
    const mergedProfile = mergeProfileData(currentProfile, extractedData, sourceFile);
    console.log(`✓ Data merged`);
    
    // Save updated profile
    const saved = saveProfile(mergedProfile);
    
    if (saved) {
      console.log('\n✅ Consolidation complete!');
      console.log(`   Source: ${path.basename(sourceFile)}`);
      console.log(`   Target: ${path.basename(PROFILE_PATH)}`);
      return mergedProfile;
    } else {
      console.log('❌ Failed to save profile');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Consolidation failed:', error.message);
    return false;
  }
}

/**
 * API handler for consolidation endpoint
 */
export function createConsolidationHandler() {
  return async (req, res) => {
    const sourceFile = req.body?.sourceFile;
    
    try {
      const result = await consolidateResume(sourceFile);
      
      if (result) {
        res.json({
          success: true,
          message: 'Resume consolidated successfully',
          profile: result
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Failed to consolidate resume'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
}

export default {
  consolidateResume,
  createConsolidationHandler,
  parseResumeText,
  loadCurrentProfile,
  saveProfile,
};
