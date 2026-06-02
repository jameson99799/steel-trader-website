import{upload,productHtml,IMG}from'./tpl.mjs'
const S=JSON.stringify
const apps=[
  {i:'🏗️',t:'Building Envelope',d:'Exterior wall panels, interior partitions, ceiling tiles, decorative facades, curtain wall infills, and architectural cladding systems.'},
  {i:'🏠',t:'Appliance & Furniture',d:'Refrigerator panels, washing machine shells, air conditioner housings, office furniture panels, whiteboard surfaces, and display cabinets.'},
  {i:'🏭',t:'Industrial Cladding',d:'Factory wall cladding, clean room panels, cold storage walls, PEB roof and wall sheets, and controlled-environment enclosures.'},
  {i:'📦',t:'Roll Forming',d:'Corrugated roofing, trapezoidal sheets, C/Z purlins, door panels, shutter slats, garage door sections, and sandwich panel facings.'}
]
const faq=[
  {q:'What is PPGI?',a:'PPGI (Prepainted Galvanized Iron) is galvanized steel coated with primer and paint on a continuous coil coating line (CCL). It provides color, aesthetics, and additional corrosion protection beyond the base zinc coating.'},
  {q:'What paint systems are available?',a:'PE (Polyester, 15-20μm, economy), SMP (Silicon Modified Polyester, 20-25μm, enhanced UV), HDP (High Durability Polyester, 20-25μm, premium), PVDF (Polyvinylidene Fluoride, 25μm, ultra-premium 20+ year exterior).'},
  {q:'How to choose RAL color?',a:'Provide RAL number (e.g. RAL 9003 Signal White), Pantone code, or physical sample. We color-match to ΔE ≤ 1.5 (visually identical). Popular: RAL 9002, 9003, 9006, 3009, 5015, 6005.'},
  {q:'What is the difference between PPGI and PPGL?',a:'PPGI uses GI (zinc) substrate; PPGL uses GL (Al-Zn) substrate. PPGL costs 5-10% more but lasts 30-50% longer. PPGL is preferred for premium exterior; PPGI is economical for interior and light-duty.'},
  {q:'What is the MOQ?',a:'25 MT per color/specification for full containers. Mixed containers: 5 MT/color minimum with 25 MT total.'},
  {q:'Can wrinkle/textured finish be produced?',a:'Yes. Wrinkle PE, embossed SMP and textured finishes are available for decorative applications. These finishes hide minor scratches and fingerprints.'}
]
function sp(paint){return[
  {name:'Product',value:'Prepainted Galvanized Steel Coil / PPGI Coil'},{name:'Paint System',value:paint},
  {name:'Substrate',value:'Hot-Dip Galvanized Steel (GI, Z40-Z275)'},{name:'Thickness',value:'0.12 – 1.2 mm'},
  {name:'Width',value:'600 – 1250 mm'},{name:'Top Paint',value:'15-25μm (PE/SMP/HDP/PVDF)'},
  {name:'Back Paint',value:'5-10μm Epoxy Primer'},{name:'Colors',value:'RAL, Pantone, or custom color matching'},
  {name:'Standard',value:'ASTM A755, EN 10169, JIS G3312, GB/T 12754'},{name:'Gloss',value:'20-80% (matte to high gloss)'}
]}
const compRows=[
  ['Substrate','GI (zinc coated)','GL (55% Al-Zn coated)'],
  ['Corrosion Life','Good; standard outdoor performance','2-4× longer than PPGI in same conditions'],
  ['Cost','More economical','5-10% higher'],
  ['Best For','Interior, light exterior, appliances','Premium roofing, marine, harsh environments'],
  ['Paint Adhesion','Excellent on zinc surface','Excellent on Al-Zn surface'],
  ['Heat Resistance','Standard (GI substrate 230°C)','Higher (GL substrate 315°C)'],
  ['Market Share','Higher volume, broader availability','Growing premium segment']
]
const adv=[
  {t:'Wide RAL color range',d:'Thousands of RAL, Pantone and custom colors available with ΔE ≤ 1.5 color matching accuracy'},
  {t:'Multiple paint systems',d:'PE economy to PVDF ultra-premium — matched to application requirements and budget'},
  {t:'Excellent paint adhesion',d:'Continuous CCL coating ensures uniform paint thickness and adhesion across entire coil length'},
  {t:'Cost-effective color solution',d:'Lower cost than PPGL while providing reliable color and corrosion protection for most applications'},
  {t:'Versatile processing',d:'Can be corrugated, roll-formed, bent, stamped and profiled without paint cracking or delamination'},
  {t:'10-25 year paint warranty',d:'PE 10-15 years, SMP 15-20 years, HDP 20-25 years, PVDF 25+ years depending on environment'}
]
const products=[
{n:'预涂镀锌钢卷',ne:'Prepainted Galvanized Steel Coil - PPGI Color Coated GI',feat:1,
  hero:'Prepainted Galvanized Steel Coil',sub:'Color Coated GI — PE/SMP/HDP/PVDF Paint Systems — RAL & Custom Colors',
  overview:`<p><strong>Prepainted galvanized steel coil (PPGI)</strong> is produced by applying primer and topcoat paint to hot-dip galvanized steel on a continuous coil coating line (CCL). The result is a factory-finished color steel product that combines the structural strength and corrosion protection of galvanized steel with the aesthetic appeal and additional weather resistance of paint coatings.</p><p>PPGI is available in multiple paint systems — from economy PE (Polyester) to ultra-premium PVDF (Polyvinylidene Fluoride) — enabling precise matching of coating performance to application requirements and budget. RAL standard colors, Pantone codes and custom color matching are all supported.</p><p>The continuous CCL process ensures uniform paint thickness, excellent adhesion and consistent color across the entire coil, producing a finished product ready for immediate fabrication without the need for downstream painting. This significantly reduces project construction time, eliminates on-site paint VOC emissions and provides superior coating quality compared to post-fabrication painting.</p>`,
  specs:sp('PE / SMP / HDP / PVDF (customer choice)'),
  seo:{t:'Prepainted Galvanized Steel Coil PPGI | Color Coated GI',d:'PPGI prepainted galvanized steel coil. PE/SMP/HDP/PVDF paint. RAL color matching. Factory direct for roofing and appliances.',k:'prepainted galvanized steel coil, PPGI coil, color coated GI, prepainted GI coil, PPGI manufacturer'}},
{n:'PPGI钢卷',ne:'PPGI Steel Coil - Pre-Painted GI Coil Factory Direct',feat:0,
  hero:'PPGI Steel Coil',sub:'Pre-Painted Galvanized Iron — Economy to Premium Paint — Factory Direct Global Supply',
  overview:`<p><strong>PPGI steel coil</strong> (Pre-Painted Galvanized Iron) is the most widely used color-coated steel product in global construction and manufacturing markets. The acronym "PPGI" is universally recognized in international steel trade and is the most commonly searched term by steel buyers seeking color-coated galvanized products.</p><p>PPGI combines the proven corrosion protection of galvanized (zinc) steel with factory-applied paint coatings, creating a ready-to-use colored steel material. With paint systems ranging from economy PE to premium PVDF, PPGI serves applications from budget-conscious light-duty interior use to demanding long-term exterior exposure.</p><p>As the highest-volume prepainted steel product, PPGI benefits from mature production technology, competitive pricing, broad color availability and established global supply chains.</p>`,
  specs:sp('PE (economy) / SMP / HDP / PVDF (premium)'),
  seo:{t:'PPGI Steel Coil | Pre-Painted GI Coil Factory',d:'PPGI steel coil factory direct. Pre-painted galvanized iron coil with PE to PVDF paint.',k:'PPGI steel coil, PPGI coil, pre-painted GI, PPGI coil factory, color steel coil'}},
{n:'彩涂镀锌钢卷',ne:'Color Coated Galvanized Steel Coil - Painted GI Sheet',feat:0,
  hero:'Color Coated Galvanized Steel Coil',sub:'Smooth Color + Zinc Protection — 10 to 25 Year Paint Warranty — Glossy & Matte Finishes',
  overview:`<p><strong>Color coated galvanized steel coil</strong> is the descriptive term for PPGI — galvanized steel that has been factory-coated with color paint. This product is widely used in markets where buyers search by descriptive name rather than the PPGI acronym.</p><p>Available in smooth glossy and matte finishes with paint warranties from 10 to 25+ years, color coated GI serves roofing, wall panel, interior decoration, appliance and industrial cladding applications. The combination of zinc corrosion protection with durable paint coating provides both structural and aesthetic performance.</p><p>Standard and custom RAL colors are available, with careful color matching to ensure consistency across production batches.</p>`,
  specs:sp('PE 15-20μm / SMP 20-25μm / HDP 20-25μm'),
  seo:{t:'Color Coated Galvanized Steel Coil | Painted GI',d:'Color coated galvanized steel coil with 10-25 year paint warranty. PE/SMP/HDP for roofing and walling.',k:'color coated galvanized steel, painted GI coil, color steel coil'}},
{n:'网纹/皱纹彩涂镀锌钢卷',ne:'Wrinkle Textured PPGI Coil - Embossed Matte Color GI',feat:0,
  hero:'Wrinkle Textured PPGI Coil',sub:'Embossed Matte Finish — Scratch-Resistant — Premium Aesthetic for Decorative Applications',
  overview:`<p><strong>Wrinkle textured PPGI coil</strong> features a specially formulated paint that creates an embossed, matte, wrinkle-finish surface during the curing process. Unlike standard smooth PPGI, the textured surface hides minor scratches, fingerprints and handling marks, making it ideal for applications where the product will be regularly touched or exposed to incidental contact.</p><p>The wrinkle finish is produced by controlling paint formulation, coating thickness and curing temperature to create a controlled surface texture. Typical wrinkle paint thickness is 25-35μm — heavier than standard smooth PE (15-20μm) — providing additional mechanical and weather protection.</p><p>Popular applications include garage doors, roller shutters, interior wall panels, decorative building facades, elevator interiors and premium consumer product housings where a high-end matte aesthetic is desired.</p>`,
  specs:sp('Wrinkle PE 25-35μm / Embossed SMP'),
  seo:{t:'Wrinkle PPGI Coil | Textured Embossed Color GI',d:'Wrinkle textured PPGI coil with embossed matte surface. Scratch-resistant for garage doors and decorative panels.',k:'wrinkle PPGI, textured PPGI coil, embossed color steel, wrinkle finish GI'}}
]
async function main(){
  const ids=[]
  for(let i=0;i<products.length;i++){
    const p=products[i]
    const data={
      name:p.n,name_en:p.ne,category_id:4,
      description:p.ne.split(' - ')[1]||p.ne,description_en:p.ne.split(' - ')[1]||p.ne,
      specs:S(p.specs),faq_items:S(faq.map(f=>({question:f.q,answer:f.a}))),
      is_featured:p.feat||0,sort_order:0,status:1,
      seo_title:p.seo.t,seo_description:p.seo.d,seo_keywords:p.seo.k,
      detail_content:productHtml({
        name:p.n,name_en:p.ne,hero:p.hero,sub:p.sub,accent:'#e74c3c',
        overview:p.overview,specs:p.specs,apps,faqs:faq,
        compTitle:'PPGI vs PPGL',compCol1:'PPGI (GI Substrate)',compCol2:'PPGL (GL Substrate)',
        compIntro:'Both PPGI and PPGL are color coated steel products. The key difference is the substrate: PPGI uses galvanized (zinc) substrate while PPGL uses Galvalume (Al-Zn) substrate.',
        compDesc1:'Cost-effective color coated solution with broad market availability and wide application range.',
        compDesc2:'Premium color coated solution with 2-4× longer substrate corrosion life for demanding exterior use.',
        compRows,advantages:adv,
        ctaTitle:'Looking for Quality PPGI Color Coated Steel?',
        ctaDesc:'Contact us for PPGI pricing, RAL color matching, paint system recommendations, export packing and shipping. Factory direct worldwide.'
      })
    }
    const r=await upload('products',data)
    ids.push(r.id)
    console.log(`✅ [${i+1}/4] ${p.n} → id=${r.id}`)
  }
  console.log(`\n🎉 PPGI products: ${ids.join(', ')}`)
}
main().catch(e=>console.error('❌',e))
