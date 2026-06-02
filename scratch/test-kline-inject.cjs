const https = require('https');
const iconv = require('iconv-lite');

const CACHE = { realtime: {}, kline: {} };

async function fetchRealtime() {
  const url = `https://hq.sinajs.cn/list=nf_HC0`;
  const resp = await fetch(url, { headers: { 'Referer': 'https://finance.sina.com.cn' }});
  const buf = await resp.arrayBuffer();
  const data = iconv.decode(Buffer.from(buf), 'gbk');
  const match = data.match(/hq_str_nf_HC0="([^"]*)"/);
  const fields = match[1].split(',');
  CACHE.realtime['HC0'] = {
    price: parseFloat(fields[8]),
    open: parseFloat(fields[2]),
    high: parseFloat(fields[3]),
    low: parseFloat(fields[4]),
    volume: parseFloat(fields[13]),
    date: fields[17] || new Date().toISOString().split('T')[0]
  };
}

async function fetchKline() {
  const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_HC0=/InnerFuturesNewService.getDailyKLine?symbol=HC0`;
  const resp = await fetch(url, { headers: { 'Referer': 'https://finance.sina.com.cn' }});
  const text = await resp.text();
  const match = text.match(/\((\[[\s\S]*?\])\)/);
  const klineData = JSON.parse(match[1]);
  
  const rt = CACHE.realtime['HC0'];
  if (rt && rt.date && klineData.length > 0) {
    const lastDate = klineData[klineData.length - 1].d;
    if (lastDate !== rt.date && rt.price > 0) {
      klineData.push({
        d: rt.date, o: rt.open.toString(), h: rt.high.toString(), l: rt.low.toString(), c: rt.price.toString(), v: rt.volume.toString()
      });
      console.log(`Injected realtime candle for ${rt.date}:`, klineData[klineData.length-1]);
    } else {
      console.log(`Last date ${lastDate} is already current, or no realtime price. Realtime date: ${rt.date}`);
    }
  }
  
  console.log('Last 2 candles:', klineData.slice(-2));
}

async function run() {
  await fetchRealtime();
  await fetchKline();
}
run();
