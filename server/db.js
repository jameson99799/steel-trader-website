import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dirname, '..', 'data')
const dbPath = join(dataDir, 'database.db')

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

let db = null

async function initDb() {
  // better-sqlite3 opens/creates directly from file — no in-memory serialization overhead
  db = new Database(dbPath)

  // Performance: WAL mode enables concurrent reads while writing
  db.pragma('journal_mode = WAL')
  db.pragma('synchronous = NORMAL')
  db.pragma('cache_size = -64000')   // 64MB cache
  db.pragma('foreign_keys = ON')

  // 创建表
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      parent_id INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      image TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER,
      name TEXT NOT NULL,
      name_en TEXT,
      description TEXT,
      description_en TEXT,
      specs TEXT,
      images TEXT,
      detail_content TEXT,
      is_featured INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Migrations: add product columns if not exist
  try { db.exec('ALTER TABLE products ADD COLUMN detail_content TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE products ADD COLUMN seo_title TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE products ADD COLUMN seo_description TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE products ADD COLUMN seo_keywords TEXT') } catch (e) { }
  // Migration: add map_embed_url to company
  try { db.exec('ALTER TABLE company ADD COLUMN map_embed_url TEXT') } catch (e) { }

  db.exec(`
    CREATE TABLE IF NOT EXISTS banners (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      image TEXT NOT NULL,
      link TEXT,
      sort_order INTEGER DEFAULT 0,
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS company (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      name_en TEXT,
      description TEXT,
      description_en TEXT,
      phone TEXT,
      email TEXT,
      address TEXT,
      address_en TEXT,
      whatsapp TEXT,
      wechat TEXT,
      facebook TEXT,
      linkedin TEXT,
      instagram TEXT,
      tiktok TEXT,
      twitter TEXT,
      whatsapp_qr TEXT,
      wechat_qr TEXT,
      logo TEXT,
      favicon TEXT,
      about_image TEXT,
      advantages TEXT,
      advantages_en TEXT,
      map_embed_url TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Migration: add new social/QR columns if not exist
  try { db.exec('ALTER TABLE company ADD COLUMN facebook TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE company ADD COLUMN linkedin TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE company ADD COLUMN instagram TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE company ADD COLUMN tiktok TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE company ADD COLUMN twitter TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE company ADD COLUMN whatsapp_qr TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE company ADD COLUMN wechat_qr TEXT') } catch (e) { }

  db.exec(`
    CREATE TABLE IF NOT EXISTS inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      company TEXT,
      country TEXT,
      message TEXT,
      product_id INTEGER,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS hero_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT,
      tag_en TEXT,
      title TEXT,
      title_en TEXT,
      subtitle TEXT,
      subtitle_en TEXT,
      stat1_num TEXT,
      stat1_label TEXT,
      stat1_label_en TEXT,
      stat2_num TEXT,
      stat2_label TEXT,
      stat2_label_en TEXT,
      stat3_num TEXT,
      stat3_label TEXT,
      stat3_label_en TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS page_texts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      logo_subtitle TEXT,
      featured_subtitle TEXT,
      featured_subtitle_en TEXT,
      categories_subtitle TEXT,
      categories_subtitle_en TEXT,
      advantages_subtitle TEXT,
      advantages_subtitle_en TEXT,
      cta_title TEXT,
      cta_title_en TEXT,
      cta_subtitle TEXT,
      cta_subtitle_en TEXT,
      products_page_subtitle TEXT,
      products_page_subtitle_en TEXT,
      contact_page_title TEXT,
      contact_page_title_en TEXT,
      contact_page_subtitle TEXT,
      contact_page_subtitle_en TEXT,
      contact_form_desc TEXT,
      contact_form_desc_en TEXT,
      inquiry_panel_title TEXT,
      inquiry_panel_title_en TEXT,
      contact_tagline TEXT,
      contact_tagline_en TEXT,
      about_overlay_text TEXT,
      about_overlay_text_en TEXT,
      about_tagline TEXT,
      about_tagline_en TEXT,
      about_cta_subtitle TEXT,
      about_cta_subtitle_en TEXT,
      about_iso TEXT,
      about_iso_en TEXT,
      about_global TEXT,
      about_global_en TEXT,
      about_innovation TEXT,
      about_innovation_en TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Migrations: add new page_texts columns if not exist
  const ptCols = ['contact_tagline', 'contact_tagline_en', 'about_overlay_text', 'about_overlay_text_en', 'about_tagline', 'about_tagline_en', 'about_cta_subtitle', 'about_cta_subtitle_en', 'about_iso', 'about_iso_en', 'about_global', 'about_global_en', 'about_innovation', 'about_innovation_en', 'inquiry_subtitle', 'inquiry_subtitle_en']
  for (const col of ptCols) {
    try { db.exec(`ALTER TABLE page_texts ADD COLUMN ${col} TEXT`) } catch (e) { }
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      title_en TEXT,
      slug TEXT UNIQUE,
      summary TEXT,
      summary_en TEXT,
      content TEXT,
      cover_image TEXT,
      seo_title TEXT,
      seo_description TEXT,
      seo_keywords TEXT,
      status INTEGER DEFAULT 1,
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

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
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Languages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS languages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      flag TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 5,
      status INTEGER DEFAULT 1,
      ai_translated INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Ensure default English language exists
  const enExists = db.prepare("SELECT id FROM languages WHERE code = 'en'").get()
  if (!enExists) {
    db.prepare("INSERT INTO languages (name, code, flag, sort_order, status, ai_translated) VALUES (?, ?, ?, ?, ?, ?)").run('English', 'en', '🇺🇸', 1, 1, 0)
  }

  // Translation settings (OpenAI-compatible API)
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_settings (
      id INTEGER PRIMARY KEY,
      api_url TEXT DEFAULT 'https://api.openai.com/v1',
      api_key TEXT DEFAULT '',
      model_name TEXT DEFAULT 'gpt-3.5-turbo',
      multilingual_enabled INTEGER DEFAULT 1,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Ensure a row exists
  const tsExists = db.prepare('SELECT id FROM translation_settings WHERE id = 1').get()
  if (!tsExists) {
    db.prepare("INSERT INTO translation_settings (id, api_url, api_key, model_name, multilingual_enabled) VALUES (1, 'https://api.openai.com/v1', '', 'gpt-3.5-turbo', 1)").run()
  }

  // Translations table — stores all translated content
  db.exec(`
    CREATE TABLE IF NOT EXISTS translations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      language_code TEXT NOT NULL,
      content_type TEXT NOT NULL,
      content_id INTEGER,
      content_field TEXT NOT NULL,
      original_text TEXT,
      translated_text TEXT,
      is_manual INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Unique index for translations
  try { db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_translations_unique ON translations(language_code, content_type, COALESCE(content_id,-1), content_field)') } catch (e) { }

  // 初始化默认数据
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count
  if (userCount === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10)
    db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run('admin', hashedPassword)
  }

  const companyCount = db.prepare('SELECT COUNT(*) as count FROM company').get().count
  if (companyCount === 0) {
    db.prepare(`INSERT INTO company (name, name_en, description, description_en, phone, email, address, address_en, whatsapp, advantages, advantages_en) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      'LED照明科技有限公司',
      'LED Lighting Technology Co., Ltd.',
      '我们是一家专业从事LED照明产品研发、生产和销售的高新技术企业，拥有10年以上的行业经验。',
      'We are a high-tech enterprise specializing in R&D, production and sales of LED lighting products with over 10 years of industry experience.',
      '+86 123 4567 8900',
      'info@ledtrade.com',
      '中国广东省深圳市宝安区工业园区',
      'Industrial Park, Baoan District, Shenzhen, Guangdong, China',
      '+86 123 4567 8900',
      '工厂直供\n品质保证\n快速交货\n定制服务',
      'Factory Direct\nQuality Assurance\nFast Delivery\nCustom Service'
    )
  }

  const heroCount = db.prepare('SELECT COUNT(*) as count FROM hero_content').get().count
  if (heroCount === 0) {
    db.prepare(`INSERT INTO hero_content (tag, tag_en, title, title_en, subtitle, subtitle_en, stat1_num, stat1_label, stat1_label_en, stat2_num, stat2_label, stat2_label_en, stat3_num, stat3_label, stat3_label_en)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      '专业LED照明解决方案',
      'Professional LED Lighting Solutions',
      '点亮世界，照亮未来',
      'Illuminate the World, Light Up the Future',
      '提供高品质LED照明产品，服务全球客户',
      'Providing high-quality LED lighting products to customers worldwide',
      '10+', '年行业经验', 'Years Experience',
      '500+', '产品型号', 'Product Models',
      '50+', '出口国家', 'Export Countries'
    )
  }

  // Seed seo_settings if empty
  const seoCount = db.prepare('SELECT COUNT(*) as count FROM seo_settings').get().count
  if (seoCount === 0) {
    db.prepare(`INSERT INTO seo_settings (site_title, site_description, site_keywords) VALUES (?,?,?)`)
      .run('LED Trade — Professional LED Lighting Solutions', 'Professional LED lighting products manufacturer and exporter. High quality LED solutions for global customers.', 'LED lighting, LED manufacturer, LED exporter, professional LED solutions')
  }

  const pageTextsCount = db.prepare('SELECT COUNT(*) as count FROM page_texts').get().count
  if (pageTextsCount === 0) {
    db.prepare(`INSERT INTO page_texts (
      logo_subtitle,
      featured_subtitle, featured_subtitle_en,
      categories_subtitle, categories_subtitle_en,
      advantages_subtitle, advantages_subtitle_en,
      cta_title, cta_title_en,
      cta_subtitle, cta_subtitle_en,
      products_page_subtitle, products_page_subtitle_en,
      contact_page_title, contact_page_title_en,
      contact_page_subtitle, contact_page_subtitle_en,
      contact_form_desc, contact_form_desc_en,
      inquiry_panel_title, inquiry_panel_title_en,
      contact_tagline, contact_tagline_en,
      about_overlay_text, about_overlay_text_en,
      about_tagline, about_tagline_en,
      about_cta_subtitle, about_cta_subtitle_en,
      about_iso, about_iso_en,
      about_global, about_global_en,
      about_innovation, about_innovation_en
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
      'Professional LED Solutions',
      'Discover our premium LED lighting solutions', 'Discover our premium LED lighting solutions',
      'Explore our comprehensive range of LED products', 'Explore our comprehensive range of LED products',
      'Professional LED solutions with unmatched quality and service', 'Professional LED solutions with unmatched quality and service',
      'Ready to Start Your Project?', 'Ready to Start Your Project?',
      'Get in touch with our experts for professional LED lighting solutions', 'Get in touch with our experts for professional LED lighting solutions',
      'Explore our comprehensive LED product catalog', 'Explore our comprehensive LED product catalog',
      'Get In Touch', 'Get In Touch',
      'Get a quote for your LED requirements', 'Get a quote for your LED requirements',
      'Tell us about your LED requirements, project details, quantity needed, etc.', 'Tell us about your LED requirements, project details, quantity needed, etc.',
      'Contact Our Team', 'Contact Our Team',
      'Professional LED Solutions Provider', 'Professional LED Solutions Provider',
      'Professional LED Solutions', 'Professional LED Solutions',
      'Trusted LED Manufacturer & Exporter', 'Trusted LED Manufacturer & Exporter',
      'Ready to start your LED project? Contact our expert team for professional consultation and competitive pricing.', 'Ready to start your LED project? Contact our expert team for professional consultation and competitive pricing.',
      'ISO Certified Quality', 'ISO Certified Quality',
      'Global Export Experience', 'Global Export Experience',
      'Innovation & Technology', 'Innovation & Technology'
    )
  } else {
    // Update existing row with new default values for new columns
    const pt = db.prepare('SELECT * FROM page_texts WHERE id = 1').get()
    if (pt && !pt.contact_tagline) {
      db.prepare(`UPDATE page_texts SET contact_tagline=?, contact_tagline_en=?, about_overlay_text=?, about_overlay_text_en=?, about_tagline=?, about_tagline_en=?, about_cta_subtitle=?, about_cta_subtitle_en=?, about_iso=?, about_iso_en=?, about_global=?, about_global_en=?, about_innovation=?, about_innovation_en=? WHERE id=1`)
        .run('Professional LED Solutions Provider', 'Professional LED Solutions Provider', 'Professional LED Solutions', 'Professional LED Solutions', 'Trusted LED Manufacturer & Exporter', 'Trusted LED Manufacturer & Exporter', 'Ready to start your LED project? Contact our expert team for professional consultation and competitive pricing.', 'Ready to start your LED project? Contact our expert team for professional consultation and competitive pricing.', 'ISO Certified Quality', 'ISO Certified Quality', 'Global Export Experience', 'Global Export Experience', 'Innovation & Technology', 'Innovation & Technology')
    }
  }

  return db
}

// 辅助函数 — better-sqlite3 同步 API，不阻塞事件循环
function getAll(sql, params = []) {
  return db.prepare(sql).all(...params)
}

function getOne(sql, params = []) {
  return db.prepare(sql).get(...params) || null
}

function run(sql, params = []) {
  const info = db.prepare(sql).run(...params)
  return { lastInsertRowid: info.lastInsertRowid }
}

// saveDb is a no-op for better-sqlite3 (writes are direct to file)
function saveDb() { }

export { initDb, getAll, getOne, run, saveDb }
export default { initDb, getAll, getOne, run, saveDb }
