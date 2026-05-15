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
    CREATE TABLE IF NOT EXISTS roofing_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model TEXT,
      profile_type TEXT,
      effective_width REAL,
      coil_width REAL,
      rib_height REAL,
      pitch REAL,
      color TEXT,
      surface TEXT,
      sort_order INTEGER DEFAULT 0,
      category_id INTEGER DEFAULT 0,
      image_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Add custom specifications to roofing_profiles if they don't exist
  try {
    const columns = db.pragma("table_info(roofing_profiles)")
    const colsToAdd = [
      { name: 'category_id', def: 'INTEGER DEFAULT 0' },
      { name: 'image_url', def: 'TEXT' },
      { name: 'material', def: 'TEXT' },
      { name: 'thickness', def: 'TEXT' },
      { name: 'coating', def: 'TEXT' },
      { name: 'length', def: 'TEXT' },
      { name: 'applications', def: 'TEXT' }
    ]
    colsToAdd.forEach(col => {
      if (!columns.some(c => c.name === col.name)) {
        db.exec(`ALTER TABLE roofing_profiles ADD COLUMN ${col.name} ${col.def}`)
      }
    })
  } catch (e) {
    console.warn('[db] Migration for roofing_profiles failed:', e)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS roofing_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      sort_order INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Populate default 3D roofing profiles if empty
  try {
    const hasRoofingProfiles = db.prepare("SELECT id FROM roofing_profiles LIMIT 1").get()
    if (!hasRoofingProfiles) {
      const defaultProfiles = [
        { model: 'YX50-410-820', type: 'trapezoidal', w: 820, cw: 1000, h: 50, p: 410, surface: 'ppgi', color: '#1e40af', sort: 100 },
        { model: 'YX35-125-750', type: 'corrugated', w: 750, cw: 1000, h: 35, p: 125, surface: 'gi', color: '', sort: 90 },
        { model: 'YX76-380-760', type: 'trapezoidal', w: 760, cw: 1000, h: 76, p: 380, surface: 'gl', color: '', sort: 80 },
        { model: 'YX62-475', type: 'standing_seam', w: 475, cw: 600, h: 62, p: 475, surface: 'ppgi', color: '#b91c1c', sort: 70 },
        { model: 'YX25-210-840', type: 'glazed_tile', w: 840, cw: 1000, h: 25, p: 210, surface: 'ppgi', color: '#166534', sort: 60 },
        { model: 'YX15-225-900', type: 'wall_panel', w: 900, cw: 1000, h: 15, p: 225, surface: 'ppgi', color: '#eab308', sort: 50 },
        { model: 'YX25-205-820', type: 'trapezoidal', w: 820, cw: 1000, h: 25, p: 205, surface: 'ppgi', color: '#374151', sort: 40 },
        { model: 'YX28-207-828', type: 'glazed_tile', w: 828, cw: 1000, h: 28, p: 207, surface: 'ppgi', color: '#854d0e', sort: 30 },
        { model: 'YX51-240-720', type: 'trapezoidal', w: 720, cw: 1000, h: 51, p: 240, surface: 'gl', color: '', sort: 20 },
        { model: 'YX18-76-836', type: 'corrugated', w: 836, cw: 1000, h: 18, p: 76, surface: 'gi', color: '', sort: 10 }
      ]
      const insertProfile = db.prepare(`
        INSERT INTO roofing_profiles (model, profile_type, effective_width, coil_width, rib_height, pitch, surface, color, sort_order, category_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      for (const p of defaultProfiles) {
        insertProfile.run(p.model, p.type, p.w, p.cw, p.h, p.p, p.surface, p.color, p.sort, 0)
      }
    }
  } catch (e) {
    console.error('[db] Error populating default roofing profiles:', e)
  }

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

  db.exec(`
    CREATE TABLE IF NOT EXISTS factory_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT,
      sort_order INTEGER DEFAULT 0,
      carousel_enabled INTEGER DEFAULT 0,
      carousel_speed INTEGER DEFAULT 3,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS factory_media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      media_url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      autoplay INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS watermark_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enabled INTEGER DEFAULT 0,
      watermark_url TEXT,
      position TEXT DEFAULT 'bottom-right',
      opacity REAL DEFAULT 0.8,
      scale REAL DEFAULT 0.15
    )
  `)

  try {
    const hasWatermark = db.prepare("SELECT count(*) as c FROM watermark_settings").get().c
    if (hasWatermark === 0) {
      db.prepare('INSERT INTO watermark_settings (enabled, position) VALUES (0, "bottom-right")').run()
    }
  } catch (e) {
    console.error('[db] Error populating default watermark settings:', e)
  }

  try {
    const hasFactoryGroups = db.prepare("SELECT count(*) as c FROM factory_groups").get().c
    if (hasFactoryGroups === 0) {
      const insertGroup = db.prepare('INSERT INTO factory_groups (name, name_en, sort_order) VALUES (?, ?, ?)')
      insertGroup.run('工厂生产', 'Factory Production', 10)
      insertGroup.run('包装', 'Packaging', 20)
      insertGroup.run('运输', 'Shipping', 30)
      insertGroup.run('质检', 'Quality Inspection', 40)
      console.log('[db] Seeded default factory groups')
    }
  } catch (e) {
    console.error('[db] Error populating default factory groups:', e)
  }

  // Migrations: add product columns if not exist
  try { db.exec('ALTER TABLE products ADD COLUMN detail_content TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE products ADD COLUMN seo_title TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE products ADD COLUMN seo_description TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE products ADD COLUMN seo_keywords TEXT') } catch (e) { }
  // Migration: add product slug for SEO-friendly URLs
  try { db.exec('ALTER TABLE products ADD COLUMN slug TEXT') } catch (e) { }
  // Migration: add category slug for SEO-friendly filter URLs
  try { db.exec('ALTER TABLE categories ADD COLUMN slug TEXT') } catch (e) { }
  // Auto-generate slugs for categories without one
  try {
    const noCatSlug = db.prepare('SELECT id, name, name_en FROM categories WHERE slug IS NULL OR slug = ""').all()
    const slugCat = (text, id) => text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '').substring(0, 60) + '-' + id
    const upCatSlug = db.prepare('UPDATE categories SET slug = ? WHERE id = ?')
    for (const c of noCatSlug) { upCatSlug.run(slugCat(c.name_en || c.name || `cat-${c.id}`, c.id), c.id) }
  } catch (e) { }
  // Auto-generate slugs for existing products that have none
  try {
    const noSlug = db.prepare('SELECT id, name, name_en FROM products WHERE slug IS NULL OR slug = ""').all()
    const slugify = (text) => text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
    const updateSlug = db.prepare('UPDATE products SET slug = ? WHERE id = ?')
    for (const p of noSlug) {
      const base = slugify(p.name_en || p.name || `product-${p.id}`)
      updateSlug.run(`${base}-${p.id}`, p.id)
    }
  } catch (e) { }
  // Migration: add map_embed_url to company
  try { db.exec('ALTER TABLE company ADD COLUMN map_embed_url TEXT') } catch (e) { }
  // Migration: add company video embed fields
  try { db.exec('ALTER TABLE company ADD COLUMN company_video_embed TEXT') } catch (e) { }
  try { db.exec('ALTER TABLE company ADD COLUMN about_show_video INTEGER DEFAULT 0') } catch (e) { }
  try { db.exec('ALTER TABLE company ADD COLUMN about_video_autoplay INTEGER DEFAULT 0') } catch (e) { }
  try { db.exec('ALTER TABLE company ADD COLUMN home_show_video INTEGER DEFAULT 0') } catch (e) { }
  // Migration: add show_contact_panel to page_texts
  try { db.exec('ALTER TABLE page_texts ADD COLUMN show_contact_panel INTEGER DEFAULT 0') } catch (e) { }
  // Migration: add GEO SEO fields to seo_settings
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN geo_region TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN geo_placename TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN geo_lat TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN geo_lng TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN hreflang_en TEXT DEFAULT 'en'") } catch (e) { }
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN hreflang_zh TEXT DEFAULT 'zh-CN'") } catch (e) { }
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN local_business_type TEXT DEFAULT 'Manufacturer'") } catch (e) { }
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN local_business_address TEXT DEFAULT ''") } catch (e) { }
  // Migration: add Google Indexing API Service Account credentials
  try { db.exec("ALTER TABLE seo_settings ADD COLUMN service_account_json TEXT DEFAULT ''") } catch (e) { }
  // Migration: add faq_items for GEO (Generative Engine Optimization) FAQ schema
  try { db.exec("ALTER TABLE products ADD COLUMN faq_items TEXT DEFAULT '[]'") } catch (e) { }
  try { db.exec("ALTER TABLE news ADD COLUMN faq_items TEXT DEFAULT '[]'") } catch (e) { }
  // Migration: add updated_at to products for freshness tracking
  try { db.exec('ALTER TABLE products ADD COLUMN updated_at DATETIME') } catch (e) { }
  // Migration: auto content-refresh interval settings for SEO freshness
  try { db.exec('ALTER TABLE seo_settings ADD COLUMN article_refresh_days INTEGER DEFAULT 0') } catch (e) { }
  try { db.exec('ALTER TABLE seo_settings ADD COLUMN product_refresh_days INTEGER DEFAULT 0') } catch (e) { }

  // ── Google Indexing Queue ──────────────────────────────────────────────────
  // Tracks every URL submission: status, response, quota usage
  db.exec(`
    CREATE TABLE IF NOT EXISTS indexing_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT NOT NULL UNIQUE,
      status TEXT DEFAULT 'pending',
      http_code INTEGER,
      api_response TEXT,
      error_message TEXT,
      submitted_at DATETIME,
      next_retry_at DATETIME,
      retry_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Track daily quota usage (one row per calendar date)
  db.exec(`
    CREATE TABLE IF NOT EXISTS indexing_daily_quota (
      date TEXT PRIMARY KEY,
      submitted_count INTEGER DEFAULT 0,
      quota_limit INTEGER DEFAULT 200,
      auto_paused INTEGER DEFAULT 0
    )
  `)

  // AI Channels table for AI product generation
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_channels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      api_url TEXT NOT NULL DEFAULT 'https://api.openai.com/v1',
      api_key TEXT NOT NULL DEFAULT '',
      models TEXT DEFAULT '[]',
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)


  // Migration: add default_model and is_image_default to ai_channels
  try { db.exec("ALTER TABLE ai_channels ADD COLUMN default_model TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE ai_channels ADD COLUMN is_image_default INTEGER DEFAULT 0") } catch (e) { }

  // AI Generated Images table
  db.exec(`
    CREATE TABLE IF NOT EXISTS ai_generated_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      target_type TEXT NOT NULL,
      target_id INTEGER NOT NULL,
      prompt TEXT,
      image_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Translation Prompts table for custom translation business rules
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      content TEXT NOT NULL,
      is_system INTEGER DEFAULT 0,
      is_default INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Add default translation prompt if empty
  try {
    const hasPrompt = db.prepare('SELECT id FROM translation_prompts LIMIT 1').get()
    if (!hasPrompt) {
      db.prepare(`
        INSERT INTO translation_prompts (name, content, is_system, is_default)
        VALUES (?, ?, 1, 1)
      `).run('系统默认业务规则', 'Glossary(zh): Galvalume/GL=镀铝锌 ALUZINC=镀铝锌 PPGI=彩涂镀锌 PPGL=彩涂镀铝锌 GI=镀锌 CRC=冷轧卷\nDo NOT translate: "SHANDONG SUNSEA STEEL CO., LTD", ASTM, JIS, EN, GB/T, model numbers.')
    }
  } catch (e) { }

  // ═══════════════════════════════════════════════════════════════════════════════
  // CRM Tables
  // ═══════════════════════════════════════════════════════════════════════════════

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      display_name TEXT NOT NULL DEFAULT '',
      email TEXT DEFAULT '',
      smtp_host TEXT DEFAULT '',
      smtp_port INTEGER DEFAULT 465,
      smtp_user TEXT DEFAULT '',
      smtp_pass TEXT DEFAULT '',
      from_name TEXT DEFAULT '',
      role TEXT DEFAULT 'sub',
      status INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER,
      first_name TEXT DEFAULT '',
      last_name TEXT DEFAULT '',
      name TEXT NOT NULL,
      country TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      whatsapp TEXT DEFAULT '',
      wechat TEXT DEFAULT '',
      company TEXT DEFAULT '',
      status TEXT DEFAULT '开发中',
      tags TEXT DEFAULT '[]',
      note TEXT DEFAULT '',
      sea_pool_count INTEGER DEFAULT 0,
      last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Migrations
  try { db.exec("ALTER TABLE crm_customers ADD COLUMN note TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE crm_customers ADD COLUMN first_name TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE crm_customers ADD COLUMN last_name TEXT DEFAULT ''") } catch (e) { }

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_customer_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      from_user_id INTEGER,
      to_user_id INTEGER,
      action TEXT DEFAULT 'claim',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_inquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      content_html TEXT DEFAULT '',
      note TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      files TEXT DEFAULT '[]',
      inquiry_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Migration: add images/files to inquiries
  try { db.exec("ALTER TABLE crm_inquiries ADD COLUMN images TEXT DEFAULT '[]'") } catch (e) {}
  try { db.exec("ALTER TABLE crm_inquiries ADD COLUMN files TEXT DEFAULT '[]'") } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_quotations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      content_html TEXT DEFAULT '',
      note TEXT DEFAULT '',
      freight_type TEXT DEFAULT 'container',
      ports TEXT DEFAULT '[]',
      price_rows TEXT DEFAULT '[]',
      files TEXT DEFAULT '[]',
      images TEXT DEFAULT '[]',
      quotation_time DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_followups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL,
      user_id INTEGER,
      content_html TEXT DEFAULT '',
      note TEXT DEFAULT '',
      attachments TEXT DEFAULT '[]',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  try { db.exec("ALTER TABLE crm_followups ADD COLUMN note TEXT DEFAULT ''") } catch (e) {}
  try { db.exec("ALTER TABLE crm_followups ADD COLUMN images TEXT DEFAULT '[]'") } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipient_email TEXT,
      subject TEXT,
      status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      sent_by INTEGER
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_smtp_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER,
      smtp_host TEXT,
      smtp_port INTEGER DEFAULT 465,
      smtp_user TEXT,
      smtp_pass TEXT,
      from_name TEXT DEFAULT '',
      assigned_users TEXT DEFAULT 'all',
      source TEXT DEFAULT 'crm',
      source_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES crm_users(id)
    )
  `)
  try { db.exec("ALTER TABLE crm_smtp_accounts ADD COLUMN assigned_users TEXT DEFAULT 'all'") } catch(e) {}
  try { db.exec("ALTER TABLE crm_smtp_accounts ADD COLUMN source TEXT DEFAULT 'crm'") } catch(e) {}
  try { db.exec("ALTER TABLE crm_smtp_accounts ADD COLUMN source_id INTEGER") } catch(e) {}
  try { db.exec("ALTER TABLE mail_templates ADD COLUMN assigned_users TEXT DEFAULT ''") } catch(e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS crm_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      sea_pool_days INTEGER DEFAULT 30
    )
  `)
  // Ensure settings row exists
  try {
    const crmS = db.prepare('SELECT id FROM crm_settings WHERE id = 1').get()
    if (!crmS) db.prepare('INSERT INTO crm_settings (id, sea_pool_days) VALUES (1, 30)').run()
  } catch (e) { }

  // Seed default CRM admin user if none exist
  try {
    const crmUserCount = db.prepare('SELECT COUNT(*) as count FROM crm_users').get().count
    if (crmUserCount === 0) {
      const hashed = bcrypt.hashSync('admin123', 10)
      db.prepare('INSERT INTO crm_users (username, password, display_name, role) VALUES (?,?,?,?)').run('crm_admin', hashed, 'CRM管理员', 'admin')
    }
  } catch (e) { }

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
  try { db.exec('ALTER TABLE company ADD COLUMN youtube TEXT') } catch (e) { }
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

  // Email notification config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      smtp_host TEXT,
      smtp_port INTEGER DEFAULT 465,
      smtp_user TEXT,
      smtp_pass TEXT,
      from_name TEXT DEFAULT 'SunSea Steel',
      to_email TEXT,
      ssl_warn_days INTEGER DEFAULT 30,
      enabled INTEGER DEFAULT 0
    )
  `)

  // Multi-account SMTP accounts
  db.exec(`
    CREATE TABLE IF NOT EXISTS smtp_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      smtp_host TEXT NOT NULL DEFAULT '',
      smtp_port INTEGER DEFAULT 465,
      smtp_user TEXT NOT NULL DEFAULT '',
      smtp_pass TEXT NOT NULL DEFAULT '',
      from_name TEXT DEFAULT 'SunSea Steel',
      is_default INTEGER DEFAULT 0,
      enabled INTEGER DEFAULT 1,
      send_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Global email settings (single row id=1)
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      to_emails TEXT DEFAULT '',
      ssl_warn_days INTEGER DEFAULT 30,
      round_robin INTEGER DEFAULT 0
    )
  `)

  // Auto-migrate old single smtp_account to smtp_accounts on first run
  try {
    const oldCfg = db.prepare('SELECT * FROM email_config WHERE id = 1').get()
    const existing = db.prepare('SELECT COUNT(*) as cnt FROM smtp_accounts').get()
    if (oldCfg && oldCfg.smtp_host && existing.cnt === 0) {
      db.prepare('INSERT INTO smtp_accounts (name, smtp_host, smtp_port, smtp_user, smtp_pass, from_name, is_default, enabled) VALUES (?,?,?,?,?,?,1,1)')
        .run('Default (migrated)', oldCfg.smtp_host, oldCfg.smtp_port || 465, oldCfg.smtp_user || '', oldCfg.smtp_pass || '', oldCfg.from_name || 'SunSea Steel')
      db.prepare("INSERT OR IGNORE INTO email_settings (id, to_emails, ssl_warn_days) VALUES (1,?,?)").run(oldCfg.to_email || '', oldCfg.ssl_warn_days || 30)
    } else {
      db.prepare("INSERT OR IGNORE INTO email_settings (id, to_emails, ssl_warn_days) VALUES (1,'',30)").run()
    }
  } catch (e) { }
  try { db.exec("ALTER TABLE smtp_accounts ADD COLUMN assigned_users TEXT DEFAULT 'all'") } catch(e) {}

  // Bulk email: templates
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      html_body TEXT NOT NULL DEFAULT '',
      note TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  try { db.exec("ALTER TABLE mail_templates ADD COLUMN is_default INTEGER DEFAULT 0") } catch(e) {}
  // Bulk email: contacts
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      name TEXT DEFAULT '',
      company TEXT DEFAULT '',
      group_id INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Contact groups
  db.exec(`
    CREATE TABLE IF NOT EXISTS contact_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Bulk email: tasks
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      status TEXT DEFAULT 'pending',
      template_ids TEXT DEFAULT '[]',
      contact_ids TEXT DEFAULT '[]',
      account_ids TEXT DEFAULT '[]',
      interval_min INTEGER DEFAULT 10,
      interval_max INTEGER DEFAULT 60,
      cc TEXT DEFAULT '',
      read_receipt INTEGER DEFAULT 1,
      total_count INTEGER DEFAULT 0,
      sent_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Bulk email: send logs
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      contact_email TEXT,
      contact_name TEXT DEFAULT '',
      account_id INTEGER,
      template_id INTEGER,
      subject TEXT DEFAULT '',
      status TEXT DEFAULT 'sent',
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      opened_at DATETIME,
      tracking_id TEXT UNIQUE,
      message_id TEXT
    )
  `)
  // Mailer v2 migrations
  try { db.exec("ALTER TABLE mail_tasks ADD COLUMN schedule_at DATETIME") } catch (e) { }
  try { db.exec("ALTER TABLE mail_tasks ADD COLUMN priority INTEGER DEFAULT 0") } catch (e) { }
  try { db.exec("ALTER TABLE mail_tasks ADD COLUMN parent_task_id INTEGER") } catch (e) { }
  try { db.exec("ALTER TABLE mail_logs ADD COLUMN message_id TEXT") } catch (e) { }
  try { db.exec("ALTER TABLE mail_logs ADD COLUMN sent_html TEXT") } catch (e) { }
  try { db.exec("ALTER TABLE mail_contacts ADD COLUMN group_id INTEGER") } catch (e) { }
  try { db.exec("ALTER TABLE mail_tasks ADD COLUMN skip_days INTEGER DEFAULT 0") } catch (e) { }
  try { db.exec("ALTER TABLE mail_tasks ADD COLUMN attachment_paths TEXT DEFAULT '[]'") } catch (e) { }
  try { db.exec("ALTER TABLE mail_templates ADD COLUMN template_type TEXT DEFAULT 'rich'") } catch (e) { }

  // Custom email variables
  db.exec(`
    CREATE TABLE IF NOT EXISTS mail_variables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT '',
      var_key TEXT NOT NULL UNIQUE,
      var_type TEXT DEFAULT 'text',
      value TEXT DEFAULT '',
      group_name TEXT DEFAULT '',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Seed built-in variables if table is empty
  try {
    const varCount = db.prepare('SELECT COUNT(*) as c FROM mail_variables').get().c
    if (varCount === 0) {
      const seedVars = db.prepare('INSERT OR IGNORE INTO mail_variables (name, var_key, var_type, value, group_name) VALUES (?,?,?,?,?)')
      seedVars.run('随机6位数字', 'random_6digits', 'random_number', '6', '随机变量')
      seedVars.run('随机8位字母数字', 'random_8alphanum', 'random_alphanumeric', '8', '随机变量')
      seedVars.run('当前日期', 'current_date', 'builtin', 'date', '系统变量')
      seedVars.run('问候表情', 'emoji_greeting', 'emoji_group', '["👋","🤝","😊","🙏","✨","💪","🌟"]', '表情变量')
    }
  } catch (e) { }

  // ─── Data isolation: add created_by columns ────────────────────────────────
  try { db.exec("ALTER TABLE mail_templates ADD COLUMN created_by TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE mail_contacts ADD COLUMN created_by TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE mail_tasks ADD COLUMN created_by TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE mail_logs ADD COLUMN created_by TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE smtp_accounts ADD COLUMN created_by TEXT DEFAULT ''") } catch (e) { }
  try { db.exec("ALTER TABLE contact_groups ADD COLUMN created_by TEXT DEFAULT ''") } catch (e) { }

  // Migration: remove UNIQUE constraint from contact_groups.name (allow same name for different users)
  try {
    // Check if the UNIQUE index still exists
    const idxInfo = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='contact_groups'").get()
    if (idxInfo && idxInfo.sql && idxInfo.sql.includes('UNIQUE')) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS contact_groups_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_by TEXT DEFAULT '',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      db.exec(`INSERT INTO contact_groups_new (id, name, created_by, created_at) SELECT id, name, COALESCE(created_by,''), created_at FROM contact_groups`)
      db.exec(`DROP TABLE contact_groups`)
      db.exec(`ALTER TABLE contact_groups_new RENAME TO contact_groups`)
    }
  } catch (e) { console.log('contact_groups migration:', e.message) }

  // ─── Media Library ─────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS media (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_filename TEXT DEFAULT '',
      filename TEXT NOT NULL,
      filepath TEXT NOT NULL,
      mimetype TEXT DEFAULT 'image/webp',
      filesize INTEGER DEFAULT 0,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      group_id INTEGER DEFAULT NULL,
      alt TEXT DEFAULT '',
      status INTEGER DEFAULT 1,
      replaced_by INTEGER DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  db.exec(`
    CREATE TABLE IF NOT EXISTS media_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      is_system INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // Seed default media groups if empty
  const mgCount = db.prepare('SELECT COUNT(*) as c FROM media_groups').get()
  if (mgCount.c === 0) {
    const seedGroups = [
      { name: 'GI', slug: 'gi', sort_order: 1, is_system: 1 },
      { name: 'GL', slug: 'gl', sort_order: 2, is_system: 1 },
      { name: 'PPGI', slug: 'ppgi', sort_order: 3, is_system: 1 },
      { name: 'ROOFING', slug: 'roofing', sort_order: 4, is_system: 1 },
      { name: 'CRC', slug: 'crc', sort_order: 5, is_system: 1 }
    ]
    const ins = db.prepare('INSERT INTO media_groups (name, slug, sort_order, is_system) VALUES (?,?,?,?)')
    for (const g of seedGroups) ins.run(g.name, g.slug, g.sort_order, g.is_system)
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS product_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      media_id INTEGER DEFAULT NULL,
      image_url TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      is_main INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)

  // External API keys
  db.exec(`
    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL DEFAULT '',
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

  // Migration: add render_mode column to news (default 'direct' = v-html, 'iframe' = full isolation)
  try { db.exec("ALTER TABLE news ADD COLUMN render_mode TEXT DEFAULT 'direct'") } catch (e) { }

  // ── News Categories (article grouping) ──────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS news_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      name_en TEXT DEFAULT '',
      slug TEXT DEFAULT '',
      sort_order INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Migration: add category_id to news table
  try { db.exec('ALTER TABLE news ADD COLUMN category_id INTEGER DEFAULT NULL') } catch (e) { }
  // Seed default news categories if empty
  try {
    const ncCount = db.prepare('SELECT COUNT(*) as c FROM news_categories').get().c
    if (ncCount === 0) {
      db.prepare('INSERT INTO news_categories (name, name_en, slug, sort_order) VALUES (?,?,?,?)').run('产品介绍', 'Product Introduction', 'product-introduction', 1)
      db.prepare('INSERT INTO news_categories (name, name_en, slug, sort_order) VALUES (?,?,?,?)').run('案例展示', 'Cases', 'cases', 2)
      // Move all existing articles to "产品介绍" category
      const firstCat = db.prepare('SELECT id FROM news_categories WHERE sort_order = 1 LIMIT 1').get()
      if (firstCat) {
        db.prepare('UPDATE news SET category_id = ? WHERE category_id IS NULL').run(firstCat.id)
      }
    }
  } catch (e) { }

  // Migration: regenerate news slugs that contain timestamp suffixes (13-digit numbers) with clean title+ID slugs
  try {
    const allNews = db.prepare('SELECT id, title, title_en, slug FROM news').all()
    const slugifyNews = (text, id) => {
      const base = text.toLowerCase()
        .replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '')
        .substring(0, 80)
      return `${base}-${id}`
    }
    const updateNewsSlug = db.prepare('UPDATE news SET slug = ? WHERE id = ?')
    for (const n of allNews) {
      // Detect timestamp-style slug: ends with 13-digit number
      const hasTimestamp = /\-\d{13}$/.test(n.slug || '')
      if (hasTimestamp || !n.slug) {
        const newSlug = slugifyNews(n.title_en || n.title || `article-${n.id}`, n.id)
        updateNewsSlug.run(newSlug, n.id)
      }
    }
  } catch (e) { }

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

  // ── Background Translation Jobs ──────────────────────────────────────────────
  // Stores each background translation job (survives browser close / server restart)
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      status TEXT DEFAULT 'pending',
      target_lang TEXT NOT NULL DEFAULT '',
      pages TEXT DEFAULT '[]',
      total_items INTEGER DEFAULT 0,
      done_items INTEGER DEFAULT 0,
      ok_items INTEGER DEFAULT 0,
      error_items INTEGER DEFAULT 0,
      failed_items TEXT DEFAULT '[]',
      is_retry INTEGER DEFAULT 0,
      auto_retried INTEGER DEFAULT 0,
      concurrency INTEGER DEFAULT 1,
      pending_items TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME
    )
  `)
  // Per-log-line table for translation jobs (each addLog call = one row)
  db.exec(`
    CREATE TABLE IF NOT EXISTS translation_job_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      level TEXT DEFAULT 'info',
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `)
  // Index for fast per-job log retrieval
  try { db.exec('CREATE INDEX IF NOT EXISTS idx_tjl_job_id ON translation_job_logs(job_id)') } catch (e) { }
  // Migrate: add explicit items column for retry jobs that target specific items
  try { db.exec("ALTER TABLE translation_jobs ADD COLUMN explicit_items TEXT DEFAULT '[]'") } catch (e) { }
  // Migrate: add concurrency and pending_items
  try { db.exec("ALTER TABLE translation_jobs ADD COLUMN concurrency INTEGER DEFAULT 1") } catch (e) { }
  try { db.exec("ALTER TABLE translation_jobs ADD COLUMN pending_items TEXT") } catch (e) { }

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

  // ── RAL Color Chart ────────────────────────────────────────────────────────
  db.exec(`
    CREATE TABLE IF NOT EXISTS ral_colors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      hex TEXT NOT NULL,
      name_zh TEXT NOT NULL,
      name_en TEXT NOT NULL
    )
  `)
  // Seed RAL colors (idempotent via INSERT OR IGNORE)
  const ralColors = [
    ['1000','#CCC58F','米绿色','Green Beige'],['1001','#D2B773','米色','Beige'],
    ['1002','#D8BE7C','沙黄色','Sand Yellow'],['1003','#E6AE18','信号黄','Signal Yellow'],
    ['1004','#E49B09','金黄色','Golden Yellow'],['1005','#CE8B00','蜜黄色','Honey Yellow'],
    ['1006','#D7A420','玉米黄','Maize Yellow'],['1007','#D8A40C','灰黄色','Daffodil Yellow'],
    ['1011','#BB8A3A','米褐色','Brown Beige'],['1012','#D6C44A','柠檬黄','Lemon Yellow'],
    ['1013','#E7E1CB','近于白色的浅','Oyster White'],['1014','#DEBF7E','象牙色','Ivory'],
    ['1015','#E4CEAB','亮象牙色','Light Ivory'],['1016','#D9D83D','硫磺色','Sulfur Yellow'],
    ['1017','#F4AC37','深黄色','Saffron Yellow'],['1018','#F6CE34','绿黄色','Zinc Yellow'],
    ['1019','#B5956C','米灰色','Grey Beige'],['1020','#A59246','橄榄黄','Olive Yellow'],
    ['1021','#F2AC00','油菜黄','Rape Yellow'],['1023','#F5C400','交通黄','Traffic Yellow'],
    ['1024','#C59A3A','赭黄色','Ochre Yellow'],['1027','#B3850D','咖喱色','Curry'],
    ['1028','#FF9B00','浅橙黄','Melon Yellow'],['1032','#E5A800','金雀花黄','Broom Yellow'],
    ['1033','#FF9900','大丽花黄','Dahlia Yellow'],['1034','#F2AC63','粉黄色','Pastel Yellow'],
    ['2000','#E97000','黄橙色','Yellow Orange'],['2001','#C64A3C','橘红','Red Orange'],
    ['2002','#C04433','朱红','Vermillion'],['2003','#F47524','淡橙','Pastel Orange'],
    ['2004','#F24E00','纯橙','Pure Orange'],['2008','#F37135','浅红橙','Bright Red Orange'],
    ['2009','#E85F00','交通橙','Traffic Orange'],['2010','#D46000','信号橙','Signal Orange'],
    ['2011','#EB6E10','深橙色','Deep Orange'],['2012','#D9613E','鲑鱼橙','Salmon Orange'],
    ['3000','#AB2B2B','火焰红','Flame Red'],['3001','#9B2828','信号红','Signal Red'],
    ['3002','#952D2D','胭脂红','Carmine Red'],['3003','#7B2033','宝石红','Ruby Red'],
    ['3004','#6E2034','紫红色','Purple Red'],['3005','#57192C','葡萄酒红','Wine Red'],
    ['3007','#3E1A1A','黑红','Black Red'],['3009','#6B2525','氧化红','Oxide Red'],
    ['3011','#7E2828','棕红色','Brown Red'],['3012','#CB8D76','米红色','Beige Red'],
    ['3013','#972826','番茄红','Tomato Red'],['3014','#CB7575','古粉红色','Antique Pink'],
    ['3015','#D8A5A5','淡粉红色','Light Pink'],['3016','#AD4A39','珊瑚红色','Coral Red'],
    ['3017','#CA5C69','玫瑰色','Rose'],['3018','#C33A4D','草莓红','Strawberry Red'],
    ['3020','#C01B1B','交通红','Traffic Red'],['3022','#C66558','鲑鱼粉红色','Salmon Pink'],
    ['3027','#B2234F','悬钩子红色','Raspberry Red'],['3031','#A3282E','戈亚红色','Orient Red'],
    ['4001','#886088','丁香红','Red Lilac'],['4002','#8A3044','紫红色','Red Violet'],
    ['4003','#C16082','石南紫','Heather Violet'],['4004','#6C2345','酒红紫','Claret Violet'],
    ['4005','#7A6896','丁香蓝','Blue Lilac'],['4006','#8A2472','交通紫','Traffic Purple'],
    ['4007','#412040','紫红蓝色','Purple Violet'],['4008','#7A3B7A','信号紫罗兰','Signal Violet'],
    ['4009','#9B8898','崧蓝紫色','Pastel Violet'],['5000','#2D4D7A','紫蓝色','Violet Blue'],
    ['5001','#1A5270','蓝绿色','Green Blue'],['5002','#1A3365','群青蓝','Ultramarine Blue'],
    ['5003','#1C3A5E','蓝宝石蓝','Sapphire Blue'],['5004','#151E28','蓝黑色','Black Blue'],
    ['5005','#1A4789','信号蓝','Signal Blue'],['5007','#3A6496','亮蓝色','Brilliant Blue'],
    ['5008','#324456','灰蓝色','Grey Blue'],['5009','#2A5E8C','天青蓝','Azure Blue'],
    ['5010','#1A3D7A','龙胆蓝色','Gentian Blue'],['5011','#1C2E40','钢蓝色','Steel Blue'],
    ['5012','#3D7AB5','淡蓝色','Light Blue'],['5013','#1B2D60','钴蓝色','Cobalt Blue'],
    ['5014','#637391','鸽蓝色','Pigeon Blue'],['5015','#2574A9','天蓝色','Sky Blue'],
    ['5017','#0E4FA0','交通蓝','Traffic Blue'],['5018','#2A898A','绿松石蓝','Turquoise Blue'],
    ['5019','#1A5C8A','卡布里蓝色','Capri Blue'],['5020','#1A3B50','海蓝色','Ocean Blue'],
    ['5021','#1A7C7A','不来梅蓝色','Water Blue'],['5022','#1A2050','夜蓝色','Night Blue'],
    ['5023','#4A6896','冷蓝色','Distant Blue'],['5024','#5A9AB5','崧蓝蓝色','Pastel Blue'],
    ['6000','#358069','铜锈绿色','Patina Green'],['6001','#286843','翡翠绿色','Emerald Green'],
    ['6002','#336A27','叶绿色','Leaf Green'],['6003','#5A5A2A','橄榄绿','Olive Green'],
    ['6004','#1A5948','蓝绿色','Blue Green'],['6005','#1A4D26','苔藓绿','Moss Green'],
    ['6006','#3C3C25','橄榄灰绿','Grey Olive'],['6007','#273823','瓶绿','Bottle Green'],
    ['6008','#3A3323','褐绿','Brown Green'],['6009','#243A28','冷杉绿','Fir Green'],
    ['6010','#3B7443','草绿色','Grass Green'],['6011','#7A8E59','淡橄榄绿','Reseda Green'],
    ['6012','#303D33','墨绿色','Black Green'],['6013','#8B8564','芦苇绿','Reed Green'],
    ['6014','#4E4B35','橄榄黄','Yellow Olive'],['6015','#3F3E2B','黑齐墩果色','Black Olive'],
    ['6016','#1A7A60','绿松石绿色','Turquoise Green'],['6017','#4E8A3F','五月绿','May Green'],
    ['6018','#64A23D','黄绿色','Yellow Green'],['6019','#BCE4C0','崧蓝绿色','Pastel Green'],
    ['6020','#2E4320','铭绿色','Chrome Green'],['6021','#8DAF75','浅绿色','Pale Green'],
    ['6022','#3E3A28','橄榄土褐色','Olive Drab'],['6024','#1A9645','交通绿','Traffic Green'],
    ['6025','#537840','蕨绿色','Fern Green'],['6026','#1A6B56','蛋白石绿色','Opal Green'],
    ['6027','#79C6B5','浅绿色','Light Green'],['6028','#2B5546','松绿色','Pine Green'],
    ['6029','#1A8042','薄荷绿','Mint Green'],['6032','#1A9B50','信号绿','Signal Green'],
    ['6033','#4A9E99','薄荷绿蓝色','Mint Turquoise'],['6034','#90C8BF','崧蓝绿松石','Pastel Turquoise'],
    ['7000','#7F8C96','松鼠灰','Squirrel Grey'],['7001','#8C9BB0','银灰色','Silver Grey'],
    ['7002','#8A8668','橄榄灰绿色','Olive Grey'],['7003','#7A7E6A','苔藓灰','Moss Grey'],
    ['7004','#969696','信号灰','Signal Grey'],['7005','#6D7066','鼠灰色','Mouse Grey'],
    ['7006','#766E60','米灰色','Beige Grey'],['7008','#7A6E49','土黄灰色','Khaki Grey'],
    ['7009','#5D6360','绿灰色','Green Grey'],['7010','#525C57','油布灰','Tarpaulin Grey'],
    ['7011','#4E5660','铁灰色','Iron Grey'],['7012','#4D5A5E','玄武石灰','Basalt Grey'],
    ['7013','#5A5248','褐灰色','Brown Grey'],['7015','#4F5660','浅橄榄灰','Slate Grey'],
    ['7016','#383D42','煤灰','Anthracite Grey'],['7021','#2A2E33','黑灰','Black Grey'],
    ['7022','#484843','暗灰','Umbra Grey'],['7023','#7B7D78','混凝土灰','Concrete Grey'],
    ['7024','#474B4E','石墨灰','Graphite Grey'],['7026','#3A4248','花岗灰','Granite Grey'],
    ['7030','#919082','石灰色','Stone Grey'],['7031','#5A6872','蓝灰色','Blue Grey'],
    ['7032','#B5B0A0','卵石灰','Pebble Grey'],['7033','#7E8A80','水泥灰','Cement Grey'],
    ['7034','#8F8A6F','黄灰色','Yellow Grey'],['7035','#CBCBCB','浅灰色','Light Grey'],
    ['7036','#938E8C','铂灰色','Platinum Grey'],['7037','#7B7B7B','土灰色','Dusty Grey'],
    ['7038','#B2B2A2','玛瑙灰','Agate Grey'],['7039','#6A6863','石英灰','Quartz Grey'],
    ['7040','#9AA0A8','窗灰色','Window Grey'],['7042','#8F9696','交通灰A','Traffic Grey A'],
    ['7043','#4E5452','交通灰B','Traffic Grey B'],['7044','#B4AFA6','深铭灰色','Silk Grey'],
    ['7045','#909095','电视灰1','Telegrey 1'],['7046','#828590','电视灰2','Telegrey 2'],
    ['7047','#CACACE','电视灰4','Telegrey 4'],['8000','#8A7040','绿褐色','Green Brown'],
    ['8001','#9A6A30','赭石棕色','Ochre Brown'],['8002','#7A4A3A','信号棕','Signal Brown'],
    ['8003','#8A5030','陶土棕色','Clay Brown'],['8004','#8A4830','铜棕色','Copper Brown'],
    ['8007','#7A4A28','鹿棕色','Fawn Brown'],['8008','#7A5530','橄榄棕色','Olive Brown'],
    ['8011','#5A3A1A','深棕','Nut Brown'],['8012','#6E3028','红棕色','Red Brown'],
    ['8014','#3E2A1A','乌贼棕','Sepia Brown'],['8015','#5A2E22','栗棕色','Chestnut Brown'],
    ['8016','#4A2018','桃花心木棕','Mahogany Brown'],['8017','#3E2018','巧克力棕','Chocolate Brown'],
    ['8019','#3E3028','灰棕色','Grey Brown'],['8022','#1A1018','黑棕色','Black Brown'],
    ['8023','#A05530','橘棕色','Orange Brown'],['8024','#8A6040','米棕色','Beige Brown'],
    ['8025','#7A5A40','浅棕色','Pale Brown'],['8028','#5A4030','土棕色','Terra Brown'],
    ['9001','#F4F1DC','米白色','Cream'],['9002','#E7EBDA','灰白色','Grey White'],
    ['9003','#F4F4F4','信号白','Signal White'],['9004','#2A2A2A','信号黑','Signal Black'],
    ['9005','#0A0A0A','碳黑色','Jet Black'],['9006','#A5A5A5','白铝色','White Aluminium'],
    ['9007','#8A8A8A','灰铝色','Grey Aluminium'],['9010','#FFFFFF','纯白色','Pure White'],
    ['9011','#1A1A1A','石墨黑','Graphite Black'],['9016','#F6F6F6','交通白','Traffic White'],
    ['9017','#1E1E1E','交通黑','Traffic Black'],['9018','#D8DDD3','纸莎草白','Papyrus White'],
    ['9022','#9A9A9A','珍珠浅灰','Pearl Light Grey'],['9023','#797979','珍珠暗灰','Pearl Dark Grey']
  ]
  const insertColor = db.prepare(`INSERT OR IGNORE INTO ral_colors (code, hex, name_zh, name_en) VALUES (?,?,?,?)`)
  const insertAllColors = db.transaction(() => {
    for (const [code, hex, name_zh, name_en] of ralColors) {
      insertColor.run(code, hex, name_zh, name_en)
    }
  })
  insertAllColors()

  // ── One-time migration: strip trailing -id from product and news slugs ──────
  // Runs safely every startup (idempotent: only changes slugs that still end with -id)
  try {
    // Products: slug like 'galvanized-steel-coil-223' → 'galvanized-steel-coil'
    const products = db.prepare("SELECT id, slug FROM products WHERE slug IS NOT NULL").all()
    for (const p of products) {
      const suffix = `-${p.id}`
      if (p.slug.endsWith(suffix)) {
        const newSlug = p.slug.slice(0, -suffix.length)
        if (newSlug.length > 0) {
          // Check uniqueness — if clash, keep the original slug
          const clash = db.prepare("SELECT id FROM products WHERE slug = ? AND id != ?").get(newSlug, p.id)
          if (!clash) db.prepare("UPDATE products SET slug = ? WHERE id = ?").run(newSlug, p.id)
        }
      }
    }
    // News: slug like 'gi-coil-introduction-45' → 'gi-coil-introduction'
    const articles = db.prepare("SELECT id, slug FROM news WHERE slug IS NOT NULL").all()
    for (const a of articles) {
      const suffix = `-${a.id}`
      if (a.slug.endsWith(suffix)) {
        const newSlug = a.slug.slice(0, -suffix.length)
        if (newSlug.length > 0) {
          const clash = db.prepare("SELECT id FROM news WHERE slug = ? AND id != ?").get(newSlug, a.id)
          if (!clash) db.prepare("UPDATE news SET slug = ? WHERE id = ?").run(newSlug, a.id)
        }
      }
    }
    console.log('[db] Slug migration complete (ID suffixes stripped from product/news slugs)')
  } catch (e) {
    console.warn('[db] Slug migration skipped:', e.message)
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
  return { lastInsertRowid: info.lastInsertRowid, changes: info.changes }
}

// saveDb is a no-op for better-sqlite3 (writes are direct to file)
function saveDb() { }

export { initDb, getAll, getOne, run, saveDb }
export default { initDb, getAll, getOne, run, saveDb }
