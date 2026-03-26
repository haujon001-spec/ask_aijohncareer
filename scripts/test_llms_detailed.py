#!/usr/bin/env python3
"""
test_llms_detailed.py — Test each LLM individually with full debug info
"""
import requests
import json
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:3000"
QUESTION = "What's John's leadership style?"

MODELS = {
    "deepseek": "DeepSeek-R1",
    "llama": "Llama 3.1 (70B)",
    "qwen": "Qwen 2.5 (32B)",
    "mixtral": "Mixtral 8x7B"
}

def test_model(model_id, model_name):
    """Test a single LLM with detailed error reporting"""
    print(f"\n{'='*70}")
    print(f"Testing: {model_name} ({model_id})")
    print('='*70)
    
    payload = {
        "question": QUESTION,
        "reasoning": False,
        "max_tokens": 512
    }
    
    try:
        start = time.time()
        print(f"Sending request to: {BASE_URL}/api/{model_id}")
        print(f"Payload: {json.dumps(payload, indent=2)}")
        print(f"\nWaiting for response...")
        
        response = requests.post(
            f"{BASE_URL}/api/{model_id}",
            json=payload,
            timeout=60
        )
        elapsed = time.time() - start
        
        print(f"\nResponse Status: {response.status_code}")
        print(f"Response Time: {elapsed:.1f}s")
        print(f"Response Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"\n✅ SUCCESS")
            print(f"   Model: {data.get('model')}")
            print(f"   Latency: {data.get('latency_ms')}ms")
            print(f"   Cost: {data.get('cost_estimate')}")
            print(f"   Tokens: {data.get('tokens_used')}")
            print(f"\n   Answer ({len(data.get('answer', ''))} chars):")
            print(f"   {data.get('answer')[:300]}...\n")
            return True
        else:
            print(f"\n❌ ERROR ({response.status_code})")
            try:
                error_data = response.json()
                print(f"   Error: {error_data.get('error')}")
                print(f"   Hint: {error_data.get('hint')}")
                print(f"   Full Response:\n{json.dumps(error_data, indent=2)}")
            except:
                print(f"   Raw Response: {response.text[:500]}")
            return False
            
    except requests.exceptions.Timeout:
        print(f"\n❌ TIMEOUT (>60s)")
        return False
    except Exception as e:
        print(f"\n❌ EXCEPTION: {type(e).__name__}: {e}")
        return False

def main():
    print("\n" + "="*70)
    print("LLM Detailed Testing - John's Leadership Style Question")
    print("="*70)
    
    results = {}
    for model_id, model_name in MODELS.items():
        results[model_id] = test_model(model_id, model_name)
    
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)
    for model_id, model_name in MODELS.items():
        status = "✅ WORKING" if results[model_id] else "❌ FAILED"
        print(f"{model_name:20} {status}")
    
    passed = sum(1 for v in results.values() if v)
    print(f"\nTotal: {passed}/{len(MODELS)} models working\n")

if __name__ == "__main__":
    main()
