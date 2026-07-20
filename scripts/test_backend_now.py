#!/usr/bin/env python3
import requests
import json

print("=" * 80)
print("DIRECT BACKEND API TESTS - March 26, 2026")
print("=" * 80)

# Test 1: Mistral 7B via backend
print("\n[1] Testing Mistral 7B via /api/deepseek endpoint")
try:
    r = requests.post('http://localhost:3000/api/deepseek',
        json={'question': 'Hello, WHO ARE YOU?', 'reasoning': False, 'max_tokens': 100},
        timeout=30)
    print(f"Status: {r.status_code}")
    data = r.json()
    if r.status_code == 200:
        print(f"✅ SUCCESS - Answer: {data.get('answer', 'N/A')[:100]}")
    else:
        print(f"❌ ERROR - {data.get('error', r.text)}")
except Exception as e:
    print(f"❌ EXCEPTION: {e}")

# Test 2: DeepSeek R1 via backend
print("\n[2] Testing DeepSeek R1 via /api/nemotron endpoint")
try:
    r = requests.post('http://localhost:3000/api/nemotron',
        json={'question': 'Hello, WHO ARE YOU?', 'reasoning': False, 'max_tokens': 100},
        timeout=30)
    print(f"Status: {r.status_code}")
    data = r.json()
    if r.status_code == 200:
        print(f"✅ SUCCESS - Answer: {data.get('answer', 'N/A')[:100]}")
    else:
        print(f"❌ ERROR - {data.get('error', r.text)}")
except Exception as e:
    print(f"❌ EXCEPTION: {e}")

print("\n" + "=" * 80)
