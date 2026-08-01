import {
  buildPublicCategoryTree,
  getVisibleCategoryIds,
  visibleProductWhere
} from './catalogVisibility.js'
import {
  translateCategory,
  translateHero,
  translatePageTexts,
  translateProduct
} from '../helpers/translate.js'

function translateCategoryTree(nodes, translationMap, lang) {
  for (const node of nodes) {
    translateCategory(node, translationMap, lang)
    translateCategoryTree(node.children || [], translationMap, lang)
  }
}

export function buildHomeInitialState({
  readOne,
  readAll,
  lang = 'en',
  translationMap = null
}) {
  const hero = readOne('SELECT * FROM hero_content WHERE id = 1') || {}
  const pageTexts = readOne('SELECT * FROM page_texts WHERE id = 1') || {}
  let featuredProducts = []
  let categories = []

  try {
    const rawCategories = readAll(
      'SELECT * FROM categories ORDER BY sort_order, id'
    ) || []
    const visibleCategoryIds = getVisibleCategoryIds(rawCategories)
    const visibility = visibleProductWhere('p', visibleCategoryIds)

    featuredProducts = readAll(
      `SELECT p.id, p.name, p.name_en, p.slug, p.category_id, p.images, p.description, p.description_en, p.is_featured, p.status, p.sort_order, c.name as category_name, c.name_en as category_name_en FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.is_featured = 1 AND p.status = 1${visibility.clause} ORDER BY p.sort_order DESC, p.id DESC LIMIT 12`,
      visibility.params
    ) || []

    const productCounts = readAll(
      'SELECT category_id, COUNT(*) as count FROM products WHERE status = 1 GROUP BY category_id'
    ) || []
    const countMap = new Map(
      productCounts.map(product => [product.category_id, product.count])
    )
    categories = buildPublicCategoryTree(rawCategories, countMap).slice(0, 6)
  } catch {
    featuredProducts = []
    categories = []
  }

  if (lang !== 'en' && translationMap) {
    translateHero(hero, translationMap, lang)
    translatePageTexts(pageTexts, translationMap, lang)
    featuredProducts.forEach(product => {
      translateProduct(product, translationMap, lang)
    })
    translateCategoryTree(categories, translationMap, lang)
  }

  return { hero, pageTexts, featuredProducts, categories }
}
