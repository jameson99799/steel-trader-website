import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { getSeoCopy } from '../server/services/seoContent.js'

// ── Issue 3: breadcrumb JSON-LD name must be a string, not a char-object ──
test('getSeoCopy breadcrumb labels stay plain strings (no object-spread corruption)', () => {
  for (const lang of ['en', 'es', 'fr', 'zh', 'de', 'ar']) {
    const copy = getSeoCopy(lang, { products: { title: 'Override' } })
    assert.equal(typeof copy.breadcrumbHome, 'string', `breadcrumbHome for ${lang}`)
    assert.equal(typeof copy.breadcrumbProducts, 'string', `breadcrumbProducts for ${lang}`)
    assert.equal(typeof copy.breadcrumbNews, 'string', `breadcrumbNews for ${lang}`)
    // The exact regression: {"0":"H","1":"o",...} instead of "Home"
    assert.equal(JSON.stringify({ name: copy.breadcrumbHome }).includes('"0":'), false)
  }
  // Overrides still apply to object fields
  const copy = getSeoCopy('en', { products: { title: 'Override Title' } })
  assert.equal(copy.products.title, 'Override Title')
  // String keys are NOT clobbered by the overrides loop
  assert.equal(copy.breadcrumbHome, 'Home')
})

// ── Issue 1: dirty news slugs (raw titles with spaces/"?") get normalized ──
test('dirty news slugs are normalized to clean [a-z0-9-] slugs', () => {
  const db = new Database(':memory:')
  db.exec(`CREATE TABLE news (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, title_en TEXT, slug TEXT, status INTEGER DEFAULT 1, seo_title TEXT)`)

  const slugifyNews = (text, id) => {
    const base = text.toLowerCase()
      .replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
      .substring(0, 80)
    return `${base}-${id}`
  }
  // Mirror the db.js migration logic
  const migrate = () => {
    const allNews = db.prepare('SELECT id, title, title_en, slug FROM news').all()
    const update = db.prepare('UPDATE news SET slug = ? WHERE id = ?')
    for (const n of allNews) {
      const hasTimestamp = /\-\d{13}$/.test(n.slug || '')
      const isDirty = !/^[a-z0-9-]+$/.test(n.slug || '')
      if (hasTimestamp || !n.slug || isDirty) {
        update.run(slugifyNews(n.title_en || n.title || `article-${n.id}`, n.id), n.id)
      }
    }
    // Then the strip-id-suffix migration (uniqueness-guarded)
    const articles = db.prepare('SELECT id, slug FROM news WHERE slug IS NOT NULL').all()
    for (const a of articles) {
      const suffix = `-${a.id}`
      if (a.slug.endsWith(suffix)) {
        const stripped = a.slug.slice(0, -suffix.length)
        if (stripped && !db.prepare('SELECT id FROM news WHERE slug = ? AND id != ?').get(stripped, a.id)) {
          db.prepare('UPDATE news SET slug = ? WHERE id = ?').run(stripped, a.id)
        }
      }
    }
  }

  db.prepare('INSERT INTO news (id, title_en, slug) VALUES (1, ?, ?)')
    .run('Why Do Some Color Coated Steel Coils Fade in Just 3 Years While Others Last 25?',
      'Why Do Some Color Coated Steel Coils Fade in Just 3 Years While Others Last 25?')
  db.prepare('INSERT INTO news (id, title_en, slug) VALUES (2, ?, ?)')
    .run('Clean Article', 'clean-article')

  migrate()

  const dirty = db.prepare('SELECT slug FROM news WHERE id = 1').get()
  assert.match(dirty.slug, /^[a-z0-9-]+$/, 'slug is now clean')
  assert.equal(dirty.slug.includes('?'), false)
  assert.equal(dirty.slug.includes(' '), false)
  assert.ok(dirty.slug.startsWith('why-do-some-color-coated-steel-coils'))
  // Clean slugs are untouched
  assert.equal(db.prepare('SELECT slug FROM news WHERE id = 2').get().slug, 'clean-article')
  // Idempotent: second run changes nothing
  const before = dirty.slug
  migrate()
  assert.equal(db.prepare('SELECT slug FROM news WHERE id = 1').get().slug, before)
})

// ── Issue 1 (route rescue): normalized retry maps dirty URL → canonical slug ──
test('dirty URL path normalizes to a lookup that finds the canonical article', () => {
  const requested = 'why-do-some-color-coated-steel-coils-fade-in-just-3-years-while-others-last-25' // "?" truncated by browser
  const canonical = 'why-do-some-color-coated-steel-coils-fade-in-just-3-years-while-others-last-25'
  // Simulated route rescue logic from index.js
  const normalized = requested.toLowerCase().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '')
  assert.equal(normalized, canonical)
  // Also full encoded variant with %3F intact — the trailing "?" becomes a
  // trailing "-" which the cleanup strips, yielding exactly the canonical slug.
  const full = 'why-do-some-color-coated-steel-coils-fade-in-just-3-years-while-others-last-25?' // decoded %3F
  const normFull = full.toLowerCase().replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '')
  assert.equal(normFull, canonical)
})
