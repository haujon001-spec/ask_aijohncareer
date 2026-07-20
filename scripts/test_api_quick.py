#!/usr/bin/env python3
import requests
import json

print("=== Testing Mistral 7B Instruct ===")
try:
    resp = requests.post('http://localhost:3000/api/deepseek', 
        json={'question': 'Who is John?', 'reasoning': False, 'max_tokens': 100},
        timeout=30)
    print(f"Status: {resp.status_code}")
    print(f"Response:\n{resp.text}\n")
except Exception as e:
    print(f"Error: {e}\n")

print("=== Testing DeepSeek R1 ===")
try:
    resp = requests.post('http://localhost:3000/api/nemotron', 
        json={'question': 'Who is John?', 'reasoning': False, 'max_tokens': 100},
        timeout=30)
    print(f"Status: {resp.status_code}")
    print(f"Response:\n{resp.text}\n")
except Exception as e:
    print(f"Error: {e}\n")
