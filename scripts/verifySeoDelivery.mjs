import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

function verificationUrl(baseUrl, pathname) {
  const url = new URL(pathname, `${baseUrl.replace(/\/+$/, '')}/`)
  url.searchParams.set('seo_verify', `${Date.now()}`)
  return url
}

async function fetchText(fetchImpl, baseUrl, pathname, label, retries = 3) {
  const url = verificationUrl(baseUrl, pathname)
  let lastError = null;

  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetchImpl(url, {
        headers: {
          accept: pathname.endsWith('.xml')
            ? 'application/xml,text/xml;q=0.9,*/*;q=0.8'
            : 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'user-agent': 'Googlebot/2.1 (+http://www.google.com/bot.html)'
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
    } catch (err) {
      lastError = err;
      if (i < retries - 1) {
        // Wait 2 seconds before retrying to give the local server time to boot
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
  }
  throw new Error(`${label} fetching ${url} failed after ${retries} retries. Last error: ${lastError.message}`);
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

function entryAsset(body, label) {
  const match = body.match(/<script\b[^>]*\bsrc=["']([^"']*\/assets\/index-[^"']+\.js)["']/i)
  if (!match) {
    throw new Error(`${label}: entry asset is missing`)
  }
  return match[1]
}

function validateDetail({ body }, label, pathname) {
  if (!/<script\b[^>]*\btype=["']application\/ld\+json["']/i.test(body)) {
    throw new Error(`${label}: server JSON-LD is missing`)
  }
  if (!/<(?:main|article|h1)\b/i.test(body)) {
    throw new Error(`${label}: server-readable detail content is missing`)
  }
  const canonical = [
    ...body.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/gi)
  ][0]?.[1]
  if (!canonical || new URL(canonical).pathname !== pathname) {
    throw new Error(`${label}: canonical does not match ${pathname}`)
  }
}

async function discoverPath(fetchImpl, baseUrl, apiPath, routePrefix, label) {
  const response = await fetchImpl(new URL(apiPath, `${baseUrl.replace(/\/+$/, '')}/`), {
    signal: AbortSignal.timeout(15000)
  })
  if (!response.ok) {
    throw new Error(`${label}: HTTP ${response.status}`)
  }
  const payload = await response.json()
  const first = Array.isArray(payload) ? payload[0] : payload.data?.[0]
  if (!first?.slug) {
    throw new Error(`${label}: no published slug found`)
  }
  return `${routePrefix}/${first.slug}`
}

export async function verifySeoDelivery({
  fetchImpl = globalThis.fetch,
  localBaseUrl,
  publicBaseUrl,
  productPath,
  newsPath
}) {
  if (typeof fetchImpl !== 'function') {
    throw new Error('A fetch implementation is required')
  }
  if (!localBaseUrl || !publicBaseUrl) {
    throw new Error('Both localBaseUrl and publicBaseUrl are required')
  }

  const pending = {
    localAbout: fetchText(fetchImpl, localBaseUrl, '/en/about', 'local about'),
    localSitemap: fetchText(fetchImpl, localBaseUrl, '/sitemap-products.xml', 'local product sitemap'),
    publicAbout: fetchText(fetchImpl, publicBaseUrl, '/en/about', 'public about'),
    publicSitemap: fetchText(fetchImpl, publicBaseUrl, '/sitemap-products.xml', 'public product sitemap')
  }
  if (productPath) {
    pending.localProduct = fetchText(fetchImpl, localBaseUrl, productPath, 'local product detail')
    pending.publicProduct = fetchText(fetchImpl, publicBaseUrl, productPath, 'public product detail')
  }
  if (newsPath) {
    pending.localNews = fetchText(fetchImpl, localBaseUrl, newsPath, 'local news detail')
    pending.publicNews = fetchText(fetchImpl, publicBaseUrl, newsPath, 'public news detail')
  }

  const names = Object.keys(pending)
  const values = await Promise.all(Object.values(pending))
  const results = Object.fromEntries(names.map((name, index) => [name, values[index]]))
  const { localAbout, localSitemap, publicAbout, publicSitemap } = results

  const localCanonical = validateAbout(localAbout, 'local about')
  const publicCanonical = validateAbout(publicAbout, 'public about')
  if (localCanonical !== publicCanonical) {
    throw new Error(
      `public about: canonical differs from Node output (${publicCanonical} != ${localCanonical})`
    )
  }
  validateSitemap(localSitemap, 'local product sitemap')
  validateSitemap(publicSitemap, 'public product sitemap')

  if (productPath) {
    validateDetail(results.localProduct, 'local product detail', productPath)
    validateDetail(results.publicProduct, 'public product detail', productPath)
  }
  if (newsPath) {
    validateDetail(results.localNews, 'local news detail', newsPath)
    validateDetail(results.publicNews, 'public news detail', newsPath)
  }

  const localEntry = entryAsset(localAbout.body, 'local about')
  const publicEntry = entryAsset(publicAbout.body, 'public about')
  if (localEntry !== publicEntry) {
    throw new Error(`public entry asset differs from Node output (${publicEntry} != ${localEntry})`)
  }
  await fetchText(fetchImpl, publicBaseUrl, publicEntry, 'public entry asset')
}

async function runCli() {
  const port = process.env.PORT || '3001'
  const localBaseUrl = process.env.LOCAL_SITE_URL || `http://127.0.0.1:${port}`
  const publicBaseUrl = process.env.PUBLIC_SITE_URL || 'https://www.sunseasteel.com'
  const [productPath, newsPath] = await Promise.all([
    discoverPath(globalThis.fetch, localBaseUrl, '/api/products?limit=1', '/en/products', 'local product discovery'),
    discoverPath(globalThis.fetch, localBaseUrl, '/api/news?limit=1', '/en/news', 'local news discovery')
  ])
  await verifySeoDelivery({ localBaseUrl, publicBaseUrl, productPath, newsPath })
  console.log(`SEO delivery verified: ${localBaseUrl} -> ${publicBaseUrl}`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runCli().catch(error => {
    console.error(`SEO delivery verification failed: ${error.message}`)
    process.exitCode = 1
  })
}
