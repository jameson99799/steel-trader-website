import{upload,productHtml,IMG}from'./tpl.mjs'
const S=JSON.stringify
const apps=[
  {i:'🏠',t:'Home Appliance',d:'Refrigerator, washing machine, air conditioner panels. Ultra-smooth surface for painting, lamination, or direct use.'},
  {i:'🚗',t:'Automotive',d:'Body panels, door inners, structural reinforcements. Multiple grades from CQ to EDDQ for formability requirements.'},
  {i:'🔧',t:'General Fabrication',d:'Stamping, bending, deep drawing, roll forming. Enclosures, brackets, panels, shelving, drums, tubes.'},
  {i:'🏗️',t:'Coating Substrate',d:'Base substrate for GI, GL, PPGI, PPGL production on CGL/CCL lines. Optimized surface chemistry and roughness.'}
]
const faq=[
  {q:'What is cold rolled steel coil?',a:'CRC is hot-rolled steel further processed at room temperature through cold reduction mills. This reduces thickness (0.15-3.0mm), improves surface finish, tightens dimensional tolerances (±0.02mm), and increases strength.'},
  {q:'What is SPCC / DC01?',a:'SPCC (JIS G3141) and DC01 (EN 10130) are equivalent commercial quality CRC grades. Both have yield ≤280MPa, tensile 270-410MPa, elongation ≥28%.'},
  {q:'What is black annealed coil?',a:'Black annealed CRC is annealed without bright finish — the surface has a dark oxide layer. Cheaper than bright-annealed, used for drums, tubes, pipes where surface appearance is not critical.'},
  {q:'CRC vs HRC — what is the difference?',a:'CRC is cold-reduced from HRC: thinner (0.15-3mm vs 1.2-25mm), smoother surface (Ra 0.4-1.8μm vs 3-12μm), tighter tolerances (±0.02mm vs ±0.1mm), higher strength from work hardening.'},
  {q:'What is the MOQ?',a:'25 MT per specification. Mixed containers: 5 MT/spec minimum with 25 MT total.'}
]
function sp(grade,thk){return[
  {name:'Product',value:'Cold Rolled Steel Coil / CRC'},{name:'Steel Grade',value:grade},
  {name:'Thickness',value:thk||'0.15 – 3.0 mm'},{name:'Width',value:'600 – 1500 mm'},
  {name:'Surface',value:'Bright / Matte / 2B / BA'},{name:'Standard',value:'ASTM A1008, EN 10130, JIS G3141, GB/T 708'},
  {name:'Coil ID',value:'508 mm / 610 mm'},{name:'Tolerance',value:'Thickness ±0.02mm, Width ±1mm'}
]}
const compRows=[
  ['Processing','Cold reduced at room temperature','Hot rolled at 900-1200°C'],
  ['Thickness','0.15 – 3.0 mm','1.2 – 25 mm'],
  ['Surface','Smooth (Ra 0.4-1.8μm)','Rougher (Ra 3-12μm)'],
  ['Tolerance','±0.02mm thickness','±0.1mm thickness'],
  ['Strength','Higher (work hardened)','Standard'],
  ['Cost','Higher (additional processing)','Lower'],
  ['Best For','Appliances, automotive, coating substrate','Structural, heavy fabrication, CRC substrate']
]
const adv=[
  {t:'Precision gauge control',d:'Thickness tolerance ±0.02mm — critical for automotive and appliance panel consistency'},
  {t:'Superior surface quality',d:'Ultra-smooth Ra 0.4-1.8μm finish for painting, lamination, plating and direct visible use'},
  {t:'Excellent formability',d:'CQ to SDDQ grades for simple bending to complex deep drawing applications'},
  {t:'Tight dimensional tolerance',d:'Width ±1mm, flatness ≤5mm/m — ensures precision in automated stamping lines'},
  {t:'Ideal coating substrate',d:'Optimized surface chemistry for GI/GL/PPGI/PPGL production on continuous coating lines'},
  {t:'Multiple grade options',d:'SPCC/DC01 (CQ) to DC06 (SDDQ) — precise grade matching to application requirements'}
]
const products=[
{n:'冷轧钢卷',ne:'Cold Rolled Steel Coil - CRC SPCC/DC01-DC06',feat:1,
  hero:'Cold Rolled Steel Coil',sub:'SPCC/DC01 to DC06 — Full Range — Appliance, Automotive & Coating Substrate',
  overview:`<p><strong>Cold rolled steel coil (CRC)</strong> is produced by further processing hot-rolled steel at room temperature through cold reduction mills. This cold rolling process reduces thickness to 0.15-3.0mm, dramatically improves surface finish to Ra 0.4-1.8μm, tightens dimensional tolerances to ±0.02mm, and increases material strength through work hardening.</p><p>CRC is available in multiple quality levels: Commercial Quality (CQ/SPCC/DC01), Drawing Quality (DQ/SPCD/DC03), Deep Drawing Quality (DDQ/SPCE/DC04), Extra Deep Drawing Quality (EDDQ/DC05) and Super Extra Deep Drawing Quality (SEDDQ/DC06). Each grade offers progressively better formability for increasingly complex stamping and drawing operations.</p><p>As the base material for galvanized (GI), Galvalume (GL), and prepainted (PPGI/PPGL) steel production, CRC is one of the most fundamental steel products in the global supply chain.</p>`,
  specs:sp('SPCC / DC01-DC06 (CQ to SDDQ)'),
  seo:{t:'Cold Rolled Steel Coil | CRC SPCC DC01-DC06',d:'Cold rolled steel coil CRC. SPCC/DC01 to DC06. Full range from CQ to super deep drawing. Factory direct.',k:'cold rolled steel coil, CRC coil, SPCC steel coil, DC01 coil'}},
{n:'CRC钢卷',ne:'CRC Steel Coil - Cold Rolled Carbon Steel Factory Direct',feat:0,
  hero:'CRC Steel Coil',sub:'Factory Direct Cold Rolled — Precision Gauge ±0.02mm — Multi-Finish Options',
  overview:`<p><strong>CRC steel coil</strong> (Cold Rolled Coil) is the universal industry term for cold-reduced flat steel products. "CRC" is the most commonly searched and traded term in international steel procurement for cold rolled products.</p><p>CRC is characterized by precision thickness control (±0.02mm), excellent surface quality and consistent mechanical properties. It is supplied in bright and matte finishes for applications ranging from simple fabrication to demanding automotive stamping.</p><p>As one of the highest-volume flat steel products in global trade, CRC benefits from mature production technology, standardized specifications and competitive pricing from multiple manufacturing bases.</p>`,
  specs:sp('CQ / DQ / DDQ (SPCC-DC04)'),
  seo:{t:'CRC Steel Coil | Cold Rolled Carbon Steel Factory',d:'CRC steel coil factory direct. Cold rolled carbon steel 0.15-3.0mm. Precision tolerance.',k:'CRC steel coil, CRC coil, cold rolled carbon steel'}},
{n:'SPCC钢卷',ne:'SPCC Steel Coil - Commercial Quality Cold Rolled',feat:0,
  hero:'SPCC Steel Coil',sub:'Commercial Quality CRC — JIS G3141 — The Industry Standard Grade',
  overview:`<p><strong>SPCC steel coil</strong> is the JIS G3141 designation for commercial quality cold rolled steel coil — the most widely used CRC grade globally. SPCC is equivalent to DC01 (EN 10130) and A1008 CS Type B (ASTM), ensuring worldwide interchangeability and acceptance.</p><p>With yield strength ≤280 MPa, tensile strength 270-410 MPa and elongation ≥28%, SPCC provides a balanced combination of strength and formability suitable for the widest range of fabrication applications: bending, mild forming, welding, roll forming and general sheet metal work.</p><p>SPCC is the default specification for general fabrication, furniture manufacturing, appliance housings, electrical enclosures and as coating substrate material.</p>`,
  specs:sp('SPCC / DC01 / A1008 CS Type B','0.20 – 3.0 mm'),
  seo:{t:'SPCC Steel Coil | Commercial Quality CRC DC01',d:'SPCC steel coil - commercial quality CRC equivalent to DC01. Standard cold rolled grade for general fabrication.',k:'SPCC steel coil, SPCC coil, DC01 steel coil'}},
{n:'黑退钢卷',ne:'Black Annealed Steel Coil - BA Cold Rolled for Tubes',feat:0,
  hero:'Black Annealed Steel Coil',sub:'Cost-Effective Annealed CRC — Drum Making, Tube Welding & General Fabrication',
  overview:`<p><strong>Black annealed steel coil</strong> is cold rolled steel that has been annealed in a non-protective atmosphere, resulting in a dark oxide layer on the surface instead of the bright finish of standard annealed CRC. This simplified annealing process reduces production cost, making black annealed coil a more economical option for applications where surface appearance is not critical.</p><p>Black annealed coil retains the formability benefits of annealing (restored ductility after cold rolling) while offering a lower price point. It is widely used for drum and barrel making, ERW tube and pipe welding, general fabrication, fencing and applications where the product will be painted, galvanized or otherwise coated after fabrication.</p><p>The dark oxide surface also provides temporary storage protection and serves as a good base for subsequent painting or coating processes.</p>`,
  specs:sp('Black Annealed (SPCC base)','0.15 – 2.0 mm'),
  seo:{t:'Black Annealed Steel Coil | BA Cold Rolled for Tubes',d:'Black annealed cold rolled steel coil for drum making, tube welding and general fabrication.',k:'black annealed steel coil, BA coil, annealed cold rolled'}}
]
async function main(){
  const ids=[]
  for(let i=0;i<products.length;i++){
    const p=products[i]
    const data={
      name:p.n,name_en:p.ne,category_id:6,
      description:p.ne.split(' - ')[1]||p.ne,description_en:p.ne.split(' - ')[1]||p.ne,
      specs:S(p.specs),faq_items:S(faq.map(f=>({question:f.q,answer:f.a}))),
      is_featured:p.feat||0,sort_order:0,status:1,
      seo_title:p.seo.t,seo_description:p.seo.d,seo_keywords:p.seo.k,
      detail_content:productHtml({
        name:p.n,name_en:p.ne,hero:p.hero,sub:p.sub,accent:'#2c3e50',
        overview:p.overview,specs:p.specs,apps,faqs:faq,
        compTitle:'Cold Rolled (CRC) vs Hot Rolled (HRC)',compCol1:'Cold Rolled Steel (CRC)',compCol2:'Hot Rolled Steel (HRC)',
        compIntro:'CRC and HRC are both flat steel products but differ significantly in processing, surface quality, thickness range and applications.',
        compDesc1:'Precision-processed for superior surface quality, tight tolerances and excellent formability.',
        compDesc2:'Cost-effective for structural applications where surface finish and tight tolerances are not critical.',
        compRows,advantages:adv,
        ctaTitle:'Looking for Quality Cold Rolled Steel Coil?',
        ctaDesc:'Contact us for CRC pricing, grade selection, surface finish options and export solutions. Factory direct worldwide.'
      })
    }
    const r=await upload('products',data)
    ids.push(r.id)
    console.log(`✅ [${i+1}/4] ${p.n} → id=${r.id}`)
  }
  console.log(`\n🎉 CRC products: ${ids.join(', ')}`)
}
main().catch(e=>console.error('❌',e))
