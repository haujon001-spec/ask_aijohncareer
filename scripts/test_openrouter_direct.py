#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Direct OpenRouter API testing
Bypasses backend to test API keys and endpoints directly
"""
import requests
import json
from dotenv import load_dotenv
import os

# Load env
load_dotenv('../.env.local', override=True)

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

print("\n" + "="*90)
print("OPENROUTER DIRECT API TEST")
print("="*90)

if not OPENROUTER_API_KEY:
    print("❌ No OPENROUTER_API_KEY found in .env.local")
    exit(1)

print(f"✅ API Key loaded: {OPENROUTER_API_KEY[:20]}...")

# Test models
models = [
    ('nvidia/nemotron-3-super-120b-a12b:free', 'NVIDIA Nemotron 3 Super 120B (Free)'),
    ('minimax/minimax-m2.5:free', 'Minimax M2.5 (Free)'),
    ('qwen/qwen3-next-80b-a3b-instruct:free', 'Qwen3 Next 80B (Free)'),
    ('google/gemini-3.1-flash-lite-preview:free', 'Google Gemini 3.1 Flash Lite (Free)'),
    ('google/gemini-3.1-flash-lite-preview', 'Google Gemini 3.1 Flash Lite'),
]

print("\n" + "-"*90)
print("Testing each model with OpenRouter direct API call...")
print("-"*90)

for model_id, model_name in models:
    print(f"\n📡 Testing: {model_name}")
    print(f"   Model ID: {model_id}")
    
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
                    {'role': 'user', 'content': 'Say hello briefly'}
                ],
                'max_tokens': 50
            },
            timeout=30
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ SUCCESS")
            print(f"   Response: {data.get('choices', [{}])[0].get('message', {}).get('content', '')[:60]}")
            print(f"   Tokens: {data.get('usage', {})}")
        else:
            print(f"   ❌ ERROR: {response.status_code}")
            try:
                error_data = response.json()
                print(f"   Error Details: {json.dumps(error_data, indent=2)[:200]}")
            except:
                print(f"   Response: {response.text[:200]}")
                
    except Exception as e:
        print(f"   ❌ EXCEPTION: {str(e)[:100]}")

print("\n" + "="*90)
print("DeepSeek Direct Test (for comparison)")
print("="*90)

deepseek_key = os.getenv('DEEPSEEK_API_KEY')
if deepseek_key:
    print(f"✅ DeepSeek API Key loaded: {deepseek_key[:20]}...")
    
    try:
        response = requests.post(
            'https://api.deepseek.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {deepseek_key}',
                'Content-Type': 'application/json'
            },
            json={
                'model': 'deepseek-chat',
                'messages': [
                    {'role': 'user', 'content': 'Say hello briefly'}
                ],
                'max_tokens': 50
            },
            timeout=30
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ DeepSeek working")
            print(f"Response: {data.get('choices', [{}])[0].get('message', {}).get('content', '')[:60]}")
            print(f"Tokens: {data.get('usage', {})}")
        else:
            print(f"❌ DeepSeek error: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Exception: {str(e)[:100]}")
else:
    print("❌ No DeepSeek API key found")

print("\n" + "="*90)
