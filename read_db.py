import sqlite3, json

db_path = 'server/data.db'
try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute("SELECT id, title, title_en, seo_title, slug FROM news WHERE title LIKE '%what is gi coil%' OR seo_title LIKE '%what is gi coil%' OR title_en LIKE '%what is gi coil%' OR slug LIKE '%galvanized-steel-coil-what-is-it%' OR title_en LIKE '%What Is Galvanized Steel Coil and How Do You Choose%' OR seo_title LIKE '%What Is Galvanized Steel Coil and How Do You Choose%'")
    rows = [dict(r) for r in cur.fetchall()]
    print('DATA.DB:', json.dumps(rows, indent=2))
except Exception as e:
    print('DATA.DB failed:', e)
