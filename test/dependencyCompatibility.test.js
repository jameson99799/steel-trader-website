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

test('every server Archiver import uses the Archiver 8 named API', () => {
  const serverRoot = new URL('../server/', import.meta.url)
  const pending = [serverRoot]
  const javascriptFiles = []

  while (pending.length) {
    const directory = pending.pop()
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
      if (entry.isDirectory()) pending.push(target)
      else if (entry.name.endsWith('.js')) javascriptFiles.push(target)
    }
  }

  const incompatibleImports = javascriptFiles
    .filter((file) => /import\s+archiver\s+from\s+['"]archiver['"]/.test(fs.readFileSync(file, 'utf8')))
    .map((file) => file.pathname)

  assert.deepEqual(incompatibleImports, [])

  const crmCustomers = read('server/routes/crm-customers.js')
  assert.match(crmCustomers, /import\s*\{\s*ZipArchive\s*\}\s*from\s*['"]archiver['"]/)
  assert.match(crmCustomers, /new ZipArchive\(/)
})
