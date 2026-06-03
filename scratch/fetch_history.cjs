const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '..', 'data', 'database.db'));

try {
  const rows = db.prepare('SELECT * FROM live_chat_messages ORDER BY id DESC LIMIT 5').all();
  console.log(JSON.stringify(rows, null, 2));
} catch (e) {
  console.error(e);
}
db.close();
