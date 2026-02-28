import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Always resolve uploads relative to project root (server's parent dir)
const uploadDir = join(__dirname, '..', '..', 'uploads')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Lazily load sharp — if it's not available on this server, fall back gracefully
let sharp = null
try {
  const sharpModule = await import('sharp')
  sharp = sharpModule.default
  console.log('✓ sharp image compression available')
} catch {
  console.warn('⚠ sharp not available - images will be saved uncompressed')
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
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB
})

/**
 * Compress image after multer upload
 * Falls back gracefully if sharp is unavailable
 */
export async function compressImage(req, res, next) {
  if (!req.file) return next()

  const ext = extname(req.file.originalname).toLowerCase()
  const skipTypes = ['.svg', '.gif', '.ico']
  const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}`

  // Skip compression for special formats
  if (skipTypes.includes(ext)) {
    const filename = uniqueName + ext
    const outPath = join(uploadDir, filename)
    try {
      fs.writeFileSync(outPath, req.file.buffer)
      req.file.filename = filename
      req.file.path = outPath
    } catch (err) {
      console.error('Upload write error:', err)
      return res.status(500).json({ error: `文件保存失败: ${err.message}` })
    }
    return next()
  }

  // Try sharp compression first
  if (sharp) {
    try {
      const outFilename = uniqueName + '.webp'
      const outPath = join(uploadDir, outFilename)

      await sharp(req.file.buffer)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82, effort: 4 })
        .toFile(outPath)

      req.file.filename = outFilename
      req.file.path = outPath
      req.file.mimetype = 'image/webp'
      return next()
    } catch (err) {
      console.warn('sharp compress failed, saving original:', err.message)
      // Fall through to save original
    }
  }

  // Fallback: save original buffer uncompressed
  try {
    const filename = uniqueName + (ext || '.jpg')
    const outPath = join(uploadDir, filename)
    fs.writeFileSync(outPath, req.file.buffer)
    req.file.filename = filename
    req.file.path = outPath
    next()
  } catch (err) {
    console.error('Upload fallback write error:', err)
    return res.status(500).json({ error: `文件保存失败: ${err.message}` })
  }
}

export default upload
