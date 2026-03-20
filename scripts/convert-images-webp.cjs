#!/usr/bin/env node
/**
 * Batch convert existing jpg/png images in uploads/ to WebP.
 * Run on the server: node scripts/convert-images-webp.cjs
 * 
 * Requires: sharp (already installed)
 */
const fs = require('fs');
const path = require('path');

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error('❌ sharp not installed. Run: npm install sharp');
    process.exit(1);
  }

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    console.error('❌ uploads/ directory not found');
    process.exit(1);
  }

  const files = fs.readdirSync(uploadsDir);
  const imageExts = ['.jpg', '.jpeg', '.png', '.bmp'];
  const candidates = files.filter(f => {
    const ext = path.extname(f).toLowerCase();
    return imageExts.includes(ext);
  });

  console.log(`Found ${candidates.length} images to convert...`);
  let converted = 0, skipped = 0, failed = 0;

  for (const file of candidates) {
    const inputPath = path.join(uploadsDir, file);
    const webpName = file.replace(/\.[^.]+$/, '.webp');
    const outputPath = path.join(uploadsDir, webpName);

    // Skip if WebP already exists
    if (fs.existsSync(outputPath)) {
      skipped++;
      continue;
    }

    try {
      const stat = fs.statSync(inputPath);
      await sharp(inputPath)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toFile(outputPath);

      const newStat = fs.statSync(outputPath);
      const savedKB = ((stat.size - newStat.size) / 1024).toFixed(1);
      console.log(`  ✅ ${file} → ${webpName} (saved ${savedKB}KB)`);
      converted++;
    } catch (err) {
      console.log(`  ❌ ${file}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nDone! Converted: ${converted}, Skipped: ${skipped}, Failed: ${failed}`);
  
  if (converted > 0) {
    console.log(`\n⚠️ To update database references, run this SQL on your server:`);
    console.log(`   Replace .jpg/.png URLs with .webp in products.images, news.cover_image, etc.`);
    console.log(`   Example: UPDATE products SET images = REPLACE(images, '.jpg', '.webp') WHERE images LIKE '%.jpg%';`);
  }
}

main().catch(console.error);
