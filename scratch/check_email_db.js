import Database from 'better-sqlite3';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const dbPath = join(__dirname, '..', 'data', 'database.db');
const db = new Database(dbPath);

console.log('--- email_settings ---');
try {
    console.log(db.prepare('SELECT * FROM email_settings').all());
} catch (e) {
    console.error(e.message);
}

console.log('\n--- email_config ---');
try {
    console.log(db.prepare('SELECT * FROM email_config').all());
} catch (e) {
    console.error(e.message);
}

console.log('\n--- smtp_accounts ---');
try {
    console.log(db.prepare('SELECT * FROM smtp_accounts').all());
} catch (e) {
    console.error(e.message);
}
