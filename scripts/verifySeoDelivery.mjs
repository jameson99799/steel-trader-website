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

async function fetchJson(fetchImpl, baseUrl, pathname, label, retries = 3) {
  const result = await fetchText(fetchImpl, baseUrl, pathname, label, retries)
  try {
    return JSON.parse(result.body)
  } catch (error) {
    throw new Error(`${label}: invalid JSON (${error.message})`)
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function findProductSchema(value) {
  if (!value || typeof value !== 'object') return null
  const types = Array.isArray(value['@type']) ? value['@type'] : [value['@type']]
  if (types.includes('Product')) return value
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findProductSchema(item)
      if (found) return found
    }
  }
  if (Array.isArray(value['@graph'])) {
    return findProductSchema(value['@graph'])
  }
  return null
}

export function extractProductSchema(html) {
  const scripts = [...String(html ?? '').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
  const ordered = scripts.sort((left, right) => {
    const leftPreferred = /\bid=["']product-jsonld["']/i.test(left[1]) ? 1 : 0
    const rightPreferred = /\bid=["']product-jsonld["']/i.test(right[1]) ? 1 : 0
    return rightPreferred - leftPreferred
  })
  let invalidProductJson = null
  for (const script of ordered) {
    const attributes = script[1]
    if (!/\btype=["']application\/ld\+json["']/i.test(attributes)) continue
    try {
      const schema = findProductSchema(JSON.parse(script[2]))
      if (schema) return schema
    } catch (error) {
      if (/\bid=["']product-jsonld["']/i.test(attributes)) invalidProductJson = error
    }
  }
  if (invalidProductJson) {
    throw new Error(`Product JSON-LD is invalid: ${invalidProductJson.message}`)
  }
  throw new Error('Product JSON-LD is missing from product HTML')
}

export function verifyProductReviewParity({ html, productSchema, payload }) {
  if (!payload || !Array.isArray(payload.reviews) || !payload.summary) {
    throw new Error('Product review API payload is invalid')
  }
  if (!productSchema || typeof productSchema !== 'object') {
    throw new Error('Product JSON-LD is missing')
  }

  if (payload.reviews.length === 0) {
    if (/Verified Buyer|Excellent quality and service\.|["']reviewCount["']\s*:\s*["']?89\b/i.test(String(html))) {
      throw new Error('Legacy fixed review content remains in product HTML')
    }
    return
  }

  const visible = payload.reviews[0]
  const visibleHtml = String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
  const visibleFields = [
    ['author', visible.author_name],
    ['date', visible.review_date],
    ['rating', String(Number(visible.rating))],
    ['body', visible.review_text]
  ]
  for (const [label, value] of visibleFields) {
    if (!visibleHtml.includes(escapeHtml(value))) {
      throw new Error(`Visible review ${label} is missing from SSR HTML`)
    }
  }

  const schemaReview = Array.isArray(productSchema.review)
    ? productSchema.review[0]
    : productSchema.review
  if (schemaReview?.author?.name !== visible.author_name) {
    throw new Error('Review author differs between page and JSON-LD')
  }
  if (schemaReview?.datePublished !== visible.review_date) {
    throw new Error('Review date differs between page and JSON-LD')
  }
  if (Number(schemaReview?.reviewRating?.ratingValue) !== Number(visible.rating)) {
    throw new Error('Review rating differs between page and JSON-LD')
  }
  if (schemaReview?.reviewBody !== visible.review_text) {
    throw new Error('Review body differs between page and JSON-LD')
  }
  if (Number(productSchema.aggregateRating?.reviewCount) !== Number(payload.summary.reviewCount)) {
    throw new Error('Review count differs between API and JSON-LD')
  }
  if (Number(productSchema.aggregateRating?.ratingValue) !== Number(payload.summary.ratingValue)) {
    throw new Error('Average rating differs between API and JSON-LD')
  }
}

function unwrapReviewPayload(payload) {
  return payload?.data?.reviews ? payload.data : payload
}

export function verifyProductReviewPayloadParity(localPayload, publicPayload) {
  const visibleFields = [
    'author_name',
    'review_title',
    'review_date',
    'rating',
    'review_text',
    'verified_purchase',
    'is_incentivized',
    'incentive_disclosure'
  ]
  const comparable = payload => {
    const normalized = unwrapReviewPayload(payload)
    if (!normalized || !Array.isArray(normalized.reviews) || !normalized.summary) {
      throw new Error('Product review API payload is invalid')
    }
    return {
      summary: {
        reviewCount: Number(normalized.summary.reviewCount),
        ratingValue: Number(normalized.summary.ratingValue)
      },
      reviews: normalized.reviews.map(review => Object.fromEntries(
        visibleFields.map(field => [
          field,
          field === 'rating' ? Number(review?.[field]) : (review?.[field] ?? null)
        ])
      ))
    }
  }

  if (JSON.stringify(comparable(localPayload)) !== JSON.stringify(comparable(publicPayload))) {
    throw new Error('Local and public product review payloads differ')
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

export async function discoverItem(
  fetchImpl,
  baseUrl,
  apiPath,
  label,
  options = {}
) {
  const attempts = Number.isInteger(options.attempts) && options.attempts > 0
    ? options.attempts
    : 15
  const intervalMs = Number.isFinite(options.intervalMs) && options.intervalMs >= 0
    ? options.intervalMs
    : 2000
  const waitImpl = options.waitImpl || (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const url = new URL(apiPath, `${baseUrl.replace(/\/+$/, '')}/`)
  let lastError = null

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetchImpl(url, {
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
      return first
    } catch (error) {
      lastError = error
      if (attempt < attempts) {
        await waitImpl(intervalMs)
      }
    }
  }

  throw new Error(
    `${label} fetching ${url} failed after ${attempts} attempts. Last error: ${lastError?.message || lastError}`
  )
}

export async function discoverPath(
  fetchImpl,
  baseUrl,
  apiPath,
  routePrefix,
  label,
  options = {}
) {
  const first = await discoverItem(fetchImpl, baseUrl, apiPath, label, options)
  return `${routePrefix}/${first.slug}`
}

export async function verifySeoDelivery({
  fetchImpl = globalThis.fetch,
  localBaseUrl,
  publicBaseUrl,
  productPath,
  productId,
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
    if (productId) {
      const reviewPath = `/api/product-reviews/product/${productId}?lang=en&page=1&limit=10`
      pending.localProductReviews = fetchJson(
        fetchImpl,
        localBaseUrl,
        reviewPath,
        'local product reviews'
      )
      pending.publicProductReviews = fetchJson(
        fetchImpl,
        publicBaseUrl,
        reviewPath,
        'public product reviews'
      )
    }
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
    if (productId) {
      const localPayload = unwrapReviewPayload(results.localProductReviews)
      const publicPayload = unwrapReviewPayload(results.publicProductReviews)
      verifyProductReviewPayloadParity(localPayload, publicPayload)
      for (const [label, document, payload] of [
        ['local product detail', results.localProduct, localPayload],
        ['public product detail', results.publicProduct, publicPayload]
      ]) {
        try {
          const schema = extractProductSchema(document.body)
          verifyProductReviewParity({ html: document.body, productSchema: schema, payload })
        } catch (error) {
          throw new Error(`${label}: ${error.message}`)
        }
      }
    }
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
  const [product, newsPath] = await Promise.all([
    discoverItem(globalThis.fetch, localBaseUrl, '/api/products?limit=1', 'local product discovery'),
    discoverPath(globalThis.fetch, localBaseUrl, '/api/news?limit=1', '/en/news', 'local news discovery')
  ])
  if (!product?.id || !product?.slug) throw new Error('local product discovery: no published product id and slug found')
  const productPath = `/en/products/${product.slug}`
  await verifySeoDelivery({ localBaseUrl, publicBaseUrl, productPath, productId: product.id, newsPath })
  console.log(`SEO delivery verified: ${localBaseUrl} -> ${publicBaseUrl}`)
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  runCli().catch(error => {
    console.error(`SEO delivery verification failed: ${error.message}`)
    process.exitCode = 1
  })
}
