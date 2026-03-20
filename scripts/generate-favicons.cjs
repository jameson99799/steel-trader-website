/**
 * Generate favicons from existing logo
 * Run on server: node scripts/generate-favicons.cjs
 * 
 * Reads /uploads/logo.png and generates:
 *   - /public/favicon-192.png (192x192, for Google)
 *   - /public/apple-touch-icon.png (180x180, for Apple)
 *   - /public/favicon-32.png (32x32, browser tab)
 *   - /public/favicon-16.png (16x16, browser tab)
 */
const sharp = require('sharp')
const path = require('path')
const fs = require('fs')

const ROOT = path.resolve(__dirname, '..')
const UPLOADS = path.join(ROOT, 'uploads')
const PUBLIC = path.join(ROOT, 'public')

// Find logo file  
const logoFile = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.webp']
  .map(f => path.join(UPLOADS, f))
  .find(f => fs.existsSync(f))

if (!logoFile) {
  console.error('❌ No logo found in uploads/ directory. Please upload a logo first.')
  process.exit(1)
}

if (!fs.existsSync(PUBLIC)) fs.mkdirSync(PUBLIC, { recursive: true })

const sizes = [
  { name: 'favicon-192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
]

async function generate() {
  console.log(`📷 Source logo: ${logoFile}`)
  const meta = await sharp(logoFile).metadata()
  console.log(`   Original size: ${meta.width}x${meta.height}`)

  for (const { name, size } of sizes) {
    const outPath = path.join(PUBLIC, name)
    await sharp(logoFile)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toFile(outPath)
    console.log(`  ✅ ${name} (${size}x${size})`)
  }

  console.log('\n✅ All favicons generated! Update index.html to use them.')
  console.log('   <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png">')
  console.log('   <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">')
  console.log('   <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png">')
  console.log('   <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">')
}

generate().catch(e => { console.error('❌ Error:', e.message); process.exit(1) })
