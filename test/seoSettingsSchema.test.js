import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { initializeSeoSettingsSchema } from '../server/services/seoSettingsSchema.js'

const requiredColumns = [
  'site_title', 'site_description', 'site_keywords', 'og_image', 'google_analytics',
  'google_search_console', 'robots_txt', 'geo_region', 'geo_placename', 'geo_lat',
  'geo_lng', 'hreflang_en', 'hreflang_zh', 'local_business_type',
  'local_business_address', 'service_account_json', 'oauth_client_id',
  'oauth_client_secret', 'oauth_refresh_token', 'article_refresh_days',
  'product_refresh_days', 'llms_txt', 'llms_full_txt', 'updated_at'
]

test('creates a complete SEO settings schema before fresh-database seeding', () => {
  const db = new Database(':memory:')
  try {
    initializeSeoSettingsSchema(db)
    const columns = db.pragma('table_info(seo_settings)').map(column => column.name)
    for (const name of requiredColumns) assert.ok(columns.includes(name), `missing ${name}`)
    assert.doesNotThrow(() => db.prepare(`
      INSERT INTO seo_settings (site_title, site_description, site_keywords, llms_txt, llms_full_txt)
      VALUES (?, ?, ?, ?, ?)
    `).run('Title', 'Description', 'keywords', '# llms', '# full'))
  } finally {
    db.close()
  }
})

test('upgrades a legacy SEO settings table idempotently without replacing custom data', () => {
  const db = new Database(':memory:')
  try {
    db.exec('CREATE TABLE seo_settings (id INTEGER PRIMARY KEY, site_title TEXT)')
    db.prepare('INSERT INTO seo_settings (id, site_title) VALUES (1, ?)').run('Custom title')
    initializeSeoSettingsSchema(db)
    initializeSeoSettingsSchema(db)
    assert.equal(db.prepare('SELECT site_title FROM seo_settings WHERE id = 1').get().site_title, 'Custom title')
    assert.equal(db.prepare('SELECT COUNT(*) AS count FROM seo_settings').get().count, 1)
    const columns = db.pragma('table_info(seo_settings)').map(column => column.name)
    for (const name of requiredColumns) assert.ok(columns.includes(name), `missing ${name}`)
  } finally {
    db.close()
  }
})
