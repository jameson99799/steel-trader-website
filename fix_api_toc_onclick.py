import urllib.request
import json
import re
from bs4 import BeautifulSoup

API_KEY = 'ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5'
BASE_URL = 'https://www.sunseasteel.com/api/external'
HEADERS = {'X-API-Key': API_KEY, 'User-Agent': 'Mozilla/5.0'}

def fetch_latest_articles():
    req = urllib.request.Request(f"{BASE_URL}/news?limit=25", headers=HEADERS)
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode('utf-8'))
    return data.get('news', [])

def fetch_article(a_id):
    req = urllib.request.Request(f"{BASE_URL}/news/{a_id}", headers=HEADERS)
    response = urllib.request.urlopen(req)
    return json.loads(response.read().decode('utf-8'))

def update_article(a_id, new_content):
    payload = json.dumps({'content': new_content}).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/news/{a_id}", data=payload, headers={
        'X-API-Key': API_KEY, 
        'User-Agent': 'Mozilla/5.0',
        'Content-Type': 'application/json'
    }, method='PUT')
    response = urllib.request.urlopen(req)
    return response.getcode()

def fix_article_toc(article_data):
    content = article_data.get('content', '')
    if not content: return False

    soup = BeautifulSoup(content, 'html.parser')
    
    # AI generated TOC links use data-target and onclick. We need to strip these and make them standard anchors.
    toc_links_data = soup.select('a[data-target]')
    
    changes_made = 0
    
    for link in toc_links_data:
        target_id = link.get('data-target')
        if not target_id:
            continue
            
        # Clean the link
        link['href'] = f"#{target_id}"
        if 'onclick' in link.attrs:
            del link['onclick']
        if 'data-target' in link.attrs:
            del link['data-target']
            
        changes_made += 1
        print(f"      Cleaned TOC Link -> href='#{target_id}'")

    if changes_made > 0:
        # Standardize HTML back
        new_html = str(soup)
        update_article(article_data['id'], new_html)
        print(f"   => Successfully updated {changes_made} TOC links for ID {article_data['id']} to Native HTML hashes.")
        return True
    return False

articles = fetch_latest_articles()
print(f"Scanning the latest {len(articles)} articles to STRIP AI javascript links...")

fixed_count = 0
for a in articles:
    full_data = fetch_article(a['id'])
    
    if fix_article_toc(full_data):
        print(f"Fixed {a['id']}: {a.get('title_en', '')[:50]}")
        fixed_count += 1

print(f"Finished. Fixed {fixed_count} articles.")
