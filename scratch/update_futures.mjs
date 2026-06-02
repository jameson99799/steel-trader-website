import fs from 'fs';
let file = 'server/routes/futures.js';
let t = fs.readFileSync(file, 'utf8');

// We need to inject translations for the futures_watchlist into the endpoints.
// 1. the router.get('/') endpoint
t = t.replace(
    /router\.get\('\/', \(req, res\) => \{\r?\n  const list = getAll\('SELECT \* FROM futures_watchlist ORDER BY sort_order ASC, id ASC'\)\r?\n  res\.json\(list\)\r?\n\}\)/,
    `router.get('/', (req, res) => {
  const list = getAll('SELECT * FROM futures_watchlist ORDER BY sort_order ASC, id ASC')
  const translations = getAll("SELECT content_id, language_code, translated_text FROM translations WHERE content_type = 'futures_watchlist' AND content_field = 'name'")
  const transMap = {}
  for (const t of translations) {
    if (!transMap[t.content_id]) transMap[t.content_id] = {}
    transMap[t.content_id]['name_' + t.language_code] = t.translated_text
  }
  for (const item of list) {
    if (transMap[item.id]) {
      Object.assign(item, transMap[item.id])
    }
  }
  res.json(list)
})`
);

// 2. the router.get('/list-data') endpoint
t = t.replace(
    /const list = getAll\('SELECT \* FROM futures_watchlist ORDER BY sort_order ASC, id ASC'\)/,
    `const list = getAll('SELECT * FROM futures_watchlist ORDER BY sort_order ASC, id ASC')
    const translations = getAll("SELECT content_id, language_code, translated_text FROM translations WHERE content_type = 'futures_watchlist' AND content_field = 'name'")
    const transMap = {}
    for (const t of translations) {
      if (!transMap[t.content_id]) transMap[t.content_id] = {}
      transMap[t.content_id]['name_' + t.language_code] = t.translated_text
    }
    for (const item of list) {
      if (transMap[item.id]) {
        Object.assign(item, transMap[item.id])
      }
    }`
);

fs.writeFileSync(file, t);
console.log("Updated futures.js successfully.");
