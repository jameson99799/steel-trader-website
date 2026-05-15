import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getOne } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', '..', 'uploads')

export async function applyWatermark(originalFilepath) {
  try {
    let sharp
    try { 
      const m = await import('sharp')
      sharp = m.default 
    } catch {
      console.warn('sharp not installed, skipping watermark')
      return originalFilepath
    }

    const settings = getOne('SELECT * FROM watermark_settings LIMIT 1')
    if (!settings || !settings.watermark_url) {
      return originalFilepath
    }

    const originalAbsPath = path.join(uploadDir, path.basename(originalFilepath))
    if (!fs.existsSync(originalAbsPath)) return originalFilepath

    const watermarkAbsPath = path.join(uploadDir, path.basename(settings.watermark_url))
    if (!fs.existsSync(watermarkAbsPath)) return originalFilepath

    // Skip non-images
    const ext = path.extname(originalAbsPath).toLowerCase()
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return originalFilepath

    const originalMeta = await sharp(originalAbsPath).metadata()
    if (!originalMeta.width || !originalMeta.height) return originalFilepath

    const wmMeta = await sharp(watermarkAbsPath).metadata()
    if (!wmMeta.width || !wmMeta.height) return originalFilepath

    // Calculate watermark scale relative to original image width
    // scale is a percentage (e.g., 0.15 for 15%)
    const scaleFactor = settings.scale || 0.15
    const targetWmWidth = Math.round(originalMeta.width * scaleFactor)
    const resizedWmBuffer = await sharp(watermarkAbsPath)
      .resize({ width: targetWmWidth, withoutEnlargement: true })
      .toBuffer()

    const resizedWmMeta = await sharp(resizedWmBuffer).metadata()
    
    // Determine position
    let gravity = 'southeast'
    switch(settings.position) {
      case 'center': gravity = 'center'; break;
      case 'top-left': gravity = 'northwest'; break;
      case 'top-right': gravity = 'northeast'; break;
      case 'bottom-left': gravity = 'southwest'; break;
      case 'bottom-right': gravity = 'southeast'; break;
    }

    // Apply composite
    // Generate new filename
    const nameWithoutExt = path.basename(originalFilepath, ext)
    const newFilename = `${nameWithoutExt}_wm_${Date.now()}${ext}`
    const newAbsPath = path.join(uploadDir, newFilename)

    await sharp(originalAbsPath)
      .composite([{
        input: resizedWmBuffer,
        gravity: gravity,
        blend: 'over'
      }])
      .toFile(newAbsPath)

    return `/uploads/${newFilename}`
  } catch (e) {
    console.error('Watermark Error:', e)
    return originalFilepath
  }
}
