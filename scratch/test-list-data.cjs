const https = require('https');
function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', reject);
  });
}
async function test() {
  try {
    const res = await fetch('https://www.sunseasteel.com/api/futures/list-data');
    console.log(res.status, res.data.slice(0, 1000));
  } catch(e) { console.error(e); }
}
test();
