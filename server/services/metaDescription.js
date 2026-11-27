const MIN_DESCRIPTION_LENGTH = 120
const MAX_DESCRIPTION_LENGTH = 160


function toCharacters(value) {
  return Array.from(String(value ?? ''))
}

export function cleanMetaText(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function metaDescriptionLength(value) {
  return toCharacters(cleanMetaText(value)).length
}

export function isMetaDescriptionWithinRange(value, min = MIN_DESCRIPTION_LENGTH, max = MAX_DESCRIPTION_LENGTH) {
  const length = metaDescriptionLength(value)
  return length >= min && length <= max
}

function cutAtWord(value, max = MAX_DESCRIPTION_LENGTH) {
  const text = cleanMetaText(value)
  if (metaDescriptionLength(text) <= max) return text
  const sliced = toCharacters(text).slice(0, max).join('')
  const withoutPartialWord = sliced.replace(/\s+\S*$/, '').replace(/[\s,;:–—-]+$/, '').trim()
  return (withoutPartialWord || sliced.trim()).replace(/[\s,;:–—-]+$/, '')
}

function sentence(value) {
  const text = cleanMetaText(value)
  if (!text) return ''
  return /[.!?]$/.test(text) ? text : `${text}.`
}

function appendSentence(base, addition, max = MAX_DESCRIPTION_LENGTH) {
  const text = cleanMetaText(base)
  const next = sentence(addition)
  if (!next) return text
  if (!text) return cutAtWord(next, max)
  const separator = /[.!?]$/.test(text) ? ' ' : '. '
  const candidate = `${text}${separator}${next}`.replace(/\s+/g, ' ').trim()
  return metaDescriptionLength(candidate) <= max ? candidate : null
}

function fitDescription(base, additions, { min = MIN_DESCRIPTION_LENGTH, max = MAX_DESCRIPTION_LENGTH } = {}) {
  let text = cutAtWord(cleanMetaText(base), max)
  for (const addition of additions) {
    const next = cleanMetaText(addition)
    if (!next || text.toLowerCase().includes(next.toLowerCase())) continue
    if (metaDescriptionLength(text) >= max) break
    const candidate = appendSentence(text, next, max)
    if (candidate) text = candidate
  }
  if (metaDescriptionLength(text) < min) {
    for (const filler of ['Fast export.', 'Factory-direct export.', 'Contact us for a quote.']) {
      const candidate = appendSentence(text, filler, max)
      if (candidate) text = candidate
      if (metaDescriptionLength(text) >= min) break
    }
  }
  return cutAtWord(text, max)
}

function firstSentence(value, max = 150) {
  const text = cleanMetaText(value)
  if (!text) return ''
  const match = text.match(/^(.+?[.!?])(?:\s|$)/)
  return cutAtWord(match ? match[1] : text, max)
}

function parseSpecs(specs) {
  if (Array.isArray(specs)) return specs
  try {
    const parsed = JSON.parse(specs || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch (error) {
    return []
  }
}

const SPEC_LABELS = [
  [/^thickness$/i, value => `Thickness ${value}`],
  [/^width$/i, value => `Width ${value}`],
  [/^zinc coating$/i, value => `Zinc coating ${value}`],
  [/^(paint system|paint|coating)$/i, value => `Coating ${value}`],
  [/^(standard|standards)$/i, value => `Certified to ${value}`],
  [/^(length|sheet length)$/i, value => `Length ${value}`],
  [/^(color|colors|ral)$/i, value => `Color ${value}`],
  [/^(steel grade|grade)$/i, value => `Grade ${value}`]
]

function productSpecFragments(product, maxFragments = 3) {
  const matched = []
  for (const spec of parseSpecs(product?.specs)) {
    const name = cleanMetaText(spec?.name)
    const value = cleanMetaText(spec?.value)
    if (!name || !value || value.length > 55) continue
    const priority = SPEC_LABELS.findIndex(([pattern]) => pattern.test(name))
    if (priority < 0) continue
    const label = SPEC_LABELS[priority][1](value)
    if (matched.some(item => item.label.toLowerCase() === label.toLowerCase())) continue
    matched.push({ label, priority })
  }
  return matched
    .sort((left, right) => left.priority - right.priority)
    .slice(0, maxFragments)
    .map(item => item.label)
}

function categoryAdvantage(product) {
  const category = cleanMetaText(product?.category_name_en || product?.category_name || '').toLowerCase()
  if (/strip|slit/.test(category)) return 'Precision slitting, factory-direct pricing and fast export.'
  if (/roof|sheet|panel/.test(category)) return 'Custom profiles, factory-direct pricing and fast export.'
  if (/coil/.test(category)) return 'Factory-direct pricing, stable quality and fast export.'
  return 'Factory-direct pricing, ASTM/JIS/EN quality and fast export.'
}

export function buildProductMetaDescription(product, base = '') {
  const name = cleanMetaText(product?.name_en || product?.name || 'Steel product')
  const category = cleanMetaText(product?.category_name_en || product?.category_name || '')
  const initial = cleanMetaText(base)
    || cleanMetaText(product?.seo_description)
    || firstSentence(product?.description_en || product?.description)
    || `${name}${category ? ` - ${category}` : ''}`
  const specs = productSpecFragments(product)
  const hasAdvantage = /\b(?:factory[- ]direct|export|pricing|price|certified|corrosion|warranty|durable)\b/i.test(initial)
  const additions = []
  if (specs[0]) additions.push(`${specs[0]}.`)
  if (!hasAdvantage) additions.push(categoryAdvantage(product))
  for (const spec of specs.slice(1)) additions.push(`${spec}.`)
  if (!hasAdvantage) additions.push('Factory-direct export.')
  additions.push('Contact SUNSEA STEEL for a quote.')
  return fitDescription(initial, additions)
}

function newsAddition(article) {
  const text = `${article?.title_en || article?.title || ''} ${article?.summary_en || article?.summary || ''}`
  if (/spec|standard|coating|zinc|thickness|price|guide|selection|how to/i.test(text)) {
    return 'Includes specifications, standards and sourcing tips for steel buyers.'
  }
  return 'Steel industry insights and sourcing advice from SUNSEA STEEL.'
}

export function buildNewsMetaDescription(article, base = '') {
  const title = cleanMetaText(article?.title_en || article?.title || 'Steel industry article')
  const initial = cleanMetaText(base)
    || cleanMetaText(article?.seo_description)
    || firstSentence(article?.summary_en || article?.summary)
    || title
  return fitDescription(initial, [newsAddition(article), 'SUNSEA STEEL industry insights.'])
}

export function buildCategoryMetaDescription({ categoryName, products = [], companyName = 'SUNSEA STEEL', kind = 'product' }) {
  const name = cleanMetaText(categoryName)
  const brand = cleanMetaText(companyName) || 'SUNSEA STEEL'
  if (kind === 'news') {
    return fitDescription(`${name} articles from ${brand}.`, [
      'Expert steel coil specifications, standards and sourcing insights.'
    ])
  }
  const exactProduct = products.find(product => {
    const productName = cleanMetaText(product?.name_en || product?.name).toLowerCase()
    return productName.includes(name.toLowerCase()) && productSpecFragments(product).length
  })
  const firstProduct = exactProduct || products.find(product => productSpecFragments(product).length)
  const specs = firstProduct ? productSpecFragments(firstProduct) : []
  const initial = `${name} from ${brand}.`
  const additions = []
  if (specs[0]) additions.push(`${specs[0]}.`)
  additions.push('ASTM/JIS/EN certified, factory-direct pricing and fast global export.')
  for (const spec of specs.slice(1)) additions.push(`${spec}.`)
  return fitDescription(initial, additions)
}

export function buildHomeMetaDescription(base = '') {
  const initial = cleanMetaText(base)
  if (initial && /\b(?:thickness|zinc|Z\d{2,3}|mm|coating)\b/i.test(initial)) {
    return cutAtWord(initial, MAX_DESCRIPTION_LENGTH)
  }
  const generated = 'GI, GL, PPGI, PPGL & CRC steel coil supplier. Thickness 0.12-3.5 mm, zinc Z40-Z275, ASTM/JIS/EN certified. Factory-direct pricing, fast export.'
  return cutAtWord(generated, MAX_DESCRIPTION_LENGTH)
}

export function finalizeMetaDescription(value, {
  lang = 'en',
  pageType = 'static',
  product = null,
  article = null,
  categoryName = '',
  categoryProducts = [],
  companyName = 'SUNSEA STEEL'
} = {}) {
  const normalized = cleanMetaText(value)
  // Full sentences are preserved — Google truncates for display itself, and
  // a cut-off fragment ("...pricing from") looks unprofessional in snippets.
  // Only short descriptions are enriched (generated filler below).
  if (lang !== 'en') return normalized
  if (pageType === 'home') return buildHomeMetaDescription(normalized)
  if (pageType === 'product' && product) return buildProductMetaDescription(product, normalized)
  if (pageType === 'news' && article) return buildNewsMetaDescription(article, normalized)
  if (pageType === 'productCategory' && categoryName) {
    return buildCategoryMetaDescription({ categoryName, products: categoryProducts, companyName, kind: 'product' })
  }
  if (pageType === 'newsCategory' && categoryName) {
    return buildCategoryMetaDescription({ categoryName, companyName, kind: 'news' })
  }
  if (metaDescriptionLength(normalized) > MAX_DESCRIPTION_LENGTH) return normalized
  if (isMetaDescriptionWithinRange(normalized)) return normalized
  return fitDescription(normalized, ['Factory-direct pricing and fast export.', 'ASTM/JIS/EN certified.'])
}
