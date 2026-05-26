const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Referer': 'https://quote.eastmoney.com/'
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function test() {
  try {
    // Eastmoney API for All futures
    // Markets: 113, 114, 115, 8, 142, 220
    const url = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=2000&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:113,m:114,m:115,m:8,m:142,m:220&fields=f12,f13,f14';
    const em = await fetch(url);
    const data = JSON.parse(em).data;
    if (data && data.diff) {
        console.log(`Found ${data.diff.length} futures contracts.`);
        const mainContracts = data.diff.filter(d => d.f12.endsWith('m'));
        console.log('Main contracts:', mainContracts.slice(0, 10).map(d => `${d.f14} (${d.f12})`));
        
        // Find HC
        const hc = data.diff.filter(d => d.f12.toLowerCase().includes('hc'));
        console.log('HC matches:', hc.map(d => `${d.f14} (${d.f12})`));
    }
  } catch(e) {
    console.error(e);
  }
}
test();
