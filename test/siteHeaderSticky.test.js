import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const indexHtml = fs.readFileSync(
  new URL('../index.html', import.meta.url),
  'utf8'
)

const siteHeader = fs.readFileSync(
  new URL('../src/components/SiteHeader.vue', import.meta.url),
  'utf8'
)

test('critical CSS clips horizontal overflow without breaking sticky positioning', () => {
  assert.match(
    indexHtml,
    /html,\s*body\s*\{[^}]*overflow-x:\s*clip;/
  )
  assert.doesNotMatch(
    indexHtml,
    /html,\s*body\s*\{[^}]*overflow-x:\s*hidden;/
  )
})

test('site header keeps the complete header sticky at the viewport top', () => {
  assert.match(
    siteHeader,
    /\.site-header\s*\{[^}]*position:\s*sticky;[^}]*top:\s*0;/
  )
})
