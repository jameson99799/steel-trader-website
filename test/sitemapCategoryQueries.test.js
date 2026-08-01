import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import {
  CATEGORY_INDEX_LASTMOD_QUERY,
  PRODUCT_CATEGORY_SITEMAP_QUERY,
  NEWS_CATEGORY_SITEMAP_QUERY
} from '../server/services/sitemapCategoryQueries.js'

function createCategoryDatabase() {
  const db = new Database(':memory:')
  db.exec(`
    CREATE TABLE categories (
      id INTEGER PRIMARY KEY,
      slug TEXT,
      name_en TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE news_categories (
      id INTEGER PRIMARY KEY,
      slug TEXT,
      name_en TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `)
  db.prepare('INSERT INTO categories (id, slug, name_en, created_at) VALUES (1, ?, ?, ?)')
    .run('steel-coil', 'Steel Coil', '2026-07-20 12:00:00')
  db.prepare('INSERT INTO news_categories (id, slug, name_en, created_at) VALUES (1, ?, ?, ?)')
    .run('guides', 'Guides', '2026-07-21 12:00:00')
  return db
}

test('category sitemap queries work with the deployed created_at-only schemas', () => {
  const db = createCategoryDatabase()
  try {
    assert.equal(db.prepare(CATEGORY_INDEX_LASTMOD_QUERY).get().d, '2026-07-20 12:00:00')
    assert.equal(db.prepare(PRODUCT_CATEGORY_SITEMAP_QUERY).all()[0].lastmod_date, '2026-07-20 12:00:00')
    assert.equal(db.prepare(NEWS_CATEGORY_SITEMAP_QUERY).all()[0].lastmod_date, '2026-07-21 12:00:00')
  } finally {
    db.close()
  }
})

test('category sitemap queries never require an updated_at column', () => {
  for (const query of [
    CATEGORY_INDEX_LASTMOD_QUERY,
    PRODUCT_CATEGORY_SITEMAP_QUERY,
    NEWS_CATEGORY_SITEMAP_QUERY
  ]) {
    assert.doesNotMatch(query, /updated_at/i)
  }
})
