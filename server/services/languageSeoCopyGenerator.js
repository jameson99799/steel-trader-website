import { getAll, getOne } from '../db.js'
import {
  collectLanguageSeoCopy,
  enhanceWithDefaultChannel,
  translateBatch
} from '../routes/translation.js'
import { getMissingSeoCopy } from './languageSeoReadiness.js'

const SEO_RULES = `[SEO metadata task]
Generate natural, keyword-rich localized SEO metadata, not a literal word-for-word translation.
- title: keep it under 60 characters where the language allows.
- description: 120-160 characters, include the product category and a clear B2B value proposition.
- Keep placeholders such as {company} and {category} unchanged.
- Do not add quotes, labels such as "Title:", explanations, or markdown.
- Do not mix English into the target language except standard grade names (GI, GL, PPGI, PPGL, CRC, RAL).`

export async function generateLanguageSeoCopy(code) {
  const language = getOne('SELECT * FROM languages WHERE code = ? AND status = 1', [code])
  if (!language) {
    const error = new Error(`目标语言不存在或未启用: ${code}`)
    error.statusCode = 404
    throw error
  }
  if (code === 'en') {
    const error = new Error('English is the source language; SEO copy generation is not required')
    error.statusCode = 400
    throw error
  }

  const settings = enhanceWithDefaultChannel(
    getOne('SELECT * FROM translation_settings WHERE id = 1') || {}
  )
  if (!settings?.api_key) {
    const error = new Error('AI API key is not configured')
    error.statusCode = 400
    throw error
  }

  const items = collectLanguageSeoCopy()
  const { results, errors } = await translateBatch(
    settings,
    items,
    code,
    language.name,
    '',
    3,
    SEO_RULES
  )

  const rows = getAll(
    'SELECT page_key, title, description, is_manual FROM language_seo_copy WHERE language_code = ? ORDER BY page_key',
    [code]
  )

  return {
    language_code: code,
    generated: results.length,
    total: items.length,
    errors,
    missing: getMissingSeoCopy(code),
    rows
  }
}
