const fetch = require('node-fetch');

const FUTURES_MAP = {
  HC: { exchange: 'SHFE' },
  RB: { exchange: 'SHFE' },
  I: { exchange: 'DCE' },
  FG: { exchange: 'CZCE' }
};

const EXCHANGE_PREFIX_MAP = {
  'SHFE': '113', 'DCE': '114', 'CZCE': '115', 'INE': '142', 'GFEX': '225', 'CFFEX': '8'
}
function getBaseCode(symbol) {
  const m = symbol.match(/^([A-Z]+)/i)
  return m ? m[1].toUpperCase() : symbol.toUpperCase()
}
function getEastMoneySecid(symbol) {
  let raw = symbol.replace(/^nf_/, '').toLowerCase()
  const baseCode = getBaseCode(raw)
  const info = FUTURES_MAP[baseCode]
  if (!info) return symbol
  const prefix = EXCHANGE_PREFIX_MAP[info.exchange] || '113'
  let suffix = raw
  if (suffix === `${baseCode.toLowerCase()}0`) {
    suffix = `${baseCode.toLowerCase()}m`
  }
  return `${prefix}.${suffix}`
}

async function test() {
  const secid = getEastMoneySecid('HC2610')
  console.log('Secid for HC2610:', secid)
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f1,f2,f3,f4,f12,f13,f14,f15,f16,f17,f18,f60&secids=${secid}`
  const resp = await fetch(url)
  const json = await resp.json()
  console.log('Realtime for HC2610:', json.data.diff[0])
  
  const secid2 = getEastMoneySecid('I0')
  console.log('Secid for I0:', secid2)
  const url2 = `https://push2his.eastmoney.com/api/qt/stock/trends2/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f53,f56,f58&ndays=1&iscr=0&iscca=0&secid=${secid2}`
  const resp2 = await fetch(url2)
  const json2 = await resp2.json()
  console.log('Minline length for I0:', json2.data.trends.length)
}
test()
