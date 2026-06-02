const fetch = require('node-fetch')
async function testEM() {
  const url1 = 'https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f1,f2,f3,f4,f12,f13,f14,f15,f16,f17,f18,f60&secids=113.hcm,114.im,115.fgm'
  const r1 = await fetch(url1)
  const d1 = await r1.json()
  console.log('Realtime:', JSON.stringify(d1.data.diff, null, 2))
}
testEM()
