import sqlite3
conn = sqlite3.connect('data/database.db')
print("Tables:", [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'").fetchall()])
conn.close()
