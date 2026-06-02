import{upload,productHtml,IMG,API_BASE,API_KEY}from'./tpl.mjs'
const S=JSON.stringify

// ═══════════════════ Roofing shared data ═══════════════════
const roofApps=[
  {i:'🏠',t:'Residential Roofing',d:'Villas, townhouses, rural houses. Color-matched roofing sheets with 15-25+ year life. Lightweight, easy installation.'},
  {i:'🏗️',t:'Commercial Building',d:'Warehouses, factories, shopping centers, airports. Large-span roofing with excellent water drainage and wind resistance.'},
  {i:'🏭',t:'Industrial Facility',d:'Steel structure workshops, pre-engineered buildings (PEB), cold storage, logistics parks. Cost-effective metal cladding.'},
  {i:'🌾',t:'Agricultural',d:'Poultry houses, barns, grain silos, greenhouses. Corrosion-resistant roofing for high-humidity agricultural environments.'}
]
const roofFaq=[
  {q:'What is the standard roofing sheet length?',a:'Standard lengths: 1000-6000mm. Custom lengths up to 12000mm available. Most roof projects use 2000-4000mm panels to minimize end laps and reduce leak risk.'},
  {q:'What thickness for roofing?',a:'Residential: 0.35-0.50mm. Commercial: 0.40-0.60mm. Industrial: 0.50-0.80mm. Thicker = stronger wind uplift resistance and lower oil-canning risk.'},
  {q:'What substrate is best for roofing?',a:'GL (Galvalume AZ150) substrate is the industry standard for roofing — 2-4× longer life than GI (zinc). PPGL offers color + maximum corrosion resistance. Full-hard GI is economical for light-duty applications.'},
  {q:'What is the MOQ for roofing sheets?',a:'5,000 linear meters or 25 MT per profile/color. Mixed containers available with 25 MT total minimum.'}
]
function roofSpecs(profile,sub,thk){return[
  {name:'Profile',value:profile},{name:'Substrate',value:sub},{name:'Thickness',value:thk||'0.12-0.80mm'},
  {name:'Effective Width',value:'750-1050mm (profile dependent)'},{name:'Length',value:'1000-12000mm (custom)'},
  {name:'Standard',value:'AS 1397, ASTM A653/A792, EN 10346, JIS G3302/3321'},
  {name:'Wind Uplift',value:'Tested to AS/NZS 1170.2 & ASCE 7'},{name:'Coating',value:'Z40-Z275 / AZ50-AZ185 / PE/SMP/HDP/PVDF paint'}
]}

// ═══════════════════ 6 Roofing Products ═══════════════════
const roofProducts=[
{n:'波纹屋顶钢板',ne:'Corrugated Roofing Sheet - Wave Profile Metal Roof Panel',
  desc:'Classic corrugated (波纹) roofing sheet with sinusoidal wave profile. The most traditional and widely recognized metal roof profile. Excellent water drainage and structural strength.',
  hero:'Corrugated Roofing Sheet',sub:'Classic Wave Profile — Universal Metal Roof — Proven Performance',
  badges:['🌊 Wave Profile','📏 0.12-0.80mm','🏗️ Universal','💧 Drainage'],accent:'#e74c3c',
  specs:roofSpecs('Corrugated (sinusoidal wave), pitch 76mm, depth 18-25mm','GI / GL / PPGI / PPGL'),
  seo:{t:'Corrugated Roofing Sheet | Wave Profile Metal Roof',d:'Corrugated roofing sheet with classic wave profile. GI/GL/PPGI/PPGL substrate. Factory direct for residential and commercial roofing.',k:'corrugated roofing sheet, wave profile roof, corrugated metal roof, corrugated steel sheet, metal roof panel'}},
{n:'T型屋顶钢板',ne:'Trapezoidal Roofing Sheet - T-Profile IBR Metal Roof Panel',
  desc:'Trapezoidal (T型/梯形) roofing sheet with IBR (Inverted Box Rib) profile. Superior spanning capability and water drainage vs corrugated. The modern industrial roofing standard.',
  hero:'Trapezoidal Roofing Sheet',sub:'T-Profile IBR — Superior Span — The Modern Industrial Standard',
  badges:['📐 T-Profile','📏 0.25-0.80mm','🏭 Industrial','💪 Long Span'],accent:'#3498db',
  specs:roofSpecs('Trapezoidal (IBR), rib height 35-55mm, pitch 200-333mm','GI / GL / PPGI / PPGL','0.25-0.80mm'),
  seo:{t:'Trapezoidal Roofing Sheet | T-Profile IBR Metal Roof',d:'Trapezoidal roofing sheet with IBR profile. Superior spanning for industrial and commercial metal roofing. GI/GL/PPGI/PPGL.',k:'trapezoidal roofing sheet, IBR roof panel, T-profile roof, trapezoidal metal roof, IBR metal sheet'}},
{n:'镀锌波纹屋顶钢板',ne:'Galvanized Corrugated Roofing Sheet - GI Zinc Roof Panel',
  desc:'Galvanized (GI) corrugated roofing sheet with Z40-Z275 zinc coating. Cost-effective metallic-finish roofing for residential, agricultural, and light commercial applications.',
  hero:'Galvanized Corrugated Roofing Sheet',sub:'GI Zinc Coated — Economical Metal Roofing — Z40 to Z275',
  badges:['🔩 Zinc Coated','📏 0.12-0.60mm','💰 Economy','🏠 Residential'],accent:'#27ae60',
  specs:roofSpecs('Corrugated (wave), pitch 76mm, depth 18-25mm','Hot-Dip Galvanized (GI) Z40-Z275','0.12-0.60mm'),
  seo:{t:'Galvanized Corrugated Roofing Sheet GI | SunSea Steel',d:'Galvanized corrugated roofing sheet Z40-Z275. GI zinc coated roof panel for residential and agricultural use. Factory direct.',k:'galvanized corrugated roofing, GI roof sheet, zinc roof panel, galvanized roof sheet, GI corrugated'}},
{n:'镀铝锌波纹屋顶钢板',ne:'Galvalume Corrugated Roofing Sheet - GL Aluzinc Roof Panel',
  desc:'Galvalume (GL) corrugated roofing sheet with AZ50-AZ185 aluminum-zinc coating. 2-4× longer life than GI. The premium metallic-finish roofing choice for durability-critical projects.',
  hero:'Galvalume Corrugated Roofing Sheet',sub:'GL Aluzinc Coated — 2-4× Longer Life — Premium Metallic Roof',
  badges:['⚗️ Al-Zn Coated','📏 0.25-0.60mm','🏆 Premium','☀️ Heat Resist'],accent:'#e67e22',
  specs:roofSpecs('Corrugated (wave), pitch 76mm, depth 18-25mm','Galvalume (GL) AZ50-AZ185','0.25-0.60mm'),
  seo:{t:'Galvalume Corrugated Roofing Sheet GL | SunSea Steel',d:'Galvalume corrugated roofing sheet AZ50-AZ185. 55% Al-Zn coated roof panel. 2-4× longer life than GI roofing.',k:'galvalume corrugated roofing, GL roof sheet, aluzinc roof panel, galvalume roof sheet, GL corrugated'}},
{n:'全硬屋顶钢板',ne:'Full Hard Roofing Sheet - High Strength Structural Roof Panel',
  desc:'Full hard (全硬) roofing sheet with high yield strength (≥550 MPa). No annealing after cold rolling. Provides maximum structural rigidity for long-span roofing and wall cladding.',
  hero:'Full Hard Roofing Sheet',sub:'High Strength ≥550 MPa — Maximum Rigidity — Long Span Capability',
  badges:['💪 Full Hard','📏 0.12-0.50mm','🏭 Structural','📐 Long Span'],accent:'#2c3e50',
  specs:roofSpecs('Corrugated / Trapezoidal (customer choice)','Full Hard GI (Z40-Z150) / Full Hard GL (AZ50-AZ100)','0.12-0.50mm'),
  seo:{t:'Full Hard Roofing Sheet | High Strength Roof Panel',d:'Full hard roofing sheet ≥550 MPa yield. Maximum structural rigidity for long-span metal roofing. GI/GL substrate.',k:'full hard roofing sheet, full hard roof panel, high strength roofing, structural roof sheet, full hard GI'}},
{n:'彩涂屋顶钢板',ne:'Color Coated Roofing Sheet - PPGI PPGL Painted Roof Panel',
  desc:'Color coated (彩涂) roofing sheet with PPGI/PPGL substrate. RAL and custom colors with PE/SMP/HDP/PVDF paint. The complete aesthetic + protection roofing solution.',
  hero:'Color Coated Roofing Sheet',sub:'PPGI/PPGL Painted — RAL Colors — Beautiful + Durable',
  badges:['🎨 RAL Colors','📏 0.25-0.80mm','🏠 Beautiful','🏆 Durable'],accent:'#9b59b6',
  specs:roofSpecs('Corrugated / Trapezoidal / Tile profile (customer choice)','PPGI (GI+Paint) or PPGL (GL+Paint)','0.25-0.80mm'),
  seo:{t:'Color Coated Roofing Sheet PPGI PPGL | SunSea Steel',d:'Color coated roofing sheet PPGI/PPGL. RAL colors, PE to PVDF paint. Beautiful and durable metal roof panels.',k:'color coated roofing sheet, PPGI roof sheet, PPGL roof panel, painted roofing, color roof sheet'}}
]

// ═══════════════════ Upload Roofing Products ═══════════════════
async function main(){
  const roofIds=[]
  let idx=0
  for(const p of roofProducts){
    idx++
    const ov=`<p><strong>${p.ne}</strong> — ${p.desc}</p><p>Manufactured with precision roll forming from certified GI/GL/PPGI/PPGL coil. Every shipment includes material test reports. Custom profiles, lengths, and colors available.</p>`
    const data={
      name:p.n,name_en:p.ne,category_id:5,
      description:p.desc,description_en:p.desc,
      specs:S(p.specs),faq_items:S(roofFaq.map(f=>({question:f.q,answer:f.a}))),
      is_featured:idx===1?1:0, sort_order:0, status:1,
      seo_title:p.seo.t,seo_description:p.seo.d,seo_keywords:p.seo.k,
      detail_content:productHtml({
        name:p.n,name_en:p.ne,hero:p.hero,sub:p.sub,
        badges:p.badges,accent:p.accent,
        overview:ov,specs:p.specs,apps:roofApps,faqs:roofFaq
      })
    }
    const r=await upload('products',data)
    roofIds.push(r.id)
    console.log(`✅ [${idx}/6] Roof: ${p.n} → id=${r.id}`)
  }
  console.log(`\n🎉 6 roofing products uploaded: ${roofIds.join(', ')}`)

  // ═══════════════════ Interleaved Sort Order ═══════════════════
  // Existing IDs:
  // GI:   193,194,195,196,197 (5 products)
  // GL:   198,199,200,201,202,203,204 (7 products)
  // PPGI: 205,206,207,208 (4 products)
  // PPGL: 209,210,211,212 (4 products)
  // CRC:  213,214,215,216 (4 products)
  // Roof: roofIds[0..5] (6 products)

  // Categories in interleave order: GI, GL, PPGI, PPGL, CRC, Roof
  const cats=[
    [193,194,195,196,197],           // GI (5)
    [198,199,200,201,202,203,204],   // GL (7)
    [205,206,207,208],               // PPGI (4)
    [209,210,211,212],               // PPGL (4)
    [213,214,215,216],               // CRC (4)
    roofIds                          // Roof (6)
  ]

  // Build interleaved order: take 1 from each category in round-robin
  const interleaved=[]
  const maxLen=Math.max(...cats.map(c=>c.length))
  for(let row=0;row<maxLen;row++){
    for(const cat of cats){
      if(row<cat.length) interleaved.push(cat[row])
    }
  }

  // Assign sort_order DESC: first product gets highest value
  console.log('\n📊 Setting interleaved sort_order...')
  for(let i=0;i<interleaved.length;i++){
    const id=interleaved[i]
    const sortVal=300-i*5  // 300, 295, 290, 285, ...
    const r=await fetch(`${API_BASE}/products/${id}`,{
      method:'PUT',
      headers:{'Content-Type':'application/json','X-API-Key':API_KEY},
      body:JSON.stringify({sort_order:sortVal})
    }).then(r=>r.json())
    console.log(`  #${i+1} id=${id} sort=${sortVal} → ${r.message||'ok'}`)
  }

  console.log('\n✅ Interleaved sort order set!')
  console.log('Order: ' + interleaved.join(', '))
}
main().catch(e=>console.error('❌',e))
