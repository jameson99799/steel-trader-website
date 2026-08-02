import test from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'

import {
  FAVICON_SIZES,
  createFaviconHandler,
  resolveFaviconSource
} from '../server/services/favicon.js'

test('uses the packaged brand icon when company assets are unavailable', () => {
  const projectRoot = join('C:', 'app')
  const expected = join(projectRoot, 'public', 'favicon-32.png')

  const source = resolveFaviconSource({
    company: { favicon: '', logo: '' },
    projectRoot,
    filename: 'favicon-32.png',
    exists: value => value === expected
  })

  assert.equal(source, expected)
})

test('prefers a configured company favicon over the packaged fallback', () => {
  const projectRoot = join('C:', 'app')
  const expected = join(projectRoot, 'uploads', 'brand.png')

  const source = resolveFaviconSource({
    company: { favicon: '/uploads/brand.png', logo: '/uploads/logo.png' },
    projectRoot,
    filename: 'favicon.ico',
    exists: value => value === expected
  })

  assert.equal(source, expected)
})

test('rejects paths outside uploads and never scans arbitrary upload images', () => {
  const projectRoot = join('C:', 'app')
  const expected = join(projectRoot, 'public', 'favicon-192.png')

  const source = resolveFaviconSource({
    company: { favicon: '/../secret.png', logo: '/images/product.jpg' },
    projectRoot,
    filename: 'favicon-192.png',
    exists: value => value === expected
  })

  assert.equal(source, expected)
})

test('favicon handler renders the requested size with stable cache and content type', async () => {
  const calls = []
  const handler = createFaviconHandler({
    getCompany: () => ({ favicon: '', logo: '' }),
    projectRoot: join('C:', 'app'),
    exists: () => true,
    imageFactory(source) {
      calls.push(['source', source])
      return {
        resize(width, height, options) {
          calls.push(['resize', width, height, options])
          return this
        },
        png() {
          calls.push(['png'])
          return this
        },
        async toBuffer() {
          return Buffer.from('brand-icon')
        }
      }
    }
  })
  const headers = {}
  const response = {
    setHeader(name, value) { headers[name] = value },
    send(value) { this.body = value; return this },
    status(code) { this.statusCode = code; return this }
  }

  await handler({ params: { file: 'favicon-192.png' } }, response)

  assert.equal(FAVICON_SIZES['favicon-192.png'], 192)
  assert.equal(headers['Content-Type'], 'image/png')
  assert.equal(headers['Cache-Control'], 'public, max-age=86400')
  assert.equal(response.body.toString(), 'brand-icon')
  assert.equal(calls[1][1], 192)
  assert.equal(calls[1][2], 192)
})
