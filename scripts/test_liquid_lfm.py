#!/usr/bin/env python3
import requests

# Test Liquid LFM directly
system_msg = 'You are John Career Copilot - helpful AI assistant about John Hau professional experience.'

questions = [
    'What are Johns key achievements?',
    'What is Johns favorite hobby?'
]

for q in questions:
    resp = requests.post(
        'https://openrouter.ai/api/v1/chat/completions',
        headers={
            'Authorization': 'Bearer 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',
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Test'
        },
        json={
            'model': 'liquid/lfm-2.2-6b',
            'messages': [
                {'role': 'system', 'content': system_msg},
                {'role': 'user', 'content': q}
            ],
            'max_tokens': 512
        },
        timeout=30
    )
    print(f'Q: {q[:40]}')
    print(f'Status: {resp.status_code}')
    if resp.status_code == 200:
        data = resp.json()
        content = data['choices'][0]['message'].get('content')
        print(f'Content: {content is not None}')
        if content:
            print(f'Length: {len(content)}')
    else:
        print(f'Error: {resp.text[:100]}')
    print()
