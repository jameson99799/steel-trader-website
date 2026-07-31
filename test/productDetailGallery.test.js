import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(
  new URL('../src/views/ProductDetail.vue', import.meta.url),
  'utf8'
)

test('product detail renders selectable thumbnails from the existing images source', () => {
  assert.match(source, /<div class="thumbnails" v-if="images\.length > 1">/)
  assert.match(source, /v-for="\(img, index\) in images"/)
  assert.match(source, /:class="\['thumbnail-btn', \{ active: currentImage === img \}\]"/)
  assert.match(source, /@click="currentImage = img"/)
  assert.doesNotMatch(source, /\bgalleryImages\b/)
  assert.doesNotMatch(source, /['"]thumb-btn['"]/)
})

test('product detail keeps image and video thumbnail rendering', () => {
  assert.match(source, /img\.toLowerCase\(\)\.endsWith\('\.mp4'\)/)
  assert.match(source, /img\.toLowerCase\(\)\.endsWith\('\.webm'\)/)
  assert.match(source, /<video v-if="img &&/)
  assert.match(source, /<img v-else :src="img"/)
})
