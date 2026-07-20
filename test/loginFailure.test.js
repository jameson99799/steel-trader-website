import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

function installBrowserStubs() {
  const storage = new Map([['token', 'stale-token']])
  globalThis.localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    key: index => [...storage.keys()][index] ?? null,
    get length() { return storage.size }
  }
  globalThis.window = { location: { pathname: '/admin/login', href: '' } }
  return storage
}

test('invalid admin credentials stay on the login page and expose the server error', async () => {
  const storage = installBrowserStubs()
  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    headers: { get: () => 'application/json' },
    json: async () => ({ error: '用户名或密码错误' })
  })

  const { api } = await import(`../src/api/index.js?login-failure=${Date.now()}`)
  await assert.rejects(api.login({ username: 'admin', password: 'wrong' }), /用户名或密码错误/)

  assert.equal(window.location.href, '')
  assert.equal(storage.get('token'), 'stale-token')
})

test('admin login renders an inline error instead of relying on a browser alert', () => {
  const source = fs.readFileSync(new URL('../src/views/admin/Login.vue', import.meta.url), 'utf8')
  assert.match(source, /v-if="loginError"/)
  assert.match(source, /role="alert"/)
  assert.doesNotMatch(source, /alert\(e\.message\)/)
})
