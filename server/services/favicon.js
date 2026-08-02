import { join, resolve, sep } from 'node:path'

export const FAVICON_SIZES = Object.freeze({
  'favicon.ico': 32,
  'favicon-32.png': 32,
  'favicon-16.png': 16,
  'favicon-192.png': 192,
  'apple-touch-icon.png': 180
})

export function createIcoFromPng(pngBuffer, size = 32) {
  if (!Buffer.isBuffer(pngBuffer) || !pngBuffer.length) throw new TypeError('ICO source must be a non-empty PNG buffer')
  if (!Number.isInteger(size) || size < 1 || size > 256) throw new RangeError('ICO size must be an integer from 1 to 256')

  const header = Buffer.alloc(22)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // icon type
  header.writeUInt16LE(1, 4) // one image
  header.writeUInt8(size === 256 ? 0 : size, 6)
  header.writeUInt8(size === 256 ? 0 : size, 7)
  header.writeUInt8(0, 8) // no palette
  header.writeUInt8(0, 9)
  header.writeUInt16LE(1, 10) // color planes
  header.writeUInt16LE(32, 12) // RGBA bit depth
  header.writeUInt32LE(pngBuffer.length, 14)
  header.writeUInt32LE(header.length, 18)
  return Buffer.concat([header, pngBuffer])
}

function configuredUploadPath(value, projectRoot) {
  const normalized = String(value || '').trim().replace(/\\/g, '/')
  if (!/^\/?uploads\//i.test(normalized)) return ''

  const uploadsRoot = resolve(projectRoot, 'uploads')
  const candidate = resolve(projectRoot, normalized.replace(/^\/+/, ''))
  if (candidate !== uploadsRoot && !candidate.startsWith(`${uploadsRoot}${sep}`)) return ''
  return candidate
}

export function resolveFaviconSource({ company, projectRoot, filename, exists }) {
  if (!Object.hasOwn(FAVICON_SIZES, filename)) return ''
  const fileExists = typeof exists === 'function' ? exists : () => false

  for (const value of [company?.favicon, company?.logo]) {
    const configured = configuredUploadPath(value, projectRoot)
    if (configured && fileExists(configured)) return configured
  }

  // Sharp reads the packaged PNG, then the handler wraps it in a real ICO container.
  const fallback = join(projectRoot, 'public', filename === 'favicon.ico' ? 'favicon-32.png' : filename)
  return fileExists(fallback) ? fallback : ''
}

export function createFaviconHandler({
  getCompany,
  projectRoot,
  exists,
  imageFactory,
  logger = console
}) {
  return async function faviconHandler(req, res) {
    const filename = String(req.params?.file || '')
    const size = FAVICON_SIZES[filename]
    if (!size) return res.status(404).send('Not Found')

    try {
      const sourcePath = resolveFaviconSource({
        company: getCompany(),
        projectRoot,
        filename,
        exists
      })
      if (!sourcePath) return res.status(404).send('Not Found')

      const pngBuffer = await imageFactory(sourcePath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toBuffer()
      const buffer = filename.endsWith('.ico') ? createIcoFromPng(pngBuffer, size) : pngBuffer

      res.setHeader('Content-Type', filename.endsWith('.ico') ? 'image/x-icon' : 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.send(buffer)
    } catch (error) {
      logger?.error?.('Favicon serving error:', error)
      return res.status(404).send('Not Found')
    }
  }
}
