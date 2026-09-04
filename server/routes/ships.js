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

// ── ShipXY (船讯网) — primary data source (China-reachable) ──────────────
// API v3: https://api.shipxy.com/apicall/v3 — key in query param, {status:0,data:[...]}
const SHIPXY_BASE = 'https://api.shipxy.com/apicall/v3'

const SHIPXY_TYPE = {
  0: { en: 'Unknown', zh: '未知' },
  30: { en: 'Fishing', zh: '渔船' },
  50: { en: 'Pilot Vessel', zh: '引航船' },
  60: { en: 'Passenger', zh: '客船' },
  70: { en: 'Cargo', zh: '货船' },
  71: { en: 'Container Ship', zh: '集装箱船' },
  80: { en: 'Tanker', zh: '油轮' },
  81: { en: 'Chemical Tanker', zh: '化学品船' },
  82: { en: 'LNG Carrier', zh: '液化气船' },
  90: { en: 'Bulk Carrier', zh: '散货船' },
  100: { en: 'General Cargo', zh: '杂货船' }
}

const SHIPXY_NS = { 0: 'underway', 1: 'anchored', 5: 'moored' }

const shipxyDiag = { lastPoll: null, lastPollCount: 0, lastError: null }

function getShipxyKey() {
  const s = loadSettingsCache()
  return s.shipxy || process.env.SHIPXY_API_KEY || ''
}

async function shipxyGet(endpoint, params) {
  const key = getShipxyKey()
  if (!key) return null
  try {
    const qs = new URLSearchParams({ key, ...params })
    const resp = await fetch(`${SHIPXY_BASE}/${endpoint}?${qs}`, { signal: AbortSignal.timeout(10000) })
    if (!resp.ok) {
      console.error(`[ships] ShipXY ${endpoint} -> HTTP ${resp.status}`)
      return null
    }
    const json = await resp.json()
    if (json.status !== 0) {
      console.error(`[ships] ShipXY ${endpoint} status=${json.status}`, String(json.msg || '').slice(0, 150))
      return null
    }
    return json.data
  } catch (e) {
    console.error('[ships] ShipXY error:', e.message)
    shipxyDiag.lastError = { at: new Date().toISOString(), message: e.message }
    return null
  }
}

function applyShipxyShip(s) {
  if (!s || !s.mmsi) return
  const mmsi = String(s.mmsi)
  let entry = liveCache.get(mmsi) || { mmsi }
  if (s.lat !== undefined && s.lng !== undefined && s.lat !== null && s.lng !== null) {
    entry.lat = s.lat
    entry.lon = s.lng
  }
  if (s.sog !== undefined && s.sog !== -1) entry.sog = s.sog
  if (s.cog !== undefined && s.cog !== -1) entry.cog = s.cog
  if (s.navistat !== undefined) entry.navStatus = SHIPXY_NS[s.navistat] || 'na'
  if (s.ship_name) entry.name = s.ship_name
  if (s.ship_cnname) entry.nameZh = s.ship_cnname
  if (s.imo) entry.imo = s.imo
  if (s.call_sign) entry.callsign = s.call_sign
  if (s.ship_type !== undefined) {
    const t = SHIPXY_TYPE[s.ship_type]
    if (t) { entry.type = t.en; entry.typeZh = t.zh }
  }
  if (s.dest) entry.dest = String(s.dest).toUpperCase()
  if (s.eta) entry.eta = s.eta
  if (s.length) entry.loa = s.length
  if (s.width) entry.beam = s.width
  if (s.draught !== undefined && s.draught !== null) entry.draught = s.draught
  entry.dataSource = s.data_source === 0 ? 'AIS岸基' : 'AIS卫星'
  entry.source = 'live'
  entry.updatedAt = new Date().toISOString()
  liveCache.set(mmsi, entry)
}

async function shipxyPollWatchlist() {
  const key = getShipxyKey()
  if (!key) return
  try {
    const rows = getAll('SELECT mmsi FROM ship_watchlist WHERE mmsi IS NOT NULL')
    if (rows.length === 0) return
    const mmsis = rows.map(r => r.mmsi)
    for (let i = 0; i < mmsis.length; i += 100) {
      const batch = mmsis.slice(i, i + 100)
      const data = await shipxyGet('GetManyShip', { mmsis: batch.join(',') })
      if (Array.isArray(data)) {
        for (const s of data) applyShipxyShip(s)
      }
    }
    shipxyDiag.lastPoll = new Date().toISOString()
    shipxyDiag.lastPollCount = rows.length
  } catch (e) { /* handled */ }
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
  let shipxy = null
  try {
    const rows = getAll('SELECT key, value FROM ship_settings')
    for (const r of rows) {
      if (r.key === 'aisstream_api_key') ais = r.value
      else if (r.key === 'vessel_api_key') vessel = r.value
      else if (r.key === 'shipxy_api_key') shipxy = r.value
    }
  } catch (e) { /* table may not exist yet */ }
  settingsCache = { aisstream: ais || null, vessel: vessel || null, shipxy: shipxy || null }
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
    if (!resp.ok) {
      const body = await resp.text()
      console.error(`[ships] VesselAPI ${path.split('?')[0]} -> HTTP ${resp.status}:`, body.slice(0, 200))
      return null
    }
    return await resp.json()
  } catch (e) {
    console.error('[ships] VesselAPI error:', e.message)
    return null
  }
}

// ── aisstream.io WebSocket client (live positions, no query limits) ───────
// https://aisstream.io/documentation — free tier: persistent connection,
// filter by MMSI, permessage-deflate compression required since 2026-09.
const AISSTREAM_URL = process.env.AISSTREAM_URL || 'wss://stream.aisstream.io/v0/stream'

let ws = null
let reconnectTimer = null
let backoffMs = 2000
let subscribedMMSIs = new Set()
let requestedMMSIs = new Set()   // watchlist MMSIs + recently searched MMSIs
let subUpdateTimer = null
const liveCache = new Map()       // mmsi -> latest PositionReport + ShipData
const searchTTL = new Map()       // mmsi -> expiry timestamp (recent search tracking)
const wsDiag = { lastError: null, lastClose: null, connectAttempts: 0, openedAt: null, subscribedAt: null, messagesReceived: 0, lastSubscribeAt: null, lastSubscribeCount: 0 }

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
    if (same) return
    if (ws && ws.readyState === 1) {
      sendSubscribe()
    } else if (ws) {
      ws.close(1000, 'resubscribe')
    }
  }, delayMs)
}

function handleAisMessage(raw) {
  let msg
  try { msg = JSON.parse(raw) } catch { return }

  if (msg.MessageType === 'SubscriptionConfirmation') {
    wsDiag.subscribedAt = new Date().toISOString()
    console.log('[ships] aisstream subscription confirmed')
    return
  }

  wsDiag.messagesReceived++

  const meta = msg.MetaData || {}
  const mmsi = meta.MMSI || meta.mmsi || msg.Message?.ShipData?.Mmsi || msg.Message?.ShipStaticData?.Mmsi
  if (!mmsi) return

  let entry = liveCache.get(String(mmsi)) || { mmsi: String(mmsi) }

  if (msg.MessageType === 'PositionReport' && msg.Message?.PositionReport) {
    const p = msg.Message.PositionReport
    if (meta.Latitude !== undefined && meta.Longitude !== undefined) {
      entry.lat = meta.Latitude
      entry.lon = meta.Longitude
    } else if (meta.latitude !== undefined && meta.longitude !== undefined) {
      entry.lat = meta.latitude
      entry.lon = meta.longitude
    }
    if (p.Sog !== undefined) entry.sog = p.Sog
    if (p.Cog !== undefined) entry.cog = p.Cog
    const heading = p.TrueHeading ?? p.Heading
    if (heading !== undefined) entry.heading = heading
    const navStatus = p.NavigationalStatus ?? p.NavStatus
    if (navStatus !== undefined) entry.navStatus = NAV_STATUS_MAP[navStatus] || 'na'
    if (meta.ShipName || meta.shipName) entry.name = meta.ShipName || meta.shipName
  } else if ((msg.MessageType === 'ShipData' || msg.MessageType === 'ShipStaticData') && msg.Message) {
    const s = msg.Message.ShipData || msg.Message.ShipStaticData
    if (!s) return
    if (s.Name ?? s.name) entry.name = s.Name ?? s.name
    if (s.Imo ?? s.imo) entry.imo = s.Imo ?? s.imo
    const shipType = s.ShipType ?? s.shipType
    if (shipType !== undefined) entry.type = SHIP_TYPE_MAP[shipType] || 'Cargo'
    const bow = s.DimensionToBow ?? s.dimensionToBow
    const stern = s.DimensionToStern ?? s.dimensionToStern
    if (bow !== undefined && stern !== undefined) entry.loa = bow + stern
    const port = s.DimensionToPort ?? s.dimensionToPort
    const starboard = s.DimensionToStarboard ?? s.dimensionToStarboard
    if (port !== undefined && starboard !== undefined) entry.beam = port + starboard
    const dest = s.Destination ?? s.destination
    if (dest) entry.dest = String(dest).toUpperCase()
    const eta = s.Eta ?? s.eta
    if (eta) entry.eta = eta
  }

  entry.updatedAt = new Date().toISOString()
  liveCache.set(String(mmsi), entry)
}

function sendSubscribe() {
  const key = getAisstreamKey()
  if (!key || !ws) return
  const mmsis = [...requestedMMSIs].slice(0, 200)
  const payload = {
    APIKey: key,
    BoundingBoxes: [[[-90, -180], [90, 180]]],
    FilterMessageTypes: ['PositionReport', 'ShipStaticData', 'StaticDataReport']
  }
  if (mmsis.length > 0) payload.FiltersShipMMSI = mmsis
  ws.send(JSON.stringify(payload))
  subscribedMMSIs = new Set(mmsis)
  wsDiag.lastSubscribeAt = new Date().toISOString()
  wsDiag.lastSubscribeCount = mmsis.length
  backoffMs = 2000
}

function connectAisstream() {
  const key = getAisstreamKey()
  if (!key || ws) return

  loadRequestedMMSIs()
  wsDiag.connectAttempts++

  let socket
  try {
    socket = new WebSocket(AISSTREAM_URL, { perMessageDeflate: true })
  } catch (e) {
    console.error('[ships] aisstream connection failed:', e.message)
    wsDiag.lastError = { at: new Date().toISOString(), message: e.message }
    reconnectTimer = setTimeout(() => { connectAisstream() }, backoffMs)
    backoffMs = Math.min(backoffMs * 1.5, 60000)
    return
  }

  socket.on('open', () => {
    wsDiag.openedAt = new Date().toISOString()
    console.log(`[ships] aisstream connected (tracking ${requestedMMSIs.size} vessels)`)
    sendSubscribe()
  })

  socket.on('message', (data) => {
    handleAisMessage(String(data))
  })

  socket.on('unexpected-response', (req, rsp) => {
    wsDiag.lastError = { at: new Date().toISOString(), message: `WebSocket upgrade rejected: HTTP ${rsp.statusCode} ${rsp.statusMessage || ''}` }
    console.error(`[ships] aisstream upgrade rejected: HTTP ${rsp.statusCode} ${rsp.statusMessage || ''}`)
    try { socket.terminate() } catch (e) { /* ignore */ }
  })

  socket.on('close', (code, reason) => {
    if (ws === socket) ws = null
    subscribedMMSIs = new Set()
    const confirmed = Boolean(wsDiag.subscribedAt)
    wsDiag.lastClose = { at: new Date().toISOString(), code, reason: String(reason || ''), confirmed }
    console.warn(`[ships] aisstream closed: code=${code} reason=${String(reason || '')} confirmed=${confirmed}`)
    if (!getAisstreamKey()) return
    reconnectTimer = setTimeout(() => {
      connectAisstream()
    }, backoffMs)
    backoffMs = Math.min(backoffMs * 1.5, 60000)
  })

  socket.on('error', (err) => {
    console.error('[ships] aisstream socket error:', err?.message || err)
    wsDiag.lastError = { at: new Date().toISOString(), message: err?.message || String(err) }
  })

  ws = socket
}

// Keep the connection alive with protocol-level ping frames (RFC 6455).
// Empty text messages could be mistaken for malformed subscription updates.
setInterval(() => {
  if (ws && ws.readyState === 1) {
    try { ws.ping() } catch (e) { /* ignore */ }
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

// ShipXY watchlist polling (primary position source when key configured)
setTimeout(() => { shipxyPollWatchlist() }, 2000)
setInterval(() => { shipxyPollWatchlist() }, 30000)

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
      name: cached.name || ship.name,
      nameZh: cached.nameZh || null,
      type: cached.type || ship.type,
      typeZh: cached.typeZh || ship.typeZh || null,
      loa: cached.loa || ship.loa,
      beam: cached.beam || ship.beam,
      live: {
        lat: cached.lat, lon: cached.lon,
        sog: cached.sog !== undefined ? cached.sog : null,
        cog: cached.cog !== undefined ? cached.cog : null,
        heading: cached.heading !== undefined ? cached.heading : null,
        status: cached.navStatus || 'na',
        dest: cached.dest || null,
        destZh: cached.dest && ship.destZh && cached.dest === ship.dest ? ship.destZh : null,
        eta: cached.eta || null,
        draught: cached.draught || null,
        dataSource: cached.dataSource || null,
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

// ── ShipXY proxy whitelist (public dashboard endpoints) ───────────────────
const SHIPXY_PROXY_WHITELIST = {
  SearchShip: ['keywords', 'max'],
  GetSingleShip: ['mmsi'],
  GetManyShip: ['mmsis'],
  GetNearbyShip: ['mmsi'],
  GetAreaShip: ['lat1', 'lng1', 'lat2', 'lng2', 'ship_type'],
  GetShipRegistry: ['mmsi'],
  GetShipArchives: ['mmsi'],
  SearchPort: ['keyword'],
  GetPortBerthedShips: ['port_code'],
  GetPortAnchoredShips: ['port_code'],
  GetPortExpectedShips: ['port_code'],
  GetShipTrack: ['mmsi', 'start_time', 'end_time'],
  RouteByPoints: ['lat1', 'lng1', 'lat2', 'lng2'],
  RouteByPorts: ['port1', 'port2'],
  GetETA: ['mmsi', 'port_code'],
  GetPointWeather: ['lat', 'lng'],
  GetTyphoons: [],
  GetGlobalPortTide: ['port_code'],
  GetFleetShip: ['fleet_id']
}

// Ships shown on the public dashboard when no watchlist is configured
const DASHBOARD_DEFAULT_MMSIS = [
  '413961925', '477172700', '477276900', '636018258', '219265000',
  '228379800', '412304788', '370286000', '413761246', '413761521',
  '413698530', '413552478', '413215487', '412703890', '538008645',
  '212759000', '311000576', '566914000', '636017492', '352898159'
]

// ── Public: dashboard fleet data (GetManyShip via ShipXY, demo fallback) ──
router.get('/dashboard-data', async (req, res) => {
  let mmsis = []
  try {
    const rows = getAll('SELECT mmsi FROM ship_watchlist WHERE mmsi IS NOT NULL')
    mmsis = rows.map(r => String(r.mmsi))
  } catch (e) { /* table may not exist */ }
  if (mmsis.length === 0) mmsis = DASHBOARD_DEFAULT_MMSIS

  let ships = []
  if (getShipxyKey()) {
    for (let i = 0; i < mmsis.length; i += 100) {
      const batch = mmsis.slice(i, i + 100)
      const data = await shipxyGet('GetManyShip', { mmsis: batch.join(',') })
      if (Array.isArray(data)) {
        for (const s of data) {
          applyShipxyShip(s)
          ships.push(s)
        }
      }
    }
  }

  if (ships.length === 0) {
    ships = DEMO_SHIPS.map(d => ({
      mmsi: d.mmsi, imo: d.imo, call_sign: d.callsign, ship_name: d.name, ship_cnname: null,
      ship_type: 90, length: d.loa, width: d.beam, draught: null,
      dest: d.dest, eta: d.eta, navistat: d.status === 'underway' ? 0 : d.status === 'anchored' ? 1 : 5,
      lat: d.lat, lng: d.lon, sog: d.sog, cog: d.cog, hdg: d.heading,
      data_source: 0, last_time: new Date().toISOString().replace('T', ' ').slice(0, 19)
    }))
  }

  res.json(ships)
})

// ── Public: ShipXY proxy (whitelist only, key stays server-side) ──────────
router.get('/shipxy/:endpoint', async (req, res) => {
  const endpoint = req.params.endpoint
  const allowed = SHIPXY_PROXY_WHITELIST[endpoint]
  if (!allowed) return res.status(400).json({ error: 'unsupported_endpoint' })

  const params = {}
  for (const k of allowed) {
    if (req.query[k] !== undefined && req.query[k] !== '') params[k] = req.query[k]
  }

  if (!getShipxyKey()) {
    return res.status(503).json({ error: 'shipxy_key_not_configured' })
  }

  const data = await shipxyGet(endpoint, params)
  if (data === null) {
    return res.status(502).json({ error: 'shipxy_request_failed' })
  }

  res.json({ status: 0, msg: '', data })
})

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

  // 1. ShipXY (primary — China reachable)
  const shipxyKey = getShipxyKey()
  if (shipxyKey) {
    try {
      const list = await shipxyGet('SearchShip', { keywords: q, max: 10 })
      if (Array.isArray(list)) {
        for (const s of list) {
          const name = s.ship_name || s.ship_cnname || ''
          if (!name) continue
          const exists = results.some(r =>
            r.name.toUpperCase() === name.toUpperCase() || (s.mmsi && r.mmsi === s.mmsi)
          )
          if (exists) continue
          const t = SHIPXY_TYPE[s.ship_type]
          results.push(mergeLive({
            name,
            name_en: s.ship_name || name,
            nameZh: s.ship_cnname || null,
            mmsi: s.mmsi || null,
            imo: s.imo || null,
            callsign: s.call_sign || null,
            type: t?.en || 'Cargo',
            typeZh: t?.zh || null,
            loa: s.length || null,
            beam: s.width || null
          }))
        }
        // Enrich the top result with full position/voyage details (1 call)
        const top = results.find(r => r.mmsi)
        if (top) {
          const detail = await shipxyGet('GetSingleShip', { mmsi: top.mmsi })
          if (Array.isArray(detail) && detail[0]) {
            applyShipxyShip(detail[0])
          }
        }
        if (results.some(r => r.mmsi)) scheduleSubscriptionUpdate(2000)
      }
    } catch (e) {
      console.error('ShipXY search error:', e.message)
    }
  }

  // 2. VesselAPI (secondary search fallback)
  const vesselKey = getVesselApiKey()
  if (vesselKey) {
    try {
      const cleanQ = q.replace(/[^A-Za-z0-9]/g, '')
      const isMmsi = /^\d{9}$/.test(cleanQ)
      const isImo = /^\d{7}$/.test(cleanQ)
      const filterParam = isMmsi ? `filter.mmsi=${cleanQ}`
        : isImo ? `filter.imo=${cleanQ}`
        : `filter.name=${encodeURIComponent(q)}`
      const data = await vesselApiGet(`/search/vessels?${filterParam}&pagination.limit=10`)
      const items = data?.vessels || data?.results || []
      for (const it of items) {
        const name = it.name || it.vessel_name || ''
        if (!name) continue
        const exists = results.some(r => r.name.toUpperCase() === name.toUpperCase() ||
          (it.mmsi && r.mmsi === it.mmsi) || (it.imo && r.imo === it.imo))
        if (exists) continue
        const ship = {
          name,
          name_en: name,
          imo: it.imo || null,
          mmsi: it.mmsi || null,
          callsign: it.call_sign || it.callsign || null,
          flag: it.flag || null,
          flagName: it.country || it.flag_name || it.flag || null,
          flagNameZh: null,
          type: it.vessel_type || it.shipType || 'Cargo',
          typeZh: null,
          built: it.year_built || it.yearBuilt || null,
          gt: it.gross_tonnage || it.grossTonnage || null,
          dwt: it.deadweight_tonnage || it.deadweight || null,
          loa: it.length || null,
          beam: it.breadth || it.beam || null
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
    shipxy_api_key_display: maskSecret(s.shipxy),
    shipxy_api_key_configured: Boolean(s.shipxy || process.env.SHIPXY_API_KEY),
    aisstream_api_key_display: maskSecret(s.aisstream),
    aisstream_api_key_configured: Boolean(s.aisstream || process.env.AISSTREAM_API_KEY),
    vessel_api_key_display: maskSecret(s.vessel),
    vessel_api_key_configured: Boolean(s.vessel || process.env.VESSEL_API_KEY)
  })
})

// ── Admin: update API settings ────────────────────────────────────────────
router.put('/settings', authMiddleware, (req, res) => {
  const { shipxy_api_key, aisstream_api_key, vessel_api_key } = req.body
  let aisChanged = false

  if (typeof shipxy_api_key === 'string') {
    run(
      `INSERT INTO ship_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`,
      ['shipxy_api_key', shipxy_api_key.trim()]
    )
  }
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
    shipxy_key_configured: Boolean(getShipxyKey()),
    shipxy_last_poll: shipxyDiag.lastPoll,
    shipxy_last_poll_count: shipxyDiag.lastPollCount,
    shipxy_last_error: shipxyDiag.lastError,
    aisstream_key_configured: Boolean(getAisstreamKey()),
    aisstream_connected: Boolean(ws && ws.readyState === 1),
    tracked_count: requestedMMSIs.size,
    vessel_key_configured: Boolean(getVesselApiKey()),
    connect_attempts: wsDiag.connectAttempts,
    opened_at: wsDiag.openedAt,
    subscribed_at: wsDiag.subscribedAt,
    last_subscribe_at: wsDiag.lastSubscribeAt,
    last_subscribe_count: wsDiag.lastSubscribeCount,
    messages_received: wsDiag.messagesReceived,
    last_error: wsDiag.lastError,
    last_close: wsDiag.lastClose
  })
})

// ── Admin: step-by-step connection self-test ───────────────────────────────
router.post('/test-connection', authMiddleware, async (req, res) => {
  const steps = []
  const record = (name, ok, detail) => steps.push({ step: name, ok, detail: String(detail || '') })

  // 1. ShipXY (primary) — direct API call test
  if (getShipxyKey()) {
    const data = await shipxyGet('SearchShip', { keywords: 'PACIFIC', max: 3 })
    if (Array.isArray(data) && data.length > 0) {
      record('船讯网 API', true, `搜索成功，返回 ${data.length} 条 (如 ${data[0].ship_name || data[0].ship_cnname || data[0].mmsi})`)
    } else if (data === null) {
      record('船讯网 API', false, '请求失败（Key 无效 / 无权限 / 网络不通），详见服务端日志')
    } else {
      record('船讯网 API', false, '返回结果为空')
    }
  } else {
    record('船讯网 API', false, '未配置 SHIPXY_API_KEY')
  }

  // 2. aisstream (optional fallback) — DNS/TCP/WS handshake
  try {
    const dns = await import('node:dns/promises')
    const result = await dns.lookup('stream.aisstream.io')
    record('DNS 解析', true, `stream.aisstream.io → ${result.address}`)
  } catch (e) {
    record('DNS 解析', false, e.message)
  }

  await new Promise((resolve) => {
    import('node:net').then(({ default: net }) => {
      const sock = net.connect({ host: 'stream.aisstream.io', port: 443, timeout: 6000 })
      sock.once('connect', () => { record('TCP 443', true, 'TCP 连接成功'); sock.destroy(); resolve() })
      sock.once('timeout', () => { record('TCP 443', false, 'TCP 连接超时 (6s)'); sock.destroy(); resolve() })
      sock.once('error', (e) => { record('TCP 443', false, e.message); resolve() })
    })
  })

  const aisKey = getAisstreamKey()
  if (!aisKey) {
    record('WebSocket', false, '未配置 AISSTREAM_API_KEY（可选备用源）')
  } else {
    await new Promise((resolve) => {
      let finished = false
      let sock = null
      const finish = () => {
        if (finished) return
        finished = true
        try { sock?.terminate() } catch (e) { /* ignore */ }
        resolve()
      }

      try {
        sock = new WebSocket(process.env.AISSTREAM_URL || AISSTREAM_URL, { perMessageDeflate: true, handshakeTimeout: 6000 })
      } catch (e) {
        record('WebSocket', false, e.message)
        return resolve()
      }

      const timer = setTimeout(() => { record('WebSocket', false, '等待订阅确认超时 (10s)'); finish() }, 10000)

      sock.on('open', () => {
        record('WebSocket', true, '握手成功，正在发送订阅...')
        try {
          sock.send(JSON.stringify({ APIKey: aisKey, BoundingBoxes: [[[-90, -180], [90, 180]]] }))
        } catch (e) {
          record('订阅', false, e.message)
          finish()
        }
      })
      sock.on('message', (data) => {
        clearTimeout(timer)
        record('订阅', true, `已收到服务端消息: ${String(data).slice(0, 150)}`)
        finish()
      })
      sock.on('unexpected-response', (r, rsp) => {
        clearTimeout(timer)
        record('WebSocket', false, `握手被拒绝: HTTP ${rsp.statusCode} ${rsp.statusMessage || ''}`)
        finish()
      })
      sock.on('error', (e) => {
        clearTimeout(timer)
        record('WebSocket', false, e.message)
        finish()
      })
      sock.on('close', (code, reason) => {
        clearTimeout(timer)
        if (!finished) record('WebSocket', false, `连接被关闭: code=${code} ${String(reason || '')}`)
        finish()
      })
    })
  }

  res.json({ steps, overall: steps.every(s => s.ok) })
})

export default router