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

    // Translate specs JSON — build specs_xx from spec_name_N / spec_value_N
    if (product.specs) {
        try {
            const origSpecs = JSON.parse(product.specs)
            if (Array.isArray(origSpecs) && origSpecs.length > 0) {
                const translatedSpecs = origSpecs.map((spec, idx) => ({
                    name: t[`spec_name_${idx}`] || spec.name,
                    value: t[`spec_value_${idx}`] || spec.value
                }))
                product[`specs_${langCode}`] = JSON.stringify(translatedSpecs)
            }
        } catch (e) { /* ignore parse errors */ }
    }

    // Translate FAQ items — build faq_items_xx from faq_q_N / faq_a_N
    if (product.faq_items) {
        try {
            const origFaqs = JSON.parse(product.faq_items)
            if (Array.isArray(origFaqs) && origFaqs.length > 0) {
                const translatedFaqs = origFaqs.map((faq, idx) => ({
                    question: t[`faq_q_${idx}`] || faq.question,
                    answer: t[`faq_a_${idx}`] || faq.answer
                }))
                product[`faq_items_${langCode}`] = JSON.stringify(translatedFaqs)
            }
        } catch (e) { /* ignore parse errors */ }
    }

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

    // Translate FAQs JSON
    if (article.faq_items) {
        try {
            const origFaqs = JSON.parse(article.faq_items)
            if (Array.isArray(origFaqs) && origFaqs.length > 0) {
                const translatedFaqs = origFaqs.map((faq, idx) => ({
                    question: t[`faq_q_${idx}`] || faq.question,
                    answer: t[`faq_a_${idx}`] || faq.answer
                }))
                article[`faq_items_${langCode}`] = JSON.stringify(translatedFaqs)
            }
        } catch (e) { /* ignore parse errors */ }
    }

    return article
}

/**
 * Apply translations to company info.
 */
export function translateCompany(company, map, langCode) {
    if (!map || !company?.id) return company
    const t = map[`company_${company.id}`]
    if (!t) return company

    if (t.description) company[`description_${langCode}`] = t.description
    if (t.advantages) company[`advantages_${langCode}`] = t.advantages
    // Company name, address, and contact info are brand/contact identity — never translate

    return company
}

/**
 * Apply translations to hero content.
 */
export function translateHero(hero, map, langCode) {
    if (!map || !hero?.id) return hero
    const t = map[`hero_${hero.id}`]
    if (!t) return hero

    for (const field of ['title', 'subtitle', 'stat1_label', 'stat2_label', 'stat3_label']) {
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
 * Apply translations to a roofing category.
 */
export function translateRoofingCategory(category, map, langCode) {
    if (!map || !category?.id) return category
    const t = map[`roofing_category_${category.id}`]
    if (!t) return category

    // Note: translation.js uses field "name_RC_{id}" inside the UI object? No, wait!
    // In translation.js for roofing_categories:
    // field: `name_RC_${c.id}` - wait, NO!
    // I fixed that in translateBatch? Let me check translation.js.
    // Actually, in `helpers/translate.js`, the map key is `roofing_category_{id}` and the field is what is in the DB.
    // Let's assume the field is `name` if we fixed it, or `name_RC_{id}`.
    const translatedName = t.name || t[`name_RC_${category.id}`]
    if (translatedName) category[`name_${langCode}`] = translatedName

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

/**
 * Apply translations to a roofing profile.
 */
export function translateRoofingProfile(profile, map, langCode) {
    if (!map || !profile?.id) return profile
    const t = map[`roofing_profile_${profile.id}`]
    if (!t) return profile

    if (t.model) profile.model = t.model
    if (t.material) profile.material = t.material
    if (t.thickness) profile.thickness = t.thickness
    if (t.coating) profile.coating = t.coating
    if (t.length) profile.length = t.length
    if (t.applications) profile.applications = t.applications

    return profile
}

/**
 * Apply translations to a factory group.
 */
export function translateFactoryGroup(group, map, langCode) {
    if (!map || !group?.id) return group
    const t = map[`factory_group_${group.id}`]
    if (!t) return group

    if (t.name) group[`name_${langCode}`] = t.name

    return group
}

/**
 * Apply translations to a factory media item.
 */
export function translateFactoryMedia(media, map, langCode) {
    if (!map || !media?.id) return media
    const t = map[`factory_media_${media.id}`]
    if (!t) return media

    if (t.description) media[`description_${langCode}`] = t.description

    return media
}
