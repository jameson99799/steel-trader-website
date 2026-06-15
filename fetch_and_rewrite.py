import urllib.request
import json
import urllib.parse
import re

api_key = "ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5"
headers = {
    "X-API-Key": api_key,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

# The target articles
targets = [
    "PPGI vs PPGL Steel Coil",
    "Galvanized Steel Coil vs Galvalume Steel Coil",
    "What Is a PPGL Ridge Cap",
    "What Is a PPGL T Profile",
    "What Is a PPGL Corrugated",
    "PPGI Corrugated Roofing Sheet"
]

print("Fetching all news...")
url = "https://www.sunseasteel.com/api/external/news?limit=200"
req = urllib.request.Request(url, headers=headers)
try:
    res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    all_news = res.get('news', [])
    print(f"Found {len(all_news)} total news items.")
    
    found_articles = {}
    
    for news in all_news:
        title = news.get("title_en") or news.get("title") or ""
        for t in targets:
            # simple substring check ignoring case
            if t.lower() in title.lower():
                print(f"Match found for '{t}' -> ID: {news['id']}, Title: {title}")
                url2 = f"https://www.sunseasteel.com/api/external/news/{news['id']}"
                req2 = urllib.request.Request(url2, headers=headers)
                art_data = json.loads(urllib.request.urlopen(req2).read().decode('utf-8'))
                found_articles[news['id']] = art_data
                break

    with open("failing_articles_data.json", "w", encoding="utf-8") as f:
        json.dump(found_articles, f, ensure_ascii=False, indent=2)
    print("Saved matching articles.")
except Exception as e:
    print("Error:", e)
