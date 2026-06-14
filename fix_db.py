import sqlite3

conn = sqlite3.connect('data/database.db')
c = conn.cursor()
c.execute('UPDATE factory_media SET type = "video", autoplay = 1 WHERE type = "image" AND (media_url LIKE "%.mp4" OR media_url LIKE "%.webm")')
conn.commit()
conn.close()
print('DB updated.')
