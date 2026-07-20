import test from 'node:test'
import assert from 'node:assert/strict'

test('router-driven language sync does not create a manual preference cookie', async () => {
  const storage = new Map([['lang', 'en']])
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    key: index => [...storage.keys()][index] ?? null,
    get length() { return storage.size }
  }
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    key: () => null,
    length: 0
  }

  const cookieWrites = []
  globalThis.document = {
    createElement: () => ({}),
    createElementNS: () => ({}),
    createTextNode: () => ({}),
    querySelector: () => null,
    set cookie(value) { cookieWrites.push(value) },
    get cookie() { return '' }
  }

  const { useLang } = await import(`../src/composables/useLang.js?locale-preference=${Date.now()}`)
  const { setLang } = useLang()

  await setLang('zh', true)
  assert.deepEqual(cookieWrites, [])

  await setLang('en')
  assert.equal(cookieWrites.length, 2)
  assert.match(cookieWrites[0], /^locale_preference=en;/)
  assert.match(cookieWrites[1], /^locale_auto_selected=;/)
})
