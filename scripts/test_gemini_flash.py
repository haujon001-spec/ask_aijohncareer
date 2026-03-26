#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test Google Gemini 3.1 Flash Lite Preview model via OpenRouter
"""
import requests
import json
from dotenv import load_dotenv
import os

# Load env
load_dotenv('../.env.local', override=True)

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

print("\n" + "="*90)
print("GOOGLE GEMINI 3.1 FLASH LITE PREVIEW - OPENROUTER TEST")
print("="*90)

if not OPENROUTER_API_KEY:
    print("❌ No OPENROUTER_API_KEY found in .env.local")
    exit(1)

print(f"✅ API Key loaded: {OPENROUTER_API_KEY[:20]}...")

# Test Gemini model - try both with and without :free suffix
models_to_test = [
    ('google/gemini-3.1-flash-lite-preview:free', 'Google Gemini 3.1 Flash Lite Preview (Free)'),
    ('google/gemini-3.1-flash-lite-preview', 'Google Gemini 3.1 Flash Lite Preview'),
]

print("\n" + "-"*90)
print("Testing Gemini 3.1 Flash Lite Preview model variations...")
print("-"*90)

test_questions = [
    'Hello, who are you?',
    'What is John Hau famous for? Keep it brief.',
    'Who is John?'
]

for model_id, model_name in models_to_test:
    print(f"\n📡 Testing: {model_name}")
    print(f"   Model ID: {model_id}")
    
    for question in test_questions:
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
                        {'role': 'user', 'content': question}
                    ],
                    'max_tokens': 150
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                answer = data.get('choices', [{}])[0].get('message', {}).get('content', 'No response')
                usage = data.get('usage', {})
                print(f"\n   ✅ SUCCESS ({question})")
                print(f"      Answer: {answer[:100]}...")
                print(f"      Tokens: input={usage.get('prompt_tokens')}, output={usage.get('completion_tokens')}")
                break  # If this model works, move to next model
            else:
                if 'not_found' in response.text.lower() or 'does not exist' in response.text.lower():
                    print(f"   ⚠️  Model not found ({response.status_code})")
                else:
                    print(f"   ❌ ERROR: {response.status_code}")
                    try:
                        error_data = response.json()
                        error_msg = error_data.get('error', {}).get('message', str(error_data)[:100])
                        print(f"      Error: {error_msg}")
                    except:
                        print(f"      Response: {response.text[:100]}")
                        
        except Exception as e:
            print(f"   ❌ EXCEPTION: {str(e)[:100]}")

print("\n" + "="*90)
print("TEST COMPLETE")
print("="*90)
