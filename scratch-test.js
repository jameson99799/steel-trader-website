import { initDb, run, getOne } from './server/db.js';
await initDb();
console.log('Testing upsertTranslation directly...');
const lang = 'pt';
const type = 'roofing_category';
const id = 1;
const field = 'name';
const original = 'Corrugated';
const translated = 'Ondulado';

try {
    run(
        `INSERT INTO translations (language_code, content_type, content_id, content_field, original_text, translated_text, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, 0)`,
        [lang, type, id || null, field, original, translated]
    );
    console.log('INSERT succeeded!');
} catch (e) {
    console.log('INSERT failed:', e.message);
}

const row = getOne('SELECT * FROM translations WHERE language_code=? AND content_type=? AND content_id=?', [lang, type, id]);
console.log('Row in DB:', row);
