import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('server never changes a visitor language from IP, referrer, or cookies', () => {
  const indexSource = fs.readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')

  assert.doesNotMatch(indexSource, /createLocaleRedirect/)
  assert.doesNotMatch(indexSource, /localeRedirect/)
})
