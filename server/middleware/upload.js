import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import fs from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadDir = join(__dirname, '..', '..', 'uploads')

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Lazily load sharp
let sharp = null
try {
  const m = await import('sharp')
  sharp = m.default
  console.log('✓ sharp image compression available')
} catch {
  console.warn('⚠ sharp not available — images saved uncompressed')
}

// DISK storage — always sets file.filename so all routes work correctly
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = extname(file.originalname).toLowerCase() || '.jpg'
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`
    cb(null, name)
  }
})

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

// Attachment upload — accepts ALL file types (for email attachments)
export const attachmentUpload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 } // 25MB per file
})

/**
 * Optional post-processing: compress a single req.file with sharp.
 * Works ONLY for single-file uploads (/api/upload route).
 * For multi-file (upload.fields), compression is skipped — files land on disk immediately.
 */
export async function compressImage(req, res, next) {
  if (!req.file || !sharp) return next()

  const ext = extname(req.file.originalname).toLowerCase()
  // Only attempt compression for standard raster images
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff']
  if (!imageExts.includes(ext)) return next()

  try {
    const originalPath = req.file.path
    const isWebp = req.file.filename.toLowerCase().endsWith('.webp')
    const newFilename = req.file.filename.replace(/\.[^.]+$/, '.webp')
    const newPath = isWebp ? `${originalPath}.tmp` : join(uploadDir, newFilename)

    await sharp(originalPath)
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75, effort: 5 })
      .toFile(newPath)

    if (isWebp) {
      fs.renameSync(newPath, originalPath)
    } else {
      // Remove original, replace with webp
      fs.unlinkSync(originalPath)
      req.file.filename = newFilename
      req.file.path = newPath
      req.file.mimetype = 'image/webp'
    }
  } catch (err) {
    // If sharp fails leave the original disk file as-is
    console.warn('sharp compress failed, using original:', err.message)
  }

  next()
}

export default upload
