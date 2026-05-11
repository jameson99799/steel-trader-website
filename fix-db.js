import { run } from './server/db.js'

async function fix() {
  const exts = ['.jpg', '.jpeg', '.png', '.bmp']
  const tables = [
    { table: 'products', columns: ['detail_content', 'images'] },
    { table: 'news', columns: ['content', 'cover_image'] },
    { table: 'categories', columns: ['image'] },
    { table: 'hero_slides', columns: ['image_url'] },
    { table: 'company', columns: ['about_image', 'logo', 'favicon', 'whatsapp_qr', 'wechat_qr'] },
    { table: 'banners', columns: ['image'] },
    { table: 'seo_settings', columns: ['og_image'] }
  ]
  
  let changes = 0
  for (const t of tables) {
    for (const col of t.columns) {
      for (const ext of exts) {
        try {
          const res = run(`UPDATE ${t.table} SET ${col}=REPLACE(${col}, '${ext}', '.webp') WHERE ${col} LIKE '%${ext}%'`)
          if (res.changes) changes += res.changes
        } catch (e) {
          // ignore missing tables/columns
        }
      }
    }
  }
  console.log(`✅ Fixed ${changes} orphaned image URLs in the database.`)
}

fix()
