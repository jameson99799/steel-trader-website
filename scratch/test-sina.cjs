const https = require('https');
const iconv = require('iconv-lite'); // Sina returns GBK

function fetchSina(symbol) {
  return new Promise((resolve, reject) => {
    https.get(`https://hq.sinajs.cn/list=${symbol}`, {
      headers: {
        'Referer': 'https://finance.sina.com.cn'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve(iconv.decode(buffer, 'gbk'));
      });
    }).on('error', reject);
  });
}

async function test() {
  try {
    // Test Sina real-time quote for main contracts: 热卷主力(HC0), 螺纹钢主力(RB0), 铁矿石主力(I0)
    const quote = await fetchSina('nf_HC0,nf_RB0,nf_I0');
    console.log('Realtime Quotes:\n', quote);
  } catch(e) {
    console.error(e);
  }
}
test();
