import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { migrateLegacySpaLocation } from '../scripts/nginxSsrConfig.mjs'
import { verifySeoDelivery } from '../scripts/verifySeoDelivery.mjs'

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
  const canonical = 'https://www.sunseasteel.com/en/about'
  const html = `<html><head>
    <link rel="canonical" href="${canonical}">
    <script type="application/ld+json">{"@type":"Organization"}</script>
  </head><body><h1>About SunSea Steel</h1></body></html>`
  const xml = '<?xml version="1.0"?><urlset></urlset>'
  const responses = new Map([
    ['http://local/en/about', new Response(html, { headers: { 'content-type': 'text/html' } })],
    ['http://local/sitemap-products.xml', new Response(xml, { headers: { 'content-type': 'application/xml' } })],
    ['https://public/en/about', new Response(html, { headers: { 'content-type': 'text/html' } })],
    ['https://public/sitemap-products.xml', new Response(xml, { headers: { 'content-type': 'application/xml' } })]
  ])

  await verifySeoDelivery({
    fetchImpl: async url => {
      const parsed = new URL(String(url))
      return responses.get(`${parsed.origin}${parsed.pathname}`)
    },
    localBaseUrl: 'http://local',
    publicBaseUrl: 'https://public'
  })
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
