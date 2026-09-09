import test from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// The skip-translated helper is imported from the REAL job engine so the
// worker's retry/fill-missing semantics drive production code.
const { filterPageItemsByExisting } = await import(
  pathToFileURL(join(__dirname, '..', 'server', 'routes', 'translation-jobs.js')).href
)

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

test('resumed jobs continue the saved queue EXACTLY, never skipping pre-translated items', () => {
  const source = readFileSync(join(__dirname, '..', 'server', 'routes', 'translation-jobs.js'), 'utf8')
  // Resume must use the persisted queue snapshot regardless of what translations
  // already exist — re-running the same scope is a full re-translate workflow.
  assert.match(source, /pendingItems = JSON\.parse\(job\.pending_items\)/)
  // The ground-truth skip filter must NOT appear anywhere in the job engine.
  assert.doesNotMatch(source, /filterToUntranslated/)
  assert.doesNotMatch(source, /resumeFromPauseFlags/)
  // The resume log tells the user the exact continuation position.
  assert.match(source, /将从第 \$\{startPos\} 项开始/)
  assert.match(source, /恢复后将从第 \$\{doneTotal \+ 1\} 项继续/)
})

test('worker still uses skip-translated engine for retry / fill-missing mode', () => {
  const source = readFileSync(join(__dirname, '..', 'server', 'routes', 'translation-jobs.js'), 'utf8')
  assert.match(source, /filterPageItemsByExisting\(itemsRaw, translatedFieldsSet\)/)
  assert.match(source, /const filteredByExisting = isRetry \|\| !!job\.skip_translated/)
})