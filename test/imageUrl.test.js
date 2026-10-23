import test from 'node:test'
import assert from 'node:assert/strict'
import { imageUrl } from '../src/utils/imageUrl.js'

test('imageUrl adds a versioned resize width without breaking existing query strings', () => {
  assert.equal(imageUrl('/uploads/a.webp', 400), '/uploads/a.webp?w=400&v=2')
  assert.equal(imageUrl('/uploads/a.webp?t=1', 400), '/uploads/a.webp?t=1&w=400&v=2')
  assert.equal(imageUrl('/uploads/a.webp?w=200', 400), '/uploads/a.webp?w=200')
  assert.equal(imageUrl('', 400), '')
  assert.equal(imageUrl('/uploads/a.webp', 0), '/uploads/a.webp')
})
