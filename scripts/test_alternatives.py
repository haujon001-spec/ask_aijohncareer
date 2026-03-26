#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Test new model alternatives for failing ones
"""
import requests
import json
from dotenv import load_dotenv
import os

# Load env
load_dotenv('../.env.local', override=True)

OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
DEEPSEEK_API_KEY = os.getenv('DEEPSEEK_API_KEY')

print("\n" + "="*90)
print("TESTING NEW MODEL ALTERNATIVES")
print("="*90)

# Test OpenRouter models
or_models = [
    ('qwen/qwen3-embedding-8b', 'Qwen3 Embedding 8B'),
    ('liquid/lfm-2.2-6b', 'Liquid LFM 2.2 6B'),
    ('google/gemini-3.1-flash-lite-preview:free', 'Google Gemini 3.1 Flash Lite (Free)'),
    ('google/gemini-3.1-flash-lite-preview', 'Google Gemini 3.1 Flash Lite'),
]

print("\n" + "-"*90)
print("OPENROUTER MODELS")
print("-"*90)

for model_id, model_name in or_models:
    print(f"\n📡 {model_name}")
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
                    {'role': 'user', 'content': 'What is John Hau famous for?'}
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
                error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                print(f"   ❌ {error_msg[:100]}")
            except:
                print(f"   ❌ HTTP {status}")
                
    except Exception as e:
        print(f"   ❌ EXCEPTION: {str(e)[:80]}")

print("\n" + "-"*90)
print("DEEPSEEK MODELS")
print("-"*90)

deepseek_models = [
    ('deepseek-reasoner', 'DeepSeek R1 (Reasoner)'),
    ('deepseek-chat', 'DeepSeek Chat (original)'),
]

for model, name in deepseek_models:
    print(f"\n📡 {name}")
    print(f"   Model: {model}")
    
    try:
        response = requests.post(
            'https://api.deepseek.com/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {DEEPSEEK_API_KEY}',
                'Content-Type': 'application/json'
            },
            json={
                'model': model,
                'messages': [
                    {'role': 'user', 'content': 'What is John Hau famous for?'}
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
                error_msg = error_data.get('error', {}).get('message', 'Unknown error')
                print(f"   ❌ {error_msg[:100]}")
            except:
                print(f"   ❌ HTTP {status}: {response.text[:100]}")
                
    except Exception as e:
        print(f"   ❌ EXCEPTION: {str(e)[:80]}")

print("\n" + "="*90)
