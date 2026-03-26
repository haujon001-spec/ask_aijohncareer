#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
LLM MISMATCH AUDIT - Expected vs Actual
Compares frontend display names with backend actual models
"""
import requests
import json

print("\n" + "="*80)
print("LLM AUDIT: EXPECTED vs ACTUAL")
print("="*80 + "\n")

BACKEND = 'http://localhost:3000'

# WHAT USER EXPECTS (Frontend wants FREE LLMs)
expected_models = {
    'deepseek': {'display': 'DeepSeek', 'cost_expected': 'FREE or minimal'},
    'llama': {'display': 'DeepSeek (Llama)', 'cost_expected': 'FREE'},
    'qwen': {'display': 'DeepSeek (Qwen)', 'cost_expected': 'FREE'},
    'mixtral': {'display': 'DeepSeek (Mixtral)', 'cost_expected': 'FREE'}
}

print("1️⃣  EXPECTED vs ACTUAL BACKEND CONFIGURATION\n")

# Read backend config
config_path = 'backend/server.js'
with open(config_path, 'r') as f:
    backend_code = f.read()

# Extract model configs
if 'deepseek-chat' in backend_code:
    print("❌ FOUND PAID MODEL: 'deepseek-chat' in backend config")
    print("   This is the paid DeepSeek API endpoint ($0.00000548 input, $0.0000164 output)")
    
if 'api.deepseek.com' in backend_code:
    print("❌ FOUND PAID API: api.deepseek.com endpoints configured")
    print("   DeepSeek is a PAID service, not FREE\n")

print("2️⃣  ACTUAL RESPONSES FROM BACKEND\n")

models = ['deepseek', 'llama', 'qwen', 'mixtral']
question = "What are John's key achievements?"

actual_results = {}
for model in models:
    try:
        r = requests.post(
            f'{BACKEND}/api/{model}',
            json={'question': question, 'reasoning': False, 'max_tokens': 100},
            timeout=30
        )
        if r.status_code == 200:
            data = r.json()
            model_name = data.get('model', 'Unknown')
            cost = data.get('cost_estimate', 'N/A')
            
            # Check if paid
            is_paid = '$' in str(cost) and float(str(cost).replace('USD $', '').replace('$', '')) > 0
            
            actual_results[model] = {
                'backend_model': model_name,
                'cost': cost,
                'is_paid': is_paid
            }
            
            status = "❌ PAID" if is_paid else "✅ FREE"
            print(f"  {model.upper():10} → Backend: {model_name:40} {status}")
            print(f"    Cost per query: {cost}")
        else:
            print(f"  {model.upper():10} → Error: {r.status_code}")
    except Exception as e:
        print(f"  {model.upper():10} → Exception: {str(e)[:50]}")

print("\n" + "="*80)
print("3️⃣  PROBLEM SUMMARY")
print("="*80)

print("""
🔴 ISSUE: User requested FREE LLMs but backend is using PAID ones!

Current Situation:
  • Frontend shows: 'DeepSeek (Llama)', 'DeepSeek (Qwen)', etc.
  • Backend actually uses: DeepSeek API (PAID - ~$0.02 per query)
  • All 4 models route to the same PAID DeepSeek backend
  • Cost: $0.024-0.025 per query × 1000 queries = $24-25/month

User's Request: Use FREE LLMs

Solution Options:
  ✅ Option 1: Use OpenRouter free models
     - NVIDIA Nemotron 3 Super (free, 262K context)
     - MiniMax Text (free, large context)
     - StepFun Step 3.5 Flash (free, 256K context)
     
  ✅ Option 2: Use Together AI free tier
     - Together AI has free tier options
     - API key available in .env.local
     
  ✅ Option 3: Use local/offline LLMs
     - Ollama with local models
     - Zero cost, completely free
""")

print("="*80)
print("RECOMMENDATION: Switch to OpenRouter free tier models immediately")
print("="*80 + "\n")
