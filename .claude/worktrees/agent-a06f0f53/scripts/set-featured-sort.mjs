// Set sort_order for 6 featured products (1 per category) so they appear first in ALL PRODUCTS
// Higher sort_order = appears first (backend uses ORDER BY sort_order DESC)
const API_BASE = 'https://www.sunseasteel.com/api/external'
const API_KEY = 'ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5'

async function patch(id, data) {
  const r = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify(data)
  })
  return r.json()
}

// Featured products (1 per category, the "main" product):
// Cat 1 GI:    id=103 "Hot Dip Galvanized Steel Coil Z40-Z275"  (the flagship GI product)
// Cat 2 GL:    id=118 "Galvalume Steel Coil AZ50-AZ185"          (the flagship GL product) 
// Cat 3 PPGL:  id=133 "PE Polyester Prepainted Galvalume Steel Coil"
// Cat 4 PPGI:  id=148 "PE Polyester PPGI Coil — Economy Color Steel"
// Cat 5 Roof:  id=163 "Corrugated Roofing Sheet 850mm"           (most popular roofing)
// Cat 6 CRC:   id=178 "Cold Rolled Steel Coil SPCC/DC01"         (standard CRC)

const featured = [
  { id: 103, sort: 100, name_en: 'Galvanized Steel Coil - GI Coil Z40-Z275 | Hot Dip Galvanized Steel Strip' },
  { id: 118, sort: 100, name_en: 'Galvalume Steel Coil - GL Coil AZ50-AZ185 | Aluminized Zinc Steel Strip' },
  { id: 133, sort: 100, name_en: 'Prepainted Galvalume Steel Coil - PPGL Color Coated Aluzinc Roof Sheet' },
  { id: 148, sort: 100, name_en: 'Prepainted Galvanized Steel Coil - PPGI Color Coated Steel Sheet' },
  { id: 163, sort: 100, name_en: 'Corrugated Roofing Sheet - Metal Roof Panel | GI GL PPGI PPGL Roof Tile' },
  { id: 178, sort: 100, name_en: 'Cold Rolled Steel Coil - CRC SPCC DC01 | Cold Rolled Steel Sheet Strip' }
]

async function main() {
  for (const f of featured) {
    const r = await patch(f.id, { sort_order: f.sort, is_featured: 1, name_en: f.name_en })
    console.log(`✅ id=${f.id} sort_order=${f.sort} → ${f.name_en}`, r.message || r)
  }
  console.log('\n🎉 6 featured products set with sort_order=100 (appear first)')
}

main().catch(e => console.error('❌', e))
