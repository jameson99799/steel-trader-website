import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import util from 'util'

const execAsync = util.promisify(exec)

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const VIDEO_EXTS = new Set(['.mp4', '.webm'])

let ffmpegPath = null

async function getFfmpegPath() {
  if (ffmpegPath) return ffmpegPath
  try {
    const module = await import('@ffmpeg-installer/ffmpeg')
    ffmpegPath = module.default?.path || module.path || 'ffmpeg'
  } catch {
    ffmpegPath = 'ffmpeg'
  }
  return ffmpegPath
}

function extOf(filePath) {
  return path.extname(filePath).toLowerCase()
}

function markOptimized(filePath) {
  try {
    fs.writeFileSync(`${filePath}.optimized`, new Date().toISOString())
  } catch {}
}

export function isOptimized(filePath) {
  return fs.existsSync(`${filePath}.optimized`)
}

export function isImagePath(filePath) {
  return IMAGE_EXTS.has(extOf(filePath))
}

export function isVideoPath(filePath) {
  return VIDEO_EXTS.has(extOf(filePath))
}

export function mimeTypeFor(filePath) {
  const ext = extOf(filePath)
  if (ext === '.mp4') return 'video/mp4'
  if (ext === '.webm') return 'video/webm'
  if (ext === '.png') return 'image/png'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.svg') return 'image/svg+xml'
  if (ext === '.gif') return 'image/gif'
  if (ext === '.ico') return 'image/x-icon'
  if (ext === '.bmp') return 'image/bmp'
  return 'image/jpeg'
}

export async function compressImageInPlace(filePath, { maxWidth = 1920, quality = 80 } = {}) {
  const ext = extOf(filePath)
  if (!IMAGE_EXTS.has(ext)) return null

  let sharp
  try {
    sharp = (await import('sharp')).default
  } catch {
    return null
  }

  const before = fs.statSync(filePath).size
  const tempPath = `${filePath}.optimize.tmp`

  try {
    let pipeline = sharp(filePath)
      .rotate()
      .resize({ width: maxWidth, height: maxWidth, fit: 'inside', withoutEnlargement: true })

    if (ext === '.jpg' || ext === '.jpeg') {
      pipeline = pipeline.jpeg({ quality, mozjpeg: true })
    } else if (ext === '.png') {
      pipeline = pipeline.png({ compressionLevel: 9, quality })
    } else {
      pipeline = pipeline.webp({ quality, effort: 4 })
    }

    const meta = await pipeline.toFile(tempPath)
    const after = fs.statSync(tempPath).size

    if (after >= before) {
      fs.unlinkSync(tempPath)
      markOptimized(filePath)
      return { size: before, width: meta.width, height: meta.height, optimized: false }
    }

    fs.renameSync(tempPath, filePath)
    markOptimized(filePath)
    return { size: after, width: meta.width, height: meta.height, optimized: true }
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
    } catch {}
    throw error
  }
}

export async function compressVideoInPlace(filePath, { maxWidth = 1280, maxHeight = 1280, crf = 26 } = {}) {
  const ext = extOf(filePath)
  if (!VIDEO_EXTS.has(ext)) return null

  const before = fs.statSync(filePath).size
  if (before < 1024 * 1024) {
    return { size: before, width: 0, height: 0, optimized: false }
  }

  const ffmpeg = await getFfmpegPath()
  const tempPath = `${filePath}.optimize.tmp${ext}`

  let width = 0
  let height = 0
  try {
    const probe = await execAsync(`"${ffmpeg}" -hide_banner -i "${filePath}"`, {
      maxBuffer: 4 * 1024 * 1024
    }).catch(error => error)
    const stderr = String(probe.stderr || '')
    const match = stderr.match(/Video:.*?(\d{2,5})x(\d{2,5})/)
    if (match) {
      width = Number(match[1])
      height = Number(match[2])
    }
  } catch {}

  let scale = ''
  let outWidth = width
  let outHeight = height
  if (width > maxWidth) {
    outWidth = maxWidth
    outHeight = Math.round((height * maxWidth) / width / 2) * 2
    scale = `-vf "scale=${outWidth}:-2" `
  } else if (height > maxHeight) {
    outHeight = maxHeight
    outWidth = Math.round((width * maxHeight) / height / 2) * 2
    scale = `-vf "scale=-2:${outHeight}" `
  }

  const codecArgs = ext === '.webm'
    ? `-c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -c:a libopus -b:a 96k`
    : `-c:v libx264 -preset fast -crf ${crf} -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart`

  try {
    await execAsync(
      `"${ffmpeg}" -y -hide_banner -loglevel error -i "${filePath}" ${scale}${codecArgs} "${tempPath}"`,
      { maxBuffer: 8 * 1024 * 1024 }
    )

    const after = fs.statSync(tempPath).size
    if (after >= before) {
      fs.unlinkSync(tempPath)
      markOptimized(filePath)
      return { size: before, width, height, optimized: false }
    }

    fs.renameSync(tempPath, filePath)
    markOptimized(filePath)
    return { size: after, width: outWidth, height: outHeight, optimized: true }
  } catch (error) {
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath)
    } catch {}
    throw error
  }
}

export async function compressUpload(filePath) {
  if (isVideoPath(filePath)) return compressVideoInPlace(filePath)
  if (isImagePath(filePath)) return compressImageInPlace(filePath)
  return null
}
