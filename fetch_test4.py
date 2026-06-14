import urllib.request
import json

API_KEY = 'ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5'
BASE_URL = 'https://www.sunseasteel.com/api/external'

req = urllib.request.Request(f"{BASE_URL}/news?limit=15")
req.add_header('X-API-Key', API_KEY)
req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')

try:
    response = urllib.request.urlopen(req)
    raw = response.read().decode('utf-8')
    print("Success. Payload length:", len(raw))
    data = json.loads(raw)
    if isinstance(data, list):
        articles = data
    else:
        articles = data.get('data', [])
    print(f"Fetched {len(articles)} articles!")
    if articles:
        with open('first_article.html', 'w', encoding='utf-8') as f:
            f.write(articles[0].get('content', ''))
        print("Written to first_article.html:", articles[0]['title_en'])
except Exception as e:
    import traceback
    traceback.print_exc()
