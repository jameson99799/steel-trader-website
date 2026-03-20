/**
 * Generate favicons from existing logo
 * Run on server: node scripts/generate-favicons.cjs
 * 
 * Reads logo path from database, generates into dist/
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')

async function findLogo() {
  // Read from SQLite database
  try {
    const Database = require('better-sqlite3')
    const dbPath = path.join(ROOT, 'database.sqlite')
    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath, { readonly: true })
      const row = db.prepare("SELECT value FROM settings WHERE key = 'company'").get()
      db.close()
      if (row) {
        const company = JSON.parse(row.value)
        // Try favicon first (usually PNG), then logo
        for (const field of ['favicon', 'logo']) {
          if (company[field]) {
            const filePath = path.join(ROOT, company[field].replace(/^\//, ''))
            if (fs.existsSync(filePath)) {
              console.log(`📦 Found ${field}: ${company[field]}`)
              return filePath
            }
          }
        }
      }
    }
  } catch (e) {
    console.log('   Database read error:', e.message)
  }

  // Fallback: search uploads/ for any image
  const uploadsDir = path.join(ROOT, 'uploads')
  if (fs.existsSync(uploadsDir)) {
    const files = fs.readdirSync(uploadsDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    // Sort by modification time, newest first
    const sorted = files.map(f => ({ name: f, mtime: fs.statSync(path.join(uploadsDir, f)).mtimeMs }))
      .sort((a, b) => b.mtime - a.mtime)
    if (sorted.length) {
      const first = path.join(uploadsDir, sorted[0].name)
      console.log(`📁 Using newest upload: ${sorted[0].name}`)
      return first
    }
  }

  return null
}

const sizes = [
  { name: 'favicon-192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
]

async function generate() {
  const logoFile = await findLogo()
  if (!logoFile) {
    console.error('❌ No logo found. Please upload a logo in admin settings.')
    process.exit(1)
  }

  console.log(`📷 Source: ${logoFile}`)
  const meta = await sharp(logoFile).metadata()
  console.log(`   Format: ${meta.format}, Size: ${meta.width}x${meta.height}`)

  const outDir = fs.existsSync(DIST) ? DIST : path.join(ROOT, 'public')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  for (const { name, size } of sizes) {
    const outPath = path.join(outDir, name)
    await sharp(logoFile)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outPath)
    console.log(`  ✅ ${name} (${size}x${size})`)
  }

  console.log('\n✅ All favicons generated in ' + outDir)
}

generate().catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
