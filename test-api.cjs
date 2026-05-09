const http = require('http');
const db = require('./server/db.js');
const token = db.getOne('SELECT token FROM users LIMIT 1').token;
http.get('http://localhost:3001/api/translation/status/news/1', {
  headers: { 'Authorization': 'Bearer ' + token }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log(data));
}).on('error', err => console.log(err));
