#!/usr/bin/env python3
import requests
import json

print("=" * 80)
print("BACKEND API TEST - WITH NEW MODELS")
print("=" * 80)

# Test 1: Google Gemini 3.1 Flash via backend
print("\n[1] Testing Google Gemini 3.1 Flash via /api/deepseek endpoint")
try:
    r = requests.post('http://localhost:3000/api/deepseek',
        json={'question': 'Hello, who are you?', 'reasoning': False, 'max_tokens': 100},
        timeout=30)
    print(f"Status: {r.status_code}")
    data = r.json()
    if r.status_code == 200:
        ans = data.get('answer', 'N/A')
        print(f"✅ SUCCESS - Answer: {ans[:100]}")
    else:
        print(f"❌ ERROR - {data.get('error', r.text)}")
except Exception as e:
    print(f"❌ EXCEPTION: {e}")

# Test 2: DeepSeek R1 via backend
print("\n[2] Testing DeepSeek R1 via /api/nemotron endpoint")
try:
    r = requests.post('http://localhost:3000/api/nemotron',
        json={'question': 'Hello, who are you?', 'reasoning': False, 'max_tokens': 100},
        timeout=30)
    print(f"Status: {r.status_code}")
    data = r.json()
    if r.status_code == 200:
        ans = data.get('answer', 'N/A')
        print(f"✅ SUCCESS - Answer: {ans[:100]}")
    else:
        print(f"❌ ERROR - {data.get('error', r.text)}")
except Exception as e:
    print(f"❌ EXCEPTION: {e}")

print("\n" + "=" * 80)
