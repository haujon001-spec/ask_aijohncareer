#!/usr/bin/env python3
"""
test_backend.py — Test LLM API endpoints
"""
import requests
import json
import time
import sys
import io

# Fix encoding for Windows
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

BASE_URL = "http://localhost:3000"
MODELS = ["deepseek", "llama", "qwen", "mixtral"]

def test_health():
    """Check backend health"""
    try:
        response = requests.get(f"{BASE_URL}/api/health", timeout=5)
        print(f"✅ Health Check: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Health check failed: {e}")
        return False

def test_model(model_name):
    """Test a specific LLM model"""
    payload = {
        "question": "Tell me about John's AI work in 2-3 sentences.",
        "reasoning": False,
        "max_tokens": 256
    }
    
    try:
        print(f"\n🔄 Testing {model_name}...", end=" ")
        start = time.time()
        response = requests.post(
            f"{BASE_URL}/api/{model_name}",
            json=payload,
            timeout=60
        )
        elapsed = time.time() - start
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ ({elapsed:.1f}s)")
            print(f"   Model: {data.get('model')}")
            print(f"   Latency: {data.get('latency_ms')}ms")
            print(f"   Cost: {data.get('cost_estimate')}")
            print(f"   Answer: {data.get('answer')[:100]}...")
            return True
        else:
            print(f"❌ Status {response.status_code}")
            print(f"   {response.text[:200]}")
            return False
    except requests.exceptions.Timeout:
        print(f"❌ Timeout (>60s)")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

def main():
    print("🧪 Testing John's Career Copilot Backend\n")
    print("=" * 60)
    
    # Test health
    if not test_health():
        print("\n❌ Backend not responding. Is it running on port 3000?")
        return
    
    print("\n" + "=" * 60)
    print("Testing LLM Models...")
    print("=" * 60)
    
    results = {}
    for model in MODELS:
        results[model] = test_model(model)
    
    print("\n" + "=" * 60)
    print("Summary:")
    for model, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {model:12} {status}")
    
    passed_count = sum(1 for p in results.values() if p)
    print(f"\n{passed_count}/{len(MODELS)} models working\n")

if __name__ == "__main__":
    main()
