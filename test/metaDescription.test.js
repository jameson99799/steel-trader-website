import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildProductMetaDescription,
  buildNewsMetaDescription,
  buildCategoryMetaDescription,
  buildHomeMetaDescription,
  finalizeMetaDescription,
  isMetaDescriptionWithinRange,
  metaDescriptionLength
} from '../server/services/metaDescription.js'

const product = {
  name_en: 'PPGI Steel Coil - Pre-Painted GI Coil Factory Direct',
  category_name_en: 'Prepainted Galvanized Steel Coil',
  seo_description: 'PPGI steel coil factory direct. Pre-painted galvanized iron coil with PE to PVDF paint.',
  specs: JSON.stringify([
    { name: 'Paint System', value: 'PE / SMP / HDP / PVDF' },
    { name: 'Thickness', value: '0.12 - 1.2 mm' },
    { name: 'Width', value: '600 - 1250 mm' },
    { name: 'Standard', value: 'ASTM A755, EN 10169, JIS G3312' }
  ])
}

const article = {
  title_en: '0.4*1000mm PPGI Coil RAL 3028',
  summary_en: '0.4*1000mm PPGI Coil RAL 3028, paint coating 13/5um',
  seo_description: null
}

test('product descriptions reach the 120-160 character window with real specs', () => {
  const description = buildProductMetaDescription(product, product.seo_description)
  assert.ok(isMetaDescriptionWithinRange(description))
  assert.match(description, /Thickness 0\.12 - 1\.2 mm/)
  assert.match(description, /PPGI/i)
})

test('short news summaries are expanded without padding unrelated text', () => {
  const description = buildNewsMetaDescription(article, article.seo_description)
  assert.ok(isMetaDescriptionWithinRange(description))
  assert.match(description, /PPGI Coil RAL 3028/)
  assert.match(description, /specifications|sourcing/i)
})

test('category descriptions combine category, specs and a factory-direct advantage', () => {
  const description = buildCategoryMetaDescription({
    categoryName: 'Prepainted Galvanized Steel Coil',
    products: [product],
    companyName: 'SUNSEA STEEL CO., LIMITED'
  })
  assert.ok(isMetaDescriptionWithinRange(description))
  assert.match(description, /Prepainted Galvanized Steel Coil/)
  assert.match(description, /Thickness|Width/)
  assert.match(description, /Factory-direct|export/i)
})

test('homepage descriptions always carry GI/GL/PPGI/PPGL keywords and specifications', () => {
  const description = buildHomeMetaDescription(
    'SUNSEA STEEL is a professional manufacturer and exporter of GI, GL, PPGI, PPGL & CRC steel coils. Contact us for a fast quote.'
  )
  assert.ok(isMetaDescriptionWithinRange(description))
  assert.match(description, /GI, GL, PPGI, PPGL/)
  assert.match(description, /Thickness/)
  assert.match(description, /ASTM\/JIS\/EN/)
})

test('long descriptions are cut at a word boundary and stay within 160 characters', () => {
  const description = finalizeMetaDescription(
    'Galvanized steel coil supplier with a very long description that keeps going beyond the search snippet limit and must not end in the middle of a word or contain a broken phrase that looks unprofessional.',
    { pageType: 'static' }
  )
  assert.ok(metaDescriptionLength(description) <= 160)
  assert.ok(isMetaDescriptionWithinRange(description))
  assert.doesNotMatch(description, /[\s,;:–—-]$/)
})

test('contact and other static descriptions are filled to at least 120 characters', () => {
  const description = finalizeMetaDescription(
    'Get in touch with SUNSEA STEEL CO., LIMITED. Request a quote, ask product questions, or schedule a factory visit.',
    { pageType: 'static' }
  )
  assert.ok(isMetaDescriptionWithinRange(description))
  assert.match(description, /quote|export/i)
})
