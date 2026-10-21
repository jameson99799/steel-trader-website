import { getAll, getOne } from '../db.js'
import { SEO_PAGE_KEYS } from './seoContent.js'

export const REQUIRED_UI_TEXT_KEYS = Object.freeze([
  'about',
  'contactUs',
  'products',
  'news',
  'email',
  'phone',
  'address',
  'name',
  'message',
  'submit',
  'sendInquiry',
  'getInTouch',
  'formIntro',
  'contactInfo',
  'companyLabel',
  'ourAdvantages',
  'factory',
  'factoryTour',
  'factoryDesc',
  'ralColors',
  'ralColorChart',
  'ralDesc',
  'roofingProfiles',
  'roofingProfilesDesc',
  'futuresTitle',
  'futuresDesc',
  'futuresName',
  'futuresPriceBtn',
  'homeCategories',
  'homeProducts',
  'homeQuickLinks',
  'homeFaq',
  'allProducts',
  'featuredProducts'
])

export const REQUIRED_PAGE_TEXT_KEYS = Object.freeze([
  'contact_page_subtitle',
  'contact_form_desc'
])

export const REQUIRED_COMPANY_FIELDS = Object.freeze([
  'description',
  'advantages'
])

export function findMissingKeys(rows, requiredKeys, field = 'content_field') {
  const present = new Set(rows.map(row => row[field]))
  return requiredKeys.filter(key => !present.has(key))
}

export function findMissingSeoCopyRows(rows, requiredKeys = SEO_PAGE_KEYS) {
  const byKey = new Map(rows.map(row => [row.page_key, row]))
  return requiredKeys.filter(pageKey => {
    const row = byKey.get(pageKey)
    return !row || !String(row.title || '').trim() || !String(row.description || '').trim()
  })
}

export function getMissingSeoCopy(langCode) {
  let rows = []
  try {
    rows = getAll(
      'SELECT page_key, title, description FROM language_seo_copy WHERE language_code = ?',
      [langCode]
    )
  } catch {}
  return findMissingSeoCopyRows(rows)
}

export function getMissingUiTranslations(langCode) {
  let rows = []
  try {
    rows = getAll(
      `SELECT content_field FROM translations
        WHERE language_code = ? AND content_type IN ('ui_text', 'futures')
          AND content_id = 'static'
          AND translated_text IS NOT NULL AND length(translated_text) > 0`,
      [langCode]
    )
  } catch {}
  return findMissingKeys(rows, REQUIRED_UI_TEXT_KEYS)
}

export function getMissingCompanyFields(langCode) {
  let rows = []
  try {
    rows = getAll(
      `SELECT content_field FROM translations
        WHERE language_code = ? AND content_type = 'company' AND content_id = 1
          AND content_field IN (${REQUIRED_COMPANY_FIELDS.map(() => '?').join(',')})
          AND translated_text IS NOT NULL AND length(translated_text) > 0`,
      [langCode, ...REQUIRED_COMPANY_FIELDS]
    )
  } catch {}
  return findMissingKeys(rows, REQUIRED_COMPANY_FIELDS)
}

export function getMissingPageTexts(langCode) {
  let rows = []
  try {
    rows = getAll(
      `SELECT content_field FROM translations
        WHERE language_code = ? AND content_type = 'page_text' AND content_id = 1
          AND content_field IN (${REQUIRED_PAGE_TEXT_KEYS.map(() => '?').join(',')})
          AND translated_text IS NOT NULL AND length(translated_text) > 0`,
      [langCode, ...REQUIRED_PAGE_TEXT_KEYS]
    )
  } catch {}
  return findMissingKeys(rows, REQUIRED_PAGE_TEXT_KEYS)
}

export function getLanguageSeoReadiness(langCode) {
  const missingSeoCopy = getMissingSeoCopy(langCode)
  const missingUiTexts = getMissingUiTranslations(langCode)
  const missingCompanyFields = getMissingCompanyFields(langCode)
  const missingPageTexts = getMissingPageTexts(langCode)
  return {
    ready: missingSeoCopy.length === 0
      && missingUiTexts.length === 0
      && missingCompanyFields.length === 0
      && missingPageTexts.length === 0,
    missingSeoCopy,
    missingUiTexts,
    missingCompanyFields,
    missingPageTexts
  }
}

export function getLanguageByCode(code) {
  return getOne('SELECT * FROM languages WHERE code = ?', [code])
}
