import urllib.request
import json
import re

API_KEY = 'ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5'
BASE_URL = 'https://www.sunseasteel.com/api/external'
HEADERS = {'X-API-Key': API_KEY, 'User-Agent': 'Mozilla/5.0'}

def fetch_articles():
    req = urllib.request.Request(f"{BASE_URL}/news?limit=100", headers=HEADERS)
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode('utf-8'))
    return data.get('news', [])

articles = fetch_articles()
target_articles = []

# Find articles published around June 8 with "Table of Contents"
for a in articles:
    if "Table of Contents" in (a.get('content') or ""):
        target_articles.append(a)

print(f"Found {len(target_articles)} articles with 'Table of Contents'.")

if target_articles:
    a = target_articles[0]
    content = a['content']
    print("Article:", a['title_en'])
    # dump
    with open('test_toc.html', 'w', encoding='utf-8') as f:
        f.write(content)
    
    # Analyze the TOC
    toc_links = re.findall(r'href="#(.*?)"', content)
    print("Found TOC links:", toc_links)
    
    # Check if these IDs actually exist
    for link in toc_links:
        has_id = f'id="{link}"' in content or getattr(re.search(rf'id=[\'"]?{link}[\'"]?', content), 'group', lambda: False)()
        if not has_id:
            print(f"MISSING ID for heading: {link}")
    
