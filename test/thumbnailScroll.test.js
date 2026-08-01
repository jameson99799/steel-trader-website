import test from 'node:test'
import assert from 'node:assert/strict'
import { getCenteredThumbnailScrollLeft } from '../src/utils/thumbnailScroll.js'

test('centers an offscreen thumbnail inside the scroll container', () => {
  assert.equal(getCenteredThumbnailScrollLeft({
    scrollLeft: 0,
    clientWidth: 358,
    scrollWidth: 760,
    itemLeft: 456,
    itemWidth: 60
  }), 307)
})

test('clamps the first and last thumbnail to valid scroll bounds', () => {
  assert.equal(getCenteredThumbnailScrollLeft({
    scrollLeft: 100,
    clientWidth: 358,
    scrollWidth: 760,
    itemLeft: -100,
    itemWidth: 60
  }), 0)
  assert.equal(getCenteredThumbnailScrollLeft({
    scrollLeft: 350,
    clientWidth: 358,
    scrollWidth: 760,
    itemLeft: 350,
    itemWidth: 60
  }), 402)
})
