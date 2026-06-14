import urllib.request, json

API_KEY = 'ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5'
HEADERS = {'X-API-Key': API_KEY, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'}

def fetch_all(endpoint):
    req = urllib.request.Request(f'https://www.sunseasteel.com/api/external/{endpoint}?limit=500', headers=HEADERS)
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

print("Pinging live database...")
news_data = fetch_all('news')
prod_data = fetch_all('products')

news_items = news_data.get('news', [])
prod_items = prod_data.get('products', [])

print(f"Total News: {len(news_items)} (from pagination reported total: {news_data.get('total')})")
print(f"Total Products: {len(prod_items)} (from pagination reported total: {prod_data.get('total')})")

missing_news_slug = [n for n in news_items if not n.get('slug')]
missing_prod_slug = [p for p in prod_items if not p.get('slug')]

if missing_news_slug:
    print(f"WARNING: {len(missing_news_slug)} news articles missing slug!")
else:
    print("OK: All news articles have a slug.")

if missing_prod_slug:
    print(f"WARNING: {len(missing_prod_slug)} products missing slug!")
else:
    print("OK: All products have a slug.")

# Check for duplicate slugs
all_slugs = {}
clashes = []

for n in news_items:
    s = n.get('slug')
    if s:
        if s in all_slugs:
            clashes.append(f"DUPLICATE SLUG: '{s}' used by News ID {n['id']} and {all_slugs[s]}")
        all_slugs[s] = f"News ID {n['id']}"

for p in prod_items:
    s = p.get('slug')
    if s:
        if s in all_slugs:
            clashes.append(f"DUPLICATE SLUG: '{s}' used by Product ID {p['id']} and {all_slugs[s]}")
        all_slugs[s] = f"Product ID {p['id']}"

if clashes:
    print("\n--- WARNING: SLUG CLASHES DETECTED ---")
    for c in clashes:
        print(c)
else:
    print("\nOK: All slugs across news and products are 100% unique.")

print(f"\nAnalyzed {len(all_slugs)} unique routes.")
