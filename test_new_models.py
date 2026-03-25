#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test specific OpenRouter models with new API key
"""
import requests
import json
from dotenv import load_dotenv
import os

# Load env
load_dotenv('.env.local', override=True)

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')

print("\n" + "="*90)
print("TESTING NEW OPENROUTER MODELS")
print("="*90)

if not OPENROUTER_API_KEY:
    print("❌ No OPENROUTER_API_KEY found")
    exit(1)

print(f"✅ API Key: {OPENROUTER_API_KEY[:30]}...")

# Test specific models
test_models = [
    ('minimax/minimax-m2.5:free', 'Minimax M2.5 (Free)'),
    ('mistralai/mistral-small-3.1-24b-instruct:free', 'Mistral Small 3.1 24B (Free)'),
]

print("\n" + "-"*90)
print("Testing models...")
print("-"*90)

for model_id, model_name in test_models:
    print(f"\n📡 Model: {model_name}")
    print(f"   ID: {model_id}")
    
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
                    {'role': 'user', 'content': 'John has expertise in infrastructure. Say hello.'}
                ],
                'max_tokens': 100
            },
            timeout=30
        )
        
        status = response.status_code
        print(f"   Status: {status}")
        
        if status == 200:
            data = response.json()
            answer = data.get('choices', [{}])[0].get('message', {}).get('content', '')
            tokens = data.get('usage', {})
            print(f"   ✅ SUCCESS")
            print(f"   Response: {answer[:80]}")
            print(f"   Tokens: {tokens}")
        else:
            try:
                error_data = response.json()
                print(f"   ❌ ERROR {status}")
                error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                print(f"   Message: {error_msg}")
            except:
                print(f"   ❌ ERROR {status}")
                print(f"   Response: {response.text[:150]}")
                
    except Exception as e:
        print(f"   ❌ EXCEPTION: {str(e)[:100]}")

print("\n" + "="*90)
