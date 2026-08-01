export const CATEGORY_INDEX_LASTMOD_QUERY = `
  SELECT created_at AS d
  FROM categories
  ORDER BY created_at DESC
  LIMIT 1
`

export const PRODUCT_CATEGORY_SITEMAP_QUERY = `
  SELECT id, slug, name_en, created_at AS lastmod_date
  FROM categories
  ORDER BY sort_order, id
`

export const NEWS_CATEGORY_SITEMAP_QUERY = `
  SELECT id, slug, name_en, created_at AS lastmod_date
  FROM news_categories
  ORDER BY sort_order, id
`
