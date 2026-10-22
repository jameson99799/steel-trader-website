export const DEFAULT_SHIPPING_COUNTRIES = 'US,DE,FR,GB,ES,IT,NL,PL,AE,SA,AU,CA,MX,BR,IN,TH,VN,TR,RU,ZA,DZ'

export function parseCountryList(value) {
  if (!value) return []
  return [...new Set(String(value)
    .split(/[\s,;]+/)
    .map(code => code.trim().toUpperCase())
    .filter(code => /^[A-Z]{2}$/.test(code)))]
}

function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function buildProductOfferPolicy(settings = {}) {
  const shippingCountries = parseCountryList(settings.shipping_countries || DEFAULT_SHIPPING_COUNTRIES)
  if (!shippingCountries.length) return {}

  const returnCountries = parseCountryList(settings.return_policy_countries || settings.shipping_countries || DEFAULT_SHIPPING_COUNTRIES)
  const rate = Number(settings.shipping_rate_usd)
  const shippingRate = Number.isFinite(rate) && rate >= 0 ? rate : 0
  const handlingMin = positiveInt(settings.shipping_handling_min, 1)
  const handlingMax = Math.max(handlingMin, positiveInt(settings.shipping_handling_max, 3))
  const transitMin = positiveInt(settings.shipping_transit_min, 15)
  const transitMax = Math.max(transitMin, positiveInt(settings.shipping_transit_max, 35))

  const shippingDetails = {
    '@type': 'OfferShippingDetails',
    shippingDestination: shippingCountries.map(code => ({
      '@type': 'DefinedRegion',
      addressCountry: code
    })),
    shippingRate: {
      '@type': 'MonetaryAmount',
      value: shippingRate,
      currency: 'USD'
    },
    deliveryTime: {
      '@type': 'ShippingDeliveryTime',
      handlingTime: {
        '@type': 'QuantitativeValue',
        minValue: handlingMin,
        maxValue: handlingMax
      },
      transitTime: {
        '@type': 'QuantitativeValue',
        minValue: transitMin,
        maxValue: transitMax
      }
    }
  }

  const category = settings.return_policy_category || 'MerchantReturnNotPermitted'
  const returnPolicy = {
    '@type': 'MerchantReturnPolicy',
    applicableCountry: returnCountries.length ? returnCountries : shippingCountries,
    returnPolicyCategory: `https://schema.org/${category}`
  }
  if (category === 'MerchantReturnFiniteReturnWindow') {
    returnPolicy.merchantReturnDays = positiveInt(settings.return_policy_days, 30)
    returnPolicy.returnFees = `https://schema.org/${settings.return_policy_fees || 'ReturnFeesCustomerResponsibility'}`
    returnPolicy.returnMethod = 'https://schema.org/ReturnByMail'
  }

  return {
    shippingDetails,
    hasMerchantReturnPolicy: returnPolicy
  }
}
