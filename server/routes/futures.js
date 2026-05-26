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
}

/** Extract base code from symbol, e.g. HC2510 → HC, I2510 → I, HC0 -> HC */
function getBaseCode(symbol) {
  const m = symbol.match(/^([A-Z]+)/i)
  return m ? m[1].toUpperCase() : symbol.toUpperCase()
}

// ── Public: get watchlist ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  const list = getAll('SELECT * FROM futures_watchlist ORDER BY sort_order ASC, id ASC')
  res.json(list)
})

// ── Public: fetch real-time quotes via Sina API ───────────────────────────
router.get('/realtime', async (req, res) => {
  const symbols = req.query.symbols // e.g. "HC0,RB0"
  if (!symbols) return res.json([])
  
  const queryList = symbols.split(',').map(s => {
    // Sina API uses prefix 'nf_' for domestic futures
    return s.startsWith('nf_') ? s : `nf_${s}`
  }).join(',')

  try {
    const data = await new Promise((resolve, reject) => {
      https.get(`https://hq.sinajs.cn/list=${queryList}`, {
        headers: { 'Referer': 'https://finance.sina.com.cn' }
      }, (response) => {
        const chunks = []
        response.on('data', chunk => chunks.push(chunk))
        response.on('end', () => resolve(iconv.decode(Buffer.concat(chunks), 'gbk')))
      }).on('error', reject)
    })

    const results = []
    const lines = data.split('\n').map(l => l.trim()).filter(Boolean)
    
    for (const line of lines) {
      // var hq_str_nf_HC0="热轧卷板连续,093952,3435.000,...";
      const match = line.match(/hq_str_nf_([A-Za-z0-9]+)="([^"]*)"/)
      if (match) {
        const symbol = match[1]
        const fields = match[2].split(',')
        if (fields.length > 10) {
          const name = fields[0]
          const open = parseFloat(fields[2]) || 0
          const high = parseFloat(fields[3]) || 0
          const low = parseFloat(fields[4]) || 0
          const price = parseFloat(fields[8]) || 0
          const prevSettlement = parseFloat(fields[10]) || 0
          const volume = parseFloat(fields[13]) || 0
          const openInterest = parseFloat(fields[14]) || 0
          
          let change = 0
          let changePercent = 0
          if (prevSettlement > 0 && price > 0) {
            change = price - prevSettlement
            changePercent = (change / prevSettlement) * 100
          }

          results.push({
            symbol,
            name,
            price,
            change,
            changePercent,
            open,
            high,
            low,
            prevSettlement,
            volume,
            openInterest
          })
        }
      }
    }
    res.json(results)
  } catch (e) {
    console.error('Futures realtime proxy error:', e.message)
    res.json([])
  }
})

// ── Public: proxy K-line data from Sina Finance ───────────────────────────
router.get('/kline/:symbol', async (req, res) => {
  const symbol = req.params.symbol.toUpperCase()
  try {
    const url = `https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_${symbol}=/InnerFuturesNewService.getDailyKLine?symbol=${symbol}`
    const resp = await fetch(url, {
      headers: { 'Referer': 'https://finance.sina.com.cn', 'User-Agent': 'Mozilla/5.0' }
    })
    const text = await resp.text()
    // Parse JSONP: var _HC2510=([{...}]);
    const match = text.match(/\((\[[\s\S]*?\])\)/)
    if (!match) return res.json([])
    const data = JSON.parse(match[1])
    res.json(data)
  } catch (e) {
    console.error('Futures kline proxy error:', e.message)
    res.json([])
  }
})

// ── Admin: search futures symbols ─────────────────────────────────────────
router.get('/search', authMiddleware, (req, res) => {
  const q = (req.query.q || '').toUpperCase().trim()
  if (!q) return res.json([])

  const results = []
  for (const [code, info] of Object.entries(FUTURES_MAP)) {
    if (code.includes(q) || info.name.includes(q) || info.name_en.toUpperCase().includes(q)) {
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
