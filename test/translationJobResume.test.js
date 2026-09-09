import test from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// The resume-path helpers are imported from the REAL job engine so the
// pause→resume breakpoint test drives production code.
const { filterPageItemsByExisting, filterToUntranslated } = await import(
  pathToFileURL(join(__dirname, '..', 'server', 'routes', 'translation-jobs.js')).href
)

// ── Fake page-items (mirrors server/routes/translation.js collectNews) ──
function newsPageItems(articleIds) {
  const out = []
  for (const id of articleIds) {
    const itemName = `News #${id}`
    out.push({ type: 'news', id, field: 'title', text: `Title ${id}`, itemName })
    out.push({ type: 'news', id, field: 'summary', text: `Summary ${id}`, itemName })
    out.push({
      type: 'news', id, field: 'seo_combined', combined: true,
      subFields: ['seo_title', 'seo_description', 'seo_keywords'],
      text: JSON.stringify({ seo_title: `ST ${id}`, seo_description: `SD ${id}`, seo_keywords: `SK ${id}` }),
      itemName
    })
    out.push({ type: 'news', id, field: 'content', text: `<p>content ${id}</p>`, long_html: true, itemName })
  }
  return out
}

function articleQueue(articleIds, langs) {
  const items = []
  for (const id of articleIds) {
    for (const lang of langs) {
      items.push({ type: 'news', id, itemName: `News #${id}`, targetLang: lang })
    }
  }
  return items
}

test('filterPageItemsByExisting: combined + plain + name_NC_ field semantics', () => {
  const pageItems = [
    { type: 'news', id: 1, field: 'title', text: 'Title' },
    { type: 'news', id: 1, field: 'name_NC_5', text: 'Cat 5' },   // maps to 'name'
    { type: 'news', id: 1, field: 'seo_combined', combined: true,
      text: JSON.stringify({ seo_title: 'A', seo_description: 'B', seo_keywords: 'C' }) }
  ]

  // fully translated → all dropped
  const doneSet = new Set(['title', 'name', 'seo_title', 'seo_description', 'seo_keywords'])
  assert.deepStrictEqual(filterPageItemsByExisting(pageItems, doneSet), [])

  // name_NC_5 must be matched via its STORED field 'name', not literal key
  const wrongSet = new Set(['name_NC_5', 'title'])
  const kept = filterPageItemsByExisting(pageItems, wrongSet)
  assert.equal(kept.length, 2, 'name_NC_* must resolve to realField=name')
  assert.equal(kept[0].field, 'name_NC_5', 'field not in translated set (via realField) must be kept')
  assert.equal(kept[1].field, 'seo_combined')

  // combined: only missing sub-fields remain
  const partial = new Set(['seo_title'])
  const after = filterPageItemsByExisting([
    { type: 'news', id: 1, field: 'seo_combined', combined: true,
      text: JSON.stringify({ seo_title: 'A', seo_description: 'B' }) }
  ], partial)
  assert.equal(after.length, 1)
  assert.deepStrictEqual(JSON.parse(after[0].text), { seo_description: 'B' })
})

test('filterToUntranslated: resume rebuilds the exact remaining queue', () => {
  const articleIds = Array.from({ length: 100 }, (_, i) => i + 1)   // 100 articles
  const langs = ['es', 'fr', 'de']                                  // 300 queue items
  const allItems = articleQueue(articleIds, langs)

  // Simulate: paused with 150 shown, but in-flight drain actually completed
  // articles 1..59 for es/fr and 1..60 for de → 178 of the 300 items done.
  const getPageItems = () => newsPageItems(articleIds)
  const getTranslatedByItem = (lang, type) => {
    const map = new Map()
    const doneArticles = lang === 'de' ? 60 : 59
    for (let id = 1; id <= doneArticles; id++) {
      map.set(String(id), new Set(['title', 'summary', 'seo_title', 'seo_description', 'seo_keywords', 'content']))
    }
    return map
  }

  const remaining = filterToUntranslated(allItems, { getPageItems, getTranslatedByItem })
  assert.equal(remaining.length, 122, '178 done ⇒ exactly 122 left')

  // Order is preserved and it starts exactly after the last finished item.
  for (const lang of langs) {
    const doneForLang = lang === 'de' ? 60 : 59
    const firstForLang = remaining.find(r => r.targetLang === lang)
    assert.equal(firstForLang.id, doneForLang + 1, `${lang} must resume at the true breakpoint`)
    for (let id = 1; id <= doneForLang; id++) {
      const dup = remaining.some(r => r.targetLang === lang && r.id === id)
      assert.equal(dup, false, `${lang} item ${id} is already done and must not be re-added`)
    }
  }
})

test('filterToUntranslated: partially-translated items are kept', () => {
  const allItems = articleQueue([1], ['es'])
  const getPageItems = () => newsPageItems([1])
  const getTranslatedByItem = () => new Map([['1', new Set(['title'])]]) // only 1 of 6 fields

  const remaining = filterToUntranslated(allItems, { getPageItems, getTranslatedByItem })
  assert.equal(remaining.length, 1, 'partial items must be resumed, not skipped')
})

test('TODO-less guard: worker + resume paths both use the shared ground-truth filter', () => {
  const source = readFileSync(join(__dirname, '..', 'server', 'routes', 'translation-jobs.js'), 'utf8')
  assert.match(source, /filterPageItemsByExisting\(itemsRaw, translatedFieldsSet\)/)
  assert.match(source, /resumeFromPauseFlags\.set\(id, true\)/)
  assert.match(source, /const rebuilt = collectTranslationItems\(job, langCodes\)/)
  assert.match(source, /pendingItems = filterToUntranslated\(rebuilt\)/)
})