import sqlite3
import json
conn = sqlite3.connect('data/database.db')
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT id, title, title_en, content FROM news WHERE title_en LIKE '%PPGI%' OR title_en LIKE '%PPGL%'").fetchall()
print("Found", len(rows), "articles:")
for r in rows:
    print(r['id'], "-", r['title_en'])
conn.close()
