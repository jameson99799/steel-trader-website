import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { existsSync } from 'node:fs'
import { parse } from 'node-html-parser'

const DEFAULT_CONCURRENCY = 6
const DEFAULT_VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1440, height: 900 }
]

function issue(code, message, severity = 'error') {
  return { code, message, severity }
}

function normalizeBaseUrl(baseUrl) {
  const url = new URL(baseUrl)
  url.hash = ''
  url.search = ''
  url.pathname = url.pathname.replace(/\/+$/, '') || '/'
  return url.toString().replace(/\/$/, '')
}

function isLoopbackUrl(url) {
  const hostname = new URL(url).hostname.toLowerCase()
  return hostname === 'localhost' || hostname === '::1' || hostname.startsWith('127.')
}

function resolveSitemapLocation(location, parentUrl, normalizedBase, expectedOrigin) {
  const resolved = new URL(location, parentUrl)
  if (resolved.origin === expectedOrigin) return resolved.toString()
  if (isLoopbackUrl(normalizedBase)) return new URL(`${resolved.pathname}${resolved.search}`, normalizedBase).toString()
  throw new Error(`站点地图包含站外 URL：${resolved}`)
}

async function fetchText(fetchImpl, url) {
  const response = await fetchImpl(url, {
    headers: { 'user-agent': 'SunSea-Public-Experience-Verification/1.0' },
    redirect: 'follow',
    signal: AbortSignal.timeout(30000)
  })
  const body = await response.text()
  if (!response.ok) throw new Error(`站点地图请求失败：${url} HTTP ${response.status}`)
  return { body, contentType: response.headers?.get?.('content-type') || '' }
}

export async function discoverSitemapUrls(fetchImpl, baseUrl) {
  const normalizedBase = normalizeBaseUrl(baseUrl)
  const expectedOrigin = new URL(normalizedBase).origin
  const pending = [`${normalizedBase}/sitemap.xml`]
  const visitedSitemaps = new Set()
  const pageUrls = new Set()

  while (pending.length) {
    const sitemapUrl = pending.shift()
    if (visitedSitemaps.has(sitemapUrl)) continue
    if (new URL(sitemapUrl).origin !== expectedOrigin) throw new Error(`站点地图包含站外 URL：${sitemapUrl}`)
    visitedSitemaps.add(sitemapUrl)

    const { body } = await fetchText(fetchImpl, sitemapUrl)
    const root = parse(body)
    const isIndex = Boolean(root.querySelector('sitemapindex'))
    const isUrlset = Boolean(root.querySelector('urlset'))
    if (!isIndex && !isUrlset) throw new Error(`${sitemapUrl} 不是有效的 sitemap index 或 urlset`)

    const locations = root.querySelectorAll('loc').map(node => node.text.trim()).filter(Boolean)
    for (const location of locations) {
      const resolved = resolveSitemapLocation(location, sitemapUrl, normalizedBase, expectedOrigin)
      if (isIndex) pending.push(resolved)
      else pageUrls.add(resolved)
    }
  }

  return [...pageUrls].sort()
}

export function classifyTemplate(url) {
  const parts = new URL(url).pathname.split('/').filter(Boolean)
  if (/^[a-z]{2}(?:-[a-z]{2})?$/i.test(parts[0] || '')) parts.shift()
  if (!parts.length) return 'home'
  if (parts[0] === 'products') return parts.length > 1 ? 'product-detail' : 'products'
  if (parts[0] === 'news') return parts.length > 1 ? 'news-detail' : 'news'
  if (parts[0] === 'about') return 'about'
  if (parts[0] === 'contact') return 'contact'
  if (parts[0] === 'factory') return 'factory'
  return parts[0]
}

export function validateSeoDocument({ html, url, template = classifyTemplate(url) }) {
  const root = parse(html)
  const issues = []
  const title = root.querySelector('title')?.text.trim()
  const description = root.querySelector('meta[name="description"]')?.getAttribute('content')?.trim()
  const canonical = root.querySelector('link[rel="canonical"]')?.getAttribute('href')?.trim()
  const hreflang = root.querySelectorAll('link[rel="alternate"]').some(link => link.getAttribute('hreflang')?.trim())
  const h1 = root.querySelector('h1')?.text.trim()

  if (!title) issues.push(issue('title-missing', `${template} 页面缺少 title`))
  if (!description) issues.push(issue('meta-description-missing', `${template} 页面缺少 meta description`))
  if (!canonical) issues.push(issue('canonical-missing', `${template} 页面缺少 canonical`))
  if (!hreflang) issues.push(issue('hreflang-missing', `${template} 页面缺少 hreflang`))
  if (!h1) issues.push(issue('h1-missing', `${template} 页面缺少 H1`))

  for (const script of root.querySelectorAll('script[type="application/ld+json"]')) {
    try {
      JSON.parse(script.text)
    } catch {
      issues.push(issue('jsonld-invalid', `${template} 页面存在无法解析的 JSON-LD`))
      break
    }
  }

  if (canonical) {
    try {
      const canonicalUrl = new URL(canonical, url)
      const currentUrl = new URL(url)
      if (canonicalUrl.origin !== currentUrl.origin && !isLoopbackUrl(currentUrl)) {
        issues.push(issue('canonical-cross-origin', `canonical 指向站外地址：${canonicalUrl}`))
      }
    } catch {
      issues.push(issue('canonical-invalid', `canonical 不是有效 URL：${canonical}`))
    }
  }
  return issues
}

export async function verifyHttpUrls({ fetchImpl, urls, concurrency = DEFAULT_CONCURRENCY }) {
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 20) throw new Error('concurrency 必须是 1–20 的整数')
  const results = new Array(urls.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < urls.length) {
      const index = nextIndex++
      const url = urls[index]
      try {
        let response
        let lastError
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            response = await fetchImpl(url, {
              headers: { accept: 'text/html', 'user-agent': 'SunSea-Public-Experience-Verification/1.0' },
              redirect: 'follow',
              signal: AbortSignal.timeout(30000)
            })
            if (response.status < 500 || attempt === 2) break
          } catch (error) {
            lastError = error
            if (attempt === 2) throw error
          }
        }
        if (!response) throw lastError || new Error('request failed')
        const html = await response.text()
        const issues = []
        if (!response.ok) issues.push(issue('http-status', `HTTP ${response.status}`))
        else issues.push(...validateSeoDocument({ html, url, template: classifyTemplate(url) }))
        results[index] = { url, status: response.status, issues }
      } catch (error) {
        results[index] = { url, status: 0, issues: [issue('request-failed', error?.message || String(error))] }
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, urls.length)) }, worker))
  return results
}

function isFirstParty(resourceUrl, pageUrl) {
  try { return new URL(resourceUrl).origin === new URL(pageUrl).origin } catch { return true }
}

export async function verifyViewport({ browser, url, viewport }) {
  const page = await browser.newPage()
  const issues = []
  const pageErrors = []
  const failedRequests = []
  try {
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: 1 })
    page.on('pageerror', error => pageErrors.push(error))
    page.on('requestfailed', request => {
      const resourceUrl = request.url()
      const failure = request.failure?.()?.errorText || 'request failed'
      failedRequests.push({ resourceUrl, failure })
    })
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        break
      } catch (error) {
        if (attempt === 2) throw error
        pageErrors.length = 0
        failedRequests.length = 0
      }
    }
    for (const error of pageErrors) issues.push(issue('page-error', `${viewport.name}: ${error?.message || error}`))
    for (const { resourceUrl, failure } of failedRequests) {
      issues.push(issue(
        'resource-failed',
        `${viewport.name}: ${resourceUrl} (${failure})`,
        isFirstParty(resourceUrl, url) ? 'error' : 'warning'
      ))
    }
    const state = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      brokenImages: [...document.querySelectorAll('main img, article img')]
        .filter(image => image.complete && image.naturalWidth === 0)
        .map(image => image.currentSrc || image.src || '(unknown)')
    }))
    if (state.overflow) issues.push(issue('horizontal-overflow', `${viewport.name}: 页面出现横向溢出`))
    for (const imageUrl of state.brokenImages) issues.push(issue('broken-image', `${viewport.name}: 主内容图片加载失败 ${imageUrl}`))
  } catch (error) {
    issues.push(issue('viewport-navigation-failed', `${viewport.name}: ${error?.message || error}`))
  } finally {
    await page.close()
  }
  return issues
}

function selectRepresentativeUrls(urls) {
  const representatives = new Map()
  for (const url of urls) {
    const template = classifyTemplate(url)
    if (!representatives.has(template)) representatives.set(template, url)
  }
  return [...representatives.entries()].map(([template, url]) => ({ template, url }))
}

function printIssue(url, foundIssue) {
  console.log(`${url} | ${foundIssue.severity.toUpperCase()} ${foundIssue.code} | ${foundIssue.message}`)
}

function findInstalledBrowser() {
  const configured = process.env.PUBLIC_BROWSER_EXECUTABLE?.trim()
  if (configured) return configured
  const candidates = process.platform === 'win32'
    ? [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ]
    : ['/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser']
  return candidates.find(candidate => existsSync(candidate))
}

export async function runPublicExperienceVerification({
  baseUrl = process.env.PUBLIC_SITE_URL || 'https://www.sunseasteel.com',
  fetchImpl = globalThis.fetch,
  concurrency = Number(process.env.PUBLIC_VERIFY_CONCURRENCY || DEFAULT_CONCURRENCY),
  viewports = DEFAULT_VIEWPORTS
} = {}) {
  const normalizedBase = normalizeBaseUrl(baseUrl)
  console.log(`公开体验只读检查：${normalizedBase}`)
  const urls = await discoverSitemapUrls(fetchImpl, normalizedBase)
  if (!urls.length) throw new Error('站点地图没有公开 URL')
  console.log(`发现 ${urls.length} 个公开 URL，开始检查 HTTP 与 SEO HTML…`)

  const httpResults = await verifyHttpUrls({ fetchImpl, urls, concurrency })
  const allIssues = []
  for (const result of httpResults) {
    for (const foundIssue of result.issues) {
      allIssues.push({ ...foundIssue, url: result.url })
      printIssue(result.url, foundIssue)
    }
  }

  const { default: puppeteer } = await import('puppeteer')
  const executablePath = findInstalledBrowser()
  const browser = await puppeteer.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })
  try {
    const representatives = selectRepresentativeUrls(urls)
    console.log(`选取 ${representatives.length} 种页面模板，检查手机、平板和电脑视口…`)
    for (const { template, url } of representatives) {
      for (const viewport of viewports) {
        const viewportIssues = await verifyViewport({ browser, url, viewport })
        for (const foundIssue of viewportIssues) {
          const withTemplate = { ...foundIssue, message: `${template}: ${foundIssue.message}`, url }
          allIssues.push(withTemplate)
          printIssue(url, withTemplate)
        }
      }
    }
  } finally {
    await browser.close()
  }

  const errorCount = allIssues.filter(foundIssue => foundIssue.severity === 'error').length
  const warningCount = allIssues.filter(foundIssue => foundIssue.severity === 'warning').length
  console.log(`检查完成：${urls.length} 个 URL，${errorCount} 个错误，${warningCount} 个警告。`)
  return { urls, issues: allIssues, errorCount, warningCount }
}

async function main() {
  try {
    const result = await runPublicExperienceVerification()
    if (result.errorCount > 0) process.exitCode = 1
  } catch (error) {
    console.error(`公开体验检查失败：${error?.stack || error}`)
    process.exitCode = 1
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (invokedPath === import.meta.url) await main()
