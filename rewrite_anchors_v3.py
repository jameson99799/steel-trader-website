import json
import re
import urllib.request

api_key = "ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5"
headers = {
    "X-API-Key": api_key,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)"
}

with open("failing_articles_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

targets = ['163', '164', '165', '166', '167']

for tid in targets:
    if tid not in data: continue
    art = data[tid]
    content = art['content']
    
    # 1. Find all anchor hrefs that start with #
    anchor_hrefs = re.findall(r'<a[^>]*href=["\'](#.*?)["\'][^>]*>', content, re.IGNORECASE)
    
    # Deduplicate while preserving order
    unique_hrefs = []
    for ah in anchor_hrefs:
        if ah not in unique_hrefs:
            unique_hrefs.append(ah)
            
    if not unique_hrefs:
        print(f"ID {tid} has no hash anchors. Skipping.")
        continue

    changed = False
    for i, href_val in enumerate(unique_hrefs):
        old_id = href_val.replace('#', '')
        new_id = f"toc-sec-{i+1}"
        
        if old_id == new_id or old_id.startswith('toc-sec-'):
            continue
            
        # Global replace href
        content = re.sub(f'href=["\']#{re.escape(old_id)}["\']', f'href="#{new_id}"', content, flags=re.IGNORECASE)
        # Global replace id on any tag
        content = re.sub(f'id=["\']{re.escape(old_id)}["\']', f'id="{new_id}"', content, flags=re.IGNORECASE)
        changed = True

    if changed:
        # PUT updated content to server
        url = f"https://www.sunseasteel.com/api/external/news/{tid}"
        payload = json.dumps({"content": content}).encode('utf-8')
        req = urllib.request.Request(url, data=payload, headers=headers, method="PUT")
        
        try:
            res = urllib.request.urlopen(req).read().decode('utf-8')
            print(f"Successfully updated ID {tid}")
        except Exception as e:
            print(f"Error updating ID {tid}: {e}")
    else:
        print(f"ID {tid} needed no changes.")
