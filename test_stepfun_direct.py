#!/usr/bin/env python3
import requests

# Direct OpenRouter call to StepFun (bypass backend)
resp = requests.post('https://openrouter.ai/api/v1/chat/completions',
    headers={
        'Authorization': 'Bearer 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',
        'HTTP-Referer': 'http://localhost:3000'
    },
    json={
        'model': 'stepfun/step-3.5-flash:free',
        'messages': [
            {'role': 'system', 'content': 'You are a helpful AI assistant.'},
            {'role': 'user', 'content': 'What are Johns key achievements?'}
        ],
        'max_tokens': 200
    },
    timeout=30
)

print(f'Status: {resp.status_code}')
if resp.status_code == 200:
    d = resp.json()
    msg = d['choices'][0]['message']
    content = msg.get('content')
    reasoning = msg.get('reasoning')
    
    print(f'Has content field: {content is not None}')
    if content:
        print(f'Content: {content[:100]}')
    else:
        print(f'Content is: {content}')
    
    print(f'Has reasoning field: {reasoning is not None}')
    if reasoning:
        print(f'Reasoning: {str(reasoning)[:100]}')
else:
    print(f'Error: {resp.status_code}')
    print(resp.text[:300])
