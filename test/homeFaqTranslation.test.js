import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('homepage FAQ (home_faq) is registered as a translatable content type in every translation pipeline', () => {
  const tr = read('server/routes/translation.js')
  // Collector registered in PAGES
  assert.match(tr, /home_faq: collectHomeFaqs/)
  // Collector emits faq_q_N / faq_a_N fields carrying the English source text
  assert.match(tr, /function collectHomeFaqs\(\)/)
  assert.match(tr, /`faq_q_\$\{idx\}`/)
  assert.match(tr, /`faq_a_\$\{idx\}`/)
  // Explicit mapping in run-one / run-selective / executeTranslationTask pipelines
  assert.ok((tr.match(/home_faq: 'home_faq'/g) || []).length >= 3)
})

test('homepage FAQ audit section is exposed to the translation report', () => {
  const tr = read('server/routes/translation.js')
  assert.match(tr, /const homeFaqFields = PAGES\.home_faq/)
  assert.match(tr, /home_faq: checkSimpleGroup\(homeFaqFields, 'home_faq', lang\)/)
})

test('homepage FAQ is selectable from the admin UI and counted in audit summaries', () => {
  const vue = read('src/views/admin/Translations.vue')
  assert.match(vue, /'home_faq'/)
  assert.match(vue, /home_faq: '📋 首页FAQ'/)
  assert.ok((vue.match(/lang\.home_faq\?\.missing/g) || []).length >= 2)
})

test('SSR homepage FAQ schema reads AI translations when present, falling back to English defaults', () => {
  const idx = read('server/index.js')
  assert.match(idx, /content_type=\? AND content_id=1 AND content_field=\? AND language_code=\?/)
  assert.match(idx, /`faq_q_\$\{i\}`/)
  assert.match(idx, /`faq_a_\$\{i\}`/)
  assert.match(idx, /homeFaqs\.some|translatedFaqs\.some/)
})

test('per-field translation: each short field gets its own AI call (title/summary/seo_combined/faq_combined)', () => {
  const tr = read('server/routes/translation.js')
  // short fields are translated independently via shortTasks
  assert.match(tr, /const shortTasks = shortItems\.map\(item => async \(\) => \{/)
  // each item builds its own numbered input and its own AI call
  assert.match(tr, /const numberedInput = fieldVals\.map\(\(v, i\) => `\$\{i \+ 1\}\. \$\{v\}`\)\.join/)
  // errors carry the failing field so a retry can target exactly that field
  assert.match(tr, /field: item\.field/)
})

test('retries only re-translate the fields that failed, never rewrite successful ones', () => {
  const tr = read('server/routes/translation.js')
  const jobs = read('server/routes/translation-jobs.js')
  // executeTranslationTask regains its isRetry flag
  assert.match(tr, /async function executeTranslationTask\(targetLang, contentType, contentId, isRetry = false\)/)
  // on retry, already-translated/still-missing fields are filtered to just the missing ones
  assert.match(tr, /if \(isRetry\) \{/)
  assert.match(tr, /translatedFieldsSet\.has\(realField\)/)
  // the queued worker propagates retry_count>0 semantics as isRetry
  assert.match(tr, /executeTranslationTask\(task\.target_lang, task\.item_type, task\.item_id, task\.retry_count > 0\)/)
  // jobs worker records the failed fields and re-translates ONLY those on auto-retry
  assert.match(jobs, /item\._failedFields = \[\.\.\.new Set/)
  assert.match(jobs, /item\._failedFields\.includes\(realField\)/)
})

test('retry queue marks partial success without discarding successful translations', () => {
  const tr = read('server/routes/translation.js')
  const jobs = read('server/routes/translation-jobs.js')
  // jobs worker: partial success ("N成功, M错误") triggers exactly one auto-retry
  assert.match(jobs, /部分成功: \$\{ok\}成功/)
  assert.match(jobs, /item\._retryCount \|\| 0\) < 1/)
  assert.match(jobs, /已加入重试队列/)
  // partial success is counted as an error so it can be re-queued, but results are kept
  assert.match(tr, /UPDATE translation_tasks SET status='error'/)
  assert.match(tr, /retry_count=retry_count\+1 WHERE status='error' AND retry_count=0/)
})