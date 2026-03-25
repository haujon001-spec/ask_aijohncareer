#!/usr/bin/env python3

import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env.local or .env if present
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env.local'), override=True)
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'), override=True)


# Get API key from environment variable
OPENROUTER_API_KEY = os.getenv('OPENROUTER_API_KEY')
if not OPENROUTER_API_KEY:
    raise RuntimeError('OPENROUTER_API_KEY not set. Please add it to .env.local or your environment.')

resp = requests.post('https://openrouter.ai/api/v1/chat/completions',
    headers={
        'Authorization': f'Bearer {OPENROUTER_API_KEY}',
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
