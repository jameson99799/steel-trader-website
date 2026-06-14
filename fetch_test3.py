import urllib.request
import json
import re

API_KEY = 'ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5'
BASE_URL = 'https://www.sunseasteel.com/api/external'

def fetch_articles():
    req = urllib.request.Request(f"{BASE_URL}/news?limit=15")
    req.add_header('X-API-Key', API_KEY)
    req.add_header('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    try:
        response = urllib.request.urlopen(req)
        data = json.loads(response.read().decode('utf-8'))
        return data.get('data', [])
    except Exception as e:
        print("Fetch error:", e)
        return []

articles = fetch_articles()
print(f"Fetched {len(articles)} articles.")

# Dump the first article to inspect TOC and headings manually first!
if articles:
    with open('article_dump.html', 'w', encoding='utf-8') as f:
        f.write(articles[0].get('content', ''))
    print(f"Dumped article {articles[0]['id']} content to article_dump.html")
    print(articles[0]['title_en'])
