const https = require('https');

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
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
    // Search Sina API for HC
    const sina = await fetch('https://hq.sinajs.cn/list=nf_HC0');
    console.log('Sina HC0 (Main Contract):', sina.slice(0, 200));
    
    // Eastmoney API for SHFE futures (m:113)
    const emUrl = 'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=20&po=1&np=1&ut=bd1d9ddb04089700cf9c27f6f7426281&fltt=2&invt=2&fid=f3&fs=m:113';
    const em = await fetch(emUrl);
    console.log('\nEastmoney SHFE Top 20:', JSON.stringify(JSON.parse(em).data.diff.map(d => ({ code: d.f12, name: d.f14 })), null, 2));

    // Eastmoney API for Main Contracts (m:113,m:114,m:115) - actually Eastmoney has a specific market for main contracts
    // market 113=SHFE, 114=DCE, 115=CZCE, 8=CFFEX, 142=GFEX. Main contracts usually end with 'm'.
    // Let's just search for HCm
    const emSearch = await fetch('https://searchapi.eastmoney.com/api/suggest/get?type=14&token=D43BF722C8E33BDC906FB84D85E326E8&input=HC');
    console.log('\nEastmoney Search HC:', JSON.parse(emSearch).QuotationCodeTable.Data.map(d => ({ code: d.Code, name: d.Name })));
  } catch(e) {
    console.error(e);
  }
}
test();
