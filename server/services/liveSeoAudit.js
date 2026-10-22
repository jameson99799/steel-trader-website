import { parse } from 'node-html-parser'
import { discoverSitemapUrls } from '../../scripts/verifyPublicExperience.mjs'
import { getAll } from '../db.js'
import { PRIMARY_CONTENT_LANGS } from './indexingPolicy.js'

const DEFAULT_BASE_URL = (process.env.SITE_URL || 'https://www.sunseasteel.com').replace(/\/+$/, '')
const GOOGLEBOT_UA = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
const REQUEST_TIMEOUT_MS = 10000
const DEFAULT_LIMIT = 30
const MAX_LIMIT = 100
const DEFAULT_CONCURRENCY = 4
const MAX_CONCURRENCY = 8
const TIME_BUDGET_MS = 45000

const TYPE_ALIASES = Object.freeze({
  home: 'home',
  products: 'productsList',
  productsList: 'productsList',
  productDetail: 'productDetail',
  'product-detail': 'productDetail',
  productCategory: 'productCategory',
  'product-category': 'productCategory',
  news: 'newsList',
  newsList: 'newsList',
  newsDetail: 'newsDetail',
  'news-detail': 'newsDetail',
  newsCategory: 'newsCategory',
  'news-category': 'newsCategory',
  about: 'about',
  contact: 'contact',
  factory: 'factory',
  ralColors: 'ralColors',
  'ral-colors': 'ralColors',
  roofingProfiles: 'roofingProfiles',
  'roofing-profiles': 'roofingProfiles',
  futuresPrice: 'futuresPrice',
  'futures-price': 'futuresPrice'
})

const STATIC_LIKE_TYPES = new Set([
  'home', 'productsList', 'newsList', 'productCategory', 'newsCategory',
  'about', 'contact', 'factory', 'ralColors', 'roofingProfiles', 'futuresPrice'
])

export function classifyLivePage(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean)
  const rest = parts[0] && /^[a-z]{2}$/i.test(parts[0]) ? parts.slice(1) : parts
  if (!rest.length) return 'home'
  const section = rest[0]
  if (section === 'products') {
    if (rest[1] === 'category') return 'productCategory'
    if (rest.length > 1) return 'productDetail'
    return 'productsList'
  }
  if (section === 'news') {
    if (rest[1] === 'category') return 'newsCategory'
    if (rest[1] === 'ral-colors') return 'ralColors'
    if (rest[1] === 'roofing-profiles') return 'roofingProfiles'
    if (rest[1] === 'futures-price') return 'futuresPrice'
    if (rest.length > 1) return 'newsDetail'
    return 'newsList'
  }
  if (section === 'about') return 'about'
  if (section === 'contact') return 'contact'
  if (section === 'factory') return 'factory'
  return section || 'unknown'
}

export function languageOfUrl(url) {
  const first = new URL(url).pathname.split('/').filter(Boolean)[0] || ''
  return /^[a-z]{2}$/i.test(first) ? first.toLowerCase() : 'en'
}

export function normalizeType(value) {
  if (!value) return null
  return TYPE_ALIASES[value] || TYPE_ALIASES[String(value).toLowerCase()] || null
}

function normalizeUrl(value) {
  try {
    const url = new URL(value)
    url.hash = ''
    return url.toString().replace(/\/$/, '')
  } catch {
    return value
  }
}

function headerValue(headers, name) {
  if (!headers) return ''
  if (typeof headers.get === 'function') return headers.get(name) || ''
  return headers[name] || headers[name.toLowerCase()] || ''
}

function addIssue(issues, code, message, severity = 'error') {
  issues.push({ code, message, severity })
}

export function inspectLiveHtml({ url, status = 200, headers = {}, html = '', expectedStaticLangs = [] }) {
  const root = parse(html)
  const issues = []
  const title = root.querySelector('title')?.text.trim() || ''
  const description = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim() || ''
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim() || ''
  const robotsMeta = root.querySelector('meta[name="robots"]')?.getAttribute('content')?.trim() || ''
  const xRobots = headerValue(headers, 'x-robots-tag')
  const htmlTag = root.querySelector('html')
  const htmlLang = htmlTag?.getAttribute('lang')?.trim() || ''
  const dir = htmlTag?.getAttribute('dir')?.trim() || ''
  const h1 = root.querySelector('h1')?.text.replace(/\s+/g, ' ').trim() || ''
  const alternates = root.querySelectorAll('link[rel="alternate"]').map(link => ({
    lang: link.getAttribute('hreflang') || '',
    href: link.getAttribute('href') || ''
  })).filter(item => item.lang)
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const lang = languageOfUrl(url)
  const type = classifyLivePage(url)
  const expectedLang = lang === 'zh' ? 'zh-CN' : lang

  if (status !== 200) addIssue(issues, 'http-status', `HTTP ${status || 'request failed'}`)
  if (/noindex/i.test(xRobots) || /noindex/i.test(robotsMeta)) {
    addIssue(issues, 'noindex-in-sitemap', 'URL 在 sitemap 中但返回 noindex')
  }
  if (!title) addIssue(issues, 'title-missing', '缺少 title')
  else if (title.length > 70) addIssue(issues, 'title-too-long', `title 长度 ${title.length}，建议 ≤ 70`, 'warning')
  else if (title.length < 10) addIssue(issues, 'title-too-short', `title 长度 ${title.length}，建议 ≥ 10`, 'warning')

  if (!description) addIssue(issues, 'meta-description-missing', '缺少 meta description')
  else if (description.length < 50 || description.length > 160) {
    addIssue(issues, 'meta-description-length', `meta description 长度 ${description.length}，建议 50–160`, 'warning')
  }

  if (!canonical) addIssue(issues, 'canonical-missing', '缺少 canonical')
  else if (normalizeUrl(canonical) !== normalizeUrl(url)) {
    addIssue(issues, 'canonical-mismatch', `canonical 指向 ${canonical}`)
  }

  if (!h1) addIssue(issues, 'h1-missing', '缺少 H1')
  if (htmlLang !== expectedLang) {
    addIssue(issues, 'html-lang-mismatch', `html lang="${htmlLang}"，预期 "${expectedLang}"`)
  }
  if (lang === 'ar' && dir !== 'rtl') {
    addIssue(issues, 'dir-missing-rtl', '阿拉伯语页面缺少 dir="rtl"', 'warning')
  }

  if (!alternates.length) {
    addIssue(issues, 'hreflang-missing', '缺少 hreflang')
  } else {
    if (!alternates.some(item => item.lang === expectedLang)) {
      addIssue(issues, 'hreflang-self-missing', `缺少当前语言 hreflang="${expectedLang}"`)
    }
    if (!alternates.some(item => item.lang === 'x-default')) {
      addIssue(issues, 'hreflang-x-default-missing', '缺少 hreflang="x-default"', 'warning')
    }
    if (STATIC_LIKE_TYPES.has(type) && expectedStaticLangs.length > 0) {
      const expectedCount = expectedStaticLangs.length + 1
      if (alternates.length < expectedCount) {
        addIssue(issues, 'hreflang-incomplete', `hreflang 数量 ${alternates.length}，预期至少 ${expectedCount}`, 'warning')
      }
    }
    for (const item of alternates) {
      if (!item.href) continue
      try {
        if (new URL(item.href).origin !== new URL(url).origin) {
          addIssue(issues, 'hreflang-cross-origin', `hreflang 指向站外地址 ${item.href}`, 'warning')
        }
      } catch {
        addIssue(issues, 'hreflang-invalid', `hreflang 不是有效 URL: ${item.href}`, 'warning')
      }
    }
  }

  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      JSON.parse(script.text)
    } catch {
      addIssue(issues, 'jsonld-invalid', 'JSON-LD 无法解析')
      break
    }
  }

  if (visibleText.length < 50) {
    addIssue(issues, 'body-text-too-short', `可见正文只有 ${visibleText.length} 字符`, 'warning')
  }

  return {
    url,
    status,
    lang,
    type,
    title,
    description,
    descriptionLength: description.length,
    canonical,
    hreflangCount: alternates.length,
    hreflangs: alternates.map(item => item.lang),
    htmlLang,
    dir,
    h1,
    visibleChars: visibleText.length,
    issues
  }
}

function getReadyLanguages() {
  try {
    return getAll('SELECT code, seo_index_ready FROM languages WHERE status = 1')
      .filter(row => row.seo_index_ready || PRIMARY_CONTENT_LANGS.includes(row.code))
      .map(row => row.code)
  } catch {
    return [...PRIMARY_CONTENT_LANGS]
  }
}

async function fetchPage(url, timeoutMs = REQUEST_TIMEOUT_MS) {
  const response = await fetch(url, {
    headers: {
      'user-agent': GOOGLEBOT_UA,
      accept: 'text/html,application/xhtml+xml'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs)
  })
  const html = await response.text()
  return { status: response.status, headers: response.headers, html }
}

async function fetchEnglishCounterpart(url) {
  const current = new URL(url)
  const parts = current.pathname.split('/').filter(Boolean)
  if (!/^[a-z]{2}$/i.test(parts[0] || '')) return null
  parts[0] = 'en'
  const english = new URL(current.toString())
  english.pathname = '/' + parts.join('/')
  try {
    return await fetchPage(english.toString())
  } catch {
    return null
  }
}

function compareWithEnglish(page, englishHtml) {
  if (!englishHtml) return
  const root = parse(englishHtml)
  const englishTitle = root.querySelector('title')?.text.trim() || ''
  const englishH1 = root.querySelector('h1')?.text.replace(/\s+/g, ' ').trim() || ''
  if (englishTitle && page.title && englishTitle === page.title) {
    addIssue(page.issues, 'possible-english-fallback', 'title 与英文版完全相同，可能回退英文', 'warning')
  }
  if (englishH1 && page.h1 && englishH1 === page.h1) {
    addIssue(page.issues, 'possible-english-fallback', 'H1 与英文版完全相同，可能回退英文', 'warning')
  }
}

function summarize(results, { total, offset, limit, partial, durationMs, baseUrl, filters }) {
  const issueCounts = {}
  let errorCount = 0
  let warningCount = 0
  let passed = 0
  let withWarnings = 0
  let withErrors = 0

  for (const page of results) {
    const errors = page.issues.filter(item => item.severity !== 'warning')
    const warnings = page.issues.filter(item => item.severity === 'warning')
    errorCount += errors.length
    warningCount += warnings.length
    for (const item of page.issues) {
      issueCounts[item.code] = (issueCounts[item.code] || 0) + 1
    }
    if (errors.length) withErrors++
    else if (warnings.length) withWarnings++
    else passed++
  }

  const checked = results.length
  return {
    generated_at: new Date().toISOString(),
    base_url: baseUrl,
    filters,
    total,
    offset,
    limit,
    checked,
    next_offset: offset + checked,
    has_more: offset + limit < total || partial,
    partial,
    duration_ms: durationMs,
    summary: {
      passed,
      with_warnings: withWarnings,
      with_errors: withErrors,
      errors: errorCount,
      warnings: warningCount,
      issue_counts: issueCounts
    },
    pages: results
  }
}

export async function auditLiveHtml({
  lang = null,
  type = null,
  offset = 0,
  limit = DEFAULT_LIMIT,
  concurrency = DEFAULT_CONCURRENCY,
  compareEnglish = false,
  baseUrl = DEFAULT_BASE_URL
} = {}) {
  const normalizedLang = lang ? String(lang).toLowerCase() : null
  if (normalizedLang && !/^[a-z]{2}$/.test(normalizedLang)) {
    const error = new Error('lang must be a two-letter language code')
    error.statusCode = 400
    throw error
  }
  const normalizedType = normalizeType(type)
  if (type && !normalizedType) {
    const error = new Error(`unsupported type: ${type}`)
    error.statusCode = 400
    throw error
  }

  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || DEFAULT_LIMIT))
  const safeOffset = Math.max(0, Number.parseInt(offset, 10) || 0)
  const safeConcurrency = Math.min(MAX_CONCURRENCY, Math.max(1, Number.parseInt(concurrency, 10) || DEFAULT_CONCURRENCY))

  let allUrls
  try {
    const sitemapFetch = (url, options = {}) => fetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        'user-agent': GOOGLEBOT_UA
      }
    })
    allUrls = await discoverSitemapUrls(sitemapFetch, baseUrl)
  } catch (error) {
    const wrapped = new Error(`sitemap discovery failed: ${error.message}`)
    wrapped.statusCode = 502
    throw wrapped
  }

  let candidates = allUrls.filter(url => {
    if (normalizedLang && languageOfUrl(url) !== normalizedLang) return false
    if (normalizedType && classifyLivePage(url) !== normalizedType) return false
    return true
  })

  const total = candidates.length
  const pageUrls = candidates.slice(safeOffset, safeOffset + safeLimit)
  const expectedStaticLangs = getReadyLanguages()
  const englishCache = new Map()
  const startedAt = Date.now()
  const slots = new Array(pageUrls.length).fill(null)
  let nextIndex = 0
  let partial = false

  async function worker() {
    while (true) {
      const index = nextIndex++
      if (index >= pageUrls.length) return
      if (Date.now() - startedAt > TIME_BUDGET_MS) {
        partial = true
        return
      }
      const url = pageUrls[index]
      try {
        const pageResponse = await fetchPage(url)
        const page = inspectLiveHtml({
          url,
          status: pageResponse.status,
          headers: pageResponse.headers,
          html: pageResponse.html,
          expectedStaticLangs
        })
        if (compareEnglish && page.lang !== 'en') {
          if (!englishCache.has(url)) {
            englishCache.set(url, fetchEnglishCounterpart(url))
          }
          const english = await englishCache.get(url)
          if (english) compareWithEnglish(page, english.html)
        }
        slots[index] = page
      } catch (error) {
        slots[index] = {
          url,
          status: 0,
          lang: languageOfUrl(url),
          type: classifyLivePage(url),
          title: '',
          description: '',
          descriptionLength: 0,
          canonical: '',
          hreflangCount: 0,
          hreflangs: [],
          htmlLang: '',
          dir: '',
          h1: '',
          visibleChars: 0,
          issues: [{ code: 'request-failed', message: error?.message || String(error), severity: 'error' }]
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(safeConcurrency, Math.max(1, pageUrls.length)) }, worker)
  )

  const results = slots.filter(Boolean)
  return summarize(results, {
    total,
    offset: safeOffset,
    limit: safeLimit,
    partial: partial || results.length < pageUrls.length,
    durationMs: Date.now() - startedAt,
    baseUrl,
    filters: { lang: normalizedLang, type: normalizedType, compare_english: !!compareEnglish }
  })
}
