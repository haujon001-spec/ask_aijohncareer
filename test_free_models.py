#!/usr/bin/env python
# -*- coding: utf-8 -*-
import requests
import json
import time

models = ['deepseek', 'llama', 'qwen', 'mixtral']
question = "What are John's key achievements?"

print("=" * 70)
print("TESTING ALL 4 FREE MODELS")
print("=" * 70)

for model in models:
    print(f"\n[{model.upper()}] Testing...")
    try:
        start = time.time()
        response = requests.post(
            f'http://localhost:3000/api/{model}',
            json={'question': question, 'reasoning': False, 'max_tokens': 512},
            timeout=60
        )
        elapsed = time.time() - start
        
        print(f"Status: {response.status_code}")
        data = response.json()
        
        if response.status_code == 200:
            answer = data.get('answer', 'No answer')
            print(f"✅ Model: {data.get('model', 'N/A')}")
            print(f"   Answer: {answer[:150]}...")
            print(f"   Cost: {data.get('cost_estimate', '$0.00')}")
            print(f"   Latency: {elapsed:.2f}s")
        else:
            print(f"❌ Error: {data.get('error', 'Unknown error')}")
            
    except requests.exceptions.Timeout:
        print(f"❌ Timeout after 60s")
    except Exception as e:
        print(f"❌ Exception: {str(e)}")

print("\n" + "=" * 70)
print("TEST COMPLETE")
print("=" * 70)
