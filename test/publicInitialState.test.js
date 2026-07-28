import test from 'node:test'
import assert from 'node:assert/strict'
import { getPublicTranslationSettings } from '../server/services/publicInitialState.js'

test('reads public translation state from the legacy production schema', () => {
  const queries = []
  const readOne = sql => {
    queries.push(sql)
    if (/\benabled\b/.test(sql) && !/\bmultilingual_enabled\b/.test(sql.replace(/\bmultilingual_enabled\b/g, ''))) {
      throw new Error('no such column: enabled')
    }
    return { multilingual_enabled: 1 }
  }

  assert.deepEqual(getPublicTranslationSettings(readOne), {
    multilingual_enabled: 1
  })
  assert.deepEqual(queries, [
    'SELECT multilingual_enabled FROM translation_settings WHERE id = 1'
  ])
})

test('defaults multilingual rendering to enabled when the settings row is absent', () => {
  assert.deepEqual(getPublicTranslationSettings(() => null), {
    multilingual_enabled: 1
  })
})
