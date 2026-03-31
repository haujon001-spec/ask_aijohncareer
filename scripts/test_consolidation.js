#!/usr/bin/env node

/**
 * Test Script 1: Resume Consolidation Testing
 * 
 * Tests the consolidation of resume files into john_profile.json
 * Validates data extraction and merging
 * 
 * Usage:
 *   node test_consolidation.js
 *   node test_consolidation.js debug          (verbose logging)
 *   node test_consolidation.js restore        (restore from backup)
 *   node test_consolidation.js list-backups   (list available backups)
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { consolidateResume } from '../backend/consolidation.js';
import { backupProfile, restoreProfile, listBackups, displayBackups, ensureBackup } from '../backend/backup.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PROFILE_PATH = path.join(projectRoot, 'src/data/john_profile.json');
const DEBUG = process.argv.includes('debug');

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function validateProfileStructure(profile) {
  console.log('\n🔍 Validating profile structure...');
  
  const requiredFields = ['metadata', 'summary'];
  const warnings = [];
  const errors = [];
  
  for (const field of requiredFields) {
    if (!profile[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Check metadata content
  if (profile.metadata) {
    const requiredMetadata = ['name', 'email', 'phone'];
    for (const field of requiredMetadata) {
      if (!profile.metadata[field]) {
        warnings.push(`Metadata missing: ${field}`);
      }
    }
    
    if (!profile.metadata.last_updated) {
      warnings.push('Missing last_updated timestamp');
    }
  }
  
  if (errors.length > 0) {
    log(`❌ Validation Errors: ${errors.length}`, 'red');
    errors.forEach(e => log(`   • ${e}`, 'red'));
    return false;
  }
  
  if (warnings.length > 0) {
    log(`⚠️  Validation Warnings: ${warnings.length}`, 'yellow');
    warnings.forEach(w => log(`   • ${w}`, 'yellow'));
  }
  
  log('✅ Profile structure valid', 'green');
  return true;
}

async function compareProfiles(before, after) {
  console.log('\n📊 Comparing before/after profiles...');
  
  const changes = {
    modified: [],
    added: [],
    removed: []
  };
  
  // Check metadata changes
  if (JSON.stringify(before.metadata) !== JSON.stringify(after.metadata)) {
    changes.modified.push('metadata');
    
    if (before.metadata.email !== after.metadata.email) {
      log(`   Email: "${before.metadata.email || 'N/A'}" → "${after.metadata.email || 'N/A'}"`, 'cyan');
    }
    if (before.metadata.phone !== after.metadata.phone) {
      log(`   Phone: "${before.metadata.phone || 'N/A'}" → "${after.metadata.phone || 'N/A'}"`, 'cyan');
    }
  }
  
  // Check for new fields
  for (const key in after) {
    if (!before[key]) {
      changes.added.push(key);
      log(`   Added: ${key}`, 'green');
    }
  }
  
  const totalChanges = changes.modified.length + changes.added.length + changes.removed.length;
  log(`Total changes: ${totalChanges}`, 'blue');
  
  return changes;
}

async function testConsolidation() {
  log('\n' + '═'.repeat(80), 'bright');
  log('🧪 CONSOLIDATION TEST SUITE', 'bright');
  log('═'.repeat(80) + '\n', 'bright');
  
  try {
    // Step 1: Create backup
    log('\n[1/5] Creating backup...', 'cyan');
    const backup = await ensureBackup();
    if (!backup.success) {
      throw new Error('Failed to create backup');
    }
    
    // Step 2: Load current profile
    log('\n[2/5] Loading current profile...', 'cyan');
    if (!fs.existsSync(PROFILE_PATH)) {
      throw new Error(`Profile not found: ${PROFILE_PATH}`);
    }
    const beforeProfile = JSON.parse(fs.readFileSync(PROFILE_PATH, 'utf-8'));
    log(`✓ Loaded: ${PROFILE_PATH}`, 'green');
    
    // Step 3: Run consolidation
    log('\n[3/5] Running consolidation...', 'cyan');
    log('Looking for latest resume in data_raw/resume/...');
    const result = await consolidateResume();
    
    if (!result) {
      throw new Error('Consolidation failed');
    }
    log('✓ Consolidation completed', 'green');
    
    // Step 4: Validate structure
    log('\n[4/5] Validating structure...', 'cyan');
    const isValid = await validateProfileStructure(result);
    if (!isValid) {
      throw new Error('Profile structure validation failed');
    }
    
    // Step 5: Compare and report
    log('\n[5/5] Comparing changes...', 'cyan');
    const afterProfile = result;
    const changes = await compareProfiles(beforeProfile, afterProfile);
    
    // Final summary
    log('\n' + '═'.repeat(80), 'bright');
    log('✅ TEST RESULTS', 'green');
    log('═'.repeat(80), 'bright');
    
    log('\n📋 Summary:', 'bright');
    log(`✓ Backup created: ${backup.filename}`, 'green');
    log(`✓ Profile loaded and consolidated`, 'green');
    log(`✓ Structure validation passed`, 'green');
    log(`✓ Fields modified: ${changes.modified.length}`, 'green');
    log(`✓ Fields added: ${changes.added.length}`, 'green');
    
    log('\n📊 Profile Statistics:', 'blue');
    log(`  Total fields: ${Object.keys(afterProfile).length}`);
    
    if (afterProfile.metadata) {
      log(`  Name: ${afterProfile.metadata.name}`);
      log(`  Email: ${afterProfile.metadata.email || 'N/A'}`);
      log(`  Phone: ${afterProfile.metadata.phone || 'N/A'}`);
      log(`  Years Experience: ${afterProfile.metadata.years_experience || 'N/A'}`);
      log(`  Last Updated: ${afterProfile.metadata.last_updated}`);
      log(`  Resume Source: ${afterProfile.metadata.resume_source}`);
    }
    
    if (afterProfile.ai_projects) {
      log(`  AI Projects: ${afterProfile.ai_projects.length}`);
    }
    
    log('\n═'.repeat(80) + '\n');
    
    return {
      success: true,
      backup: backup,
      changes: changes,
      profile: afterProfile
    };
    
  } catch (error) {
    log('\n❌ TEST FAILED', 'red');
    log(`Error: ${error.message}\n`, 'red');
    return { success: false, error: error.message };
  }
}

async function handleCommand() {
  const command = process.argv[2];
  
  if (command === 'restore') {
    log('\n📋 Restore Mode', 'cyan');
    const latestBackup = listBackups()[0];
    
    if (!latestBackup) {
      log('❌ No backups found', 'red');
      process.exit(1);
    }
    
    log(`Restoring from: ${latestBackup.filename}`, 'yellow');
    const result = await restoreProfile(latestBackup.filename);
    process.exit(result.success ? 0 : 1);
  }
  
  if (command === 'list-backups') {
    displayBackups();
    process.exit(0);
  }
  
  if (command === 'help') {
    log('\n📚 Consolidation Test Script Usage:\n', 'bright');
    log('Commands:', 'cyan');
    log('  (default)      Run consolidation test', 'green');
    log('  debug          Run test with verbose logging', 'green');
    log('  restore        Restore profile from latest backup', 'green');
    log('  list-backups   Show all available backups', 'green');
    log('  help           Show this message', 'green');
    log('\nExamples:', 'cyan');
    log('  node test_consolidation.js', 'green');
    log('  node test_consolidation.js debug', 'green');
    log('  node test_consolidation.js restore', 'green');
    log('  node test_consolidation.js list-backups\n', 'green');
    process.exit(0);
  }
  
  // Default: run consolidation test
  const testResult = await testConsolidation();
  process.exit(testResult.success ? 0 : 1);
}

// Run
handleCommand().catch(err => {
  log(`\n❌ Unexpected error: ${err.message}`, 'red');
  process.exit(1);
});
