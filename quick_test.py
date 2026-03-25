import requests
r = requests.post('http://localhost:3000/api/llama', json={'question': "What's John's leadership?", 'max_tokens': 256})
print(f"Status: {r.status_code}")
print(f"Response: {r.json()}")
