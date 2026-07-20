import test from 'node:test'
import assert from 'node:assert/strict'
import { getClientIp, isPublicIp, createGeoIpService, languageForCountry } from '../server/services/geoip.js'

test('uses req.ip instead of a forged forwarded header', () => {
  assert.equal(getClientIp({ ip: '8.8.8.8', headers: { 'x-forwarded-for': '1.1.1.1' } }), '8.8.8.8')
})

test('rejects private addresses and supports public IPv6', () => {
  assert.equal(isPublicIp('10.0.0.1'), false)
  assert.equal(isPublicIp('2001:4860:4860::8888'), true)
})

test('rejects expanded IPv6 loopback and IPv4-mapped private addresses before lookup', async () => {
  const privateAddresses = [
    '0:0:0:0:0:0:0:1',
    '0:0:0:0:0:ffff:192.168.1.1',
    '::ffff:c0a8:101',
    '0000:0000:0000:0000:0000:ffff:0a00:0001'
  ]
  let lookupCalls = 0
  const geo = createGeoIpService({
    lookupPrimary: async () => { lookupCalls++; return { countryCode: 'US', countryName: 'United States' } },
    lookupFallback: async () => { lookupCalls++; return null }
  })

  for (const ip of privateAddresses) {
    assert.equal(isPublicIp(ip), false, ip)
    assert.equal(getClientIp({ ip }), null, ip)
    assert.equal(await geo.resolve(ip), null, ip)
  }
  assert.equal(lookupCalls, 0)
})

test('caches fallback lookup and maps India to Hindi', async () => {
  let fallbackCalls = 0
  const geo = createGeoIpService({
    lookupPrimary: async () => null,
    lookupFallback: async () => {
      fallbackCalls++
      return { countryCode: 'IN', countryName: 'India' }
    }
  })

  assert.equal((await geo.resolve('8.8.8.8')).countryCode, 'IN')
  await geo.resolve('8.8.8.8')
  assert.equal(fallbackCalls, 1)
  assert.equal(languageForCountry('IN', new Set(['en', 'hi'])), 'hi')
  assert.equal(languageForCountry('JP', new Set(['en', 'hi'])), 'en')
})

test('bounds the GeoIP cache and evicts the oldest entry at capacity', async () => {
  const calls = new Map()
  const geo = createGeoIpService({
    maxCacheEntries: 2,
    lookupPrimary: async ip => {
      calls.set(ip, (calls.get(ip) || 0) + 1)
      return { countryCode: 'US', countryName: 'United States' }
    },
    lookupFallback: async () => null
  })

  await geo.resolve('1.1.1.1')
  await geo.resolve('8.8.8.8')
  await geo.resolve('9.9.9.9')
  await geo.resolve('1.1.1.1')

  assert.equal(calls.get('1.1.1.1'), 2)
})

test('prunes expired GeoIP entries before evicting a live cache entry', async () => {
  let now = 0
  const calls = new Map()
  const geo = createGeoIpService({
    maxCacheEntries: 2,
    successTtlMs: 1000,
    failureTtlMs: 10,
    now: () => now,
    lookupPrimary: async ip => {
      calls.set(ip, (calls.get(ip) || 0) + 1)
      return ip === '8.8.8.8' ? null : { countryCode: 'US', countryName: 'United States' }
    },
    lookupFallback: async () => null
  })

  await geo.resolve('1.1.1.1')
  now = 1
  await geo.resolve('8.8.8.8')
  now = 20
  await geo.resolve('9.9.9.9')
  await geo.resolve('1.1.1.1')

  assert.equal(calls.get('1.1.1.1'), 1)
})
