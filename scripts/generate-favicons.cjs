/**
 * Generate favicons from existing logo
 * Run on server: node scripts/generate-favicons.cjs
 * 
 * Tries multiple sources:
 *   1. uploads/logo.png (manual placement)
 *   2. Database company.logo field
 *   3. Download from live site
 * 
 * Generates into dist/ directory (where static files are served):
 *   - favicon-192.png (192x192, for Google)
 *   - apple-touch-icon.png (180x180, for Apple)
 *   - favicon-32.png (32x32, browser tab)
 *   - favicon-16.png (16x16, browser tab)
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')
const https = require('https')
const http = require('http')

const ROOT = path.resolve(__dirname, '..')
const DIST = path.join(ROOT, 'dist')
const UPLOADS = path.join(ROOT, 'uploads')

// Try to find logo from multiple sources
async function findLogo() {
  // 1. Check common filenames in uploads/
  const names = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp']
  for (const n of names) {
    const p = path.join(UPLOADS, n)
    if (fs.existsSync(p)) return p
  }

  // 2. Try reading from SQLite database
  try {
    const Database = require('better-sqlite3')
    const dbPath = path.join(ROOT, 'database.sqlite')
    if (fs.existsSync(dbPath)) {
      const db = new Database(dbPath, { readonly: true })
      const row = db.prepare("SELECT value FROM settings WHERE key = 'company'").get()
      db.close()
      if (row) {
        const company = JSON.parse(row.value)
        if (company.logo) {
          // Logo is like /uploads/xxxx.png
          const logoPath = path.join(ROOT, company.logo.replace(/^\//, ''))
          if (fs.existsSync(logoPath)) {
            console.log(`📦 Found logo in database: ${company.logo}`)
            return logoPath
          }
        }
      }
    }
  } catch (e) {
    console.log('   (database read skipped:', e.message, ')')
  }

  // 3. Download from live site
  console.log('⬇️  Downloading logo from https://www.sunseasteel.com/uploads/logo.png ...')
  const tmpPath = path.join(ROOT, 'tmp-logo.png')
  try {
    await downloadFile('https://www.sunseasteel.com/uploads/logo.png', tmpPath)
    if (fs.existsSync(tmpPath) && fs.statSync(tmpPath).size > 100) return tmpPath
  } catch (e) {
    console.log('   Download failed:', e.message)
  }

  return null
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    const file = fs.createWriteStream(dest)
    lib.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close()
        fs.unlinkSync(dest)
        return downloadFile(res.headers.location, dest).then(resolve).catch(reject)
      }
      res.pipe(file)
      file.on('finish', () => { file.close(); resolve() })
    }).on('error', (e) => { fs.unlinkSync(dest); reject(e) })
  })
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
    console.error('❌ No logo found. Please place logo.png in uploads/ directory.')
    process.exit(1)
  }

  console.log(`📷 Source logo: ${logoFile}`)
  const meta = await sharp(logoFile).metadata()
  console.log(`   Original size: ${meta.width}x${meta.height}`)

  // Generate into dist/ (where files are served)
  const outDir = fs.existsSync(DIST) ? DIST : path.join(ROOT, 'public')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

  for (const { name, size } of sizes) {
    const outPath = path.join(outDir, name)
    await sharp(logoFile)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outPath)
    console.log(`  ✅ ${name} (${size}x${size}) → ${outDir}/`)
  }

  // Cleanup temp file
  const tmpPath = path.join(ROOT, 'tmp-logo.png')
  if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath)

  console.log('\n✅ All favicons generated successfully!')
}

generate().catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
