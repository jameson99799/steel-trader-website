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

test('retries always re-translate the full item for context coherence, never skip already-translated fields', () => {
  const tr = read('server/routes/translation.js')
  // executeTranslationTask does NOT accept an isRetry flag
  assert.match(tr, /async function executeTranslationTask\(targetLang, contentType, contentId\)/)
  // The comment explicitly states: always translate all fields, even on retry
  assert.match(tr, /Always translate all fields/)
  // No translatedFieldsSet filtering in executeTranslationTask
  assert.doesNotMatch(tr.match(/function executeTranslationTask[\s\S]{0,2500}/)[0], /translatedFieldsSet/)
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