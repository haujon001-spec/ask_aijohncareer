import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

export function loadEnv(projectRoot) {
  const envPaths = [
    path.join(projectRoot, '.env.local'),
    path.join(projectRoot, '.env.vps'),
    path.join(projectRoot, '.env'),
  ];

  console.log('🔍 [jd-api] Loading environment variables...');
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      console.log(`  ✓ Found: ${envPath}`);
      dotenv.config({ path: envPath, override: true });
    }
  }
}
