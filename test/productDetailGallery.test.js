import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(
  new URL('../src/views/ProductDetail.vue', import.meta.url),
  'utf8'
)

test('product detail renders selectable thumbnails from the existing images source', () => {
  assert.match(source, /<div class="thumbnails"[^>]*v-if="images\.length > 1">/)
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

test('active thumbnail follows main image navigation', () => {
  assert.match(source, /<div class="thumbnails"[^>]*ref="thumbnailContainer"/)
  assert.match(source, /:ref="el => setThumbnailButton\(el, index\)"/)
  assert.match(source, /import \{[^}]*nextTick[^}]*\} from 'vue'/)
  assert.match(source, /watch\(currentImage, centerActiveThumbnail\)/)
  assert.match(source, /await nextTick\(\)/)
  assert.match(source, /buttonRect\.left < containerRect\.left \|\| buttonRect\.right > containerRect\.right/)
  assert.match(source, /getCenteredThumbnailScrollLeft/)
  assert.match(source, /container\.scrollTo\(\{[\s\S]*?left,[\s\S]*?behavior: 'smooth'/)
  assert.doesNotMatch(source, /button\.scrollIntoView/)
  assert.match(source, /@media \(max-width: 640px\)[\s\S]*?\.thumbnails\s*\{[\s\S]*?justify-content: flex-start/)
})
