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

# Targets are 163 to 167. Let's do all of them just in case.
targets = ['163', '164', '165', '166', '167']

for tid in targets:
    if tid not in data: continue
    art = data[tid]
    content = art['content']
    
    # Extract TOC
    toc_match = re.search(r'<div class=["\']table-of-contents["\'][^>]*>([\s\S]*?)</div>', content, re.IGNORECASE)
    if not toc_match:
        print(f"ID {tid} has no table-of-contents. Skipping.")
        continue
        
    toc_inner = toc_match.group(1)
    
    # Find anchors in TOC
    anchors = re.findall(r'<a[^>]*href=["\'](#.*?)["\'][^>]*>', toc_inner, re.IGNORECASE)
    
    # For each anchor, rewrite href and the target ID in the content
    changed = False
    for i, anchor in enumerate(anchors):
        old_id = anchor.replace('#', '')
        new_id = f"toc-sec-{i+1}"
        
        if old_id == new_id or old_id.startswith('toc-sec-'):
            continue
            
        # Replace href in TOC inner HTML
        toc_inner = re.sub(f'href=["\']#{re.escape(old_id)}["\']', f'href="#{new_id}"', toc_inner, flags=re.IGNORECASE)
        # Replace ID in article body (this assumes IDs are like id="something")
        content = re.sub(f'id=["\']{re.escape(old_id)}["\']', f'id="{new_id}"', content, flags=re.IGNORECASE)
        changed = True

    if changed:
        # Re-inject the TOC
        new_toc_html = f'<div class="table-of-contents">{toc_inner}</div>'
        content = re.sub(r'<div class=["\']table-of-contents["\'][^>]*>[\s\S]*?</div>', new_toc_html, content, flags=re.IGNORECASE)
        
        # Remove dark inline background styles
        content = re.sub(r'<div class=["\']table-of-contents["\'][^>]*style=["\'][^>]*background[^>]*>([\s\S]*?)</div>', r'<div class="table-of-contents">\1</div>', content, flags=re.IGNORECASE)

        # PUT updated content to server
        url = f"https://www.sunseasteel.com/api/external/news/{tid}"
        payload = json.dumps({"content": content}).encode('utf-8')
        req = urllib.request.Request(url, data=payload, headers=headers, method="PUT")
        
        try:
            res = urllib.request.urlopen(req).read().decode('utf-8')
            print(f"Successfully updated ID {tid}: {json.loads(res)}")
        except Exception as e:
            print(f"Error updating ID {tid}: {e}")
    else:
        print(f"ID {tid} needed no changes.")
