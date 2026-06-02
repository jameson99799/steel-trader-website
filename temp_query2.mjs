import Database from 'better-sqlite3';
const db = new Database('data/database.db');
const rows = db.prepare("SELECT * FROM languages WHERE name LIKE '%Thai%' OR code LIKE '%th%'").all();
console.log(rows);
