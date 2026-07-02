const { getOne } = require('./server/db.js');
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getOne } from './server/db.js'
import { exec } from 'child_process'
import util from 'util'

// Try importing ffmpeg from @ffmpeg-installer/ffmpeg
let ffmpegPath = 'ffmpeg' // Fallback to system ffmpeg
try {
  import('@ffmpeg-installer/ffmpeg').then(m => {
    if (m && m.default && m.default.path) {
      ffmpegPath = m.default.path
    } else if (m && m.path) {
      ffmpegPath = m.path
    }
  }).catch(() => {})
} catch(e) {}

const execAsync = util.promisify(exec)

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

    const ext = path.extname(originalAbsPath).toLowerCase()
    const isVideo = ['.mp4', '.webm'].includes(ext)
    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext)
    
    if (!isImage && !isVideo) return originalFilepath

    let inputWidth = 0
    let inputHeight = 0

    if (isImage) {
      const originalMeta = await sharp(originalAbsPath).metadata()
      inputWidth = originalMeta.width
      inputHeight = originalMeta.height
    } else {
      try {
        const { stderr } = await execAsync(`"${ffmpegPath}" -i "${originalAbsPath}"`).catch(e => e)
        const match = stderr.match(/Video:.*?, (\d+)x(\d+)/)
        if (match) {
          inputWidth = parseInt(match[1])
          inputHeight = parseInt(match[2])
          const rotMatch = stderr.match(/rotate\s*:\s*(\d+)/i)
          if (rotMatch) {
            const rot = parseInt(rotMatch[1])
            if (rot === 90 || rot === 270) {
                const tmp = inputWidth; inputWidth = inputHeight; inputHeight = tmp;
            }
          }
        } else {
          inputWidth = 1920; inputHeight = 1080;
        }
      } catch(e) {
        inputWidth = 1920; inputHeight = 1080;
      }
    }

    if (!inputWidth || !inputHeight) return originalFilepath

    let compositeBuffer = null
    let compositeWidth = 0
    let compositeHeight = 0
    let compositeImagePath = null // used for ffmpeg overlay

    if (settings.type === 'image') {
      if (!settings.watermark_url) return originalFilepath
      const watermarkAbsPath = path.join(uploadDir, path.basename(settings.watermark_url))
      if (!fs.existsSync(watermarkAbsPath)) return originalFilepath
      
      const scaleFactor = settings.scale || 0.15
      compositeWidth = Math.round(inputWidth * scaleFactor)
      
      compositeBuffer = await sharp(watermarkAbsPath)
        .resize({ width: compositeWidth, withoutEnlargement: true })
        .toBuffer()
      
      const resizedWmMeta = await sharp(compositeBuffer).metadata()
      compositeHeight = resizedWmMeta.height
      
      if (isVideo) {
        compositeImagePath = path.join(uploadDir, `wm_tmp_${Date.now()}.png`)
        await sharp(compositeBuffer).toFile(compositeImagePath)
      }
      
    } else if (settings.type === 'text') {
      if (!settings.text_content) return originalFilepath
      
      const scaleFactor = settings.font_size || 0.05
      const fontSizePx = Math.round(inputWidth * scaleFactor)
      
      compositeWidth = Math.round(settings.text_content.length * fontSizePx * 1.5) // Added 1.5x padding to prevent SVG cropping
      compositeHeight = Math.round(fontSizePx * 2) 
      
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
            .title { fill: ${color}; font-size: ${fontSizePx}px; font-family: ${font}; font-weight: bold; stroke: ${stroke}; stroke-width: ${strokeWidthPx}px; opacity: ${opacity}; paint-order: stroke fill; stroke-linejoin: round; }
          </style>
          <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" class="title">${text}</text>
        </svg>
      `
      compositeBuffer = Buffer.from(svgImage)
      
      if (isVideo) {
        compositeImagePath = path.join(uploadDir, `wm_tmp_${Date.now()}.png`)
        await sharp(compositeBuffer).png().toFile(compositeImagePath)
      }
    }

    if (!compositeBuffer && !compositeImagePath) return originalFilepath

    const posX = settings.pos_x !== undefined ? settings.pos_x : 0.9
    const posY = settings.pos_y !== undefined ? settings.pos_y : 0.9

    const nameWithoutExt = path.basename(originalFilepath, ext)
    const newFilename = `${nameWithoutExt}_wm_${Date.now()}${ext}`
    const newAbsPath = path.join(uploadDir, newFilename)

    if (isImage) {
        let left = Math.round(posX * inputWidth - compositeWidth / 2)
        let top = Math.round(posY * inputHeight - compositeHeight / 2)
        left = Math.max(0, Math.min(left, inputWidth - compositeWidth))
        top = Math.max(0, Math.min(top, inputHeight - compositeHeight))

        await sharp(originalAbsPath)
          .composite([{
            input: compositeBuffer,
            left: left,
            top: top,
            blend: 'over'
          }])
          .toFile(newAbsPath)

        return `/uploads/${newFilename}`
    } else if (isVideo) {
        try {
            // FFmpeg overlay command with dynamic safe bounds based on actual video size instead of 1920x1080 constant
            const overlayExpr = `overlay=x='max(0, min(main_w*${posX} - overlay_w/2, main_w-overlay_w))':y='max(0, min(main_h*${posY} - overlay_h/2, main_h-overlay_h))'`
            
            // Generate ffmpeg command
            const cmd = `"${ffmpegPath}" -y -i "${originalAbsPath}" -i "${compositeImagePath}" -filter_complex "${overlayExpr}" -c:a copy -c:v libx264 -preset fast -crf 23 -movflags +faststart "${newAbsPath}"`
            
            console.log('Running FFmpeg watermark task...')
            await execAsync(cmd)
            console.log('FFmpeg watermark success!')
            
            // cleanup temp image
            if (fs.existsSync(compositeImagePath)) fs.unlinkSync(compositeImagePath)
            return `/uploads/${newFilename}`
        } catch (execErr) {
            console.error('FFmpeg Watermark Error:', execErr)
            if (fs.existsSync(compositeImagePath)) fs.unlinkSync(compositeImagePath)
            return originalFilepath
        }
    }

  } catch (e) {
    console.error('Watermark Error:', e)
    return originalFilepath
  }
}

applyWatermark('/uploads/placeholder.png', 1).then(console.log)