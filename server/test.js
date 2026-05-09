import { initDb, getOne } from './db.js';
await initDb();
const token = getOne('SELECT token FROM users LIMIT 1').token;
fetch('http://localhost:3001/api/translation/status/news/1', {
  headers: { 'Authorization': 'Bearer ' + token }
}).then(r=>r.json()).then(console.log).catch(console.error);
