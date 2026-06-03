const https = require('https');

https.get('https://www.sunseasteel.com/en', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('--- Body Start ---');
    console.log(body.substring(0, 1000));
    console.log('--- Body End ---');
  });
}).on('error', (e) => {
  console.error('Error:', e);
});
