// Valid schema.org organization types that may be used as the site's
// Organization / publisher @type. 'Manufacturer' is NOT a schema.org type —
// emitting it in JSON-LD makes the entity unparseable for Google & AI engines.
export const ORGANIZATION_TYPES = Object.freeze([
  'Organization',
  'Corporation',
  'LocalBusiness',
  'Store',
  'WholesaleStore'
])

export function sanitizeOrganizationType(value) {
  const v = typeof value === 'string' ? value.trim() : ''
  return ORGANIZATION_TYPES.includes(v) ? v : 'Corporation'
}

const ADDITIVE_COLUMNS = [
  ['site_title', 'TEXT'],
  ['site_description', 'TEXT'],
  ['site_keywords', 'TEXT'],
  ['og_image', 'TEXT'],
  ['google_analytics', 'TEXT'],
  ['google_search_console', 'TEXT'],
  ['robots_txt', 'TEXT'],
  ['geo_region', "TEXT DEFAULT ''"],
  ['geo_placename', "TEXT DEFAULT ''"],
  ['geo_lat', "TEXT DEFAULT ''"],
  ['geo_lng', "TEXT DEFAULT ''"],
  ['hreflang_en', "TEXT DEFAULT 'en'"],
  ['hreflang_zh', "TEXT DEFAULT 'zh-CN'"],
  ['local_business_type', "TEXT DEFAULT 'Corporation'"],
  ['local_business_address', "TEXT DEFAULT ''"],
  ['service_account_json', "TEXT DEFAULT ''"],
  ['oauth_client_id', "TEXT DEFAULT ''"],
  ['oauth_client_secret', "TEXT DEFAULT ''"],
  ['oauth_refresh_token', "TEXT DEFAULT ''"],
  ['article_refresh_days', 'INTEGER DEFAULT 0'],
  ['product_refresh_days', 'INTEGER DEFAULT 0'],
  ['llms_txt', 'TEXT'],
  ['llms_full_txt', 'TEXT'],
  // SQLite cannot add CURRENT_TIMESTAMP as a non-constant default to a populated table.
  ['updated_at', 'DATETIME']
]

export function initializeSeoSettingsSchema(db) {
  if (!db || typeof db.exec !== 'function') throw new TypeError('SEO settings schema requires a database instance')

  db.exec(`
    CREATE TABLE IF NOT EXISTS seo_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      site_title TEXT,
      site_description TEXT,
      site_keywords TEXT,
      og_image TEXT,
      google_analytics TEXT,
      google_search_console TEXT,
      robots_txt TEXT,
      geo_region TEXT DEFAULT '',
      geo_placename TEXT DEFAULT '',
      geo_lat TEXT DEFAULT '',
      geo_lng TEXT DEFAULT '',
      hreflang_en TEXT DEFAULT 'en',
      hreflang_zh TEXT DEFAULT 'zh-CN',
      local_business_type TEXT DEFAULT 'Corporation',
      local_business_address TEXT DEFAULT '',
      service_account_json TEXT DEFAULT '',
      oauth_client_id TEXT DEFAULT '',
      oauth_client_secret TEXT DEFAULT '',
      oauth_refresh_token TEXT DEFAULT '',
      article_refresh_days INTEGER DEFAULT 0,
      product_refresh_days INTEGER DEFAULT 0,
      llms_txt TEXT,
      llms_full_txt TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  const existing = new Set(db.pragma('table_info(seo_settings)').map(column => column.name))
  for (const [name, definition] of ADDITIVE_COLUMNS) {
    if (!existing.has(name)) db.exec(`ALTER TABLE seo_settings ADD COLUMN ${name} ${definition}`)
  }
}
