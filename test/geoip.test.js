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
