#!/usr/bin/env python3
"""Test all 4 LLM models"""
import requests
import json
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:3000"
MODELS = ["deepseek", "llama", "qwen", "mixtral"]

payload = {
    "question": "What's John's leadership style?",
    "reasoning": False,
    "max_tokens": 256
}

print("=" * 70)
print("TESTING ALL 4 LLM MODELS")
print("=" * 70)

for model in MODELS:
    print(f"\n[{model.upper()}]")
    print("-" * 70)
    
    try:
        start = time.time()
        r = requests.post(f"{BASE_URL}/api/{model}", json=payload, timeout=60)
        elapsed = time.time() - start
        
        if r.status_code == 200:
            data = r.json()
            print(f"Status: {r.status_code} OK")
            print(f"Model: {data.get('model')}")
            print(f"Latency: {data.get('latency_ms')}ms ({elapsed:.1f}s)")
            print(f"Cost: {data.get('cost_estimate')}")
            print(f"Tokens: {data.get('tokens_used')}")
            print(f"\nAnswer: {data.get('answer')[:300]}...")
            print("✅ WORKING")
        else:
            print(f"Status: {r.status_code}")
            print(f"Error: {r.text[:200]}")
            print("❌ FAILED")
            
    except requests.exceptions.Timeout:
        print(f"Timeout (>60s)")
        print("❌ FAILED")
    except Exception as e:
        print(f"Error: {str(e)[:200]}")
        print("❌ FAILED")

print("\n" + "=" * 70)
