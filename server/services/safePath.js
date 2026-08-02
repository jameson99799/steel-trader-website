import path from 'path'

export function resolveUploadPath(uploadRoot, suppliedFilename) {
  let filename = String(suppliedFilename || '')
  try { filename = decodeURIComponent(filename) } catch (_) {
    throw new Error('Invalid upload filename')
  }
  if (!filename || filename.includes('\0') || filename !== path.basename(filename)) {
    throw new Error('Invalid upload filename')
  }
  const root = path.resolve(uploadRoot)
  const fullPath = path.resolve(root, filename)
  const relative = path.relative(root, fullPath)
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('Invalid upload filename')
  }
  return fullPath
}
