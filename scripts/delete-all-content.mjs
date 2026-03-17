// Delete all uploaded products (id 13-102) and articles (id 5-64)
const API_BASE = 'https://www.sunseasteel.com/api/external'
const API_KEY = 'ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5'
const headers = { 'X-API-Key': API_KEY }

async function del(endpoint, id) {
  const r = await fetch(`${API_BASE}/${endpoint}/${id}`, { method: 'DELETE', headers })
  const j = await r.json()
  return j.success
}

async function main() {
  console.log('🗑️  Deleting products id=13-102...')
  for (let id = 13; id <= 102; id++) {
    const ok = await del('products', id)
    process.stdout.write(ok ? '✅' : '❌')
  }
  console.log('\n🗑️  Deleting articles id=5-64...')
  for (let id = 5; id <= 64; id++) {
    const ok = await del('news', id)
    process.stdout.write(ok ? '✅' : '❌')
  }
  console.log('\n🎉 All content deleted.')
}
main()
