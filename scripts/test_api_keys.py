#!/usr/bin/env python3
import os
import json
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load .env.local
env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path, override=True)

print("=" * 70)
print("API KEY VERIFICATION & TESTING")
print("=" * 70)
print()

# 1. Confirm keys exist
print("1. API KEYS IN .env.local:")
or_key = os.getenv("OPENROUTER_API_KEY")
ds_key = os.getenv("DEEPSEEK_API_KEY")

if or_key:
    print(f"   ✓ OpenRouter: {or_key[:30]}...")
else:
    print("   ✗ OpenRouter: NOT FOUND")

if ds_key:
    print(f"   ✓ DeepSeek: {ds_key[:30]}...")
else:
    print("   ✗ DeepSeek: NOT FOUND")

print()
print("2. TESTING LIQUID LFM (OpenRouter via backend):")
try:
    resp = requests.post(
        "http://localhost:3000/api/deepseek",
        json={"question": "What is John's background?", "max_tokens": 100},
        timeout=30
    )
    data = resp.json()
    if "error" in data:
        print(f"   ✗ Error: {data['error']}")
    elif "answer" in data:
        print(f"   ✓ SUCCESS! Latency: {data['latency_ms']}ms")
        print(f"   Model: {data['model']}")
        print(f"   Response: {data['answer'][:70]}...")
    else:
        print(f"   ? Response: {json.dumps(data, indent=2)}")
except Exception as e:
    print(f"   ✗ Failed: {str(e)}")

print()
print("3. TESTING DEEPSEEK R1 (Direct API):")
try:
    if not ds_key:
        print("   ✗ No API key found")
    else:
        headers = {
            "Authorization": f"Bearer {ds_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "deepseek-reasoner",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello"}
            ],
            "max_tokens": 100
        }
        resp = requests.post(
            "https://api.deepseek.com/chat/completions",
            json=payload,
            headers=headers,
            timeout=30
        )
        if resp.status_code == 200:
            data = resp.json()
            print(f"   ✓ SUCCESS! API is working")
            print(f"   Response: {data['choices'][0]['message']['content'][:70]}...")
        else:
            print(f"   ✗ Status {resp.status_code}: {resp.text[:100]}")
except Exception as e:
    print(f"   ✗ Failed: {str(e)}")

print()
print("4. TESTING OPENROUTER DIRECTLY:")
try:
    if not or_key:
        print("   ✗ No API key found")
    else:
        headers = {
            "Authorization": f"Bearer {or_key}",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Johns Career Test",
            "Content-Type": "application/json"
        }
        payload = {
            "model": "liquid/lfm-2.2-6b",
            "messages": [
                {"role": "system", "content": "You are a helpful assistant."},
                {"role": "user", "content": "Say hello"}
            ],
            "max_tokens": 100
        }
        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=30
        )
        if resp.status_code == 200:
            data = resp.json()
            print(f"   ✓ SUCCESS! API is working")
            print(f"   Response: {data['choices'][0]['message']['content'][:70]}...")
        else:
            print(f"   ✗ Status {resp.status_code}: {resp.text[:150]}")
except Exception as e:
    print(f"   ✗ Failed: {str(e)}")

print()
print("=" * 70)
print("SUMMARY")
print("=" * 70)
print("Keys Location: .env.local ✓")
print("Backend Status: Check above tests")
print("=" * 70)
