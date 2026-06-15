import urllib.request
import json
import urllib.parse
import os

titles = [
    "PPGI vs PPGL Steel Coil",
    "What Is a PPGI Corrugated"
]

header = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

for t in titles:
    url = "https://www.sunseasteel.com/api/public/news?search=" + urllib.parse.quote(t)
    req = urllib.request.Request(url, headers=header)
    try:
        res_raw = urllib.request.urlopen(req).read()
        res = json.loads(res_raw)
        
        slug = None
        if 'data' in res and len(res['data']) > 0:
            slug = res['data'][0]['slug']
        elif type(res) is list and len(res) > 0:
            slug = res[0]['slug']
        
        if slug:
            print("Found slug:", slug)
            req2 = urllib.request.Request(f"https://www.sunseasteel.com/api/public/news/{slug}", headers=header)
            art = json.loads(urllib.request.urlopen(req2).read())
            
            filename = slug[:30] + ".json"
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(art, f, ensure_ascii=False, indent=2)
            print("Saved to", filename)
        else:
            print("Not found (empty response):", res)
    except Exception as e:
        print("Error fetching", t, e)
