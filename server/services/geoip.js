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
  const value = ip.trim().replace(/^::ffff:/i, '')
  return isIP(value) ? value : null
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
  const value = ip.toLowerCase()
  return value === '::' ||
    value === '::1' ||
    value.startsWith('fc') ||
    value.startsWith('fd') ||
    /^fe[89ab]/.test(value) ||
    value.startsWith('2001:db8:') ||
    value.startsWith('ff')
}

export function getClientIp(req) {
  return normalizeIp(req?.ip)
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
  const cache = new Map()
  const inFlight = new Map()

  async function resolve(ip) {
    const normalized = normalizeIp(ip)
    if (!normalized || !isPublicIp(normalized)) return null

    const cached = cache.get(normalized)
    if (cached && cached.expiresAt > Date.now()) return cached.value
    if (cached) cache.delete(normalized)
    if (inFlight.has(normalized)) return inFlight.get(normalized)

    const lookup = (async () => {
      const primaryResult = validResult(await withTimeout(primary, normalized), 'primary')
      const result = primaryResult || validResult(await withTimeout(fallback, normalized), 'fallback')
      cache.set(normalized, {
        value: result,
        expiresAt: Date.now() + (result ? SUCCESS_TTL_MS : FAILURE_TTL_MS)
      })
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
