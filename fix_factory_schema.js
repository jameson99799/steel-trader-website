import Database from 'better-sqlite3';
const db = new Database('server/database.db');

try {
  db.exec("ALTER TABLE factory_media ADD COLUMN description TEXT DEFAULT ''")
  console.log("Added description column");
} catch (e) {
  console.log("description column might exist:", e.message);
}

try {
  db.exec("ALTER TABLE factory_media ADD COLUMN show_desc INTEGER DEFAULT 0")
  console.log("Added show_desc column");
} catch (e) {
  console.log("show_desc column might exist:", e.message);
}

const cols = db.prepare('PRAGMA table_info(factory_media)').all();
console.log('Final columns:', cols.map(c => c.name));
