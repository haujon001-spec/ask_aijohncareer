#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Comprehensive model availability test (March 26, 2026)
Tests which models actually work with current API keys
"""
import requests
import json
from dotenv import load_dotenv
import os

# Load env - use absolute path since script runs from project root
import sys
import os as os_module
script_dir = os_module.path.dirname(os_module.path.abspath(__file__))
project_root = os_module.path.dirname(script_dir)
env_path = os_module.path.join(project_root, '.env.local')

load_dotenv(env_path, override=True)

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')

print("\n" + "="*100)
print("COMPREHENSIVE MODEL AVAILABILITY TEST")
print("="*100)
print(f"\nOpenRouter Key: {OPENROUTER_API_KEY[:30] if OPENROUTER_API_KEY else 'NOT SET'}...")
print(f"DeepSeek Key: {DEEPSEEK_API_KEY[:30] if DEEPSEEK_API_KEY else 'NOT SET'}...")

# OpenRouter models to test
openrouter_models = [
    # Current models used
    ('mistralai/mistral-7b-instruct:free', 'Mistral 7B Instruct (Current - NOT WORKING)'),
    
    # Google Gemini (testing)
    ('google/gemini-3.1-flash-lite-preview:free', 'Google Gemini 3.1 Flash Lite (Free)'),
    ('google/gemini-3.1-flash-lite-preview', 'Google Gemini 3.1 Flash Lite'),
    ('google/gemini-2.0-flash-lite-preview:free', 'Google Gemini 2.0 Flash Lite (Free)'),
    ('google/gemini-2.0-flash-lite-preview', 'Google Gemini 2.0 Flash Lite'),
    
    # Other alternatives
    ('nvidia/nemotron-3-super-120b-a12b:free', 'NVIDIA Nemotron 3 Super 120B (Free)'),
    ('minimax/minimax-m2.5:free', 'Minimax M2.5 (Free)'),
    ('qwen/qwen3-next-80b-a3b-instruct:free', 'Qwen3 Next 80B (Free)'),
    ('liquid/lfm-2.2-6b', 'Liquid LFM 2.2 6B'),
]

print("\n" + "-"*100)
print("OPENROUTER MODELS TEST")
print("-"*100)

working_openrouter = []
failing_openrouter = []

for model_id, model_name in openrouter_models:
    try:
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENROUTER_API_KEY}',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'Johns Career Copilot',
                'Content-Type': 'application/json'
            },
            json={
                'model': model_id,
                'messages': [
                    {'role': 'user', 'content': 'Hello, who are you?'}
                ],
                'max_tokens': 100
            },
            timeout=20
        )
        
        if response.status_code == 200:
            data = response.json()
            answer = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            working_openrouter.append((model_id, model_name))
            print(f"✅ {model_name}")
            print(f"   ID: {model_id}")
            print(f"   Response: {answer[:80]}...\n")
        else:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', 'Unknown')
            except:
                error_msg = f"HTTP {response.status_code}"
            failing_openrouter.append((model_id, model_name, error_msg))
            print(f"❌ {model_name}")
            print(f"   ID: {model_id}")
            print(f"   Error: {error_msg}\n")
            
    except Exception as e:
        failing_openrouter.append((model_id, model_name, str(e)[:50]))
        print(f"❌ {model_name}")
        print(f"   ID: {model_id}")
        print(f"   Exception: {str(e)[:50]}\n")

# DeepSeek models to test
deepseek_models = [
    ('deepseek-reasoner', 'DeepSeek R1 (Current - NOT WORKING)'),
    ('deepseek-chat', 'DeepSeek Chat'),
]

print("\n" + "-"*100)
print("DEEPSEEK MODELS TEST")
print("-"*100)

working_deepseek = []
failing_deepseek = []

for model_id, model_name in deepseek_models:
    try:
        response = requests.post(
            'https://api.deepseek.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': model_id,
                'messages': [
                    {'role': 'user', 'content': 'Hello, who are you?'}
                ],
                'max_tokens': 100
            },
            timeout=20
        )
        
        if response.status_code == 200:
            data = response.json()
            answer = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            working_deepseek.append((model_id, model_name))
            print(f"✅ {model_name}")
            print(f"   Model: {model_id}")
            print(f"   Response: {answer[:80]}...\n")
        else:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', 'Unknown')
            except:
                error_msg = f"HTTP {response.status_code}"
            failing_deepseek.append((model_id, model_name, error_msg))
            print(f"❌ {model_name}")
            print(f"   Model: {model_id}")
            print(f"   Error: {error_msg}\n")
            
    except Exception as e:
        failing_deepseek.append((model_id, model_name, str(e)[:50]))
        print(f"❌ {model_name}")
        print(f"   Model: {model_id}")
        print(f"   Exception: {str(e)[:50]}\n")

# Summary
print("\n" + "="*100)
print("SUMMARY")
print("="*100)

print(f"\n✅ WORKING OPENROUTER MODELS: {len(working_openrouter)}")
for model_id, model_name in working_openrouter:
    print(f"   - {model_name}")

print(f"\n✅ WORKING DEEPSEEK MODELS: {len(working_deepseek)}")
for model_id, model_name in working_deepseek:
    print(f"   - {model_name}")

if not working_openrouter and not working_deepseek:
    print("\n⚠️  NO WORKING MODELS FOUND")
    print("\nPossible causes:")
    print("   1. OpenRouter/DeepSeek account restrictions (\"User not found\" errors)")
    print("   2. Region-specific API access limits")
    print("   3. Free tier models not available in your account")
    print("\nRecommendation:")
    print("   - Contact OpenRouter/DeepSeek support about 'User not found' errors")
    print("   - Check account settings for regional or tier restrictions")
else:
    print("\n✅ Available models can be used in backend integration")

print("\n" + "="*100)
