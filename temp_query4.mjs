import Database from 'better-sqlite3';
const db = new Database('data/database.db');
const rows = db.prepare("SELECT content_type, content_id, content_field, original_text, translated_text FROM translations WHERE language_code='th' ORDER BY updated_at DESC LIMIT 20").all();
console.log(rows);
