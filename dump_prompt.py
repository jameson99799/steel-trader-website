import sqlite3
import sys
conn = sqlite3.connect('data/database.db')
conn.row_factory = sqlite3.Row
row = conn.execute("SELECT content FROM ai_post_prompts WHERE type='body' LIMIT 1").fetchone()
if row:
    with open('prompt_body.txt', 'w', encoding='utf-8') as f:
        f.write(row[0])
else:
    print('Empty')
