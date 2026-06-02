async function run() {
  const secids = '114.i2509'
  const url = `http://push2.eastmoney.com/api/qt/ulist.np/get?fields=f1,f2,f3,f4,f12,f13,f14,f15,f16,f17,f18,f59,f60&secids=${secids}`
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Referer': 'https://quote.eastmoney.com/'
      }
    })
    const json = await resp.json()
    console.log(JSON.stringify(json, null, 2))
  } catch (e) {
    console.error('Fetch error:', e)
  }
}
run()
