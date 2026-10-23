import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

import { isImagePath, isVideoPath, mimeTypeFor } from '../server/utils/mediaCompression.js'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('media compression recognizes uploads and their mime types', () => {
  assert.equal(isImagePath('/uploads/a.webp'), true)
  assert.equal(isVideoPath('/uploads/a.mp4'), true)
  assert.equal(isVideoPath('/uploads/a.webm'), true)
  assert.equal(isImagePath('/uploads/a.pdf'), false)
  assert.equal(mimeTypeFor('/uploads/a.mp4'), 'video/mp4')
  assert.equal(mimeTypeFor('/uploads/a.webp'), 'image/webp')
})

test('optimize-all replaces media in place and includes videos', () => {
  const source = read('server/routes/media.js')
  const start = source.indexOf("router.post('/optimize-all'")
  const block = source.slice(start, source.indexOf('export default router', start))

  assert.ok(start >= 0)
  assert.match(block, /compressImageInPlace/)
  assert.match(block, /compressVideoInPlace/)
  assert.match(block, /WHERE filepath=\?/)
  assert.doesNotMatch(block, /REPLACE\(/)
})

test('image/video upload routes run automatic compression', () => {
  for (const page of [
    'server/routes/company.js',
    'server/routes/categories.js',
    'server/routes/news.js',
    'server/routes/seo.js'
  ]) {
    assert.match(read(page), /compressUploads/, `${page} must compress uploads`)
  }
  assert.match(read('server/routes/products.js'), /compressVideoInPlace/)
  assert.match(read('server/routes/media.js'), /compressVideoInPlace/)
  assert.match(read('server/routes/upload.js'), /compressVideoUpload/)
})
