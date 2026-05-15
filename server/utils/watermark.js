import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getOne } from '../db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, '..', '..', 'uploads')

export async function applyWatermark(originalFilepath, templateId = null) {
  try {
    let sharp
    try { 
      const m = await import('sharp')
      sharp = m.default 
    } catch {
      console.warn('sharp not installed, skipping watermark')
      return originalFilepath
    }

    let query = 'SELECT * FROM watermark_templates WHERE is_default = 1 LIMIT 1'
    let params = []
    if (templateId) {
      query = 'SELECT * FROM watermark_templates WHERE id = ? LIMIT 1'
      params = [templateId]
    }
    
    const settings = getOne(query, params)
    if (!settings) {
      return originalFilepath
    }

    const originalAbsPath = path.join(uploadDir, path.basename(originalFilepath))
    if (!fs.existsSync(originalAbsPath)) return originalFilepath

    // Skip non-images
    const ext = path.extname(originalAbsPath).toLowerCase()
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) return originalFilepath

    const originalMeta = await sharp(originalAbsPath).metadata()
    if (!originalMeta.width || !originalMeta.height) return originalFilepath

    let compositeBuffer = null
    let compositeWidth = 0
    let compositeHeight = 0

    if (settings.type === 'image') {
      if (!settings.watermark_url) return originalFilepath
      const watermarkAbsPath = path.join(uploadDir, path.basename(settings.watermark_url))
      if (!fs.existsSync(watermarkAbsPath)) return originalFilepath
      
      const wmMeta = await sharp(watermarkAbsPath).metadata()
      if (!wmMeta.width || !wmMeta.height) return originalFilepath

      const scaleFactor = settings.scale || 0.15
      compositeWidth = Math.round(originalMeta.width * scaleFactor)
      compositeBuffer = await sharp(watermarkAbsPath)
        .resize({ width: compositeWidth, withoutEnlargement: true })
        .toBuffer()
      
      const resizedWmMeta = await sharp(compositeBuffer).metadata()
      compositeHeight = resizedWmMeta.height
    } else if (settings.type === 'text') {
      if (!settings.text_content) return originalFilepath
      
      const scaleFactor = settings.font_size || 0.05
      const fontSizePx = Math.round(originalMeta.width * scaleFactor)
      
      // We generate an SVG with text. The SVG needs to be big enough to hold the text.
      // A rough estimate: width = string length * fontSizePx, height = fontSizePx * 1.5
      compositeWidth = Math.round(settings.text_content.length * fontSizePx)
      compositeHeight = Math.round(fontSizePx * 1.5)
      
      const escapeHtml = (unsafe) => unsafe.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;")
      const text = escapeHtml(settings.text_content)
      const color = settings.text_color || '#000000'
      const stroke = settings.stroke_color || 'transparent'
      const opacity = settings.opacity || 1.0
      const font = settings.font_family || 'Arial'

      const strokeWidthRatio = settings.stroke_width !== undefined ? settings.stroke_width : 0.02
      const strokeWidthPx = stroke === 'transparent' ? 0 : Math.max(1, Math.round(fontSizePx * strokeWidthRatio))

      const svgImage = `
        <svg width="${compositeWidth}" height="${compositeHeight}" viewBox="0 0 ${compositeWidth} ${compositeHeight}">
          <style>
            .title { fill: ${color}; font-size: ${fontSizePx}px; font-family: ${font}; font-weight: bold; stroke: ${stroke}; stroke-width: ${strokeWidthPx}px; opacity: ${opacity}; }
          </style>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="title">${text}</text>
        </svg>
      `
      compositeBuffer = Buffer.from(svgImage)
    }

    if (!compositeBuffer) return originalFilepath

    // Determine position based on pos_x and pos_y (percentages 0.0 to 1.0)
    const posX = settings.pos_x !== undefined ? settings.pos_x : 0.9
    const posY = settings.pos_y !== undefined ? settings.pos_y : 0.9
    
    // Ensure we don't place it outside the image bounds
    let left = Math.round(posX * originalMeta.width - compositeWidth / 2)
    let top = Math.round(posY * originalMeta.height - compositeHeight / 2)
    
    left = Math.max(0, Math.min(left, originalMeta.width - compositeWidth))
    top = Math.max(0, Math.min(top, originalMeta.height - compositeHeight))

    // Apply composite
    const nameWithoutExt = path.basename(originalFilepath, ext)
    const newFilename = `${nameWithoutExt}_wm_${Date.now()}${ext}`
    const newAbsPath = path.join(uploadDir, newFilename)

    await sharp(originalAbsPath)
      .composite([{
        input: compositeBuffer,
        left: left,
        top: top,
        blend: 'over'
      }])
      .toFile(newAbsPath)

    return `/uploads/${newFilename}`
  } catch (e) {
    console.error('Watermark Error:', e)
    return originalFilepath
  }
}
