import{API_BASE,API_KEY}from'./tpl.mjs'
async function del(id){
  const r=await fetch(`${API_BASE}/products/${id}`,{method:'DELETE',headers:{'X-API-Key':API_KEY}})
  return r.json()
}
async function main(){
  // Delete products id 103-192
  for(let id=103;id<=192;id++){
    try{const r=await del(id);console.log(`🗑️ product ${id}: ${r.message||JSON.stringify(r)}`)}catch(e){console.log(`⚠️ product ${id}: ${e.message}`)}
  }
  console.log('\n✅ All products deleted')
}
main()
