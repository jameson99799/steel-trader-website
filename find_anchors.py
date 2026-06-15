import json
import re

d = json.load(open('failing_articles_data.json', encoding='utf-8'))
for k in ['163', '164', '165', '166', '167']:
    content = d[k]['content']
    anchors = re.findall(r'(?i)<a[^>]*href=["\'](#[^"\']*)["\'][^>]*>(.*?)</a>', content)
    if anchors:
        print(f"ID {k} anchors:")
        for href, text in anchors:
            print(f"  {href} -> {text}")
    else:
        print(f"ID {k} has NO ANCHOR LINKS at all!")
