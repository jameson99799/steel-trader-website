import sqlite3

conn = sqlite3.connect('data/database.db')
conn.row_factory = sqlite3.Row
rows = conn.execute("SELECT content FROM news WHERE content LIKE '%href=\"#%' LIMIT 2").fetchall()

for row in rows:
    print(row['content'][:2000])

conn.close()
