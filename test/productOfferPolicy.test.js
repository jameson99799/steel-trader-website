import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildProductOfferPolicy,
  parseCountryList
} from '../shared/productOfferPolicy.js'

test('builds Google-compatible shipping details from configured values', () => {
  const policy = buildProductOfferPolicy({
    shipping_rate_usd: '50',
    shipping_countries: 'US, DZ, de',
    shipping_handling_min: 1,
    shipping_handling_max: 3,
    shipping_transit_min: 15,
    shipping_transit_max: 35,
    return_policy_category: 'MerchantReturnNotPermitted',
    return_policy_countries: 'US,DZ'
  })

  assert.equal(policy.shippingDetails['@type'], 'OfferShippingDetails')
  assert.equal(policy.shippingDetails.shippingRate.value, 50)
  assert.equal(policy.shippingDetails.shippingRate.currency, 'USD')
  assert.deepEqual(
    policy.shippingDetails.shippingDestination.map(item => item.addressCountry),
    ['US', 'DZ', 'DE']
  )
  assert.equal(policy.shippingDetails.deliveryTime.handlingTime.minValue, 1)
  assert.equal(policy.shippingDetails.deliveryTime.handlingTime.maxValue, 3)
  assert.equal(policy.shippingDetails.deliveryTime.transitTime.maxValue, 35)
  assert.equal(
    policy.hasMerchantReturnPolicy.returnPolicyCategory,
    'https://schema.org/MerchantReturnNotPermitted'
  )
  assert.deepEqual(policy.hasMerchantReturnPolicy.applicableCountry, ['US', 'DZ'])
})

test('finite return window includes days, fees and return method', () => {
  const policy = buildProductOfferPolicy({
    shipping_countries: 'US',
    return_policy_category: 'MerchantReturnFiniteReturnWindow',
    return_policy_days: 30,
    return_policy_fees: 'FreeReturn'
  })

  assert.equal(policy.hasMerchantReturnPolicy.merchantReturnDays, 30)
  assert.equal(policy.hasMerchantReturnPolicy.returnFees, 'https://schema.org/FreeReturn')
  assert.equal(policy.hasMerchantReturnPolicy.returnMethod, 'https://schema.org/ReturnByMail')
})

test('falls back to safe defaults when no settings are configured', () => {
  const policy = buildProductOfferPolicy({})
  assert.ok(policy.shippingDetails)
  assert.ok(policy.hasMerchantReturnPolicy)
  assert.equal(policy.shippingDetails.shippingRate.value, 0)
  assert.equal(
    policy.hasMerchantReturnPolicy.returnPolicyCategory,
    'https://schema.org/MerchantReturnNotPermitted'
  )
})

test('parses and deduplicates ISO country codes', () => {
  assert.deepEqual(parseCountryList('US, de; DZ us, invalid'), ['US', 'DE', 'DZ'])
  assert.deepEqual(parseCountryList(''), [])
})
