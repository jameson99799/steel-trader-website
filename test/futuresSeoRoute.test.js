import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const serverSource = readFileSync(new URL('../server/index.js', import.meta.url), 'utf8')

test('localized futures SSR selects the watchlist id used by translation lookup', () => {
  assert.match(serverSource, /SELECT id, symbol, name, name_en FROM futures_watchlist ORDER BY sort_order ASC/)
  assert.match(serverSource, /content_type=\? AND content_id=\? AND language_code=\? AND content_field=\?[^\n]+\['futures_watchlist', w\.id, lang, 'name'\]/)
})
