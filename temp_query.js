const db = require('better-sqlite3')('server/database.sqlite');
const rows = db.prepare("SELECT content_id, content_field, original_text, translated_text FROM translations WHERE language_code='th' AND content_type='futures_watchlist'").all();
console.log(rows);
