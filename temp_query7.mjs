import Database from 'better-sqlite3';
const db = new Database('data/database.db');
const rows = db.prepare("SELECT * FROM translation_jobs ORDER BY id DESC LIMIT 5").all();
for (const r of rows) {
  console.log(`Job ${r.id} | Status: ${r.status} | Langs: ${r.languages} | Pages: ${r.pages} | Error: ${r.error_items}`);
  if (r.failed_items && r.failed_items !== '[]') console.log(`  Failed: ${r.failed_items.substring(0, 100)}`);
}
