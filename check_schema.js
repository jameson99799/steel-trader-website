const db = require('better-sqlite3')('server/database.db');
const columns = db.prepare('PRAGMA table_info(factory_media)').all();
console.log('Columns:', columns.map(c => c.name));
