const https = require('https');
const iconv = require('iconv-lite');

function testHttps() {
  https.get(`https://hq.sinajs.cn/list=nf_HC0`, {
    headers: { 'Referer': 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0' }
  }, (res) => {
    console.log("HTTPS Headers:", res.headers['content-encoding']);
    const chunks = [];
    res.on('data', c => chunks.push(c));
    res.on('end', () => console.log("HTTPS Data:", iconv.decode(Buffer.concat(chunks), 'gbk').slice(0, 50)));
  });
}

async function testFetch() {
  const res = await fetch(`https://hq.sinajs.cn/list=nf_HC0`, {
    headers: { 'Referer': 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0' }
  });
  console.log("Fetch Headers:", res.headers.get('content-encoding'));
  const buf = await res.arrayBuffer();
  console.log("Fetch Data:", iconv.decode(Buffer.from(buf), 'gbk').slice(0, 50));
}

testHttps();
testFetch();
