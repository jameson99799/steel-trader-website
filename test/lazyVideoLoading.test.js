import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('LazyVideo attaches the source only near the viewport and never retries in a loop', () => {
  const component = read('src/components/LazyVideo.vue')
  assert.match(component, /IntersectionObserver/)
  // No src until activated → browsers download nothing for off-screen videos.
  assert.match(component, /:src="activeSrc"/)
  assert.match(component, /:preload="activeSrc \? \(autoplay \? 'auto' : 'metadata'\) : 'none'"/)
  assert.match(component, /rootMargin/)
  // A failed (e.g. timed-out) media request must not hammer the server again.
  assert.match(component, /failed = true/)
  assert.match(component, /if \(!props\.src \|\| activeSrc\.value \|\| failed\) return/)
})

test('public pages render videos through LazyVideo, not eager <video :src>', () => {
  const expectations = [
    ['src/views/Home.vue', /<LazyVideo[^>]*:src="company\.company_video_embed"/, /<video[^>]*:src="company\.company_video_embed"/],
    ['src/views/About.vue', /<LazyVideo[^>]*:src="company\.company_video_embed"/, /<video[^>]*:src="company\.company_video_embed"/],
    ['src/views/Factory.vue', /<LazyVideo[^>]*:src="video\.media_url"/, /<video[^>]*:src="video\.media_url"/],
    ['src/views/NewsDetail.vue', /<LazyVideo[^>]*:src="(?:article\.cover_image|rn\.cover_image)"/, /<video[^>]*:src="(?:article\.cover_image|rn\.cover_image)"/],
    ['src/views/ProductDetail.vue', /<LazyVideo[^>]*:src="currentImage"/, /<video[^>]*:src="(?:currentImage|img)"/]
  ]
  for (const [page, lazyPattern, eagerPattern] of expectations) {
    const source = read(page)
    assert.match(source, /import LazyVideo from '\.\.\/components\/LazyVideo\.vue'/, `${page} imports LazyVideo`)
    assert.match(source, lazyPattern, `${page} loads its videos lazily`)
    assert.doesNotMatch(source, eagerPattern, `${page} must not attach video sources eagerly`)
  }
})
