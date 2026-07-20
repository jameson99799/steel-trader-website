import { getClientIp, languageForCountry } from '../services/geoip.js'

const SEARCH_REFERER_HOSTS = [
  /(^|\.)google\.(?:com|[a-z]{2})(?:\.[a-z]{2})?$/i,
  /(^|\.)bing\.com$/i,
  /(^|\.)yahoo\.(?:com|[a-z]{2})(?:\.[a-z]{2})?$/i,
  /(^|\.)baidu\.com$/i,
  /(^|\.)yandex\.(?:com|[a-z]{2})$/i,
  /(^|\.)duckduckgo\.com$/i
]

const PRIVATE_PATH = /^\/(?:api|admin|crm|uploads|assets)(?:\/|$)/i

function requestCookies(req) {
  if (req?.cookies && typeof req.cookies === 'object') return req.cookies

  const values = {}
  for (const part of String(req?.headers?.cookie || '').split(';')) {
    const separator = part.indexOf('=')
    if (separator < 0) continue
    const key = part.slice(0, separator).trim()
    if (!key) continue
    try {
      values[key] = decodeURIComponent(part.slice(separator + 1).trim())
    } catch {
      values[key] = part.slice(separator + 1).trim()
    }
  }
  return values
}

function isSearchReferer(referer) {
  try {
    const host = new URL(referer).hostname
    return SEARCH_REFERER_HOSTS.some(pattern => pattern.test(host))
  } catch {
    return false
  }
}

function isPublicLocalizedPage(path) {
  const languageMatch = /^\/([a-z]{2})(?=\/|$)/i.exec(path || '')
  if (!languageMatch) return null

  const pagePath = (path || '').slice(languageMatch[0].length) || '/'
  if (PRIVATE_PATH.test(pagePath) || pagePath === '/health' || pagePath.startsWith('/sitemap')) return null
  return languageMatch[1].toLowerCase()
}

function normalizedActiveCodes(getActiveCodes) {
  return new Set(Array.from(getActiveCodes?.() || [], code => String(code).toLowerCase()))
}

export function createLocaleRedirect({ getActiveCodes, resolveCountry }) {
  return async (req, res, next) => {
    if (!['GET', 'HEAD'].includes(req.method)) return next()

    const currentLanguage = isPublicLocalizedPage(req.path)
    if (!currentLanguage || !isSearchReferer(req.headers?.referer)) return next()

    const cookies = requestCookies(req)
    if (Object.prototype.hasOwnProperty.call(cookies, 'locale_preference') || Object.prototype.hasOwnProperty.call(cookies, 'locale_auto_selected')) return next()

    try {
      const activeCodes = normalizedActiveCodes(getActiveCodes)
      const resolvedCountry = await resolveCountry(getClientIp(req))
      const countryCode = typeof resolvedCountry === 'string' ? resolvedCountry : resolvedCountry?.countryCode
      const targetLanguage = languageForCountry(countryCode, activeCodes)

      if (targetLanguage === currentLanguage || !activeCodes.has(targetLanguage)) return next()

      res.cookie('locale_auto_selected', '1', {
        path: '/',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000
      })
      return res.redirect(302, req.originalUrl.replace(/^\/[a-z]{2}(?=\/|$)/i, `/${targetLanguage}`))
    } catch {
      return next()
    }
  }
}
