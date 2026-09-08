import { getAll } from '../db.js'

// Locales authored natively in the CMS (English + Chinese content always exist).
export const PRIMARY_CONTENT_LANGS = Object.freeze(['en', 'zh'])

// Fields that must carry a real translation for a variant to be treated as
// fully localized. Mirrors the SSR forceNoindex checks in server/index.js
// (product detail: name + description; news detail: title + content).
const REQUIRED_FIELDS = Object.freeze({
  product: ['name', 'description'],
  news: ['title', 'content']
})

function fullyLocalizedLangs(byLang, type) {
  const required = REQUIRED_FIELDS[type]
  const langs = new Set()
  if (!required) return langs
  for (const [lang, fields] of byLang) {
    if (required.every(f => fields.has(f))) langs.add(lang)
  }
  return langs
}

// Cheap per-item lookup used by the SSR renderer for hreflang/noindex decisions.
export function getLocalizedLangsFor(type, id) {
  const byLang = new Map()
  try {
    const rows = getAll(
      `SELECT content_field, language_code FROM translations
        WHERE content_type=? AND content_id=?
          AND translated_text IS NOT NULL AND length(translated_text) > 0`,
      [type, id]
    )
    for (const row of rows) {
      if (!byLang.has(row.language_code)) byLang.set(row.language_code, new Set())
      byLang.get(row.language_code).add(row.content_field)
    }
  } catch {}
  return fullyLocalizedLangs(byLang, type)
}

// Full-scan coverage map used by the (low-traffic) sitemap routes.
export function getLocalizedCoverage() {
  const byContent = new Map() // `type:id` -> lang -> Set(field)
  try {
    const rows = getAll(
      `SELECT content_type AS t, content_id AS id, content_field AS f, language_code AS l
        FROM translations
        WHERE translated_text IS NOT NULL AND length(translated_text) > 0`
    )
    for (const row of rows) {
      if (!REQUIRED_FIELDS[row.t]) continue
      const key = `${row.t}:${row.id}`
      if (!byContent.has(key)) byContent.set(key, new Map())
      const byLang = byContent.get(key)
      if (!byLang.has(row.l)) byLang.set(row.l, new Set())
      byLang.get(row.l).add(row.f)
    }
  } catch {}

  const coverage = new Map()
  for (const [key, byLang] of byContent) {
    const type = key.slice(0, key.indexOf(':'))
    const langs = fullyLocalizedLangs(byLang, type)
    if (langs.size) coverage.set(key, langs)
  }
  return coverage
}

// Filter an active-language list to the variants safe to index/emit for a page:
// primary locales (en/zh) always + fully-localized secondary locales.
export function indexableLangs(activeLangs, extraLangs = null) {
  const result = []
  for (const l of activeLangs) {
    const code = (l && typeof l === 'string' ? l : l.code) || ''
    if (PRIMARY_CONTENT_LANGS.includes(code) || (extraLangs && extraLangs.has(code))) result.push(l)
  }
  return result
}