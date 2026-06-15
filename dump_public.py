import urllib.request
import json
import os

req = urllib.request.Request("https://www.sunseasteel.com/api/public/news?limit=200", headers={"User-Agent": "Mozilla/5.0"})
try:
    res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
    # The public API usually returns { data: [...] } or { news: [...] }
    items = res.get('news', res.get('data', []))
    with open("live_news.txt", "w", encoding="utf-8") as f:
        for i in items:
            f.write(f"{i.get('slug')} || {i.get('title_en', i.get('title'))}\n")
    print("Saved live news")
except Exception as e:
    print("Error:", e)
