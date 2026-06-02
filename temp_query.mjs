import Database from 'better-sqlite3';
const db = new Database('data/database.db');
const rows = db.prepare("SELECT content_id, content_field, original_text, translated_text FROM translations WHERE language_code='th' AND content_type='futures_watchlist'").all();
console.log(rows);
