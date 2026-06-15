import urllib.request
import urllib.parse
import json

api_key = "ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5"
headers = {
    "X-API-Key": api_key,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

searches = [
    "Which Pre-Painted Steel Coil Is Better",
    "Galvanized Steel Coil vs Galvalume Steel Coil",
    "PPGL Ridge Cap",
    "PPGL T Profile",
    "PPGL Corrugated Roofing",
    "PPGI Corrugated Roofing"
]

results = {}

for s in searches:
    url = "https://www.sunseasteel.com/api/external/news?search=" + urllib.parse.quote(s)
    req = urllib.request.Request(url, headers=headers)
    try:
        res = json.loads(urllib.request.urlopen(req).read().decode('utf-8'))
        
        found_any = False
        if 'data' in res and len(res['data']) > 0:
            for item in res['data']:
                article_id = item['id']
                url2 = f"https://www.sunseasteel.com/api/external/news/{article_id}"
                req2 = urllib.request.Request(url2, headers=headers)
                art = json.loads(urllib.request.urlopen(req2).read().decode('utf-8'))
                results[article_id] = art
                print(f"Fetched ID {article_id}: {item.get('title_en', item.get('title', ''))}")
                found_any = True
        
        if not found_any:
            print(f"Not found: {s}")
    except Exception as e:
        print(f"Error fetching {s} : {e}")

with open("articles_live.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print("Saved to articles_live.json")
