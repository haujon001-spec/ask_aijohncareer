#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test StepFun Step 3.5 Flash model
"""
import requests
import json
from dotenv import load_dotenv
import os

# Load env
load_dotenv('../.env.local', override=True)

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

print("\n" + "="*90)
print("TESTING STEPFUN STEP 3.5 FLASH")
print("="*90)

if not OPENROUTER_API_KEY:
    print("❌ No OPENROUTER_API_KEY found")
    exit(1)

print(f"✅ API Key: {OPENROUTER_API_KEY[:30]}...")

# Test StepFun model
model_id = 'stepfun/step-3.5-flash:free'
model_name = 'StepFun Step 3.5 Flash (Free)'

print(f"\n📡 Model: {model_name}")
print(f"   ID: {model_id}")
print(f"   Testing with 3 different questions...\n")

test_questions = [
    "What are John's key achievements?",
    "Tell me about John's role at Morgan Stanley",
    "What is John's favorite food?"
]

for i, question in enumerate(test_questions, 1):
    print(f"   Test {i}: {question[:50]}...")
    
    try:
        import time
        start = time.time()
        
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
        
        elapsed = time.time() - start
        status = response.status_code
        
        if status == 200:
            data = response.json()
            answer = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            tokens = data.get('usage', {})
            print(f"      ✅ SUCCESS ({elapsed:.1f}s)")
            print(f"      Response: {answer[:60]}...")
            print(f"      Tokens: {tokens.get('prompt_tokens', 0)} input, {tokens.get('completion_tokens', 0)} output")
        else:
            try:
                error_data = response.json()
                error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                print(f"      ❌ HTTP {status}: {error_msg[:80]}")
            except:
                print(f"      ❌ HTTP {status}: {response.text[:80]}")
                
    except Exception as e:
        print(f"      ❌ EXCEPTION: {str(e)[:80]}")
    
    print()

print("="*90)
