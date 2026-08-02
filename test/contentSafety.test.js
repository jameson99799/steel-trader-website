import test from 'node:test'
import assert from 'node:assert/strict'

test('rich HTML sanitizer removes executable markup while preserving safe content', async () => {
  const { sanitizeRichHtml } = await import('../src/utils/sanitizeHtml.js')
  const dirty = '<p style="color:red" onclick="steal()">Safe</p><script>alert(1)</script><a href=" javascript:alert(2) ">bad</a><img src=x onerror=steal()><iframe src="https://evil.test"></iframe>'
  const clean = sanitizeRichHtml(dirty)
  assert.match(clean, /<p style="color:red">Safe<\/p>/)
  assert.doesNotMatch(clean, /script|onclick|onerror|javascript:|iframe/i)
})

test('rich HTML sanitizer blocks encoded URLs and SVG event-handler bypasses', async () => {
  const { sanitizeRichHtml } = await import('../src/utils/sanitizeHtml.js')
  const dirty = '<a href="jav&#x61;script&#58;alert(1)">bad</a><svg/onload=alert(2)><circle></circle></svg><math href="javascript:alert(3)"></math>'
  const clean = sanitizeRichHtml(dirty)
  assert.doesNotMatch(clean, /javascript|onload|<svg|<math/i)
  assert.match(clean, /href="#"/)
})

test('safe upload path rejects traversal and accepts uploaded basenames', async () => {
  const { resolveUploadPath } = await import('../server/services/safePath.js')
  const root = 'C:\\service\\uploads'
  assert.throws(() => resolveUploadPath(root, '../database.db'), /Invalid upload filename/)
  assert.throws(() => resolveUploadPath(root, '..%2Fdatabase.db'), /Invalid upload filename/)
  assert.throws(() => resolveUploadPath(root, 'folder/file.pdf'), /Invalid upload filename/)
  assert.equal(resolveUploadPath(root, 'mailer-123.pdf'), 'C:\\service\\uploads\\mailer-123.pdf')
})
