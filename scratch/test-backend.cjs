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
  if (suffix.endsWith('0')) {
    suffix = suffix.replace(/0$/, 'm')
  }
  return `${prefix}.${suffix}`
}

async function test() {
  const secid = getEastMoneySecid('HC2610')
  console.log('Secid for HC2610:', secid)
  const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f1,f2,f3,f4,f12,f13,f14,f15,f16,f17,f18,f60&secids=${secid}`
  const resp = await fetch(url)
  const json = await resp.json()
  console.log(json.data.diff[0])
}
test()
