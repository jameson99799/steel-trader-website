const https = require('https');
const iconv = require('iconv-lite');

async function fetchRealtimeForSymbols(symbols) {
  const queryList = symbols.map(s => s.startsWith('nf_') ? s : `nf_${s}`).join(',')
  try {
    const data = await new Promise((resolve, reject) => {
      https.get(`https://hq.sinajs.cn/list=${queryList}`, {
        headers: { 'Referer': 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0' }
      }, (response) => {
        const chunks = []
        response.on('data', chunk => chunks.push(chunk))
        response.on('end', () => resolve(iconv.decode(Buffer.concat(chunks), 'gbk')))
      }).on('error', reject)
    })

    console.log("Raw Data:", data);

    const lines = data.split('\n').map(l => l.trim()).filter(Boolean)
    for (const line of lines) {
      const match = line.match(/hq_str_nf_([A-Za-z0-9]+)="([^"]*)"/)
      if (match) {
        const symbol = match[1]
        console.log("Matched symbol:", symbol);
      } else {
        console.log("No match for line:", line);
      }
    }
  } catch (e) {
    console.error('Futures polling error:', e.message)
  }
}

fetchRealtimeForSymbols(['HC0', 'HC2610']);
