const https = require('https');

function fetchSinaMinLine(symbol) {
  return new Promise((resolve, reject) => {
    const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_${symbol}=/InnerFuturesNewService.getMinLine?symbol=${symbol}`;
    https.get(url, { headers: { 'Referer': 'https://finance.sina.com.cn' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test() {
  try {
    const data = await fetchSinaMinLine('HC0');
    console.log(data.slice(0, 500));
  } catch(e) {
    console.error(e);
  }
}
test();
