/**
 * Profile Backup Utility
 * Creates timestamped backups of john_profile.json before any modifications
 * 
 * Usage:
 * import { backupProfile, restoreProfile, listBackups } from './backup.js';
 * await backupProfile();
 * await restoreProfile('backup-2026-03-30T14-30-45.json');
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const PROFILE_PATH = path.join(projectRoot, 'src/data/john_profile.json');
const BACKUP_DIR = path.join(projectRoot, 'backup');

export { PROFILE_PATH, BACKUP_DIR };

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * Generate timestamped backup filename
 * Format: backup-2026-03-30T14-30-45.json
 */
function getBackupFilename() {
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/[:.]/g, '-')
    .replace('Z', '');
  return `backup-${timestamp}.json`;
}

/**
 * Create a backup of the current profile
 * @returns {object} Backup info including filename and timestamp
 */
export async function backupProfile() {
  try {
    if (!fs.existsSync(PROFILE_PATH)) {
      console.log('⚠️  Profile file does not exist:', PROFILE_PATH);
      return { success: false, message: 'Profile file not found' };
    }

    // Read current profile
    const profileContent = fs.readFileSync(PROFILE_PATH, 'utf-8');
    const profile = JSON.parse(profileContent);
    
    // Create backup filename
    const backupFilename = getBackupFilename();
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    // Create backup file with metadata
    const backupData = {
      timestamp: new Date().toISOString(),
      sourceFile: PROFILE_PATH,
      fileSize: profileContent.length,
      profile: profile
    };
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
    
    console.log('✅ Profile backed up');
    console.log(`   File: ${backupFilename}`);
    console.log(`   Path: ${backupPath}`);
    console.log(`   Size: ${profileContent.length} bytes`);
    
    return {
      success: true,
      filename: backupFilename,
      path: backupPath,
      timestamp: new Date().toISOString(),
      size: profileContent.length
    };
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Restore profile from a backup
 * @param {string} backupFilename - Filename of backup to restore
 * @returns {object} Restore result
 */
export async function restoreProfile(backupFilename) {
  try {
    const backupPath = path.join(BACKUP_DIR, backupFilename);
    
    if (!fs.existsSync(backupPath)) {
      console.log('❌ Backup file not found:', backupPath);
      return { success: false, message: 'Backup file not found' };
    }
    
    // Read backup
    const backupContent = fs.readFileSync(backupPath, 'utf-8');
    const backupData = JSON.parse(backupContent);
    
    // Extract original profile
    const originalProfile = backupData.profile;
    
    // Restore to original location
    fs.writeFileSync(PROFILE_PATH, JSON.stringify(originalProfile, null, 2), 'utf-8');
    
    console.log('✅ Profile restored');
    console.log(`   From: ${backupFilename}`);
    console.log(`   To: ${PROFILE_PATH}`);
    console.log(`   Timestamp: ${backupData.timestamp}`);
    
    return {
      success: true,
      backupFilename: backupFilename,
      restoredTo: PROFILE_PATH,
      originalTimestamp: backupData.timestamp
    };
  } catch (error) {
    console.error('❌ Restore failed:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * List all available backups
 * @returns {array} Array of backup file objects
 */
export function listBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      console.log('📁 No backup directory found');
      return [];
    }
    
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .sort()
      .reverse(); // Most recent first
    
    const backups = files.map(filename => {
      const fullPath = path.join(BACKUP_DIR, filename);
      const stats = fs.statSync(fullPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const data = JSON.parse(content);
      
      return {
        filename: filename,
        path: fullPath,
        createdAt: stats.birthtime || stats.ctime,
        timestamp: data.timestamp,
        size: stats.size,
        profileSize: data.fileSize || 'unknown'
      };
    });
    
    return backups;
  } catch (error) {
    console.error('❌ Failed to list backups:', error.message);
    return [];
  }
}

/**
 * Display backups in table format
 */
export function displayBackups() {
  const backups = listBackups();
  
  if (backups.length === 0) {
    console.log('📁 No backups found in:', BACKUP_DIR);
    return;
  }
  
  console.log('\n📋 Available Backups:');
  console.log('═'.repeat(100));
  
  backups.forEach((backup, index) => {
    console.log(`\n${index + 1}. ${backup.filename}`);
    console.log(`   Timestamp:  ${backup.timestamp}`);
    console.log(`   Created:    ${backup.createdAt}`);
    console.log(`   Size:       ${backup.size} bytes`);
  });
  
  console.log('\n═'.repeat(100));
}

/**
 * Delete old backups (keep only N most recent)
 * @param {number} keepCount - Number of recent backups to keep (default: 10)
 */
export function cleanupOldBackups(keepCount = 10) {
  try {
    const backups = listBackups();
    
    if (backups.length <= keepCount) {
      console.log(`✅ Only ${backups.length} backups exist (keeping all, threshold: ${keepCount})`);
      return { success: true, deleted: 0 };
    }
    
    const toDelete = backups.slice(keepCount);
    let deleted = 0;
    
    toDelete.forEach(backup => {
      fs.unlinkSync(backup.path);
      deleted++;
      console.log(`🗑️  Deleted: ${backup.filename}`);
    });
    
    console.log(`✅ Cleanup complete: Deleted ${deleted} backups`);
    return { success: true, deleted: deleted };
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    return { success: false, message: error.message };
  }
}

/**
 * Get latest backup
 */
export function getLatestBackup() {
  const backups = listBackups();
  return backups.length > 0 ? backups[0] : null;
}

/**
 * Read and parse one backup snapshot, for the Version History / diff view.
 * backupData.profile is the ENTIRE original {timestamp, sourceFile, profile}
 * envelope (see backupProfile() above) — this unwraps it one level further
 * to return the same {timestamp, profile} shape GET /api/profile-view
 * already uses, so the frontend can treat "current" and "a past version"
 * identically.
 * @param {string} filename - Filename of the backup to read
 * @returns {{timestamp: string, profile: object}|null}
 */
export function getBackup(filename) {
  const backupPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(backupPath)) {
    return null;
  }
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));
  const envelope = backupData.profile; // the whole original envelope
  return { timestamp: envelope.timestamp, profile: envelope.profile };
}

/**
 * Create automatic backup before modification
 * Useful to call before any profile changes
 */
export async function ensureBackup() {
  console.log('🔄 Creating pre-modification backup...');
  const result = await backupProfile();
  // Snapshots are now taken far more often (every manual save, every
  // approved merge) than the occasional Python backfill run this default
  // was originally sized for — auto-prune so backup/ doesn't grow unbounded.
  cleanupOldBackups(10);
  return result;
}

export default {
  backupProfile,
  restoreProfile,
  listBackups,
  displayBackups,
  cleanupOldBackups,
  getLatestBackup,
  getBackup,
  ensureBackup,
  PROFILE_PATH,
  BACKUP_DIR
};
