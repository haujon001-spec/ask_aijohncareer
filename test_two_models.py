#!/usr/bin/env python3
import requests
import json

q = 'What are Johns key achievements?'

print('=== Testing Liquid LFM ===')
try:
    r = requests.post('http://localhost:3000/api/deepseek', 
                     json={'question': q, 'reasoning': False, 'max_tokens': 200}, 
                     timeout=30)
    if r.status_code == 200:
        d = r.json()
        ans = d.get('answer')
        print(f'Answer is None: {ans is None}')
        print(f'Answer len: {len(ans) if ans else 0}')
        if ans:
            print(f'Sample: {str(ans)[:120]}')
    else:
        print(f'Error {r.status_code}')
except Exception as e:
    print(f'Exception: {e}')

print('\n=== Testing StepFun ===')
try:
    r = requests.post('http://localhost:3000/api/nemotron', 
                     json={'question': q, 'reasoning': False, 'max_tokens': 200}, 
                     timeout=60)
    if r.status_code == 200:
        d = r.json()
        ans = d.get('answer')
        print(f'Answer is None: {ans is None}')
        print(f'Answer len: {len(ans) if ans else 0}')
        if ans:
            print(f'Sample: {str(ans)[:120]}')
        else:
            print(f'Full response keys: {list(d.keys())}')
    else:
        print(f'Error {r.status_code}: {r.text[:100]}')
except Exception as e:
    print(f'Exception: {e}')
