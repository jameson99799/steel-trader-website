import{API_BASE,API_KEY}from'./tpl.mjs'
async function main(){
  for(let id=193;id<=222;id++){
    try{
      const r=await fetch(`${API_BASE}/products/${id}`,{method:'DELETE',headers:{'X-API-Key':API_KEY}})
      const j=await r.json()
      console.log(`🗑️ ${id}: ${j.message||'deleted'}`)
    }catch(e){console.log(`⚠️ ${id}: ${e.message}`)}
  }
  console.log('\n✅ All products deleted')
}
main()
