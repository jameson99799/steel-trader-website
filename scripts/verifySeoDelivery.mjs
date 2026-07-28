import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

function verificationUrl(baseUrl, pathname) {
  const url = new URL(pathname, `${baseUrl.replace(/\/+$/, '')}/`)
  url.searchParams.set('seo_verify', `${Date.now()}`)
  return url
}

async function fetchText(fetchImpl, baseUrl, pathname, label) {
  const url = verificationUrl(baseUrl, pathname)
  const response = await fetchImpl(url, {
    headers: {
      accept: pathname.endsWith('.xml')
        ? 'application/xml,text/xml;q=0.9,*/*;q=0.8'
        : 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
      'user-agent': 'SunSea-SEO-Delivery-Verifier/1.0'
    },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000)
  })

  if (!response) {
    throw new Error(`${label}: no HTTP response`)
  }
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`)
  }
  return {
    body: await response.text(),
    contentType: response.headers.get('content-type') || ''
  }
}

function validateAbout({ body }, label) {
  const canonicals = [
    ...body.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)
  ].map(match => match[1])

  if (canonicals.length !== 1 || !/\/en\/about\/?$/.test(canonicals[0])) {
    throw new Error(
      `${label}: expected one route-specific /en/about canonical; received ${canonicals.join(', ') || 'none'}`
    )
  }
  if (!/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>/i.test(body)) {
    throw new Error(`${label}: server JSON-LD is missing`)
  }
  if (!/<(?:h1|main|section|article)\b/i.test(body)) {
    throw new Error(`${label}: server-readable route content is missing`)
  }

  return canonicals[0]
}

function validateSitemap({ body, contentType }, label) {
  if (!/\b(?:application|text)\/xml\b/i.test(contentType)) {
    throw new Error(`${label}: expected an XML content type; received ${contentType || 'none'}`)
  }
  if (!/<urlset\b/i.test(body)) {
    throw new Error(`${label}: expected a <urlset> sitemap document`)
  }
}

export async function verifySeoDelivery({
  fetchImpl = globalThis.fetch,
  localBaseUrl,
  publicBaseUrl
}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required')
  }
  if (!localBaseUrl || !publicBaseUrl) {
    throw new Error('Both localBaseUrl and publicBaseUrl are required')
  }

  const [localAbout, localSitemap, publicAbout, publicSitemap] = await Promise.all([
    fetchText(fetchImpl, localBaseUrl, '/en/about', 'local about'),
    fetchText(fetchImpl, localBaseUrl, '/sitemap-products.xml', 'local product sitemap'),
    fetchText(fetchImpl, publicBaseUrl, '/en/about', 'public about'),
    fetchText(fetchImpl, publicBaseUrl, '/sitemap-products.xml', 'public product sitemap')
  ])

  const localCanonical = validateAbout(localAbout, 'local about')
  const publicCanonical = validateAbout(publicAbout, 'public about')
  if (localCanonical !== publicCanonical) {
    throw new Error(
      `public about: canonical differs from Node output (${publicCanonical} != ${localCanonical})`
    )
  }
  validateSitemap(localSitemap, 'local product sitemap')
  validateSitemap(publicSitemap, 'public product sitemap')
}

async function runCli() {
  const port = process.env.PORT || '3001'
  const localBaseUrl = process.env.LOCAL_SITE_URL || `http://127.0.0.1:${port}`
  const publicBaseUrl = process.env.PUBLIC_SITE_URL || 'https://www.sunseasteel.com'
  await verifySeoDelivery({ localBaseUrl, publicBaseUrl })
  console.log(`SEO delivery verified: ${localBaseUrl} -> ${publicBaseUrl}`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runCli().catch(error => {
    console.error(`SEO delivery verification failed: ${error.message}`)
    process.exitCode = 1
  })
}
