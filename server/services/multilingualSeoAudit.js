import { getAll, getOne } from '../db.js'
import { PRIMARY_CONTENT_LANGS } from './indexingPolicy.js'
import {
  getLanguageSeoReadiness,
  getRequiredUiTextKeys,
  REQUIRED_COMPANY_FIELDS,
  REQUIRED_PAGE_TEXT_KEYS
} from './languageSeoReadiness.js'
import { SEO_PAGE_KEYS } from './seoContent.js'

function safeCount(sql, params = []) {
  try {
    return getOne(sql, params)?.c || 0
  } catch {
    return 0
  }
}

function safeAll(sql, params = []) {
  try {
    return getAll(sql, params)
  } catch {
    return []
  }
}

function completeTranslationIds(contentType, fields, languageCode) {
  const placeholders = fields.map(() => '?').join(',')
  const rows = safeAll(
    `SELECT content_id, COUNT(DISTINCT content_field) AS c
       FROM translations
      WHERE language_code = ? AND content_type = ?
        AND content_field IN (${placeholders})
        AND translated_text IS NOT NULL AND length(translated_text) > 0
      GROUP BY content_id`,
    [languageCode, contentType, ...fields]
  )
  return new Set(rows.filter(row => row.c === fields.length).map(row => String(row.content_id)))
}

function auditContentSet({ table, contentType, fields, languageCode, label, statusClause = '' }) {
  const total = safeCount(`SELECT COUNT(*) AS c FROM ${table} WHERE 1=1 ${statusClause}`)
  const rows = safeAll(`SELECT * FROM ${table} WHERE 1=1 ${statusClause}`)
  const completeIds = completeTranslationIds(contentType, fields, languageCode)
  const missing = rows
    .filter(row => !completeIds.has(String(row.id)))
    .map(row => ({
      id: row.id,
      slug: row.slug || null,
      name: row.name_en || row.name || row.title_en || row.title || String(row.id)
    }))
  return {
    label,
    total,
    translated: Math.max(0, total - missing.length),
    missing: missing.length,
    examples: missing.slice(0, 8)
  }
}

function scoreFor({ isPrimary, readiness, uiKeysCount, products, news, categories, newsCategories }) {
  if (isPrimary) return 100
  const ratios = []
  ratios.push(1 - readiness.missingSeoCopy.length / SEO_PAGE_KEYS.length)
  ratios.push(1 - readiness.missingUiTexts.length / Math.max(1, uiKeysCount))
  ratios.push(1 - readiness.missingCompanyFields.length / REQUIRED_COMPANY_FIELDS.length)
  ratios.push(1 - readiness.missingPageTexts.length / REQUIRED_PAGE_TEXT_KEYS.length)
  ratios.push(products.total ? products.translated / products.total : 1)
  ratios.push(news.total ? news.translated / news.total : 1)
  ratios.push(categories.total ? categories.translated / categories.total : 1)
  ratios.push(newsCategories.total ? newsCategories.translated / newsCategories.total : 1)
  const average = ratios.reduce((sum, value) => sum + Math.max(0, Math.min(1, value)), 0) / ratios.length
  return Math.round(average * 100)
}

export function auditMultilingualSeo({ lang = null } = {}) {
  const languages = lang
    ? safeAll('SELECT * FROM languages WHERE code = ? ORDER BY sort_order ASC', [lang])
    : safeAll('SELECT * FROM languages ORDER BY sort_order ASC, id ASC')
  const productsTotal = safeCount('SELECT COUNT(*) AS c FROM products WHERE status = 1')
  const newsTotal = safeCount('SELECT COUNT(*) AS c FROM news WHERE status = 1')
  const categoriesTotal = safeCount('SELECT COUNT(*) AS c FROM categories')
  const newsCategoriesTotal = safeCount('SELECT COUNT(*) AS c FROM news_categories')

  const languageAudits = languages.map(language => {
    const isPrimary = PRIMARY_CONTENT_LANGS.includes(language.code)
    const indexable = !!language.status && (isPrimary || !!language.seo_index_ready)
    const requiredUiKeys = getRequiredUiTextKeys(language.code)
    const readiness = isPrimary
      ? {
          ready: true,
          missingSeoCopy: [],
          missingUiTexts: [],
          missingCompanyFields: [],
          missingPageTexts: []
        }
      : getLanguageSeoReadiness(language.code)

    const products = isPrimary
      ? { label: 'products', total: productsTotal, translated: productsTotal, missing: 0, examples: [] }
      : auditContentSet({
          table: 'products',
          contentType: 'product',
          fields: ['name', 'description'],
          languageCode: language.code,
          label: 'products',
          statusClause: 'AND status = 1'
        })
    const news = isPrimary
      ? { label: 'news', total: newsTotal, translated: newsTotal, missing: 0, examples: [] }
      : auditContentSet({
          table: 'news',
          contentType: 'news',
          fields: ['title', 'content'],
          languageCode: language.code,
          label: 'news',
          statusClause: 'AND status = 1'
        })
    const categories = isPrimary
      ? { label: 'categories', total: categoriesTotal, translated: categoriesTotal, missing: 0, examples: [] }
      : auditContentSet({
          table: 'categories',
          contentType: 'category',
          fields: ['name'],
          languageCode: language.code,
          label: 'categories'
        })
    const newsCategories = isPrimary
      ? { label: 'news_categories', total: newsCategoriesTotal, translated: newsCategoriesTotal, missing: 0, examples: [] }
      : auditContentSet({
          table: 'news_categories',
          contentType: 'news_category',
          fields: ['name'],
          languageCode: language.code,
          label: 'news_categories'
        })

    const issues = []
    if (language.status && !indexable) {
      issues.push('未开启 SEO 收录：该语言所有页面为 noindex，不进入 sitemap/hreflang')
    }
    if (readiness.missingSeoCopy.length) {
      issues.push(`SEO 文案缺少 ${readiness.missingSeoCopy.length} 组：${readiness.missingSeoCopy.join(', ')}`)
    }
    if (readiness.missingUiTexts.length) {
      issues.push(`UI 译文缺少 ${readiness.missingUiTexts.length} 项，页面按钮/标题可能中英混杂`)
    }
    if (readiness.missingCompanyFields.length) {
      issues.push(`公司简介缺少：${readiness.missingCompanyFields.join(', ')}`)
    }
    if (readiness.missingPageTexts.length) {
      issues.push(`Contact 页面文案缺少：${readiness.missingPageTexts.join(', ')}`)
    }
    if (products.missing) {
      issues.push(`${products.missing} 个产品缺少完整 name+description 译文，对应详情页不会 index，列表可能回退英文`)
    }
    if (news.missing) {
      issues.push(`${news.missing} 篇文章缺少完整 title+content 译文，对应详情页不会 index，列表可能回退英文`)
    }
    if (categories.missing) {
      issues.push(`${categories.missing} 个产品分类缺少名称译文，分类页标题可能中英混杂`)
    }
    if (newsCategories.missing) {
      issues.push(`${newsCategories.missing} 个新闻分类缺少名称译文，分类页标题可能中英混杂`)
    }

    const listingPages = 9 + categoriesTotal + newsCategoriesTotal
    const indexablePages = indexable ? listingPages + products.translated + news.translated : 0

    return {
      code: language.code,
      name: language.name,
      status: language.status,
      seo_index_ready: isPrimary ? 1 : (language.seo_index_ready ? 1 : 0),
      indexable,
      score: scoreFor({ isPrimary, readiness, uiKeysCount: requiredUiKeys.length, products, news, categories, newsCategories }),
      seo_copy: {
        total: SEO_PAGE_KEYS.length,
        complete: SEO_PAGE_KEYS.length - readiness.missingSeoCopy.length,
        missing: readiness.missingSeoCopy
      },
      ui_texts: {
        total: requiredUiKeys.length,
        missing: readiness.missingUiTexts
      },
      company: {
        total: REQUIRED_COMPANY_FIELDS.length,
        missing: readiness.missingCompanyFields
      },
      page_texts: {
        total: REQUIRED_PAGE_TEXT_KEYS.length,
        missing: readiness.missingPageTexts
      },
      products,
      news,
      categories,
      news_categories: newsCategories,
      mixed_language_risk: !isPrimary && issues.length > 0,
      indexable_pages: indexablePages,
      issues
    }
  })

  const readyCount = languageAudits.filter(item => item.indexable).length
  const mixedRiskCount = languageAudits.filter(item => item.mixed_language_risk).length
  const totalIndexablePages = languageAudits.reduce((sum, item) => sum + item.indexable_pages, 0)

  return {
    generated_at: new Date().toISOString(),
    summary: {
      languages: languageAudits.length,
      ready: readyCount,
      not_ready: languageAudits.length - readyCount,
      mixed_language_risk: mixedRiskCount,
      products: productsTotal,
      news: newsTotal,
      categories: categoriesTotal,
      news_categories: newsCategoriesTotal,
      total_indexable_pages: totalIndexablePages
    },
    languages: languageAudits
  }
}
