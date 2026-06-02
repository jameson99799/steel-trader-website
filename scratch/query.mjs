import Database from 'better-sqlite3';
const db = new Database('data/database.db');
const r = db.prepare("SELECT * FROM translations WHERE content_type='futures_watchlist'").all();
console.log(r);
