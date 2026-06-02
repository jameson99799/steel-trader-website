import Database from 'better-sqlite3';
const db = new Database('data/database.db');
const job = db.prepare("SELECT * FROM translation_jobs ORDER BY id DESC LIMIT 1").get();
console.log('Status:', job.status);
console.log('Error Items:', job.error_items);
console.log('Failed Items length:', job.failed_items ? JSON.parse(job.failed_items).length : 0);
console.log('Log snippet:', job.log ? job.log.substring(job.log.length - 1000) : '');
