const fs = require('fs');
let file = 'server/routes/translation.js';
let t = fs.readFileSync(file, 'utf8');

// 1. Update /ui-texts/:lang query
t = t.replace(
    /'SELECT content_field, translated_text FROM translations WHERE language_code = \? AND content_type = \? AND content_id = \?'/,
    "\`SELECT content_field, translated_text FROM translations WHERE language_code = ? AND content_type IN ('ui_text', 'futures') AND content_id = ?\`"
);
t = t.replace(
    /\[lang, 'ui_text', 'static'\]/,
    "[lang, 'static']"
);

// 2. Update collectFuturesTexts to include watchlist
t = t.replace(
    /function collectFuturesTexts\(\) \{[\s\S]*?return items\r?\n\}/,
    `function collectFuturesTexts() {
    const entries = Object.entries(FUTURES_TEXTS_EN)
    const CHUNK_SIZE = 15
    const items = []
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
        const chunk = Object.fromEntries(entries.slice(i, i + CHUNK_SIZE))
        const chunkIdx = Math.floor(i / CHUNK_SIZE)
        items.push({
            type: 'futures', id: 'static', field: 'futures_chunk_' + chunkIdx,
            text: JSON.stringify(chunk),
            combined: true, subFields: Object.keys(chunk),
            itemName: 'Futures Text (batch ' + (chunkIdx + 1) + '/' + Math.ceil(entries.length / CHUNK_SIZE) + ')'
        })
    }
    try {
        const { getAll } = require('../db.js') // or it's already in scope? getAll is already imported in translation.js
        const watchlist = getAll('SELECT id, symbol, name, name_en FROM futures_watchlist')
        for (const w of watchlist) {
            const textToTranslate = w.name_en || w.name
            if (textToTranslate) {
                items.push({
                    type: 'futures_watchlist',
                    id: w.id,
                    field: 'name',
                    text: textToTranslate,
                    itemName: 'Futures Symbol: ' + w.symbol
                })
            }
        }
    } catch (e) {}
    return items
}`
);

fs.writeFileSync(file, t);
console.log("Updated translation.js successfully.");
