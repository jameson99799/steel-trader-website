import { Router } from 'express'
import { getAll, getOne, run } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { maskSecret } from '../config/secrets.js'
import WebSocket from 'ws'

const router = Router()

// ── Built-in demo ship database (real static particulars) ─────────────────
// Used when no API keys are configured or external sources are unreachable,
// so the feature works out of the box.
const DEMO_SHIPS = [
  { name: 'PACIFIC TALENT', imo: 9712943, mmsi: 477900500, callsign: 'VROZ5', flag: 'HK', flagName: 'Hong Kong', flagNameZh: '中国香港', type: 'Bulk Carrier', typeZh: '散货船', built: 2016, gt: 34590, dwt: 61408, loa: 199, beam: 32, lat: 32.4, lon: 122.3, sog: 11.9, cog: 25, heading: 24, dest: 'TIANJIN XINGANG', destZh: '天津新港', eta: '2026-08-28 02:00', lastPort: 'ZHANJIANG', lastPortZh: '湛江', status: 'underway' },
  { name: 'PACIFIC BLISS', imo: 1047524, mmsi: 477155700, callsign: 'VRQW8', flag: 'HK', flagName: 'Hong Kong', flagNameZh: '中国香港', type: 'Bulk Carrier', typeZh: '散货船', built: 2025, gt: 44100, dwt: 81000, loa: 229, beam: 32, lat: 24.8, lon: 118.1, sog: 12.3, cog: 310, heading: 308, dest: 'SINGAPORE', destZh: '新加坡', eta: '2026-08-30 18:00', lastPort: 'KAOHSIUNG', lastPortZh: '高雄', status: 'underway' },
  { name: 'PACIFIC CHAMP', imo: 9856244, mmsi: 636024366, callsign: 'D5UC9', flag: 'LR', flagName: 'Liberia', flagNameZh: '利比里亚', type: 'Bulk Carrier', typeZh: '散货船', built: 2019, gt: 34900, dwt: 61400, loa: 200, beam: 32, lat: 22.2, lon: 114.1, sog: 0.0, cog: 0, heading: 182, dest: 'HONG KONG', destZh: '中国香港', eta: '2026-08-26 09:00', lastPort: 'JINGTANG', lastPortZh: '京唐港', status: 'anchored' },
  { name: 'PACIFIC MERIT', imo: 9731987, mmsi: 477148900, callsign: 'VROZ7', flag: 'HK', flagName: 'Hong Kong', flagNameZh: '中国香港', type: 'Bulk Carrier', typeZh: '散货船', built: 2018, gt: 34590, dwt: 61408, loa: 199, beam: 32, lat: 39.0, lon: 119.7, sog: 0.0, cog: 0, heading: 0, dest: 'TIANJIN XINGANG', destZh: '天津新港', eta: '2026-08-24 22:00', lastPort: 'NEWCASTLE', lastPortZh: '纽卡斯尔', status: 'moored' },
  { name: 'PACIFIC WEALTH', imo: 9731975, mmsi: 477139500, callsign: 'VROZ6', flag: 'HK', flagName: 'Hong Kong', flagNameZh: '中国香港', type: 'Bulk Carrier', typeZh: '散货船', built: 2017, gt: 34590, dwt: 61408, loa: 199, beam: 32, lat: -6.5, lon: 112.8, sog: 11.5, cog: 95, heading: 96, dest: 'SINGAPORE', destZh: '新加坡', eta: '2026-08-27 08:00', lastPort: 'SURIGAO', lastPortZh: '苏里高', status: 'underway' },
  { name: 'PACIFIC VICTORY', imo: 9731896, mmsi: 477035200, callsign: 'VROZ5', flag: 'HK', flagName: 'Hong Kong', flagNameZh: '中国香港', type: 'Bulk Carrier', typeZh: '散货船', built: 2017, gt: 34590, dwt: 61408, loa: 199, beam: 32, lat: 31.9, lon: 122.9, sog: 10.8, cog: 355, heading: 358, dest: 'ZHANJIANG', destZh: '湛江', eta: '2026-08-29 14:00', lastPort: 'TIANJIN XINGANG', lastPortZh: '天津新港', status: 'underway' },
  { name: 'PACIFIC TALISMAN', imo: 9712931, mmsi: 477849700, callsign: 'VROZ9', flag: 'HK', flagName: 'Hong Kong', flagNameZh: '中国香港', type: 'Bulk Carrier', typeZh: '散货船', built: 2016, gt: 34590, dwt: 61408, loa: 199, beam: 32, lat: 30.6, lon: 122.1, sog: 0.0, cog: 0, heading: 210, dest: 'SHANGHAI', destZh: '上海', eta: '2026-08-27 20:00', lastPort: 'PORT HEDLAND', lastPortZh: '黑德兰港', status: 'anchored' },
  { name: 'PACIFIC ACHIEVEMENT', imo: 9712917, mmsi: 477347800, callsign: 'VROZ2', flag: 'HK', flagName: 'Hong Kong', flagNameZh: '中国香港', type: 'Bulk Carrier', typeZh: '散货船', built: 2016, gt: 34590, dwt: 61408, loa: 199, beam: 32, lat: 1.2, lon: 104.0, sog: 10.2, cog: 275, heading: 278, dest: 'PORT KLANG', destZh: '巴生港', eta: '2026-08-25 16:00', lastPort: 'TIANJIN XINGANG', lastPortZh: '天津新港', status: 'underway' },
  { name: 'PACIFIC AWARD', imo: 9712905, mmsi: 477078100, callsign: 'VROZ3', flag: 'HK', flagName: 'Hong Kong', flagNameZh: '中国香港', type: 'Bulk Carrier', typeZh: '散货船', built: 2015, gt: 34590, dwt: 61408, loa: 199, beam: 32, lat: -33.9, lon: 18.4, sog: 11.6, cog: 350, heading: 351, dest: 'CAPE TOWN', destZh: '开普敦', eta: '2026-08-26 06:00', lastPort: 'QINGDAO', lastPortZh: '青岛', status: 'underway' },
  { name: 'PACIFIC ABILITY', imo: 9712890, mmsi: 477769800, callsign: 'VROZ4', flag: 'HK', flagName: 'Hong Kong', flagNameZh: '中国香港', type: 'Bulk Carrier', typeZh: '散货船', built: 2016, gt: 34590, dwt: 61408, loa: 199, beam: 32, lat: 34.5, lon: 120.9, sog: 0.0, cog: 0, heading: 45, dest: 'RIZHAO', destZh: '日照', eta: '2026-08-27 10:00', lastPort: 'PORT HEDLAND', lastPortZh: '黑德兰港', status: 'moored' }
]

// ── AIS numeric navigational status → normalized status ───────────────────
const NAV_STATUS_MAP = {
  0: 'underway', 1: 'anchored', 2: 'na', 3: 'na', 4: 'na', 5: 'moored',
  6: 'na', 7: 'na', 8: 'underway', 9: 'na', 10: 'na', 11: 'na', 12: 'na',
  13: 'na', 14: 'na', 15: 'na'
}

const SHIP_TYPE_MAP = {
  30: 'Fishing', 31: 'Fishing', 32: 'Fishing', 33: 'Fishing', 34: 'Fishing', 35: 'Fishing', 36: 'Fishing', 37: 'Fishing',
  40: 'High Speed Craft', 50: 'Pilot Vessel', 51: 'Search & Rescue', 52: 'Tug', 53: 'Port Tender', 54: 'Anti-Pollution',
  55: 'Law Enforcement', 58: 'Medical Transport', 59: 'Non-Combatant',
  60: 'Passenger', 61: 'Passenger', 62: 'Passenger', 63: 'Passenger', 64: 'Passenger', 65: 'Passenger', 66: 'Passenger', 67: 'Passenger', 68: 'Passenger', 69: 'Passenger',
  70: 'Cargo', 71: 'Cargo', 72: 'Cargo', 73: 'Cargo', 74: 'Cargo', 75: 'Cargo', 76: 'Cargo', 77: 'Cargo', 78: 'Cargo', 79: 'Cargo',
  80: 'Tanker', 81: 'Tanker', 82: 'Tanker', 83: 'Tanker', 84: 'Tanker', 85: 'Tanker', 86: 'Tanker', 87: 'Tanker', 88: 'Tanker', 89: 'Tanker',
  90: 'Other', 91: 'Other', 92: 'Other', 93: 'Other', 94: 'Other', 95: 'Other', 96: 'Other', 97: 'Other', 98: 'Other', 99: 'Other'
}

function normalizeStatus(raw) {
  const s = String(raw || '').toLowerCase()
  if (s.includes('under')) return 'underway'
  if (s.includes('anchor')) return 'anchored'
  if (s.includes('moor') || s.includes('alongside') || s.includes('bert')) return 'moored'
  return 'na'
}

// ── API settings (admin-managed, stored in DB, env fallback) ──────────────
let settingsCache = null
let settingsCacheTime = 0
const SETTINGS_TTL = 10000

function loadSettingsCache(force = false) {
  const now = Date.now()
  if (!force && settingsCache && now - settingsCacheTime < SETTINGS_TTL) return settingsCache
  let ais = null
  let vessel = null
  try {
    const rows = getAll('SELECT key, value FROM ship_settings')
    for (const r of rows) {
      if (r.key === 'aisstream_api_key') ais = r.value
      else if (r.key === 'vessel_api_key') vessel = r.value
    }
  } catch (e) { /* table may not exist yet */ }
  settingsCache = { aisstream: ais || null, vessel: vessel || null }
  settingsCacheTime = now
  return settingsCache
}

function getAisstreamKey() {
  const s = loadSettingsCache()
  return s.aisstream || process.env.AISSTREAM_API_KEY || ''
}

function getVesselApiKey() {
  const s = loadSettingsCache()
  return s.vessel || process.env.VESSEL_API_KEY || ''
}

function restartAisstream() {
  if (ws) {
    try { ws.close(1000, 'settings-changed') } catch (e) { /* ignore */ }
    ws = null
  }
  setTimeout(() => { connectAisstream() }, 500)
}

// ── VesselAPI (search only — 1 query per search, free tier ≈150/month) ─────
const VESSEL_API_BASE = 'https://api.vesselapi.com/v1'

async function vesselApiGet(path) {
  const key = getVesselApiKey()
  if (!key) return null
  try {
    const resp = await fetch(`${VESSEL_API_BASE}${path}`, {
      headers: { 'Authorization': `Bearer ${key}`, 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000)
    })
    if (!resp.ok) return null
    return await resp.json()
  } catch (e) {
    console.error('VesselAPI error:', e.message)
    return null
  }
}

// ── aisstream.io WebSocket client (live positions, no query limits) ───────
// https://aisstream.io — free tier: persistent connection, filter by MMSI.
const AISSTREAM_URL = 'wss://stream.aisstream.io/v0.1'

let ws = null
let reconnectTimer = null
let backoffMs = 2000
let subscribedMMSIs = new Set()
let requestedMMSIs = new Set()   // watchlist MMSIs + recently searched MMSIs
let subUpdateTimer = null
const liveCache = new Map()       // mmsi -> latest PositionReport + ShipData
const searchTTL = new Map()       // mmsi -> expiry timestamp (recent search tracking)

const SEARCH_TRACK_MS = 30 * 60 * 1000  // keep searched ships subscribed for 30 min

function findDemoShip(q) {
  q = String(q || '').trim().toUpperCase()
  if (!q) return null
  return DEMO_SHIPS.find(s =>
    s.name === q || s.name.includes(q) ||
    String(s.imo) === q || String(s.mmsi) === q
  ) || null
}

function loadRequestedMMSIs() {
  requestedMMSIs = new Set()
  try {
    const list = getAll('SELECT mmsi FROM ship_watchlist WHERE mmsi IS NOT NULL')
    for (const row of list) requestedMMSIs.add(String(row.mmsi))
  } catch (e) { /* table may not exist */ }
  const now = Date.now()
  for (const [mmsi, expiry] of searchTTL) {
    if (expiry > now) requestedMMSIs.add(String(mmsi))
    else searchTTL.delete(mmsi)
  }
}

function scheduleSubscriptionUpdate(delayMs = 3000) {
  if (!getAisstreamKey()) return
  clearTimeout(subUpdateTimer)
  subUpdateTimer = setTimeout(() => {
    loadRequestedMMSIs()
    const same =
      requestedMMSIs.size === subscribedMMSIs.size &&
      [...requestedMMSIs].every(m => subscribedMMSIs.has(m))
    if (!same && ws) {
      ws.close(1000, 'resubscribe')
    }
  }, delayMs)
}

function handleAisMessage(raw) {
  let msg
  try { msg = JSON.parse(raw) } catch { return }

  const meta = msg.MetaData || {}
  const mmsi = meta.MMSI || msg.Message?.ShipData?.Mmsi
  if (!mmsi) return

  let entry = liveCache.get(String(mmsi)) || { mmsi: String(mmsi) }

  if (msg.MessageType === 'PositionReport' && msg.Message?.PositionReport) {
    const p = msg.Message.PositionReport
    if (meta.Latitude !== undefined && meta.Longitude !== undefined) {
      entry.lat = meta.Latitude
      entry.lon = meta.Longitude
    }
    if (p.Sog !== undefined) entry.sog = p.Sog
    if (p.Cog !== undefined) entry.cog = p.Cog
    if (p.Heading !== undefined) entry.heading = p.Heading
    if (p.NavStatus !== undefined) entry.navStatus = NAV_STATUS_MAP[p.NavStatus] || 'na'
    if (meta.ShipName) entry.name = meta.ShipName
  } else if (msg.MessageType === 'ShipData' && msg.Message?.ShipData) {
    const s = msg.Message.ShipData
    if (s.Name) entry.name = s.Name
    if (s.Imo) entry.imo = s.Imo
    if (s.ShipType !== undefined) entry.type = SHIP_TYPE_MAP[s.ShipType] || 'Cargo'
    if (s.Dimension) {
      const d = s.Dimension
      entry.loa = (d.A !== undefined && d.B !== undefined) ? d.A + d.B : null
      entry.beam = (d.C !== undefined && d.D !== undefined) ? d.C + d.D : null
    }
    if (s.Destination) entry.dest = String(s.Destination).toUpperCase()
    if (s.Eta) entry.eta = s.Eta
  }

  entry.updatedAt = new Date().toISOString()
  liveCache.set(String(mmsi), entry)
}

function sendSubscribe() {
  const key = getAisstreamKey()
  if (!key || !ws) return
  const mmsis = [...requestedMMSIs]
  if (mmsis.length === 0) return
  ws.send(JSON.stringify({
    APIKey: key,
    BoundingBoxes: [[[-90, -180], [90, 180]]],
    FiltersShipMMSI: mmsis,
    FilterMessageTypes: ['PositionReport', 'ShipData']
  }))
  subscribedMMSIs = new Set(mmsis)
  backoffMs = 2000
}

function connectAisstream() {
  const key = getAisstreamKey()
  if (!key || ws) return

  loadRequestedMMSIs()

  let socket
  try {
    socket = new WebSocket(AISSTREAM_URL)
  } catch (e) {
    console.error('[ships] aisstream connection failed:', e.message)
    reconnectTimer = setTimeout(() => { connectAisstream() }, backoffMs)
    backoffMs = Math.min(backoffMs * 1.5, 60000)
    return
  }

  socket.on('open', () => {
    console.log(`[ships] aisstream connected (tracking ${requestedMMSIs.size} vessels)`)
    sendSubscribe()
  })

  socket.on('message', (data) => {
    handleAisMessage(String(data))
  })

  socket.on('close', () => {
    if (ws === socket) ws = null
    subscribedMMSIs = new Set()
    if (!getAisstreamKey()) return
    reconnectTimer = setTimeout(() => {
      connectAisstream()
    }, backoffMs)
    backoffMs = Math.min(backoffMs * 1.5, 60000)
  })

  socket.on('error', (err) => {
    console.error('[ships] aisstream socket error:', err?.message || err)
  })

  ws = socket
}

// Keep the connection alive — aisstream closes idle sockets
setInterval(() => {
  if (ws && ws.readyState === 1) {
    try { ws.send('') } catch (e) { /* ignore */ }
  }
}, 30000)

// Cleanup expired search-tracked MMSIs (subscription stays lean)
setInterval(() => {
  let changed = false
  const now = Date.now()
  for (const [mmsi, expiry] of searchTTL) {
    if (expiry <= now) {
      searchTTL.delete(mmsi)
      changed = true
    }
  }
  if (changed) scheduleSubscriptionUpdate(2000)
}, 60000)

setTimeout(() => { connectAisstream() }, 1500)

// ── Helpers ────────────────────────────────────────────────────────────────
function shipRowToObject(row) {
  const demo = DEMO_SHIPS.find(s => s.name.toUpperCase() === String(row.name).toUpperCase()) || null
  const cached = row.mmsi ? liveCache.get(String(row.mmsi)) : null
  return {
    id: row.id,
    name: cached?.name || row.name,
    name_en: cached?.name || demo?.name || row.name,
    imo: row.imo || cached?.imo || demo?.imo || null,
    mmsi: row.mmsi || demo?.mmsi || null,
    callsign: demo?.callsign || null,
    flag: demo?.flag || null,
    flagName: demo?.flagName || null,
    flagNameZh: demo?.flagNameZh || null,
    type: cached?.type || demo?.type || 'Cargo',
    typeZh: demo?.typeZh || null,
    built: demo?.built || null,
    gt: demo?.gt || null,
    dwt: demo?.dwt || null,
    loa: cached?.loa || demo?.loa || null,
    beam: cached?.beam || demo?.beam || null,
    lastPort: demo?.lastPort || null,
    lastPortZh: demo?.lastPortZh || null
  }
}

function mergeLive(ship) {
  const cached = ship.mmsi ? liveCache.get(String(ship.mmsi)) : null
  if (cached) {
    return {
      ...ship,
      live: {
        lat: cached.lat, lon: cached.lon,
        sog: cached.sog !== undefined ? cached.sog : null,
        cog: cached.cog !== undefined ? cached.cog : null,
        heading: cached.heading !== undefined ? cached.heading : null,
        status: cached.navStatus || 'na',
        dest: cached.dest || null,
        destZh: cached.dest && ship.destZh && cached.dest === ship.dest ? ship.destZh : null,
        eta: cached.eta || null,
        lastPort: ship.lastPort || null,
        lastPortZh: ship.lastPortZh || null,
        updatedAt: cached.updatedAt,
        source: 'live'
      }
    }
  }

  const demo = DEMO_SHIPS.find(s => s.name.toUpperCase() === String(ship.name).toUpperCase())
  if (demo) {
    return {
      ...ship,
      live: {
        lat: demo.lat, lon: demo.lon, sog: demo.sog, cog: demo.cog, heading: demo.heading,
        status: demo.status, dest: demo.dest, destZh: demo.destZh, eta: demo.eta,
        lastPort: demo.lastPort, lastPortZh: demo.lastPortZh,
        updatedAt: new Date().toISOString(), source: 'demo'
      }
    }
  }

  return { ...ship, live: null }
}

// ── Public: watchlist with live data ──────────────────────────────────────
router.get('/list-data', (req, res) => {
  try {
    const list = getAll('SELECT * FROM ship_watchlist ORDER BY sort_order ASC, id ASC')
    const results = list.map(row => mergeLive(shipRowToObject(row)))
    res.json(results)
  } catch (e) {
    res.json([])
  }
})

// ── Public: search ships by name / IMO / MMSI ──────────────────────────────
router.get('/search', async (req, res) => {
  const q = (req.query.q || '').trim()
  if (!q) return res.json([])

  const results = []

  const demo = findDemoShip(q)
  if (demo) {
    results.push(mergeLive({ ...demo, name_en: demo.name }))
  }

  const key = getVesselApiKey()
  if (key) {
    try {
      const data = await vesselApiGet(`/search/vessels?query=${encodeURIComponent(q)}`)
      const items = Array.isArray(data) ? data : (data?.vessels || data?.results || [])
      for (const it of items.slice(0, 5)) {
        const name = it.vesselName || it.name || it.shipName || ''
        if (!name) continue
        const exists = results.some(r => r.name.toUpperCase() === name.toUpperCase() ||
          (it.mmsi && r.mmsi === it.mmsi) || (it.imo && r.imo === it.imo))
        if (exists) continue
        const ship = {
          name,
          name_en: name,
          imo: it.imo || null,
          mmsi: it.mmsi || null,
          callsign: it.callsign || it.callSign || null,
          flag: it.flag || null,
          flagName: it.flagName || null,
          flagNameZh: null,
          type: it.vesselType || it.shipType || 'Cargo',
          typeZh: null,
          built: it.yearBuilt || null,
          gt: it.grossTonnage || null,
          dwt: it.deadweight || null,
          loa: it.length || null,
          beam: it.beam || null
        }
        if (it.mmsi) {
          searchTTL.set(String(it.mmsi), Date.now() + SEARCH_TRACK_MS)
          const cached = liveCache.get(String(it.mmsi))
          if (cached) {
            ship.name = cached.name || ship.name
            if (cached.loa) ship.loa = cached.loa
            if (cached.beam) ship.beam = cached.beam
            if (cached.type) ship.type = cached.type
          }
        }
        results.push(mergeLive(ship))
      }
      if (results.some(r => r.mmsi)) scheduleSubscriptionUpdate(2000)
    } catch (e) {
      console.error('Ship search error:', e.message)
    }
  }

  res.json(results.slice(0, 10))
})

// ── Admin: get watchlist ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  const list = getAll('SELECT * FROM ship_watchlist ORDER BY sort_order ASC, id ASC')
  res.json(list)
})

// ── Admin: add ship to watchlist ──────────────────────────────────────────
router.post('/', authMiddleware, (req, res) => {
  const { name, imo, mmsi } = req.body
  if (!name) return res.status(400).json({ error: '船名不能为空' })

  const existing = getOne('SELECT id FROM ship_watchlist WHERE name = ?', [name.toUpperCase()])
  if (existing) return res.status(400).json({ error: '该船已添加' })

  const demo = findDemoShip(name)
  const maxOrder = getOne('SELECT MAX(sort_order) as max_order FROM ship_watchlist')
  const sortOrder = (maxOrder?.max_order || 0) + 1

  run(
    'INSERT INTO ship_watchlist (name, imo, mmsi, sort_order) VALUES (?, ?, ?, ?)',
    [name.toUpperCase(), imo || demo?.imo || null, mmsi || demo?.mmsi || null, sortOrder]
  )

  const row = getOne('SELECT * FROM ship_watchlist WHERE name = ?', [name.toUpperCase()])
  if (row?.mmsi) {
    searchTTL.delete(String(row.mmsi))
    scheduleSubscriptionUpdate(1000)
  }
  res.json({ success: true })
})

// ── Admin: reorder watchlist ──────────────────────────────────────────────
router.put('/reorder', authMiddleware, (req, res) => {
  const { items } = req.body
  if (!Array.isArray(items)) return res.status(400).json({ error: 'Invalid data' })
  for (const item of items) {
    run('UPDATE ship_watchlist SET sort_order = ? WHERE id = ?', [item.sort_order, item.id])
  }
  res.json({ success: true })
})

// ── Admin: delete from watchlist ──────────────────────────────────────────
router.delete('/:id', authMiddleware, (req, res) => {
  run('DELETE FROM ship_watchlist WHERE id = ?', [req.params.id])
  scheduleSubscriptionUpdate(1000)
  res.json({ success: true })
})

// ── Admin: get API settings (masked) ──────────────────────────────────────
router.get('/settings', authMiddleware, (req, res) => {
  const s = loadSettingsCache(true)
  res.json({
    aisstream_api_key_display: maskSecret(s.aisstream),
    aisstream_api_key_configured: Boolean(s.aisstream || process.env.AISSTREAM_API_KEY),
    vessel_api_key_display: maskSecret(s.vessel),
    vessel_api_key_configured: Boolean(s.vessel || process.env.VESSEL_API_KEY)
  })
})

// ── Admin: update API settings ────────────────────────────────────────────
router.put('/settings', authMiddleware, (req, res) => {
  const { aisstream_api_key, vessel_api_key } = req.body
  let aisChanged = false

  if (typeof aisstream_api_key === 'string') {
    run(
      `INSERT INTO ship_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      ['aisstream_api_key', aisstream_api_key.trim()]
    )
    aisChanged = true
  }
  if (typeof vessel_api_key === 'string') {
    run(
      `INSERT INTO ship_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      ['vessel_api_key', vessel_api_key.trim()]
    )
  }

  loadSettingsCache(true)
  if (aisChanged) restartAisstream()
  res.json({ success: true })
})

// ── Admin: live connection status ─────────────────────────────────────────
router.get('/status', authMiddleware, (req, res) => {
  res.json({
    aisstream_key_configured: Boolean(getAisstreamKey()),
    aisstream_connected: Boolean(ws && ws.readyState === 1),
    tracked_count: requestedMMSIs.size,
    vessel_key_configured: Boolean(getVesselApiKey())
  })
})

export default router