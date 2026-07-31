import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { migrateLegacySpaLocation } from '../scripts/nginxSsrConfig.mjs'
import { verifySeoDelivery } from '../scripts/verifySeoDelivery.mjs'

const productPath = '/en/products/sample-product'
const newsPath = '/en/news/sample-news'

function htmlDocument(pathname, asset = '/assets/index-current.js') {
  return `<html><head>
    <link rel="canonical" href="https://www.sunseasteel.com${pathname}">
    <script type="application/ld+json">{"@type":"Thing"}</script>
    <script type="module" src="${asset}"></script>
  </head><body><main><h1>Page</h1></main></body></html>`
}

function deliveryFetch(overrides = {}) {
  return async url => {
    const parsed = new URL(String(url))
    const key = `${parsed.origin}${parsed.pathname}`
    const override = overrides[key]
    if (override) {
      return new Response(override.body || '', {
        status: override.status || 200,
        headers: { 'content-type': override.contentType || 'text/html' }
      })
    }
    if (parsed.pathname === '/sitemap-products.xml') {
      return new Response('<?xml version="1.0"?><urlset></urlset>', {
        headers: { 'content-type': 'application/xml' }
      })
    }
    if (parsed.pathname === '/assets/index-current.js') {
      return new Response('console.log("current")', {
        headers: { 'content-type': 'text/javascript' }
      })
    }
    return new Response(htmlDocument(parsed.pathname), {
      headers: { 'content-type': 'text/html' }
    })
  }
}

test('migrates only the setup-generated legacy SPA location', () => {
  const legacy = `server {
    # Frontend (Vue SPA)
    location / {
        root /www/wwwroot/steel-trader/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }
}`

  const result = migrateLegacySpaLocation(legacy, 3001)
  assert.equal(result.changed, true)
  assert.match(result.content, /proxy_pass http:\/\/127\.0\.0\.1:3001;/)
  assert.match(result.content, /proxy_set_header X-Forwarded-Proto \$scheme;/)
  assert.doesNotMatch(result.content, /try_files/)

  const unknown = `server {
    location / {
        include /www/server/panel/vhost/rewrite/site.conf;
        try_files $uri /index.html;
    }
}`
  assert.deepEqual(migrateLegacySpaLocation(unknown, 3001), {
    changed: false,
    content: unknown
  })
})

test('new-install and update scripts deliver public HTML through Node', () => {
  const setup = fs.readFileSync(new URL('../server-setup.sh', import.meta.url), 'utf8')
  const update = fs.readFileSync(new URL('../server-update.sh', import.meta.url), 'utf8')

  assert.match(
    setup,
    /# Public HTML and sitemap routes are rendered by Node[\s\S]*?location \/ \{[\s\S]*?proxy_pass http:\/\/127\.0\.0\.1:\$\{PORT\};/
  )
  assert.doesNotMatch(setup, /# Frontend \(Vue SPA\)[\s\S]*?try_files \\\$uri \\\$uri\/ \/index\.html;/)
  assert.match(update, /scripts\/nginxSsrConfig\.mjs/)
  assert.match(update, /scripts\/verifySeoDelivery\.mjs/)
  assert.match(update, /nginx -t/)
  assert.match(update, /\.seo-backup-\$\{TIMESTAMP\}/)
  assert.match(update, /\$SUDO node scripts\/nginxSsrConfig\.mjs/)
  assert.match(update, /\$SUDO cmp -s "\$SEO_NGINX_CONF" "\$SEO_NGINX_TMP"/)
  assert.doesNotMatch(update, /\/www\/server\/panel\/vhost\/nginx\/\*\.conf/)
  assert.doesNotMatch(update, /\/www\/server\/nginx\/conf\/nginx\.conf/)
})

test('delivery verifier accepts matching SSR HTML and child sitemap XML', async () => {
  await verifySeoDelivery({
    fetchImpl: deliveryFetch(),
    localBaseUrl: 'http://local',
    publicBaseUrl: 'https://public',
    productPath,
    newsPath
  })
})

test('delivery verifier rejects a failing public product detail', async () => {
  await assert.rejects(
    verifySeoDelivery({
      fetchImpl: deliveryFetch({
        [`https://public${productPath}`]: { status: 500, body: 'Server Error' }
      }),
      localBaseUrl: 'http://local',
      publicBaseUrl: 'https://public',
      productPath,
      newsPath
    }),
    /public product detail: HTTP 500/
  )
})

test('delivery verifier rejects a failing public news detail', async () => {
  await assert.rejects(
    verifySeoDelivery({
      fetchImpl: deliveryFetch({
        [`https://public${newsPath}`]: { status: 500, body: 'Server Error' }
      }),
      localBaseUrl: 'http://local',
      publicBaseUrl: 'https://public',
      productPath,
      newsPath
    }),
    /public news detail: HTTP 500/
  )
})

test('delivery verifier rejects a stale public entry asset', async () => {
  await assert.rejects(
    verifySeoDelivery({
      fetchImpl: deliveryFetch({
        'https://public/en/about': {
          body: htmlDocument('/en/about', '/assets/index-stale.js')
        }
      }),
      localBaseUrl: 'http://local',
      publicBaseUrl: 'https://public',
      productPath,
      newsPath
    }),
    /entry asset differs/
  )
})

test('delivery verifier rejects a missing public entry asset file', async () => {
  await assert.rejects(
    verifySeoDelivery({
      fetchImpl: deliveryFetch({
        'https://public/assets/index-current.js': { status: 404, body: 'Not Found' }
      }),
      localBaseUrl: 'http://local',
      publicBaseUrl: 'https://public',
      productPath,
      newsPath
    }),
    /public entry asset: HTTP 404/
  )
})

test('delivery verifier rejects a public generic shell', async () => {
  const canonical = 'https://www.sunseasteel.com/en/about'
  const localHtml = `<link rel="canonical" href="${canonical}"><script type="application/ld+json">{}</script><h1>About</h1>`
  const genericShell = '<link rel="canonical" href="https://www.sunseasteel.com/"><div id="app"></div>'
  const xml = '<?xml version="1.0"?><urlset></urlset>'

  await assert.rejects(
    verifySeoDelivery({
      fetchImpl: async url => {
        const parsed = new URL(String(url))
        if (parsed.pathname === '/sitemap-products.xml') {
          return new Response(xml, { headers: { 'content-type': 'application/xml' } })
        }
        return new Response(parsed.origin === 'http://local' ? localHtml : genericShell)
      },
      localBaseUrl: 'http://local',
      publicBaseUrl: 'https://public'
    }),
    /public.*canonical|canonical.*public/i
  )
})
