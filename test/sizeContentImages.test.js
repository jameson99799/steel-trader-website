import test from 'node:test'
import assert from 'node:assert/strict'
import { sizeContentImages } from '../src/utils/sizeContentImages.js'

test('sizeContentImages resizes uploaded article images only once', () => {
  const html = [
    '<p><img src="/uploads/article-1.webp" alt="a"></p>',
    '<img src="/uploads/article-2.webp?t=1" alt="b">',
    '<img src="/uploads/article-3.webp?w=400" alt="c">',
    '<img src="https://example.com/external.webp" alt="d">'
  ].join('')

  const result = sizeContentImages(html, 1000)

  assert.match(result, /src="\/uploads\/article-1\.webp\?w=1000&v=3"/)
  assert.match(result, /src="\/uploads\/article-2\.webp\?t=1&w=1000&v=3"/)
  assert.match(result, /src="\/uploads\/article-3\.webp\?w=400"/)
  assert.match(result, /src="https:\/\/example\.com\/external\.webp"/)
})
