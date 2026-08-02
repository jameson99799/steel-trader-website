import { join, resolve, sep } from 'node:path'

export const FAVICON_SIZES = Object.freeze({
  'favicon.ico': 32,
  'favicon-32.png': 32,
  'favicon-16.png': 16,
  'favicon-192.png': 192,
  'apple-touch-icon.png': 180
})

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

  const fallback = join(projectRoot, 'public', filename)
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

      const buffer = await imageFactory(sourcePath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toBuffer()

      res.setHeader('Content-Type', filename.endsWith('.ico') ? 'image/x-icon' : 'image/png')
      res.setHeader('Cache-Control', 'public, max-age=86400')
      return res.send(buffer)
    } catch (error) {
      logger?.error?.('Favicon serving error:', error)
      return res.status(404).send('Not Found')
    }
  }
}
