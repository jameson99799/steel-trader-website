const db = require('better-sqlite3')('led-trade.db');
const row = db.prepare('SELECT head_scripts FROM seo_settings WHERE id = 1').get();
console.log('head_scripts:', row ? row.head_scripts : 'not found');
