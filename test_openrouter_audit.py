#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Audit: Test OpenRouter Free Models directly
Shows exact error responses
"""
import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('.env.local', override=True)
OPENROUTER_KEY = os.getenv('OPENROUTER_API_KEY', 'NOT_SET')

print("=" * 80)
print("OPENROUTER FREE MODELS AUDIT")
print("=" * 80)
print(f"\nAPI Key Status: {OPENROUTER_KEY[:20]}...{'(SET)' if OPENROUTER_KEY != 'NOT_SET' else '(MISSING)'}")

models_to_test = [
    {
        'name': 'NVIDIA Nemotron 3 Super 120B',
        'model': 'nvidia/nemotron-3-super-120b',
        'cost': 'FREE'
    },
    {
        'name': 'MiniMax M2.5',
        'model': 'minimax/minimax-m2.5',
        'cost': 'FREE'
    },
    {
        'name': 'Qwen3 Next 80B',
        'model': 'qwen/qwen3-next-80b-a3b-instruct',
        'cost': 'FREE'
    }
]

print("\n" + "=" * 80)
print("TESTING MODELS")
print("=" * 80)

question = "What are John's key achievements?"

for model_info in models_to_test:
    print(f"\n📊 Testing: {model_info['name']} ({model_info['cost']})")
    print(f"   Model ID: {model_info['model']}")
    
    try:
        response = requests.post(
            'https://openrouter.ai/api/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {OPENROUTER_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': model_info['model'],
                'messages': [
                    {
                        'role': 'system',
                        'content': 'You are a helpful assistant.'
                    },
                    {
                        'role': 'user',
                        'content': question
                    }
                ],
                'max_tokens': 256
            },
            timeout=15
        )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            answer = data.get('choices', [{}])[0].get('message', {}).get('content', 'No response')
            print(f"   ✅ SUCCESS")
            print(f"   Response: {answer[:100]}...")
        else:
            error_data = response.json()
            print(f"   ❌ FAILED")
            print(f"   Error: {error_data.get('error', {}).get('message', response.text)}")
            if 'error' in error_data:
                print(f"   Full Error: {json.dumps(error_data['error'], indent=2)}")
                
    except requests.exceptions.Timeout:
        print(f"   ⏱️  TIMEOUT (>15s)")
    except Exception as e:
        print(f"   ⚠️  EXCEPTION: {str(e)[:100]}")

print("\n" + "=" * 80)
print("DIAGNOSIS COMPLETE")
print("=" * 80)
print("\nIF ALL TESTS FAILED WITH 401:")
print("  ❌ OpenRouter API key is invalid or account not verified")
print("  ✅ Solution: Switch to working alternative")
print("\nIF SOME TESTS PASSED:")
print("  ✅ Use only the models that passed")
print("=" * 80 + "\n")
