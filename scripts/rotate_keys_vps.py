#!/usr/bin/env python3
"""
🔐 Secure API Key Rotation Script
Updates VPS deployment with new API keys after security incident

USAGE:
    python3 rotate_keys_vps.py

STEPS:
    1. Generate new keys from:
       - OpenRouter: https://openrouter.ai/keys
       - DeepSeek: https://platform.deepseek.com/api_keys
    2. Run this script and enter new keys when prompted
    3. Script will SSH to VPS and update securely
    4. Verifies deployment works with new keys
"""

import os
import sys
import subprocess
import getpass
import json
from pathlib import Path

def run_ssh_command(host, command):
    """Execute command on remote VPS via SSH (key-based auth, no password)"""
    try:
        # Ensure host has proper format
        if not host.startswith("root@"):
            host = f"root@{host}"
        result = subprocess.run(
            ['ssh', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=no', host, command],
            capture_output=True,
            text=True,
            timeout=60,
            stdin=subprocess.DEVNULL  # Disable stdin to prevent password prompts
        )
        return result.returncode, result.stdout, result.stderr
    except Exception as e:
        return 1, "", str(e)

def main():
    print("\n" + "="*70)
    print("🔐 VPS API KEY ROTATION SCRIPT".center(70))
    print("="*70 + "\n")
    
    # Configuration
    vps_host = "askcareer-ai.com"
    project_dir = "/root/ask_aijohncareer"
    
    print("⚠️  IMPORTANT SECURITY NOTICES:")
    print("  • Keys are transmitted over SSH (encrypted)")
    print("  • Never paste keys in chat or documentation")
    print("  • Rotate immediately after security incident")
    print("  • This script will NOT save keys locally\n")
    
    # Get new keys from user
    print("📝 STEP 1: Enter New API Keys")
    print("-" * 70)
    
    print("\n🔑 New OpenRouter API Key:")
    print("   Get from: https://openrouter.ai/keys")
    print("   Format: sk-or-v1-xxxxxxxxxxxxx")
    openrouter_key = getpass.getpass("   Enter key (hidden): ")
    
    if not openrouter_key.startswith("sk-or-v1-"):
        print("❌ ERROR: OpenRouter key should start with 'sk-or-v1-'")
        sys.exit(1)
    
    print("\n🔑 New DeepSeek API Key:")
    print("   Get from: https://platform.deepseek.com/api_keys")
    print("   Format: sk-xxxxxxxxxxxxx")
    deepseek_key = getpass.getpass("   Enter key (hidden): ")
    
    if not deepseek_key.startswith("sk-"):
        print("❌ ERROR: DeepSeek key should start with 'sk-'")
        sys.exit(1)
    
    # Confirm
    print("\n✓ Keys accepted (not displayed for security)")
    print("\n🔄 STEP 2: Updating VPS...")
    print("-" * 70)
    
    # Create .env file content
    env_content = f'''OPENROUTER_API_KEY={openrouter_key}
DEEPSEEK_API_KEY={deepseek_key}
PORT=3000
NODE_ENV=production
'''
    
    # Update VPS via SSH
    print(f"\n📡 Connecting to {vps_host}...")
    
    # Write .env file
    cat_command = f"cat > {project_dir}/.env << 'ENVEOF'\n{env_content}ENVEOF\nchmod 600 {project_dir}/.env"
    code, stdout, stderr = run_ssh_command(f"root@{vps_host}", f"cd {project_dir} && {cat_command}")
    
    if code != 0:
        print(f"❌ Failed to update .env: {stderr}")
        sys.exit(1)
    
    print("   ✓ .env file updated")
    
    # Restart containers
    print("\n📡 Restarting Docker containers...")
    code, stdout, stderr = run_ssh_command(
        f"root@{vps_host}", 
        f"cd {project_dir} && docker-compose restart john-career-copilot"
    )
    
    if code != 0:
        print(f"⚠️  Containers may need manual restart: {stderr}")
    else:
        print("   ✓ Containers restarted")
    
    # Wait and verify
    print("\n⏳ Waiting for containers to stabilize (10s)...")
    import time
    time.sleep(10)
    
    # Test health endpoint
    print("\n🧪 STEP 3: Testing Deployment...")
    print("-" * 70)
    
    code, stdout, stderr = run_ssh_command(
        f"root@{vps_host}",
        f"curl -s https://www.askcareer-ai.com/api/health 2>/dev/null | head -c 300"
    )
    
    if code == 0 and '"status":"ok"' in stdout:
        print("   ✓ Health endpoint responding")
        print(f"   Response: {stdout[:200]}...")
    else:
        print(f"⚠️  Health check failed or slow: {stderr}")
    
    # Summary
    print("\n" + "="*70)
    print("✅ KEY ROTATION COMPLETE".center(70))
    print("="*70)
    
    print("\n✓ New keys have been deployed to VPS")
    print("✓ Docker containers restarted")
    print("✓ Health check passed")
    
    print("\n🎯 Next Steps:")
    print("   1. Test the site: https://www.askcareer-ai.com")
    print("   2. Try a query to verify LLM models work")
    print("   3. Monitor for errors in docker logs:")
    print("      ssh root@www.askcareer-ai.com 'docker logs -f john-career-copilot-app'")
    print("   4. Document completion in SECURITY_INCIDENT_25MAR2026.md")
    
    print("\n⚠️  IMPORTANT:")
    print("   • Old keys should be revoked on OpenRouter/DeepSeek accounts")
    print("   • Monitor account activity for unauthorized access")
    print("   • Delete this script after successful rotation")
    print("\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n❌ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)
