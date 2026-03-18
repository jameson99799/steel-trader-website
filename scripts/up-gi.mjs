import{upload,productHtml,IMG}from'./tpl.mjs'
const S=JSON.stringify
const apps=[
  {i:'🏗️',t:'Construction & Roofing',d:'Roofing sheets, wall cladding, purlins, structural decking, and light gauge framing for residential and commercial buildings.'},
  {i:'🏠',t:'Home Appliance',d:'Air conditioner housings, water heater shells, washing machine panels. Requires smooth surface finish with controlled zinc coating.'},
  {i:'🔧',t:'General Fabrication',d:'Ductwork, cable trays, guard rails, storage racks, shelving, signage, enclosures, and general sheet metal fabrication.'},
  {i:'🚗',t:'Automotive & Transport',d:'Floor pans, wheel housings, chassis components, fuel tanks, trailer bodies, and container panels.'}
]
const faq=[
  {q:'What is galvanized steel coil?',a:'Galvanized steel coil (GI) is cold-rolled or hot-rolled steel coated with a zinc layer through the hot-dip galvanizing process. The zinc coating protects the base steel from corrosion through both barrier protection and galvanic (sacrificial) protection.'},
  {q:'What is the difference between GI coil and GI strip?',a:'GI coil is the full-width product (600-1500mm) from the galvanizing line. GI strip is slit from GI coil to narrower widths (30-600mm) for specific applications like pipe making and roll-formed profiles.'},
  {q:'How long does galvanized steel last?',a:'Service life depends on coating weight and environment: Z80 (urban) 15-20 years, Z180 (industrial) 20-30 years, Z275 (marine/severe) 30-50 years.'},
  {q:'What does Z275 mean?',a:'Z275 means 275 g/m² total zinc coating on both sides (approximately 137.5 g/m² per side, about 20μm per side). This is a heavy coating suitable for outdoor and corrosive environments.'},
  {q:'Can you provide customized specifications?',a:'Yes. Thickness, width, coating weight, steel grade, coil weight, surface treatment and export packaging can all be customized.'},
  {q:'What is the MOQ?',a:'25 MT per specification for full containers (20GP). Mixed containers: 5 MT/spec minimum with 25 MT total.'},
  {q:'How do you ensure export quality?',a:'We focus on thickness control, coating verification, surface inspection, packing inspection and shipment preparation to help ensure product quality before export.'}
]
function sp(z,thk,w){return[
  {name:'Product',value:'Galvanized Steel Coil / GI Coil'},{name:'Zinc Coating',value:z},
  {name:'Thickness',value:thk||'0.12 – 4.0 mm'},{name:'Width',value:w||'600 – 1500 mm'},
  {name:'Spangle',value:'Regular / Mini / Zero Spangle'},{name:'Standard',value:'ASTM A653, EN 10346, JIS G3302, GB/T 2518'},
  {name:'Surface',value:'Chromate / Oiled / Chromate-free / Dry'},{name:'Steel Grade',value:'DX51D+Z, DX52D+Z, SGCC, S250GD+Z, S350GD+Z'},
  {name:'Coil ID',value:'508 mm / 610 mm'},{name:'Coil Weight',value:'3 – 12 MT (customizable)'}
]}
const compRows=[
  ['Coating','Pure zinc (Z40-Z600)','55% Al + 43.4% Zn + 1.6% Si (AZ)'],
  ['Corrosion','Good; zinc sacrificial protection','Better flat-panel atmospheric resistance'],
  ['Cut-Edge Protection','Excellent — zinc migrates to cut edges','Lower — aluminum does not migrate easily'],
  ['Heat Resistance','Up to 230°C','Up to 315°C'],
  ['Formability','Excellent for bending, drawing, welding','Good for roofing/cladding; less for deep drawing'],
  ['Surface','Traditional zinc spangle','Bright metallic silver'],
  ['Cost','More economical','5-15% higher'],
  ['Best For','Construction, ducts, fabrication, tubes','Roofing, solar, heat-exposed, PPGL substrate']
]
const adv=[
  {t:'Excellent sacrificial protection',d:'Zinc migrates to protect cut edges and scratches — self-healing corrosion protection'},
  {t:'Superior formability',d:'Excellent for bending, stamping, deep drawing and welding — more versatile than GL'},
  {t:'Cost-effective',d:'Lower cost per ton than Galvalume while providing reliable outdoor corrosion protection'},
  {t:'Wide coating range',d:'Z40 to Z600 g/m² — from light indoor use to extreme marine environments'},
  {t:'Global standard',d:'ASTM A653, EN 10346, JIS G3302 — accepted worldwide with broad market availability'},
  {t:'Versatile applications',d:'Roofing, appliances, automotive, ductwork, furniture, pipes — the most widely used coated steel'}
]

const products=[
{n:'镀锌钢卷',ne:'Galvanized Steel Coil - Hot Dip GI Coil Z40-Z275',sort:0,feat:1,
  hero:'Premium Galvanized Steel Coil Supplier',sub:'Hot-Dip Zinc Coated — Z40 to Z275 — Factory Direct Supply for Roofing, Construction and Industrial Use',
  overview:`<p><strong>Galvanized steel coil</strong> is a coated steel product produced by applying a zinc layer to cold rolled steel through a continuous hot-dip galvanizing process. In international markets, this material is commonly known as <strong>GI coil</strong> or <strong>hot-dip galvanized coil</strong>.</p><p>The zinc coating protects the base steel from corrosion through both barrier protection and galvanic (sacrificial) protection. When the coating is scratched or cut, surrounding zinc migrates to protect exposed steel — a unique self-healing property that makes GI coil one of the most reliable coated steel products available.</p><p>Galvanized steel coil is widely used in roofing systems, wall panels, steel framing, ductwork, appliance housings, automotive parts and general fabrication. It can be processed by bending, cutting, stamping, welding and roll forming, making it a highly practical material for manufacturers and contractors worldwide.</p><p>For buyers, distributors and steel importers, galvanized steel coil offers an excellent balance of cost, durability, processing flexibility and long-term project performance. With coating weights from Z40 to Z275, it serves applications from light indoor use to severe marine environments.</p>`,
  specs:sp('Z40 – Z275 (40-275 g/m²)'),
  seo:{t:'Galvanized Steel Coil | Hot Dip GI Coil Z40-Z275 Manufacturer',d:'Factory direct galvanized steel coil Z40-Z275. Hot-dip GI coil for roofing, construction, appliances. Competitive pricing, fast delivery.',k:'galvanized steel coil, GI coil, hot dip galvanized coil, zinc coated steel coil, galvanized steel manufacturer'}},
{n:'热镀锌钢卷',ne:'Hot Dip Galvanized Steel Coil - HDG Coil Z60-Z275',sort:0,feat:0,
  hero:'Hot Dip Galvanized Steel Coil',sub:'Continuous Hot-Dip Process — Superior Coating Adhesion & Uniformity — Multi-Standard Certified',
  overview:`<p><strong>Hot dip galvanized steel coil (HDG)</strong> is produced on continuous galvanizing lines (CGL) where cold rolled steel strip is immersed in a molten zinc bath at approximately 460°C. The resulting metallurgical bond between zinc and steel creates a coating with superior adhesion that will not peel, flake or blister during normal processing and service.</p><p>The hot-dip process produces a uniform zinc coating across the full coil width and length, ensuring consistent corrosion protection performance. Air knives precisely control coating thickness to meet Z60-Z275 specifications with tight tolerance.</p><p>HDG coil is certified to multiple international standards including ASTM A653, EN 10346, JIS G3302 and GB/T 2518, making it accepted in virtually all global markets. It is the preferred choice for projects requiring documented quality certification and traceable mill test certificates.</p>`,
  specs:sp('Z60 – Z275 (60-275 g/m²)','0.15 – 3.5 mm'),
  seo:{t:'Hot Dip Galvanized Steel Coil HDG | SunSea Steel',d:'Hot-dip galvanized steel coil (HDG) Z60-Z275. Continuous galvanizing line. ASTM A653, EN 10346 certified.',k:'hot dip galvanized steel coil, HDG coil, hot dip zinc coating, continuous galvanizing'}},
{n:'镀锌带钢',ne:'Galvanized Steel Strip - GI Slit Coil 30-600mm Width',sort:0,feat:0,
  hero:'Galvanized Steel Strip',sub:'Precision Slit — 30 to 600mm Width — Burr-Free Edges for Pipe, Profile & Cable Tray',
  overview:`<p><strong>Galvanized steel strip</strong> is produced by precision slitting full-width GI coil (600-1500mm) into narrow widths ranging from 30mm to 600mm. The slitting process uses high-precision rotary shears that produce clean, burr-free edges suitable for downstream processing without additional edge treatment.</p><p>GI strip is essential for applications requiring narrow-width galvanized material: welded pipe and tube making, cable tray manufacturing, roll-formed C/Z purlins, steel strapping, automotive stamping blanks, and precision roll-formed profiles.</p><p>All GI strip inherits the same zinc coating, steel grade and surface quality as the parent coil, with additional edge quality control during the slitting process.</p>`,
  specs:sp('Z40 – Z275 (40-275 g/m²)','0.15 – 3.0 mm','30 – 600 mm (slit to order)'),
  seo:{t:'Galvanized Steel Strip | GI Slit Coil Narrow Width',d:'Galvanized steel strip precision-slit to 30-600mm width. Burr-free edges for pipe, cable tray, and roll forming.',k:'galvanized steel strip, GI strip, slit galvanized coil, narrow GI strip'}},
{n:'GI 钢卷',ne:'GI Steel Coil - Galvanized Iron Coil for Construction',sort:0,feat:0,
  hero:'GI Steel Coil',sub:'Galvanized Iron — The Most Versatile Zinc-Coated Steel for Every Application',
  overview:`<p><strong>GI steel coil</strong> (Galvanized Iron coil) is the industry term for hot-dip galvanized steel coil used across construction, manufacturing and fabrication industries worldwide. The term "GI" is universally recognized in international steel trade and is the most commonly searched product name by steel buyers globally.</p><p>GI coil combines the structural strength of cold rolled steel with the corrosion protection of hot-dip zinc coating, creating a material that is durable, cost-effective and easy to process. It can be corrugated for roofing, roll-formed into purlins and channels, stamped into appliance panels, or fabricated into ductwork and enclosures.</p><p>As one of the highest-volume coated steel products in global trade, GI coil benefits from mature production technology, competitive pricing and broad specification availability.</p>`,
  specs:sp('Z40 – Z275 (40-275 g/m²)'),
  seo:{t:'GI Steel Coil | Galvanized Iron Coil Manufacturer',d:'GI steel coil manufacturer. Galvanized iron coil Z40-Z275 for construction, roofing and industrial fabrication.',k:'GI steel coil, GI coil, galvanized iron coil, GI manufacturer'}},
{n:'GI 带钢',ne:'GI Steel Strip - Galvanized Iron Strip Custom Width',sort:0,feat:0,
  hero:'GI Steel Strip',sub:'Custom-Width Galvanized Strip — Tube Making, Cable Tray, Strapping & Precision Roll Forming',
  overview:`<p><strong>GI steel strip</strong> (Galvanized Iron strip) is narrow-width galvanized steel slit from standard GI coil to customer-specified widths between 30mm and 600mm. It is widely used in industries requiring precision-width galvanized material for automated production lines.</p><p>Common applications include ERW pipe and tube manufacturing, cable tray production, metal strapping, automotive stamping, C/Z purlin roll forming, and narrow profile fabrication. The combination of zinc corrosion protection with precise dimensional control makes GI strip ideal for high-volume automated processing.</p><p>GI strip can be supplied with various edge conditions (slit edge, mill edge) and surface treatments (chromate, oiled, dry) to match specific processing requirements.</p>`,
  specs:sp('Z40 – Z275 (40-275 g/m²)','0.15 – 3.0 mm','30 – 600 mm (slit to order)'),
  seo:{t:'GI Steel Strip | Galvanized Iron Strip Custom Width',d:'GI steel strip slit to custom width 30-600mm. For tube, cable tray, and roll forming.',k:'GI steel strip, GI strip, galvanized iron strip, GI slit strip'}}
]

async function main(){
  const ids=[]
  for(let i=0;i<products.length;i++){
    const p=products[i]
    const data={
      name:p.n,name_en:p.ne,category_id:1,
      description:p.ne.split(' - ')[1]||p.ne,description_en:p.ne.split(' - ')[1]||p.ne,
      specs:S(p.specs),faq_items:S(faq.map(f=>({question:f.q,answer:f.a}))),
      is_featured:p.feat,sort_order:p.sort,status:1,
      seo_title:p.seo.t,seo_description:p.seo.d,seo_keywords:p.seo.k,
      detail_content:productHtml({
        name:p.n,name_en:p.ne,hero:p.hero,sub:p.sub,accent:'#2980b9',
        overview:p.overview,specs:p.specs,apps,faqs:faq,
        compTitle:'Galvanized (GI) vs Galvalume (GL)',compCol1:'Galvanized Steel Coil (GI)',compCol2:'Galvalume Steel Coil (GL)',
        compIntro:'Many buyers compare GI and GL before purchasing. Both are coated steel but their coating composition, performance and best applications differ significantly.',
        compDesc1:'Known for excellent cut-edge protection, superior formability and cost-effectiveness across a wide range of applications.',
        compDesc2:'Offers better flat-panel atmospheric corrosion resistance and heat reflectivity, preferred for premium roofing.',
        compRows,advantages:adv,
        ctaTitle:'Looking for a Reliable Galvanized Steel Coil Supplier?',
        ctaDesc:'Contact us for the latest GI coil pricing, specifications, coating options, export packing and shipping solutions. Factory direct supply for construction, appliance and industrial applications worldwide.'
      })
    }
    const r=await upload('products',data)
    ids.push(r.id)
    console.log(`✅ [${i+1}/5] ${p.n} → id=${r.id}`)
  }
  console.log(`\n🎉 GI products: ${ids.join(', ')}`)
}
main().catch(e=>console.error('❌',e))
