import puppeteer from 'puppeteer'
import { getOne, run } from '../db.js'

let browserInstance = null
let isRendering = false

/**
 * Returns a persistent Puppeteer browser instance.
 */
async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1280,1024'
      ]
    })
  }
  return browserInstance
}

/**
 * Perform a dynamic render of a URL using headless Chromium, and cache it.
 * Designed specifically for Bot/Crawler hits (Googlebot).
 */
export async function renderUrl(req, port, originalUrl) {
  const fullLocalUrl = `http://localhost:${port}${originalUrl}`
  const cacheKey = originalUrl

  // 1. Check sqlite cache (valid for 3 days)
  const cached = getOne('SELECT html, created_at FROM seo_render_cache WHERE url = ?', [cacheKey])
  if (cached) {
    const ageDays = (new Date() - new Date(cached.created_at)) / (1000 * 60 * 60 * 24)
    if (ageDays < 3) {
      console.log(`[seo] Served from puppeteer cache: ${cacheKey}`)
      return cached.html
    }
  }

  // 2. Concurrency limit hack: if already rendering another page, just fallback to standard response 
  // (we don't want to spin up 10 Chromes and crash the 2GB RAM VM).
  if (isRendering) {
    console.warn(`[seo] Puppeteer is busy. Falling back for: ${cacheKey}`)
    return null // Tell index.js to fallback to text-injection
  }

  isRendering = true
  let page = null

  try {
    const browser = await getBrowser()
    page = await browser.newPage()

    // Block heavy resources we don't care about for SEO DOM
    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const type = req.resourceType()
      if (['image', 'media', 'font', 'websocket'].includes(type) || req.url().includes('google-analytics') || req.url().includes('youtube.com')) {
        req.abort()
      } else {
        req.continue()
      }
    })

    console.log(`[seo] Puppeteer rendering: ${fullLocalUrl}`)
    // Set a recognizable user agent so we don't accidentally loop if we hit our own external IP
    await page.setUserAgent('Sunsea-Internal-Prerenderer')
    await page.goto(fullLocalUrl, { waitUntil: 'networkidle0', timeout: 30000 })

    // Wait until the Vue app signals it's fully mounted
    await page.waitForFunction('window.__APP_MOUNTED__ === true', { timeout: 10000 }).catch(() => {})

    // Optionally wait an extra bit for Echats/Quill lazy components to settle
    await new Promise(r => setTimeout(r, 1000))

    // Pull the fully assembled HTML string
    const finalHtml = await page.evaluate(() => document.documentElement.outerHTML)

    const finalDoc = '<!DOCTYPE html>\n<html lang="' + (originalUrl.substring(1,3) || 'en') + '">\n' + finalHtml + '\n</html>'

    // Write to cache
    run('INSERT OR REPLACE INTO seo_render_cache (url, html, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [cacheKey, finalDoc])
    
    return finalDoc
  } catch (error) {
    console.error(`[seo] Puppeteer render failed for ${cacheKey}:`, error)
    return null
  } finally {
    isRendering = false
    if (page) await page.close().catch(() => {})
  }
}
