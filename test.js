import Database from 'better-sqlite3';
const db = new Database('data/database.db');
console.log(db.prepare("SELECT id, slug, status, length(content) FROM news WHERE id IN (124, 92, 126, 78, 105, 127) OR slug LIKE '%eps-vs-pu-vs-rockwool%'").all());
