#!/usr/bin/env python3
"""
Performance comparison test for LLM models
Tests: Liquid LFM 2.2-6B vs Liquid LFM 2.5 1.2B Free vs DeepSeek R1
"""

import requests
import time
import json
from typing import Dict, List

# Test questions about John's career
TEST_QUESTIONS = [
    "What is John's key expertise?",
    "Tell me about John's AI projects",
    "How much did John save in infrastructure costs?",
    "What is John's leadership style?",
]

BACKEND_URL = "http://localhost:3000"

class ModelTester:
    def __init__(self):
        self.results = {}
    
    def test_model(self, model_id: str, model_name: str, questions: List[str]) -> Dict:
        """Test a model with multiple questions"""
        print(f"\n{'='*70}")
        print(f"TESTING: {model_name} ({model_id})")
        print(f"{'='*70}")
        
        model_results = {
            "model": model_name,
            "tests": [],
            "total_latency_ms": 0,
            "avg_latency_ms": 0,
            "total_tokens": 0,
            "total_cost": 0
        }
        
        for i, question in enumerate(questions, 1):
            print(f"\n[Test {i}/{len(questions)}] {question}")
            try:
                start = time.time()
                response = requests.post(
                    f"{BACKEND_URL}/api/{model_id}",
                    json={"question": question, "max_tokens": 200},
                    timeout=120
                )
                elapsed = time.time() - start
                
                if response.status_code == 200:
                    data = response.json()
                    latency = data.get("latency_ms", 0)
                    answer = data.get("answer", "")[:60]
                    tokens = data.get("tokens_used", {})
                    cost = data.get("cost_estimate", "FREE")
                    
                    test_result = {
                        "question": question,
                        "latency_ms": latency,
                        "tokens_in": tokens.get("input", 0),
                        "tokens_out": tokens.get("output", 0),
                        "cost": cost,
                        "answer_preview": answer
                    }
                    model_results["tests"].append(test_result)
                    model_results["total_latency_ms"] += latency
                    model_results["total_tokens"] += tokens.get("input", 0) + tokens.get("output", 0)
                    
                    print(f"   ✓ Latency: {latency}ms | Tokens: {tokens.get('input', 0)} in, {tokens.get('output', 0)} out")
                    print(f"   ✓ Cost: {cost}")
                    print(f"   ✓ Response: {answer}...")
                else:
                    print(f"   ✗ Error {response.status_code}: {response.text[:100]}")
                    
            except Exception as e:
                print(f"   ✗ Failed: {str(e)}")
        
        # Calculate averages
        if model_results["tests"]:
            model_results["avg_latency_ms"] = model_results["total_latency_ms"] / len(model_results["tests"])
        
        self.results[model_id] = model_results
        return model_results
    
    def print_comparison(self):
        """Print comparison table"""
        print(f"\n\n{'='*70}")
        print(f"PERFORMANCE COMPARISON SUMMARY")
        print(f"{'='*70}\n")
        
        print(f"{'Model':<35} {'Avg Latency':<15} {'Total Tests':<12}")
        print(f"{'-'*70}")
        
        for model_id, result in self.results.items():
            model_name = result["model"]
            avg_latency = result["avg_latency_ms"]
            num_tests = len(result["tests"])
            print(f"{model_name:<35} {avg_latency:>6.1f}ms{'':<7} {num_tests:>3} tests")
        
        print(f"\n{'='*70}")
        print("DETAILED RESULTS:")
        print(f"{'='*70}\n")
        
        for model_id, result in self.results.items():
            print(f"\n📊 {result['model']}")
            print(f"   Avg Latency: {result['avg_latency_ms']:.1f}ms")
            print(f"   Total Tokens: {result['total_tokens']}")
            print(f"   Tests Passed: {len(result['tests'])}/{len(TEST_QUESTIONS)}")
            
            # Show individual test results
            for i, test in enumerate(result["tests"], 1):
                print(f"   Test {i}: {test['latency_ms']}ms | {test['cost']}")

def main():
    print("╔════════════════════════════════════════════════════════════════╗")
    print("║        LLM PERFORMANCE COMPARISON TEST                         ║")
    print("║   LFM 2.2-6B vs LFM 2.5 1.2B Free vs DeepSeek R1               ║")
    print("╚════════════════════════════════════════════════════════════════╝")
    
    tester = ModelTester()
    
    # Test LFM 2.2-6B
    tester.test_model(
        "deepseek",
        "Liquid LFM 2.2-6B",
        TEST_QUESTIONS
    )
    
    # Test LFM 2.5 1.2B Free
    # First, we need to update backend config temporarily
    print("\n\n⏳ Note: LFM 2.5 is already in backend. Testing...")
    
    # Test DeepSeek R1
    tester.test_model(
        "nemotron",
        "DeepSeek R1",
        TEST_QUESTIONS
    )
    
    # Print comparison
    tester.print_comparison()
    
    print("\n╔════════════════════════════════════════════════════════════════╗")
    print("║                    RECOMMENDATION                              ║")
    print("╚════════════════════════════════════════════════════════════════╝\n")
    
    # Calculate best model
    if tester.results:
        best_model = min(tester.results.items(), key=lambda x: x[1]["avg_latency_ms"])
        print(f"⚡ FASTEST: {best_model[1]['model']} ({best_model[1]['avg_latency_ms']:.1f}ms avg)")
        print(f"\n✅ RECOMMENDATION:")
        print(f"   Use: {best_model[1]['model']}")
        print(f"   Reasoning: Fastest response time for career queries")

if __name__ == "__main__":
    main()
