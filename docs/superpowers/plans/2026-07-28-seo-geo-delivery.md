# SunSea Steel SEO/GEO Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the existing route-specific SEO/GEO output through production, normalize server metadata, and prevent deployment from silently serving the generic Vite shell.

**Architecture:** Keep the existing Vue/Vite client and Express production renderer. Extract deterministic HTML normalization and delivery verification into focused, testable modules; route public HTML through Node in Nginx; make the update script migrate only the exact legacy setup-generated proxy block and verify public delivery after restart.

**Tech Stack:** Node.js ESM, Express, Vue 3, Vite, Node test runner, Nginx, Bash, PM2.

## Global Constraints

- Do not migrate to Nuxt, `vite-ssg`, or a second rendering framework.
- Do not invent customer cases, certificates, employee biographies, reviews, prices, or backlinks.
- Do not alter the existing product offer/rating markup in this remediation.
- Preserve `/api/`, admin, CRM, uploads, chat, language selection, and all existing customer-facing behavior.
- Return real `200`, `301`, `404`, and `5xx` statuses; never mask an SSR failure with an indexable 200 homepage shell.
- Run the full Node test suite, server syntax checks, shell syntax checks, and Vite production build before publication.

---

### Task 1: Deterministic server SEO document normalization

**Files:**
- Create: `server/services/seoDocument.js`
- Modify: `server/index.js`
- Modify: `index.html`
- Test: `test/seoDocument.test.js`

**Interfaces:**
- Consumes: the built Vite HTML shell plus route-specific title, description, keywords, language, canonical, robots, metadata, schemas, and state.
- Produces: `renderSeoDocument(options): string`, `publicHtmlCacheControl: string`, and `renderSeoErrorPage(): string`.

- [ ] **Step 1: Write the failing document-normalization tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  renderSeoDocument,
  publicHtmlCacheControl,
  renderSeoErrorPage
} from '../server/services/seoDocument.js'

const shell = `<!doctype html><html lang="en"><head>
  <title>Generic</title>
  <meta name="description" content="Generic description">
  <meta name="keywords" content="generic">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="https://www.sunseasteel.com/">
  <meta property="og:title" content="Generic">
  <meta name="twitter:card" content="summary">
</head><body><div id="app"></div></body></html>`

test('normalizes route SEO into exactly one managed metadata set', () => {
  const html = renderSeoDocument({
    html: shell,
    lang: 'zh',
    title: '镀铝锌钢卷',
    description: '产品描述',
    keywords: '镀铝锌',
    canonical: 'https://www.sunseasteel.com/zh/products/gl',
    robots: 'index, follow',
    metaHtml: '<meta property="og:title" content="镀铝锌钢卷">',
    schemaHtml: '<script type="application/ld+json" id="product-jsonld">{"@type":"Product"}</script>',
    stateHtml: '<script>window.__INITIAL_STATE__={}</script>'
  })
  assert.match(html, /<html lang="zh">/)
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1)
  assert.equal((html.match(/property="og:title"/g) || []).length, 1)
  assert.equal((html.match(/id="product-jsonld"/g) || []).length, 1)
})

test('uses revalidation caching and emits non-indexable error HTML', () => {
  assert.equal(publicHtmlCacheControl, 'public, max-age=0, must-revalidate, s-maxage=300, stale-while-revalidate=60')
  const html = renderSeoErrorPage()
  assert.match(html, /name="robots" content="noindex, nofollow"/)
  assert.doesNotMatch(html, /rel="canonical"/)
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/seoDocument.test.js`

Expected: FAIL because `server/services/seoDocument.js` does not exist.

- [ ] **Step 3: Implement the focused normalizer**

`renderSeoDocument()` will:

```js
export const publicHtmlCacheControl =
  'public, max-age=0, must-revalidate, s-maxage=300, stale-while-revalidate=60'

export function renderSeoDocument(options) {
  let output = options.html
  output = output.replace(/<html([^>]*?)lang="[^"]*"/i, `<html$1lang="${escapeHtml(options.lang)}"`)
  output = replaceSingleton(output, /<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(options.title)}</title>`)
  output = removeManagedHeadTags(output)
  const head = [
    `<meta name="description" content="${escapeHtml(options.description)}">`,
    `<meta name="keywords" content="${escapeHtml(options.keywords)}">`,
    `<meta name="robots" content="${escapeHtml(options.robots)}">`,
    `<link rel="canonical" href="${escapeHtml(options.canonical)}">`,
    options.metaHtml,
    options.schemaHtml,
    options.stateHtml
  ].filter(Boolean).join('\n  ')
  output = output.replace('</head>', `  ${head}\n</head>`)
  return output
}

export function renderSeoErrorPage() {
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>Server Error</title></head><body><h1>Server Error</h1></body></html>'
}
```

The removal helper will delete the shell description, keywords, robots,
canonical, Open Graph, Twitter, alternate-hreflang, cache-control meta tags,
and previously server-managed JSON-LD/state blocks before inserting one set.

- [ ] **Step 4: Integrate the normalizer into Express**

Keep the existing admin loader and public SSR-content body insertion, then
replace the inline head `html.replace(...)` chain in `server/index.js` with
`renderSeoDocument(...)`. Private admin/CRM routes must be `noindex` and
`no-store`; public success responses use:

```js
res.setHeader(
  'Cache-Control',
  isNotFound || isPrivateRoute ? 'no-store' : publicHtmlCacheControl
)
```

Replace the fatal catch fallback:

```js
res
  .status(500)
  .set('Cache-Control', 'no-store')
  .set('Content-Type', 'text/html; charset=utf-8')
  .send(renderSeoErrorPage())
```

Remove the three cache-control meta elements from `index.html`.

- [ ] **Step 5: Run targeted and full tests**

Run: `node --test test/seoDocument.test.js`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 6: Commit Task 1**

```bash
git add server/services/seoDocument.js server/index.js index.html test/seoDocument.test.js
git commit -m "fix: normalize server seo output"
```

---

### Task 2: Truthful organization and article identity

**Files:**
- Modify: `server/index.js`
- Modify: `src/views/NewsDetail.vue`
- Test: `test/seoIdentity.test.js`

**Interfaces:**
- Consumes: database-backed company information and optional `default_news_author`.
- Produces: truthful Organization JSON-LD and deterministic Article `author`.

- [ ] **Step 1: Write failing identity tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const server = fs.readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')
const news = fs.readFileSync(new URL('../src/views/NewsDetail.vue', import.meta.url), 'utf8')

test('organization schema does not invent founding date or employee count', () => {
  assert.doesNotMatch(server, /foundingDate:\s*'2010'/)
  assert.doesNotMatch(server, /numberOfEmployees:\s*\{/)
})

test('article schema falls back to the company organization author', () => {
  assert.match(server, /default_news_author[\s\S]*@type': 'Organization'/)
  assert.match(news, /default_news_author[\s\S]*@type': 'Organization'/)
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/seoIdentity.test.js`

Expected: FAIL on the hard-coded organization claims and missing author fallback.

- [ ] **Step 3: Implement truthful identity fallback**

Remove hard-coded `foundingDate` and `numberOfEmployees`. Build the Article
author in both server and client:

```js
const articleAuthor = seoSettings.default_news_author
  ? { '@type': 'Person', name: seoSettings.default_news_author }
  : {
      '@type': 'Organization',
      name: companyName,
      url: `${siteUrl}/${lang}/about`
    }
```

Use the same company name and logo for `publisher`; do not derive publisher
name from `document.title`. Build Article and Product URLs from the localized
browser pathname so client JSON-LD never replaces the server's language-aware
canonical with an unprefixed URL.

- [ ] **Step 4: Run targeted and full tests**

Run: `node --test test/seoIdentity.test.js`

Expected: PASS.

Run: `npm test`

Expected: all tests pass.

- [ ] **Step 5: Commit Task 2**

```bash
git add server/index.js src/views/NewsDetail.vue test/seoIdentity.test.js
git commit -m "fix: use truthful seo identity"
```

---

### Task 3: Production Nginx delivery and guarded migration

**Files:**
- Create: `scripts/nginxSsrConfig.mjs`
- Create: `scripts/verifySeoDelivery.mjs`
- Modify: `server-setup.sh`
- Modify: `server-update.sh`
- Modify: `nginx.conf.example`
- Modify: `UPDATE-GUIDE.md`
- Test: `test/seoDelivery.test.js`

**Interfaces:**
- `migrateLegacySpaLocation(source, port): { changed: boolean, content: string }`
- `verifySeoDelivery({ fetchImpl, localBaseUrl, publicBaseUrl }): Promise<void>`
- CLI modes write only an explicitly named output file or verify named URLs.

- [ ] **Step 1: Write failing delivery tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { migrateLegacySpaLocation } from '../scripts/nginxSsrConfig.mjs'
import { verifySeoDelivery } from '../scripts/verifySeoDelivery.mjs'

test('migrates only the legacy setup-generated SPA location', () => {
  const legacy = `# Frontend (Vue SPA)
location / {
    root /www/wwwroot/steel-trader/dist;
    index index.html;
    try_files $uri $uri/ /index.html;
}`
  const result = migrateLegacySpaLocation(legacy, 3001)
  assert.equal(result.changed, true)
  assert.match(result.content, /proxy_pass http:\/\/127\.0\.0\.1:3001/)
  assert.doesNotMatch(result.content, /try_files/)
  assert.equal(migrateLegacySpaLocation('location /api/ {}', 3001).changed, false)
})

test('setup and update scripts cover public SSR and child sitemap verification', () => {
  const setup = fs.readFileSync(new URL('../server-setup.sh', import.meta.url), 'utf8')
  const update = fs.readFileSync(new URL('../server-update.sh', import.meta.url), 'utf8')
  assert.match(setup, /location \/\s*\{[\s\S]*proxy_pass http:\/\/127\.0\.0\.1:\$\{PORT\}/)
  assert.doesNotMatch(setup, /try_files \\\$uri \\\$uri\/ \/index\.html/)
  assert.match(update, /verifySeoDelivery\.mjs/)
})

test('delivery verifier rejects the generic shell and accepts SSR XML', async () => {
  const responses = new Map([
    ['http://local/en/about', new Response('<link rel="canonical" href="https://www.sunseasteel.com/en/about"><script type="application/ld+json">{}</script>')],
    ['http://local/sitemap-products.xml', new Response('<?xml version="1.0"?><urlset></urlset>', { headers: { 'content-type': 'application/xml' } })],
    ['https://public/en/about', new Response('<link rel="canonical" href="https://www.sunseasteel.com/en/about"><script type="application/ld+json">{}</script>')],
    ['https://public/sitemap-products.xml', new Response('<?xml version="1.0"?><urlset></urlset>', { headers: { 'content-type': 'application/xml' } })]
  ])
  await verifySeoDelivery({
    fetchImpl: async url => responses.get(String(url)),
    localBaseUrl: 'http://local',
    publicBaseUrl: 'https://public'
  })
})
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `node --test test/seoDelivery.test.js`

Expected: FAIL because the delivery modules do not exist and setup still uses
`try_files`.

- [ ] **Step 3: Implement pure Nginx migration and delivery verification**

`migrateLegacySpaLocation()` replaces only the exact setup-generated
`# Frontend (Vue SPA)` block with:

```nginx
# Public HTML and sitemap routes are rendered by Node for SEO/GEO.
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 30s;
    proxy_read_timeout 300s;
}
```

`verifySeoDelivery()` requests `/en/about` and
`/sitemap-products.xml` from Node and the public domain with a cache-busting
query. It requires the About canonical, JSON-LD, XML content type, and
`<urlset>`.

- [ ] **Step 4: Correct new-install and update workflows**

Change `server-setup.sh` so `location /` proxies Node. Keep direct `/assets/`
and `/uploads/` delivery.

Add an update phase that:

1. checks `/etc/nginx/sites-available/led-trade` and
   `/etc/nginx/sites-available/steel-trader`;
2. applies the migration only if the exact legacy block is present;
3. saves a timestamped backup next to the target;
4. runs `nginx -t`;
5. restores the backup if validation fails;
6. reloads Nginx only after validation;
7. runs `node scripts/verifySeoDelivery.mjs`.

Panel-managed or unknown Nginx layouts are never rewritten. Verification
failure prints the path to `nginx.conf.example` and exits non-zero.

- [ ] **Step 5: Update deployment documentation**

Document the expected proxy topology, backup/rollback behavior, public checks,
and Search Console follow-up in `UPDATE-GUIDE.md`.

- [ ] **Step 6: Run targeted tests and shell syntax checks**

Run: `node --test test/seoDelivery.test.js`

Expected: PASS.

Run: `bash -n server-setup.sh && bash -n server-update.sh`

Expected: both scripts parse successfully.

- [ ] **Step 7: Commit Task 3**

```bash
git add scripts/nginxSsrConfig.mjs scripts/verifySeoDelivery.mjs server-setup.sh server-update.sh nginx.conf.example UPDATE-GUIDE.md test/seoDelivery.test.js
git commit -m "fix: deliver seo through node"
```

---

### Task 4: Final regression verification and publication

**Files:**
- Verify all files changed by Tasks 1–3.

**Interfaces:**
- Consumes: completed implementation.
- Produces: evidence that existing application behavior still builds and tests.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Check every server module**

Run:

```powershell
$files = Get-ChildItem server -Recurse -File -Filter *.js
foreach ($file in $files) {
  node --check $file.FullName
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
}
```

Expected: exit code 0.

- [ ] **Step 3: Check deployment scripts**

Run: `bash -n server-setup.sh && bash -n server-update.sh`

Expected: exit code 0.

- [ ] **Step 4: Build the production client**

Run: `npm run build`

Expected: Vite production build completes successfully.

- [ ] **Step 5: Review the complete diff**

Run:

```bash
git diff --check
git status --short
git diff main...HEAD
```

Expected: no whitespace errors and only files in this plan.

- [ ] **Step 6: Request code review**

Review must verify the design requirements, Nginx migration safety, status-code
behavior, cache policy, metadata uniqueness, and absence of unrelated changes.

- [ ] **Step 7: Fast-forward to `main` and push**

After review approval:

```bash
git checkout main
git merge --ff-only codex/seo-geo-delivery
git push origin main
```

Expected: GitHub `main` points to the verified implementation commit.
