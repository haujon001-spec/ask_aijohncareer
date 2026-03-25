#!/usr/bin/env python3
import requests
import time

print("╔════════════════════════════════════════════════════════════════╗")
print("║     PERFORMANCE TEST: LFM 2.5 Free vs DeepSeek R1              ║")
print("╚════════════════════════════════════════════════════════════════╝\n")

questions = [
    "What is John's background?",
    "Tell me about John's AI work",
    "What are John's key achievements?"
]

results = {"lfm_free": [], "deepseek": []}

# Test LFM 2.5 Free
print("TESTING: Liquid LFM 2.5 1.2B (Free)")
print("="*70)
for i, q in enumerate(questions, 1):
    print(f"\nTest {i}: {q}")
    try:
        resp = requests.post("http://localhost:3000/api/deepseek",
            json={"question": q, "max_tokens": 150}, timeout=60)
        if resp.status_code == 200:
            data = resp.json()
            latency = data.get("latency_ms", 0)
            tokens = data.get("tokens_used", {})
            results["lfm_free"].append(latency)
            print(f"  ✓ Latency: {latency}ms")
            print(f"  ✓ Tokens: {tokens.get('input', 0)} → {tokens.get('output', 0)}")
            print(f"  ✓ Response: {data.get('answer', '')[:50]}...")
        else:
            print(f"  ✗ Error {resp.status_code}")
    except Exception as e:
        print(f"  ✗ Failed: {e}")

# Test DeepSeek R1
print("\n\nTESTING: DeepSeek R1")
print("="*70)
for i, q in enumerate(questions, 1):
    print(f"\nTest {i}: {q}")
    try:
        resp = requests.post("http://localhost:3000/api/nemotron",
            json={"question": q, "max_tokens": 150}, timeout=120)
        if resp.status_code == 200:
            data = resp.json()
            latency = data.get("latency_ms", 0)
            tokens = data.get("tokens_used", {})
            results["deepseek"].append(latency)
            print(f"  ✓ Latency: {latency}ms")
            print(f"  ✓ Tokens: {tokens.get('input', 0)} → {tokens.get('output', 0)}")
            print(f"  ✓ Response: {data.get('answer', '')[:50]}...")
        else:
            print(f"  ✗ Error {resp.status_code}")
    except Exception as e:
        print(f"  ✗ Failed: {e}")

# Summary
print("\n\n╔════════════════════════════════════════════════════════════════╗")
print("║                    SUMMARY                                     ║")
print("╚════════════════════════════════════════════════════════════════╝\n")

if results["lfm_free"]:
    avg_lfm = sum(results["lfm_free"]) / len(results["lfm_free"])
    print(f"LFM 2.5 Free:")
    print(f"  Tests passed: {len(results['lfm_free'])}/3")
    print(f"  Average latency: {avg_lfm:.0f}ms")
    print(f"  Cost: FREE ✓\n")
else:
    print("LFM 2.5 Free: FAILED ✗\n")

if results["deepseek"]:
    avg_ds = sum(results["deepseek"]) / len(results["deepseek"])
    print(f"DeepSeek R1:")
    print(f"  Tests passed: {len(results['deepseek'])}/3")
    print(f"  Average latency: {avg_ds:.0f}ms")
    print(f"  Cost: FREE ✓\n")
else:
    print("DeepSeek R1: FAILED ✗\n")

print("╔════════════════════════════════════════════════════════════════╗")
print("║                    VERDICT                                     ║")
print("╚════════════════════════════════════════════════════════════════╝\n")

if results["lfm_free"] and results["deepseek"]:
    avg_lfm = sum(results["lfm_free"]) / len(results["lfm_free"])
    avg_ds = sum(results["deepseek"]) / len(results["deepseek"])
    
    if avg_lfm < avg_ds:
        winner = "LFM 2.5 Free"
        ratio = avg_ds / avg_lfm
        print(f"⚡ WINNER: {winner}")
        print(f"   {ratio:.1f}x FASTER than DeepSeek R1\n")
    else:
        winner = "DeepSeek R1"
        ratio = avg_lfm / avg_ds
        print(f"⚡ WINNER: {winner}")
        print(f"   {ratio:.1f}x FASTER than LFM 2.5\n")
    
    print("RECOMMENDATION FOR PRODUCTION:")
    print(f"✅ Use {winner}")
    print(f"   - Best speed/performance ratio")
    print(f"   - Both cost FREE")
    print(f"   - Reliable for career queries")
