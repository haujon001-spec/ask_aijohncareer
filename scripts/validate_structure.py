#!/usr/bin/env python3
"""
validate_structure.py — Validate project folder structure per soul.md

Purpose: Pre-commit hook to enforce soul.md folder structure compliance.
Ensures all required directories exist and files are in correct locations.

Usage:
  python scripts/validate_structure.py

Date: 25 MAR 2026
Governance: soul.md §1 (Universal Folder Structure)
"""

import os
import sys
from pathlib import Path

# Define required folder structure per soul.md §1
REQUIRED_FOLDERS = [
    "src",
    "src/components",
    "src/data",
    "src/hooks",
    "src/utils",
    "public",
    "config",
    "data_raw",
    "data_processed",
    "etl",
    "models",
    "dashboards",
    "reports_html",
    "qa",
    "scripts",
    "docs",
    "docs/setup",
    "docs/guides",
    "docs/architecture",
    "docs/api",
    "docs/project",
    "docs/status",
    "logs",
]

REQUIRED_FILES = {
    ".gitignore": "Must exist to ignore secrets and logs",
    ".pre-commit-config.yaml": "Pre-commit hooks configuration",
    "soul.md": "Project governance guidelines",
    "package.json": "Node.js dependencies",
    "vite.config.js": "Vite configuration",
    "src/data/john_profile.json": "Resume knowledge base",
}

GITIGNORED_PATTERNS = [
    "/secrets/",
    ".env.local",
    ".env.vps",
    ".env",
    "/logs/",
    "node_modules/",
    "*.log",
]

def check_folder_structure():
    """Check if all required folders exist."""
    missing_folders = []
    project_root = Path.cwd()

    for folder in REQUIRED_FOLDERS:
        folder_path = project_root / folder
        if not folder_path.exists():
            missing_folders.append(folder)
        elif not folder_path.is_dir():
            missing_folders.append(f"{folder} (exists but is not a directory)")

    return missing_folders

def check_required_files():
    """Check if all required files exist."""
    missing_files = []
    project_root = Path.cwd()

    for file, reason in REQUIRED_FILES.items():
        file_path = project_root / file
        if not file_path.exists():
            missing_files.append(f"{file}: {reason}")

    return missing_files

def check_gitignore():
    """Check if .gitignore contains required patterns."""
    gitignore_path = Path.cwd() / ".gitignore"
    
    if not gitignore_path.exists():
        return ["✗ .gitignore does not exist"]

    with open(gitignore_path, 'r') as f:
        gitignore_content = f.read()

    missing_patterns = []
    for pattern in GITIGNORED_PATTERNS:
        if pattern not in gitignore_content:
            missing_patterns.append(f"Pattern '{pattern}' not found in .gitignore")

    return missing_patterns

def check_no_secrets():
    """Check for exposed secrets in tracked files."""
    project_root = Path.cwd()
    secrets_found = []

    secret_patterns = [
        "DEEPSEEK_API_KEY",
        "TOGETHER_API_KEY",
        "OPENROUTER_API_KEY",
        "sk-",
        "api_key",
    ]

    # Check Python files
    for py_file in project_root.rglob("*.py"):
        if "venv" in str(py_file) or "__pycache__" in str(py_file):
            continue
        
        with open(py_file, 'r', errors='ignore') as f:
            content = f.read()
            for pattern in secret_patterns:
                if pattern.lower() in content.lower() and "example" not in content.lower():
                    secrets_found.append(f"Possible secret in {py_file}: {pattern}")

    # Check JS/JSX files
    for js_file in project_root.rglob("*.{js,jsx}"):
        if "node_modules" in str(js_file):
            continue
        
        with open(js_file, 'r', errors='ignore') as f:
            content = f.read()
            for pattern in secret_patterns:
                if pattern in content and "example" not in content.lower():
                    secrets_found.append(f"Possible secret in {js_file}: {pattern}")

    return secrets_found

def main():
    """Run all validation checks."""
    print("🔍 Validating project structure per soul.md...\n")

    all_errors = []

    # Check folders
    print("1️⃣  Checking required folders...")
    missing_folders = check_folder_structure()
    if missing_folders:
        print(f"   ✗ Missing folders:")
        for folder in missing_folders:
            print(f"     - {folder}")
        all_errors.extend(missing_folders)
    else:
        print("   ✅ All required folders exist")

    # Check files
    print("\n2️⃣  Checking required files...")
    missing_files = check_required_files()
    if missing_files:
        print(f"   ✗ Missing files:")
        for file in missing_files:
            print(f"     - {file}")
        all_errors.extend(missing_files)
    else:
        print("   ✅ All required files exist")

    # Check .gitignore
    print("\n3️⃣  Checking .gitignore...")
    missing_patterns = check_gitignore()
    if missing_patterns:
        print(f"   ✗ .gitignore issues:")
        for pattern in missing_patterns:
            print(f"     - {pattern}")
        all_errors.extend(missing_patterns)
    else:
        print("   ✅ .gitignore is properly configured")

    # Check for secrets
    print("\n4️⃣  Scanning for exposed secrets...")
    secrets_found = check_no_secrets()
    if secrets_found:
        print(f"   ⚠️  Potential secrets found:")
        for secret in secrets_found[:5]:  # Show first 5
            print(f"     - {secret}")
        all_errors.extend(secrets_found)
    else:
        print("   ✅ No exposed secrets detected")

    # Summary
    print("\n" + "="*60)
    if all_errors:
        print(f"❌ Validation FAILED ({len(all_errors)} issues)\n")
        for error in all_errors:
            print(f"   - {error}")
        print("\n💡 Fix issues and try again: git commit")
        sys.exit(1)
    else:
        print("✅ Validation PASSED — Project structure is compliant\n")
        sys.exit(0)

if __name__ == "__main__":
    main()
