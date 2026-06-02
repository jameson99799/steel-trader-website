const fetch = require('node-fetch')

async function testEM() {
  const url1 = 'https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f1,f2,f3,f4,f12,f13,f14,f15,f16,f17,f18,f60&secids=113.hcM,113.hc2610'
  const r1 = await fetch(url1)
  const d1 = await r1.json()
  console.log('Realtime:', JSON.stringify(d1.data.diff, null, 2))

  const url2 = 'https://push2his.eastmoney.com/api/qt/stock/trends2/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f53,f56,f58&ndays=1&iscr=0&iscca=0&secid=113.hcM'
  const r2 = await fetch(url2)
  const d2 = await r2.json()
  console.log('Minline length:', d2.data.trends.length, 'Sample:', d2.data.trends.slice(0, 2))

  const url3 = 'https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&secid=113.hcM&end=20500101&lmt=5'
  const r3 = await fetch(url3)
  const d3 = await r3.json()
  console.log('Kline length:', d3.data.klines.length, 'Sample:', d3.data.klines.slice(-2))
}
testEM()
