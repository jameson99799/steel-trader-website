import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('legacy queue recovers running rows and treats partial output as an error', () => {
  const source = read('server/routes/translation.js')
  assert.match(source, /translation_tasks SET status='pending'[\s\S]{0,160}status='running'/)
  assert.match(source, /result\.errors[\s\S]{0,100}length > 0/)
  assert.doesNotMatch(source, /result\.errors && result\.errors\.length > 0 && \(!result\.results/)
})

test('background jobs recover to resumable pause and persist pending work', () => {
  const source = read('server/routes/translation-jobs.js')
  assert.match(source, /status='paused'[\s\S]{0,180}status IN \('pending', 'running', 'pausing', 'aborting'\)/)
  assert.match(source, /pending_items: JSON\.stringify/)
  assert.match(source, /status IN \('pending', 'running', 'pausing', 'aborting'\)/)
})

test('translation concurrency is bounded and UI tracks transitional states', () => {
  const source = read('server/routes/translation-jobs.js')
  assert.match(source, /normalizeTranslationConcurrency/)
  const ui = read('src/views/admin/Translations.vue')
  assert.match(ui, /\['running', 'pausing', 'aborting'\]\.includes\(j\.status\)/)
})
