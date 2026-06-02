import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

import https from 'https'
import iconv from 'iconv-lite'

// ── Futures symbol → name mapping (built-in) ──────────────────────────────
const FUTURES_MAP = {
  // 上海期货交易所 (SHFE)
  HC: { name: '热轧卷板', name_en: 'Hot Rolled Coil', exchange: 'SHFE' },
  RB: { name: '螺纹钢', name_en: 'Rebar', exchange: 'SHFE' },
  SS: { name: '不锈钢', name_en: 'Stainless Steel', exchange: 'SHFE' },
  CU: { name: '沪铜', name_en: 'Copper', exchange: 'SHFE' },
  AL: { name: '沪铝', name_en: 'Aluminum', exchange: 'SHFE' },
  ZN: { name: '沪锌', name_en: 'Zinc', exchange: 'SHFE' },
  PB: { name: '沪铅', name_en: 'Lead', exchange: 'SHFE' },
  NI: { name: '沪镍', name_en: 'Nickel', exchange: 'SHFE' },
  SN: { name: '沪锡', name_en: 'Tin', exchange: 'SHFE' },
  AU: { name: '沪金', name_en: 'Gold', exchange: 'SHFE' },
  AG: { name: '沪银', name_en: 'Silver', exchange: 'SHFE' },
  BU: { name: '沥青', name_en: 'Bitumen', exchange: 'SHFE' },
  RU: { name: '天然橡胶', name_en: 'Natural Rubber', exchange: 'SHFE' },
  FU: { name: '燃料油', name_en: 'Fuel Oil', exchange: 'SHFE' },
  SP: { name: '纸浆', name_en: 'Pulp', exchange: 'SHFE' },
  WR: { name: '线材', name_en: 'Wire Rod', exchange: 'SHFE' },
  AO: { name: '氧化铝', name_en: 'Alumina', exchange: 'SHFE' },
  // 大连商品交易所 (DCE)
  I: { name: '铁矿石', name_en: 'Iron Ore', exchange: 'DCE' },
  J: { name: '焦炭', name_en: 'Coke', exchange: 'DCE' },
  JM: { name: '焦煤', name_en: 'Coking Coal', exchange: 'DCE' },
  A: { name: '豆一', name_en: 'Soybean No.1', exchange: 'DCE' },
  B: { name: '豆二', name_en: 'Soybean No.2', exchange: 'DCE' },
  M: { name: '豆粕', name_en: 'Soybean Meal', exchange: 'DCE' },
  Y: { name: '豆油', name_en: 'Soybean Oil', exchange: 'DCE' },
  P: { name: '棕榈油', name_en: 'Palm Oil', exchange: 'DCE' },
  C: { name: '玉米', name_en: 'Corn', exchange: 'DCE' },
  CS: { name: '玉米淀粉', name_en: 'Corn Starch', exchange: 'DCE' },
  JD: { name: '鸡蛋', name_en: 'Egg', exchange: 'DCE' },
  V: { name: 'PVC', name_en: 'PVC', exchange: 'DCE' },
  PP: { name: '聚丙烯', name_en: 'PP', exchange: 'DCE' },
  EB: { name: '苯乙烯', name_en: 'Styrene', exchange: 'DCE' },
  EG: { name: '乙二醇', name_en: 'Ethylene Glycol', exchange: 'DCE' },
  // 郑州商品交易所 (CZCE)
  SM: { name: '锰硅', name_en: 'Silicon Manganese', exchange: 'CZCE' },
  SF: { name: '硅铁', name_en: 'Ferrosilicon', exchange: 'CZCE' },
  ZC: { name: '动力煤', name_en: 'Thermal Coal', exchange: 'CZCE' },
  FG: { name: '玻璃', name_en: 'Glass', exchange: 'CZCE' },
  SA: { name: '纯碱', name_en: 'Soda Ash', exchange: 'CZCE' },
  TA: { name: 'PTA', name_en: 'PTA', exchange: 'CZCE' },
  MA: { name: '甲醇', name_en: 'Methanol', exchange: 'CZCE' },
  CF: { name: '棉花', name_en: 'Cotton', exchange: 'CZCE' },
  SR: { name: '白糖', name_en: 'Sugar', exchange: 'CZCE' },
  OI: { name: '菜油', name_en: 'Rapeseed Oil', exchange: 'CZCE' },
  RM: { name: '菜粕', name_en: 'Rapeseed Meal', exchange: 'CZCE' },
  AP: { name: '苹果', name_en: 'Apple', exchange: 'CZCE' },
  CJ: { name: '红枣', name_en: 'Jujube', exchange: 'CZCE' },
  UR: { name: '尿素', name_en: 'Urea', exchange: 'CZCE' },
  // 广州期货交易所 (GFEX)
  SI: { name: '工业硅', name_en: 'Industrial Silicon', exchange: 'GFEX' },
  LC: { name: '碳酸锂', name_en: 'Lithium Carbonate', exchange: 'GFEX' },
  // 上海国际能源交易中心 (INE)
  SC: { name: '原油', name_en: 'Crude Oil', exchange: 'INE' },
  LU: { name: '低硫燃料油', name_en: 'Low Sulfur Fuel Oil', exchange: 'INE' },
  NR: { name: '20号胶', name_en: 'TSR 20', exchange: 'INE' },
  BC: { name: '国际铜', name_en: 'International Copper', exchange: 'INE' },
  EC: { name: '集运指数', name_en: 'Container Freight Index', exchange: 'INE' },
  // 外汇 (Forex)
  USDCNH: { name: '美元兑离岸人民币', name_en: 'USD/CNH', exchange: 'FOREX' },
}

function getBaseCode(symbol) {
  let s = symbol.replace(/^nf_/, '')
  if (s.includes('.')) {
    s = s.split('.')[1]
  }
  const m = s.match(/^([A-Z]+)/i)
  return m ? m[1].toUpperCase() : s.toUpperCase()
}

// ── Global In-Memory Cache for Futures Data ─────────────────────────────────
const CACHE = {
  realtime: {}, // symbol -> realtime data object
  minline: {},  // symbol -> minline array
  kline: {}     // symbol -> daily kline array
}

function getChinaDate() {
  const d = new Date()
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000)
  return new Date(utc + (3600000 * 8)).toISOString().split('T')[0]
}

function getUpdatedKline(symbol, previewDays = null) {
  const klineArray = CACHE.kline[symbol] || []
  const realtime = CACHE.realtime[symbol]
  
  if (klineArray.length === 0) return []
  
  const klineCopy = klineArray.map(item => ({ ...item }))
  
  if (realtime && realtime.price) {
    const lastItem = klineCopy[klineCopy.length - 1]
    if (lastItem.d === realtime.date) {
      lastItem.c = realtime.price.toString()
      if (realtime.open) lastItem.o = realtime.open.toString()
      
      const rtHigh = parseFloat(realtime.high || realtime.price)
      const kHigh = parseFloat(lastItem.h || 0)
      if (rtHigh > kHigh) lastItem.h = rtHigh.toString()
      
      const rtLow = parseFloat(realtime.low || realtime.price)
      const kLow = parseFloat(lastItem.l || Infinity)
      if (rtLow < kLow) lastItem.l = rtLow.toString()
      
      if (realtime.volume) lastItem.v = realtime.volume.toString()
    } else if (new Date(realtime.date) > new Date(lastItem.d)) {
      klineCopy.push({
        d: realtime.date,
        o: (realtime.open || realtime.price).toString(),
        h: (realtime.high || realtime.price).toString(),
        l: (realtime.low || realtime.price).toString(),
        c: realtime.price.toString(),
        v: (realtime.volume || 0).toString()
      })
    }
  }
  
  if (previewDays) {
    return klineCopy.slice(-previewDays)
  }
  return klineCopy
}

// ── EastMoney Mapping ────────────────────────────────────────────────────────
const EXCHANGE_PREFIX_MAP = {
  'SHFE': '113', 'DCE': '114', 'CZCE': '115', 'INE': '142', 'GFEX': '225', 'CFFEX': '8', 'FOREX': '133'
}
function getEastMoneySecid(symbol) {
  let raw = symbol.replace(/^nf_/, '').toLowerCase()
  const baseCode = getBaseCode(raw)
  if (baseCode === 'USDCNH') return '133.USDCNH'
  
  const info = FUTURES_MAP[baseCode]
  if (!info) return symbol
  const prefix = EXCHANGE_PREFIX_MAP[info.exchange] || '113'
  let suffix = raw
  if (suffix === `${baseCode.toLowerCase()}0`) {
    suffix = `${baseCode.toLowerCase()}m`
  }
  return `${prefix}.${suffix}`
}

function getSymbolPrecision(symbol, apiF59) {
  const baseCode = getBaseCode(symbol)
  if (baseCode === 'USDCNH') return 4
  
  const precisions = {
    AU: 2,
    I: 1,
    J: 1,
    JM: 1,
    ZC: 1,
    SC: 1,
    EC: 1
  }
  
  if (precisions[baseCode] !== undefined) {
    return precisions[baseCode]
  }
  
  if (apiF59 !== '-' && apiF59 !== undefined) {
    return Number(apiF59)
  }
  
  return 0
}

// ── Background Polling Mechanism ──────────────────────────────────────────
async function fetchRealtimeForSymbols(symbols) {
  if (!symbols || symbols.length === 0) return
  
  const emSymbols = symbols.filter(s => getBaseCode(s) !== 'USDCNH')
  const sinaSymbols = symbols.filter(s => getBaseCode(s) === 'USDCNH')

  // 1. Fetch EastMoney symbols
  if (emSymbols.length > 0) {
    const secids = emSymbols.map(s => getEastMoneySecid(s)).join(',')
    try {
      const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f1,f2,f3,f4,f12,f13,f14,f15,f16,f17,f18,f59,f60&secids=${secids}`
      const resp = await fetch(url)
      const json = await resp.json()
      if (json && json.data && json.data.diff) {
        json.data.diff.forEach((item, index) => {
          const symbol = emSymbols[index]
          const decimalPlaces = getSymbolPrecision(symbol, item.f59)
          const factor = Math.pow(10, decimalPlaces)
          
          const price = item.f2 !== '-' ? item.f2 / factor : 0
          const changePercent = item.f3 !== '-' ? item.f3 / 100 : 0
          const change = item.f4 !== '-' ? item.f4 / factor : 0
          const open = item.f17 !== '-' ? item.f17 / factor : 0
          const high = item.f15 !== '-' ? item.f15 / factor : 0
          const low = item.f16 !== '-' ? item.f16 / factor : 0
          const prevSettlement = item.f18 !== '-' ? item.f18 / factor : 0
          const date = getChinaDate()
          
          CACHE.realtime[symbol] = {
            price, change, changePercent,
            open, high, low, prevSettlement,
            volume: 0, openInterest: 0, date
          }
        })
      }
    } catch (e) {
      console.error('Futures realtime error:', e.message)
    }
  }

  // 2. Fetch Sina symbols (USDCNH)
  if (sinaSymbols.length > 0) {
    try {
      const resp = await fetch('https://hq.sinajs.cn/list=fx_susdcnh', { headers: { 'Referer': 'https://finance.sina.com.cn/' } })
      const text = await resp.text()
      const match = text.match(/="(.*)"/)
      if (match) {
        const parts = match[1].split(',')
        if (parts.length > 8) {
          const price = parseFloat(parts[8])
          const prevSettlement = parseFloat(parts[3])
          const change = price - prevSettlement
          const changePercent = prevSettlement ? (change / prevSettlement) * 100 : 0
          const open = parseFloat(parts[5])
          const high = parseFloat(parts[6])
          const low = parseFloat(parts[7])
          
          sinaSymbols.forEach(symbol => {
            CACHE.realtime[symbol] = {
              price, change, changePercent, open, high, low, prevSettlement,
              date: parts[17] || getChinaDate(),
              volume: 0, openInterest: 0
            }
          })
        }
      }
    } catch(e) {}
  }
}

async function fetchMinline(symbol) {
  if (getBaseCode(symbol) === 'USDCNH') {
    try {
      const resp = await fetch('https://vip.stock.finance.sina.com.cn/forex/api/jsonp.php/var%20_fx_susdcnh=/NewForexService.getMinKLine?symbol=fx_susdcnh&scale=5&datalen=288')
      const text = await resp.text()
      const dataStr = text.match(/=\((.*)\)/)[1]
      const json = JSON.parse(dataStr)
      if (Array.isArray(json)) {
        // [time, price, avgPrice, volume, openInterest, prevSettlement, date]
        const prevSettlement = CACHE.realtime[symbol] ? CACHE.realtime[symbol].prevSettlement : 0
        const parsed = json.map(k => {
          const t = k.d.split(' ')[1].slice(0, 5) // "12:00:00" -> "12:00"
          return [t, k.c, k.c, "0", "0", prevSettlement.toString(), k.d.split(' ')[0]]
        })
        CACHE.minline[symbol] = parsed
      }
    } catch(e) {}
    return
  }

  try {
    const secid = getEastMoneySecid(symbol)
    const url = `https://push2his.eastmoney.com/api/qt/stock/trends2/get?fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f53,f56,f58&ndays=1&iscr=0&iscca=0&secid=${secid}`
    const resp = await fetch(url)
    const json = await resp.json()
    if (json && json.data && json.data.trends) {
      const prevSettlement = json.data.prePrice || 0
      // EastMoney minline: "2026-05-25 21:01,3417,34777,3426.8" -> [time, price, avgPrice, volume, openInterest, prevSettlement, date]
      const parsed = json.data.trends.map(t => {
        const parts = t.split(',')
        const timeStr = parts[0].split(' ')[1] // '21:01'
        const price = parseFloat(parts[1])
        const vol = parseFloat(parts[2])
        const avg = parseFloat(parts[3])
        return [timeStr, price.toString(), avg.toString(), vol.toString(), '0', prevSettlement.toString(), parts[0].split(' ')[0]]
      })
      CACHE.minline[symbol] = parsed
    }
  } catch (e) {}
}

async function fetchKline(symbol) {
  if (getBaseCode(symbol) === 'USDCNH') {
    try {
      const resp = await fetch('https://vip.stock.finance.sina.com.cn/forex/api/jsonp.php/var%20_fx_susdcnh=/NewForexService.getDayKLine?symbol=fx_susdcnh')
      const text = await resp.text()
      const dataStr = text.split('("')[1].split('")')[0]
      const rows = dataStr.split(',|')
      const klineData = rows.map(r => {
        const p = r.replace(/^\|/, '').split(',')
        return {
          d: p[0], o: p[1], c: p[4], h: p[3], l: p[2], v: "0"
        }
      }).filter(k => k.d && k.d.includes('-'))
      CACHE.kline[symbol] = klineData
    } catch (e) {}
    return
  }

  try {
    const secid = getEastMoneySecid(symbol)
    const url = `https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&secid=${secid}&end=20500101&lmt=400`
    const resp = await fetch(url)
    const json = await resp.json()
    if (json && json.data && json.data.klines) {
      // EastMoney kline: "2026-05-26,3435,3359,3435,3356,668561,..."
      // Sina format: { d: "2026-05-26", o: "3435", h: "3435", l: "3356", c: "3359", v: "668561" }
      const klineData = json.data.klines.map(k => {
        const p = k.split(',')
        return {
          d: p[0], o: p[1], c: p[2], h: p[3], l: p[4], v: p[5]
        }
      })
      CACHE.kline[symbol] = klineData
    }
  } catch (e) {}
}

// Start polling
function initPolling() {
  const getWatchlistSymbols = () => {
    try {
      const list = getAll('SELECT symbol FROM futures_watchlist')
      return list.map(item => item.symbol)
    } catch (e) {
      return []
    }
  }

  // Initial fetch immediately!
  const initSymbols = getWatchlistSymbols()
  if (initSymbols.length > 0) {
    fetchRealtimeForSymbols(initSymbols)
    for (const sym of initSymbols) {
      fetchMinline(sym)
      fetchKline(sym)
    }
  }

  setInterval(() => {
    const symbols = getWatchlistSymbols()
    if (symbols.length > 0) {
      fetchRealtimeForSymbols(symbols)
    }
  }, 2500)

  setInterval(async () => {
    const symbols = getWatchlistSymbols()
    for (const sym of symbols) {
      await fetchMinline(sym)
      await fetchKline(sym)
      await new Promise(r => setTimeout(r, 100))
    }
  }, 30000)
}
setTimeout(initPolling, 1000)

// ── Public: get watchlist and cached data ──────────────────────────────────
router.get('/list-data', (req, res) => {
  try {
    const list = getAll('SELECT * FROM futures_watchlist ORDER BY sort_order ASC, id ASC')
    const translations = getAll("SELECT content_id, language_code, translated_text FROM translations WHERE content_type = 'futures_watchlist' AND content_field = 'name'")
    const transMap = {}
    for (const t of translations) {
      if (!transMap[t.content_id]) transMap[t.content_id] = {}
      transMap[t.content_id]['name_' + t.language_code] = t.translated_text
    }
    for (const item of list) {
      if (transMap[item.id]) {
        Object.assign(item, transMap[item.id])
      }
    }
    const settings = getOne('SELECT preview_days FROM futures_settings WHERE id = 1') || { preview_days: 10 }
    const previewDays = settings.preview_days

    const results = list.map(item => {
      let realtime = CACHE.realtime[item.symbol] || null
      
      // Fallback for USDCNH: if hq.sinajs.cn is blocked by server IP, generate realtime from chart APIs
      if (!realtime && getBaseCode(item.symbol) === 'USDCNH') {
        const ml = CACHE.minline[item.symbol]
        const kl = CACHE.kline[item.symbol]
        if (ml && ml.length > 0 && kl && kl.length > 0) {
          const lastMl = ml[ml.length - 1]
          const price = parseFloat(lastMl[1])
          const lastKl = kl[kl.length - 1]
          
          let prevSettlement = 0
          if (lastMl[6] && lastKl.d === lastMl[6]) {
            const prevKl = kl.length > 1 ? kl[kl.length - 2] : lastKl
            prevSettlement = parseFloat(prevKl.c)
          } else {
            prevSettlement = parseFloat(lastKl.c)
          }
          
          const change = price - prevSettlement
          const changePercent = prevSettlement ? (change / prevSettlement) * 100 : 0
          
          let open = parseFloat(ml[0][1])
          let high = price
          let low = price
          ml.forEach(m => {
            const p = parseFloat(m[1])
            if (p > high) high = p
            if (p < low) low = p
          })
          
          realtime = {
            price, change, changePercent, open, high, low, prevSettlement,
            date: lastMl[6] || getChinaDate(),
            volume: 0, openInterest: 0
          }
          CACHE.realtime[item.symbol] = realtime
        }
      }

      return {
        ...item,
        realtime,
        minline: CACHE.minline[item.symbol] || null,
        kline: getUpdatedKline(item.symbol, previewDays)
      }
    })
    res.json(results)
  } catch(e) {
    res.json([])
  }
})

// ── Admin: Settings ────────────────────────────────────────────────────────
router.get('/settings', (req, res) => {
  const settings = getOne('SELECT preview_days FROM futures_settings WHERE id = 1') || { preview_days: 10 }
  res.json(settings)
})

router.put('/settings', authMiddleware, (req, res) => {
  const { preview_days } = req.body
  run('UPDATE futures_settings SET preview_days = ? WHERE id = 1', [preview_days || 10])
  res.json({ success: true })
})

// ── Public: get watchlist ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  const list = getAll('SELECT * FROM futures_watchlist ORDER BY sort_order ASC, id ASC')
  const translations = getAll("SELECT content_id, language_code, translated_text FROM translations WHERE content_type = 'futures_watchlist' AND content_field = 'name'")
  const transMap = {}
  for (const t of translations) {
    if (!transMap[t.content_id]) transMap[t.content_id] = {}
    transMap[t.content_id]['name_' + t.language_code] = t.translated_text
  }
  for (const item of list) {
    if (transMap[item.id]) {
      Object.assign(item, transMap[item.id])
    }
  }
  res.json(list)
})

// ── Public: fetch real-time quotes via EastMoney API ───────────────────────────
router.get('/realtime', async (req, res) => {
  const symbols = req.query.symbols // e.g. "HC0,RB0"
  if (!symbols) return res.json([])
  
  const symbolArr = symbols.split(',')
  const secids = symbolArr.map(s => getEastMoneySecid(s)).join(',')

  try {
    const url = `https://push2.eastmoney.com/api/qt/ulist.np/get?fields=f1,f2,f3,f4,f12,f13,f14,f15,f16,f17,f18,f59,f60&secids=${secids}`
    const resp = await fetch(url)
    const json = await resp.json()
    const results = []
    if (json && json.data && json.data.diff) {
      json.data.diff.forEach((item, index) => {
        const symbol = symbolArr[index]
        const decimalPlaces = getSymbolPrecision(symbol, item.f59)
        const factor = Math.pow(10, decimalPlaces)
        
        const price = item.f2 !== '-' ? item.f2 / factor : 0
        const changePercent = item.f3 !== '-' ? item.f3 / 100 : 0
        const change = item.f4 !== '-' ? item.f4 / factor : 0
        const open = item.f17 !== '-' ? item.f17 / factor : 0
        const high = item.f15 !== '-' ? item.f15 / factor : 0
        const low = item.f16 !== '-' ? item.f16 / factor : 0
        const prevSettlement = item.f18 !== '-' ? item.f18 / factor : 0
        
        results.push({
          symbol,
          name: item.f14 || symbol,
          price, change, changePercent, open, high, low, prevSettlement
        })
      })
    }
    res.json(results)
  } catch (error) {
    console.error('Futures realtime proxy error:', error.message)
    res.json([])
  }
})

// ── Public: proxy K-line data from Sina Finance ───────────────────────────
router.get('/kline/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  if (!CACHE.kline[symbol]) {
    await fetchKline(symbol)
  }
  return res.json(getUpdatedKline(symbol))
})

// ── Admin: search futures symbols ─────────────────────────────────────────
router.get('/search', authMiddleware, (req, res) => {
  const q = (req.query.q || '').toUpperCase().trim()
  if (!q) return res.json([])

  const results = []
  for (const [code, info] of Object.entries(FUTURES_MAP)) {
    if (code.includes(q) || info.name.includes(q) || info.name_en.toUpperCase().includes(q)) {
      if (info.exchange === 'FOREX') {
        results.push({
          symbol: code,
          name: info.name,
          name_en: info.name_en,
          exchange: info.exchange
        })
        continue;
      }
      
      // 1. First add the Main Continuous Contract (主力连续)
      results.push({
        symbol: `${code}0`,
        name: `${info.name}主力连续`,
        name_en: `${info.name_en} Main Contract`,
        exchange: info.exchange
      })
      
      // 2. Add current year's months if exact code is searched
      if (code === q || info.name === q) {
        const now = new Date()
        const year = now.getFullYear() % 100
        for (let m = 1; m <= 12; m++) {
          const symbol = `${code}${String(year).padStart(2, '0')}${String(m).padStart(2, '0')}`
          results.push({
            symbol,
            name: `${info.name}${year}${String(m).padStart(2, '0')}`,
            name_en: `${info.name_en} ${year}${String(m).padStart(2, '0')}`,
            exchange: info.exchange
          })
        }
      }
    }
  }
  
  // Also allow direct symbol search (e.g. HC2510, HC0)
  if (/^[A-Z]+\d+$/i.test(q)) {
    const base = getBaseCode(q)
    const info = FUTURES_MAP[base]
    if (info) {
      const suffix = q.slice(base.length)
      const exists = results.find(r => r.symbol === q)
      if (!exists) {
        results.unshift({
          symbol: q,
          name: suffix === '0' ? `${info.name}主力连续` : `${info.name}${suffix}`,
          name_en: suffix === '0' ? `${info.name_en} Main Contract` : `${info.name_en} ${suffix}`,
          exchange: info.exchange
        })
      }
    }
  }

  // Limit results
  res.json(results.slice(0, 30))
})

// ── Admin: add futures to watchlist ───────────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
  const { symbol, name, name_en, exchange } = req.body
  if (!symbol) return res.status(400).json({ error: '期货代码不能为空' })

  const existing = getOne('SELECT id FROM futures_watchlist WHERE symbol = ?', [symbol.toUpperCase()])
  if (existing) return res.status(400).json({ error: '该期货品种已添加' })

  const maxOrder = getOne('SELECT MAX(sort_order) as max_order FROM futures_watchlist')
  const sortOrder = (maxOrder?.max_order || 0) + 1

  const base = getBaseCode(symbol)
  const info = FUTURES_MAP[base] || {}

  run(
    'INSERT INTO futures_watchlist (symbol, name, name_en, exchange, sort_order) VALUES (?, ?, ?, ?, ?)',
    [
      symbol.toUpperCase(),
      name || info.name || symbol,
      name_en || info.name_en || symbol,
      exchange || info.exchange || 'SHFE',
      sortOrder
    ]
  )
  res.json({ success: true })
})

// ── Admin: reorder watchlist ──────────────────────────────────────────────
router.put('/reorder', authMiddleware, (req, res) => {
  const { items } = req.body  // [{ id, sort_order }]
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid data' })
  for (const item of items) {
    run('UPDATE futures_watchlist SET sort_order = ? WHERE id = ?', [item.sort_order, item.id])
  }
  res.json({ success: true })
})

// ── Admin: delete from watchlist ──────────────────────────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  run('DELETE FROM futures_watchlist WHERE id = ?', [req.params.id])
  res.json({ success: true })
})

export default router
