import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import fs from 'fs'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadDir = join(__dirname, '..', '..', 'uploads')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Use memory storage so we can process with sharp before writing
const storage = multer.memoryStorage()

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'image/x-icon', 'image/vnd.microsoft.icon', 'image/svg+xml', 'image/bmp'
  ]
  const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.svg', '.bmp']
  const ext = extname(file.originalname).toLowerCase()

  if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
    cb(null, true)
  } else {
    cb(new Error(`不支持的文件格式: ${file.mimetype}`), false)
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 20 * 1024 * 1024 } // Allow up to 20MB before compression
})

/**
 * Middleware: compress image after multer upload
 * - JPEG/PNG/WebP: resize to max 1920px wide, 80% quality → output as WebP for best compression
 * - SVG/GIF/ICO: skip compression, save as-is
 * - Adds file.filename and file.path to req.file so downstream code is compatible
 */
export async function compressImage(req, res, next) {
  if (!req.file) return next()

  const ext = extname(req.file.originalname).toLowerCase()
  const skipTypes = ['.svg', '.gif', '.ico']

  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`

  if (skipTypes.includes(ext)) {
    // Save unchanged
    const filename = uniqueName + ext
    const outPath = join(uploadDir, filename)
    fs.writeFileSync(outPath, req.file.buffer)
    req.file.filename = filename
    req.file.path = outPath
    return next()
  }

  try {
    // Use WebP for best compression+quality ratio; fallback JPEG for ICO-like formats
    const outFilename = uniqueName + '.webp'
    const outPath = join(uploadDir, outFilename)

    await sharp(req.file.buffer)
      .resize({
        width: 1920,
        height: 1920,
        fit: 'inside',       // Keep aspect ratio, don't upscale
        withoutEnlargement: true
      })
      .webp({ quality: 82, effort: 4 })  // High quality WebP
      .toFile(outPath)

    req.file.filename = outFilename
    req.file.path = outPath
    req.file.mimetype = 'image/webp'
  } catch (err) {
    // Fall back to saving original buffer if sharp fails (e.g. corrupt file)
    const filename = uniqueName + (ext || '.jpg')
    const outPath = join(uploadDir, filename)
    fs.writeFileSync(outPath, req.file.buffer)
    req.file.filename = filename
    req.file.path = outPath
  }

  next()
}

export default upload
