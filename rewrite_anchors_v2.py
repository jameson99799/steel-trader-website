import json
import re
import urllib.request

api_key = "ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5"
headers = {
    "X-API-Key": api_key,
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
}

with open("failing_articles_data.json", "r", encoding="utf-8") as f:
    data = json.load(f)

targets = ['163', '164', '165', '166', '167']

for tid in targets:
    if tid not in data: continue
    art = data[tid]
    content = art['content']
    
    # In these articles, the TOC is just a <ul> block at the top, usually the first <ul>
    toc_match = re.search(r'(<ul[^>]*>.*?<\/ul>)', content, re.IGNORECASE | re.DOTALL)
    if not toc_match:
        print(f"ID {tid} has no UL. Skipping.")
        continue
        
    toc_inner = toc_match.group(1)
    
    anchors = re.findall(r'<a[^>]*href=["\'](#.*?)["\'][^>]*>', toc_inner, re.IGNORECASE)
    
    changed = False
    for i, anchor in enumerate(anchors):
        old_id = anchor.replace('#', '')
        new_id = f"toc-sec-{i+1}"
        
        if old_id == new_id or old_id.startswith('toc-sec-'):
            continue
            
        # Replace href in TOC block
        toc_inner = re.sub(f'href=["\']#{re.escape(old_id)}["\']', f'href="#{new_id}"', toc_inner, flags=re.IGNORECASE)
        # Replace ID in body
        content = re.sub(f'id=["\']{re.escape(old_id)}["\']', f'id="{new_id}"', content, flags=re.IGNORECASE)
        changed = True

    if changed:
        # Re-inject the TOC block but wrapped securely in <div class="table-of-contents"> to trigger Vue logic effectively!
        new_toc_html = f'<div class="table-of-contents">{toc_inner}</div>'
        content = content.replace(toc_match.group(1), new_toc_html)
        
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
