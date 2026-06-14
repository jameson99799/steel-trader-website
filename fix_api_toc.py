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

def normalize_text(text):
    text = re.sub(r'<[^>]+>', '', text)
    text = re.sub(r'[^a-zA-Z0-9]', ' ', text).lower()
    return ' '.join(text.split())

def fix_article_toc(article_data):
    content = article_data.get('content', '')
    if not content: return False

    soup = BeautifulSoup(content, 'html.parser')
    
    # NEW LOGIC: support BOTH href="#..." and data-target="..."
    toc_links_hash = soup.select('a[href^="#"]')
    toc_links_data = soup.select('a[data-target]')
    toc_links = toc_links_hash + toc_links_data
    
    if not toc_links:
        return False
        
    changes_made = 0
    all_headings = soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'b', 'strong', 'div', 'span'])
    
    for link in toc_links:
        target_id = link.get('data-target') or link.get('href', '').lstrip('#')
        if not target_id:
            continue
            
        if soup.find(id=target_id):
            continue
            
        link_text = normalize_text(link.get_text())
        id_text = normalize_text(target_id.replace('-', ' '))
        if not link_text: continue

        best_heading = None
        for h in all_headings:
            if 'data-target' in str(h) or target_id in str(h):
                continue
            
            h_text = normalize_text(h.get_text())
            if not h_text or len(h_text) < 5:
                continue
                
            if h.name in ['h1','h2','h3','h4','h5','h6'] and (h_text == link_text or link_text in h_text or id_text in h_text):
                best_heading = h
                break
                
            if not best_heading and (h_text == link_text or link_text in h_text):
                best_heading = h
                
        if best_heading:
            best_heading['id'] = target_id
            changes_made += 1
            print(f"      Mapped #{target_id} -> <{best_heading.name}> {best_heading.get_text().strip()[:40]}")

    if changes_made > 0:
        new_html = str(soup)
        update_article(article_data['id'], new_html)
        print(f"   => Successfully updated {changes_made} headings for ID {article_data['id']}.")
        return True
    return False

articles = fetch_latest_articles()
print(f"Scanning the latest {len(articles)} articles...")

fixed_count = 0
for a in articles:
    print(f"Checking ID {a['id']}: {a.get('title_en', '')[:50]}")
    full_data = fetch_article(a['id'])
    
    if fix_article_toc(full_data):
        fixed_count += 1

print(f"Finished. Fixed {fixed_count} articles.")
