import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('backup route uses the Archiver 8 named ZipArchive API', async () => {
  const { ZipArchive } = await import('archiver')
  const archive = new ZipArchive({ zlib: { level: 1 } })
  assert.equal(typeof archive.finalize, 'function')
  archive.abort()

  const source = read('server/routes/backup.js')
  assert.match(source, /import\s*\{\s*ZipArchive\s*\}\s*from\s*['"]archiver['"]/)
  assert.match(source, /new ZipArchive\(/)
  assert.doesNotMatch(source, /import archiver from ['"]archiver['"]/)
})
