import { initDb, getOne, getAll } from './db.js';
await initDb();
try {
    const id = 1;
    let expectedFields = 0;
    const r = getOne('SELECT title_en, summary_en, seo_title, seo_description, seo_keywords, content, faq_items FROM news WHERE id=?', [id]);
    if (r) {
        if (r.title_en) expectedFields++;
        console.log('r works', expectedFields);
    }
} catch(e) {
    console.error('ERROR:', e.message);
}
