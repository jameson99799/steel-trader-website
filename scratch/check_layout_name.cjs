const https = require('https');

https.get('https://www.sunseasteel.com/assets/index-B7uOBc3E.js', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    // Find all mentions of Layout
    const regex = /Layout-[A-Za-z0-9_-]+\.js/gi;
    const matches = body.match(regex);
    console.log('Mentions of Layout:', matches);
  });
}).on('error', (e) => {
  console.error('Error:', e);
});
