import{API_BASE,API_KEY}from'./tpl.mjs'
async function patch(id,data){
  const r=await fetch(`${API_BASE}/products/${id}`,{method:'PUT',headers:{'Content-Type':'application/json','X-API-Key':API_KEY},body:JSON.stringify(data)})
  return r.json()
}
// Product IDs by category:
// GI:   223,224,225,226,227
// GL:   228,229,230,231,232,233,234
// PPGI: 235,236,237,238
// PPGL: 239,240,241,242
// CRC:  243,244,245,246
// Roof: 247,248,249,250,251,252
const cats=[
  [223,224,225,226,227],           // GI (5)
  [228,229,230,231,232,233,234],   // GL (7)
  [235,236,237,238],               // PPGI (4)
  [239,240,241,242],               // PPGL (4)
  [243,244,245,246],               // CRC (4)
  [247,248,249,250,251,252]        // Roof (6)
]
// Interleave: round-robin 1 from each category
const interleaved=[]
const maxLen=Math.max(...cats.map(c=>c.length))
for(let row=0;row<maxLen;row++){
  for(const cat of cats){
    if(row<cat.length) interleaved.push(cat[row])
  }
}
// Also set is_featured=1 for first product in each category
const featured=new Set(cats.map(c=>c[0]))

async function main(){
  console.log('📊 Setting interleaved sort_order for 30 products...\n')
  for(let i=0;i<interleaved.length;i++){
    const id=interleaved[i]
    const sortVal=300-i*5
    const data={sort_order:sortVal}
    if(featured.has(id)) data.is_featured=1
    const r=await patch(id,data)
    console.log(`  #${i+1} id=${id} sort=${sortVal}${featured.has(id)?' ⭐':''} → ${r.message||'ok'}`)
  }
  console.log('\n✅ Interleaved sort order applied!')
  console.log('Order:',interleaved.join(', '))
}
main().catch(e=>console.error('❌',e))
