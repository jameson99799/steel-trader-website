import { isIP } from 'node:net'

const LOOKUP_TIMEOUT_MS = 1200
const SUCCESS_TTL_MS = 24 * 60 * 60 * 1000
const FAILURE_TTL_MS = 10 * 60 * 1000

const COUNTRY_LANGUAGES = new Map([
  ['IN', 'hi'], ['CN', 'zh'], ['ES', 'es'], ['FR', 'fr'], ['RU', 'ru'],
  ['TH', 'th'], ['TR', 'tr'], ['PT', 'pt'], ['BR', 'pt'],
  ['AE', 'ar'], ['SA', 'ar'], ['EG', 'ar'], ['IQ', 'ar'], ['JO', 'ar'],
  ['KW', 'ar'], ['LB', 'ar'], ['LY', 'ar'], ['MA', 'ar'], ['OM', 'ar'],
  ['PS', 'ar'], ['QA', 'ar'], ['SD', 'ar'], ['SY', 'ar'], ['TN', 'ar'],
  ['YE', 'ar'], ['DZ', 'ar'], ['BH', 'ar'], ['DJ', 'ar'], ['KM', 'ar'],
  ['MR', 'ar'], ['SO', 'ar']
])

function normalizeIp(ip) {
  if (typeof ip !== 'string') return null
  const value = ip.trim()
  const version = isIP(value)
  if (!version) return null
  if (version === 4) return value
  return mappedIpv4(value) || value
}

function ipv6Groups(ip) {
  if (isIP(ip) !== 6) return null
  const halves = ip.toLowerCase().split('::')
  if (halves.length > 2) return null

  const parseHalf = (half) => {
    if (!half) return []
    const parts = half.split(':')
    const groups = []
    for (let index = 0; index < parts.length; index++) {
      const part = parts[index]
      if (part.includes('.')) {
        if (index !== parts.length - 1 || isIP(part) !== 4) return null
        const octets = part.split('.').map(Number)
        groups.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3])
      } else {
        if (!/^[0-9a-f]{1,4}$/.test(part)) return null
        groups.push(parseInt(part, 16))
      }
    }
    return groups
  }

  const left = parseHalf(halves[0])
  const right = parseHalf(halves[1] || '')
  if (!left || !right) return null
  if (halves.length === 1) return left.length === 8 ? left : null

  const missing = 8 - left.length - right.length
  if (missing < 1) return null
  return [...left, ...Array(missing).fill(0), ...right]
}

function mappedIpv4(ip) {
  const groups = ipv6Groups(ip)
  if (!groups || groups.slice(0, 5).some(Boolean) || groups[5] !== 0xffff) return null
  return `${groups[6] >> 8}.${groups[6] & 0xff}.${groups[7] >> 8}.${groups[7] & 0xff}`
}

function isPrivateIpv4(ip) {
  const [a, b, c] = ip.split('.').map(Number)
  return a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0 && c === 2) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
}

function isPrivateIpv6(ip) {
  const groups = ipv6Groups(ip)
  if (!groups) return true
  const allLeadingZero = groups.slice(0, 7).every(group => group === 0)
  return (allLeadingZero && (groups[7] === 0 || groups[7] === 1)) ||
    (groups[0] & 0xfe00) === 0xfc00 ||
    (groups[0] & 0xffc0) === 0xfe80 ||
    (groups[0] === 0x2001 && groups[1] === 0x0db8) ||
    (groups[0] & 0xff00) === 0xff00
}

export function getClientIp(req) {
  const normalized = normalizeIp(req?.ip)
  return normalized && isPublicIp(normalized) ? normalized : null
}

export function isPublicIp(ip) {
  const normalized = normalizeIp(ip)
  if (!normalized) return false
  return isIP(normalized) === 4 ? !isPrivateIpv4(normalized) : !isPrivateIpv6(normalized)
}

function withTimeout(lookup, ip) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), LOOKUP_TIMEOUT_MS)
    Promise.resolve()
      .then(() => lookup(ip))
      .then((result) => {
        clearTimeout(timer)
        resolve(result)
      }, () => {
        clearTimeout(timer)
        resolve(null)
      })
  })
}

async function requestJson(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      headers: { accept: 'application/json' },
      signal: controller.signal
    })
    if (!response.ok) return null
    return await response.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function lookupPrimary(ip) {
  const data = await requestJson(`https://ipapi.co/${encodeURIComponent(ip)}/json/`)
  return data ? { countryCode: data.country_code, countryName: data.country_name } : null
}

async function lookupFallback(ip) {
  const data = await requestJson(`https://ipwho.is/${encodeURIComponent(ip)}`)
  return data?.success ? { countryCode: data.country_code, countryName: data.country } : null
}

function validResult(result, source) {
  if (!result || typeof result !== 'object') return null
  const { countryCode, countryName } = result
  if (typeof countryCode !== 'string' || !/^[A-Z]{2}$/.test(countryCode)) return null
  if (typeof countryName !== 'string' || !countryName.trim()) return null
  return { countryCode, countryName: countryName.trim(), source }
}

export function createGeoIpService(options = {}) {
  const primary = options.lookupPrimary || lookupPrimary
  const fallback = options.lookupFallback || lookupFallback
  const now = typeof options.now === 'function' ? options.now : Date.now
  const successTtlMs = Number.isFinite(options.successTtlMs) ? options.successTtlMs : SUCCESS_TTL_MS
  const failureTtlMs = Number.isFinite(options.failureTtlMs) ? options.failureTtlMs : FAILURE_TTL_MS
  const maxCacheEntries = Number.isInteger(options.maxCacheEntries) && options.maxCacheEntries > 0
    ? options.maxCacheEntries
    : 1000
  const cache = new Map()
  const inFlight = new Map()
  let requestsSinceSweep = 0

  function pruneExpired(force = false) {
    requestsSinceSweep++
    if (!force && requestsSinceSweep < 100) return
    requestsSinceSweep = 0
    const currentTime = now()
    for (const [key, cached] of cache) {
      if (cached.expiresAt <= currentTime) cache.delete(key)
    }
  }

  function cacheResult(key, value) {
    pruneExpired(cache.size >= maxCacheEntries)
    while (cache.size >= maxCacheEntries && !cache.has(key)) {
      cache.delete(cache.keys().next().value)
    }
    cache.set(key, {
      value,
      expiresAt: now() + (value ? successTtlMs : failureTtlMs)
    })
  }

  async function resolve(ip) {
    const normalized = normalizeIp(ip)
    if (!normalized || !isPublicIp(normalized)) return null

    const cached = cache.get(normalized)
    if (cached && cached.expiresAt > now()) return cached.value
    if (cached) cache.delete(normalized)
    if (inFlight.has(normalized)) return inFlight.get(normalized)

    const lookup = (async () => {
      const primaryResult = validResult(await withTimeout(primary, normalized), 'primary')
      const result = primaryResult || validResult(await withTimeout(fallback, normalized), 'fallback')
      cacheResult(normalized, result)
      return result
    })()

    inFlight.set(normalized, lookup)
    try {
      return await lookup
    } finally {
      inFlight.delete(normalized)
    }
  }

  return { resolve }
}

export function languageForCountry(code, activeCodes) {
  const language = COUNTRY_LANGUAGES.get(code) || 'en'
  return activeCodes?.has?.(language) ? language : 'en'
}
