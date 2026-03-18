import { getAll } from '../db.js'

/**
 * Server-side translation helper.
 * Loads all translations for a given language and provides
 * functions to apply translations to data objects.
 */
export function loadTranslationsForLang(langCode) {
    if (!langCode || langCode === 'en') return null
    const rows = getAll(
        'SELECT content_type, content_id, content_field, translated_text FROM translations WHERE language_code=?',
        [langCode]
    )
    // Build lookup: { product_5: { name: "翻译", description: "翻译" }, ... }
    const map = {}
    for (const r of rows) {
        const key = `${r.content_type}_${r.content_id || 0}`
        if (!map[key]) map[key] = {}
        map[key][r.content_field] = r.translated_text
    }
    return map
}

/**
 * Apply translations to a product object.
 * Modifies the object in place, adding translated fields as _xx suffixes.
 */
export function translateProduct(product, map, langCode) {
    if (!map || !product?.id) return product
    const t = map[`product_${product.id}`]
    if (!t) return product
    
    // Apply field translations — set as both _en replacement and _xx fields
    if (t.name) product[`name_${langCode}`] = t.name
    if (t.description) product[`description_${langCode}`] = t.description
    if (t.seo_title) product[`seo_title_${langCode}`] = t.seo_title
    if (t.seo_description) product[`seo_description_${langCode}`] = t.seo_description
    if (t.seo_keywords) product[`seo_keywords_${langCode}`] = t.seo_keywords
    if (t.detail_content) product[`detail_content_${langCode}`] = t.detail_content

    // Category name — check category translation
    if (product.category_id) {
        const catT = map[`category_${product.category_id}`]
        if (catT?.name) product[`category_name_${langCode}`] = catT.name
    }

    return product
}

/**
 * Apply translations to a news article.
 */
export function translateNews(article, map, langCode) {
    if (!map || !article?.id) return article
    const t = map[`news_${article.id}`]
    if (!t) return article

    if (t.title) article[`title_${langCode}`] = t.title
    if (t.summary) article[`summary_${langCode}`] = t.summary
    if (t.content) article[`content_${langCode}`] = t.content
    if (t.seo_title) article[`seo_title_${langCode}`] = t.seo_title
    if (t.seo_description) article[`seo_description_${langCode}`] = t.seo_description
    if (t.seo_keywords) article[`seo_keywords_${langCode}`] = t.seo_keywords

    return article
}

/**
 * Apply translations to company info.
 */
export function translateCompany(company, map, langCode) {
    if (!map || !company?.id) return company
    const t = map[`company_${company.id}`]
    if (!t) return company

    // Only translate description — company name, address, contact info always in English
    if (t.description) company[`description_${langCode}`] = t.description

    return company
}

/**
 * Apply translations to hero content.
 */
export function translateHero(hero, map, langCode) {
    if (!map || !hero?.id) return hero
    const t = map[`hero_${hero.id}`]
    if (!t) return hero

    for (const field of ['tag', 'title', 'subtitle', 'stat1_label', 'stat2_label', 'stat3_label']) {
        if (t[field]) hero[`${field}_${langCode}`] = t[field]
    }

    return hero
}

/**
 * Apply translations to a category.
 */
export function translateCategory(category, map, langCode) {
    if (!map || !category?.id) return category
    const t = map[`category_${category.id}`]
    if (!t) return category

    if (t.name) category[`name_${langCode}`] = t.name

    return category
}

/**
 * Apply translations to page texts.
 */
export function translatePageTexts(pt, map, langCode) {
    if (!map || !pt?.id) return pt
    const t = map[`page_text_${pt.id}`]
    if (!t) return pt

    for (const [field, value] of Object.entries(t)) {
        pt[`${field}_${langCode}`] = value
    }

    return pt
}
