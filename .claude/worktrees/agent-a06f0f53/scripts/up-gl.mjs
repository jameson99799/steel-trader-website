import{upload,productHtml,IMG}from'./tpl.mjs'
const S=JSON.stringify
const apps=[
  {i:'🏗️',t:'Roofing & Cladding',d:'Premium roofing and wall cladding. 55% Al-Zn provides 2-4× longer life than GI in marine and industrial environments.'},
  {i:'☀️',t:'Solar Energy',d:'Solar panel mounting frames, racking systems, and ground screws. Excellent heat resistance up to 315°C continuous service.'},
  {i:'🏭',t:'Industrial Building',d:'Pre-engineered building (PEB) roofing, insulated sandwich panel facings, rain gutters, ventilation ducts, and structural decking.'},
  {i:'🔧',t:'PPGL Substrate',d:'Base substrate for prepainted Galvalume (PPGL) production on continuous color coating lines. Requires AFP or chromate surface.'}
]
const faq=[
  {q:'What is Galvalume steel coil?',a:'Galvalume (GL) is steel coated with an alloy of 55% aluminum, 43.4% zinc, and 1.6% silicon by hot-dip process. It combines aluminum barrier resistance with zinc sacrificial protection, providing 2-4× longer life than standard galvanized in most environments.'},
  {q:'What is the difference between GI and GL?',a:'GI uses pure zinc coating; GL uses 55% Al-Zn alloy. GL has 2-4× better flat panel corrosion resistance but GI has better cut-edge protection. GL resists heat to 315°C vs 230°C for GI.'},
  {q:'What does AZ150 mean?',a:'AZ150 means 150 g/m² total Al-Zn coating on both sides (75 g/m² per side). This is the standard coating for roofing and most GL applications globally.'},
  {q:'What is AFP surface treatment?',a:'AFP (Anti-Finger Print) is a clear chromate-free coating applied to GL surface. It prevents fingerprint marking during handling and provides additional corrosion protection.'},
  {q:'Can Galvalume be used for roofing?',a:'Yes. Galvalume is one of the most popular roofing materials globally because of its heat reflectivity, corrosion resistance and long outdoor service life (25-50 years).'},
  {q:'What is the MOQ?',a:'25 MT per specification for full containers. Mixed containers: 5 MT/spec minimum with 25 MT total.'},
  {q:'Can you provide customized specifications?',a:'Yes. Thickness, width, coating weight, steel grade, surface treatment and export packaging can all be customized.'}
]
function sp(az,thk,w){return[
  {name:'Product',value:'Galvalume Steel Coil / GL Coil / Aluzinc Coil'},{name:'Coating',value:az},
  {name:'Composition',value:'55% Aluminum + 43.4% Zinc + 1.6% Silicon'},{name:'Thickness',value:thk||'0.12 – 4.0 mm'},
  {name:'Width',value:w||'600 – 1500 mm'},{name:'Standard',value:'ASTM A792, EN 10346, JIS G3321, GB/T 55441'},
  {name:'Surface',value:'AFP (Anti-Finger Print) / Oiled / Chromate / Bare'},{name:'Steel Grade',value:'DX51D+AZ, DX52D+AZ, S350GD+AZ, S550GD+AZ, G550'},
  {name:'Coil ID',value:'508 mm / 610 mm'},{name:'Coil Weight',value:'3 – 10 MT (customizable)'}
]}
const compRows=[
  ['Coating','55% Al + 43.4% Zn + 1.6% Si alloy','Pure zinc (Z40-Z600)'],
  ['Flat Panel Corrosion','2-4× better than GI','Good, depends on zinc weight'],
  ['Cut-Edge Protection','Lower — Al does not migrate','Excellent — Zn migrates to cut edges'],
  ['Heat Resistance','Up to 315°C continuous','Up to 230°C'],
  ['Heat Reflectivity','Excellent — reflects solar radiation','Lower than GL'],
  ['Appearance','Bright metallic silver','Traditional zinc spangle'],
  ['Cost','5-15% higher than GI','More economical'],
  ['Best For','Roofing, solar, heat zones, PPGL substrate','Construction, ducts, tubes, fabrication']
]
const adv=[
  {t:'2-4× longer corrosion life',d:'Al-Zn alloy provides superior atmospheric corrosion resistance compared to pure zinc coating'},
  {t:'Excellent heat resistance',d:'Continuous service up to 315°C vs 230°C for galvanized — ideal for roofing in hot climates'},
  {t:'Superior heat reflectivity',d:'Reflects solar radiation effectively, reducing building cooling costs and roof temperature'},
  {t:'Premium metallic appearance',d:'Bright, uniform metallic surface that maintains aesthetic quality over decades of outdoor exposure'},
  {t:'Ideal PPGL substrate',d:'The perfect base material for prepainted Galvalume production — maximizes painted steel service life'},
  {t:'Proven 25-50 year roofing life',d:'Decades of field data confirm exceptional service life for metal roofing applications worldwide'}
]
const products=[
{n:'镀铝锌钢卷',ne:'Galvalume Steel Coil - Al-Zn Coated GL Coil AZ50-AZ185',feat:1,
  hero:'Premium Galvalume Steel Coil Supplier',sub:'55% Aluminum-Zinc Alloy Coated — AZ50 to AZ185 — Superior Corrosion Resistance for Roofing, Solar and Industrial Applications',
  overview:`<p><strong>Galvalume steel coil</strong> is a coated steel product produced by applying an aluminum-zinc alloy layer to cold rolled steel through a continuous hot-dip process. In international markets, it is also known as <strong>Aluzinc steel coil</strong> or <strong>GL coil</strong>. The standard coating composition is approximately <strong>55% aluminum, 43.4% zinc and 1.6% silicon</strong>.</p><p>This alloy combines the barrier protection of aluminum with the sacrificial protection of zinc, giving the steel better long-term atmospheric corrosion resistance in most environments. Field studies confirm Galvalume provides <strong>2-4× longer service life</strong> than standard galvanized steel in equivalent outdoor conditions.</p><p>Besides corrosion resistance, Galvalume offers a bright metallic appearance, strong heat reflectivity and heat resistance up to 315°C. It can be formed by bending, corrugating and roll forming, making it a practical and premium material for construction and industrial applications.</p><p>For buyers and distributors, Galvalume steel coil is the premium choice when long service life, heat resistance and aesthetic quality are project priorities.</p>`,
  specs:sp('AZ50 – AZ185 (50-185 g/m²)'),
  seo:{t:'Galvalume Steel Coil | GL Coil AZ50-AZ185 Manufacturer',d:'Galvalume steel coil AZ50-AZ185. 55% Al-Zn alloy for superior corrosion resistance. Factory direct for roofing and solar.',k:'galvalume steel coil, GL coil, aluzinc steel coil, 55% aluminum zinc coil, galvalume manufacturer'}},
{n:'热镀铝锌钢卷',ne:'Hot Dip Galvalume Steel Coil - Aluzinc AZ100-AZ185',feat:0,
  hero:'Hot Dip Galvalume Steel Coil',sub:'Continuous Hot-Dip Al-Zn Process — Premium Alloy Coating Technology — Multi-Standard Certified',
  overview:`<p><strong>Hot dip Galvalume steel coil</strong> is produced on modern continuous galvanizing lines (CGL) where cold rolled steel strip is immersed in a molten bath of 55% aluminum, 43.4% zinc and 1.6% silicon alloy at approximately 600°C. The resulting intermetallic bonding creates an exceptionally adherent coating.</p><p>The hot-dip process ensures uniform alloy distribution across the full coil width and length. AZ100-AZ185 coating weights provide heavy-duty protection for demanding outdoor applications including roofing in marine, tropical and industrial environments.</p><p>HDG Galvalume coil is certified to ASTM A792, EN 10346, JIS G3321 and GB/T 55441, accepted globally with full mill test certificates and third-party inspection support.</p>`,
  specs:sp('AZ100 – AZ185 (100-185 g/m²)','0.25 – 2.0 mm'),
  seo:{t:'Hot Dip Galvalume Steel Coil Aluzinc',d:'Hot-dip Galvalume steel coil AZ100-AZ185. 55% aluminum-zinc alloy. Superior corrosion and heat resistance.',k:'hot dip galvalume, aluzinc coil, hot dip al-zn steel, AZ150 galvalume'}},
{n:'镀铝锌带钢',ne:'Galvalume Steel Strip - Al-Zn Slit Coil 30-600mm',feat:0,
  hero:'Galvalume Steel Strip',sub:'Al-Zn Coated Narrow Strip — 30 to 600mm — AFP Available — Precision Edge Quality',
  overview:`<p><strong>Galvalume steel strip</strong> is precision-slit from full-width GL coil (600-1500mm) into narrow widths from 30mm to 600mm. AFP or bare surface treatment is available. The slitting process produces clean, burr-free edges for automated downstream processing.</p><p>GL strip is used for PPGL color coating substrate, solar panel mounting brackets, exhaust system tubing, narrow roll-formed profiles and precision stamping components where the superior corrosion and heat resistance of Al-Zn coating is required.</p><p>All GL strip maintains the same coating composition, steel grade and surface quality as the parent coil, plus additional dimensional accuracy from the precision slitting process.</p>`,
  specs:sp('AZ50 – AZ185','0.20 – 2.0 mm','30 – 600 mm (slit to order)'),
  seo:{t:'Galvalume Steel Strip | Al-Zn Slit Coil Narrow',d:'Galvalume steel strip slit to 30-600mm. AFP treatment. For solar, PPGL substrate and precision applications.',k:'galvalume steel strip, GL strip, aluzinc strip, galvalume slit coil'}},
{n:'GL钢卷',ne:'GL Steel Coil - Galvalume Coil for Roofing & Solar',feat:0,
  hero:'GL Steel Coil',sub:'Industry Standard Galvalume — Roofing, Solar & Coating Substrate — Global Supply',
  overview:`<p><strong>GL steel coil</strong> (Galvalume coil) is the industry-standard 55% aluminum-zinc coated steel product recognized worldwide. The term "GL" is universally used in international steel trade and procurement documentation.</p><p>GL coil is the material of choice for metal roofing systems, solar mounting structures, pre-engineered building cladding and as the base substrate for PPGL (prepainted Galvalume) production. Its combination of corrosion resistance, heat reflectivity and aesthetic appearance makes it the premium alternative to standard galvanized steel.</p><p>As a mature, high-volume product in global trade, GL coil benefits from standardized production processes, broad grade availability and competitive pricing from established manufacturing bases.</p>`,
  specs:sp('AZ50 – AZ185'),
  seo:{t:'GL Steel Coil | Galvalume Coil Roofing Solar',d:'GL steel coil manufacturer. Galvalume coil for roofing, solar, and industrial buildings. AZ50-AZ185.',k:'GL steel coil, GL coil, galvalume roofing, GL steel manufacturer'}},
{n:'GL带钢',ne:'GL Steel Strip - Galvalume Strip Custom Width',feat:0,
  hero:'GL Steel Strip',sub:'Custom-Width Galvalume Strip — AFP Surface — Precision Edge — Tube & Profile',
  overview:`<p><strong>GL steel strip</strong> (Galvalume strip) is narrow-width Al-Zn coated steel slit from standard GL coil to custom widths between 30mm and 600mm. AFP (Anti-Finger Print) surface treatment is commonly requested for clean handling and additional corrosion protection.</p><p>GL strip serves applications requiring narrow-width Galvalume material: exhaust system tubing, cable tray manufacturing, solar bracket roll forming, narrow architectural profiles and precision fabrication components where heat resistance and corrosion protection are critical.</p>`,
  specs:sp('AZ50 – AZ185','0.20 – 2.0 mm','30 – 600 mm (slit to order)'),
  seo:{t:'GL Steel Strip | Galvalume Strip Custom Width',d:'GL steel strip custom width 30-600mm. AFP Galvalume strip for exhaust, solar, and roll forming.',k:'GL steel strip, GL strip, galvalume strip, GL slit coil'}},
{n:'55%镀铝锌钢卷',ne:'55% Aluminum-Zinc Steel Coil - AZ150 Galvalume Standard',feat:0,
  hero:'55% Aluminum-Zinc Steel Coil',sub:'The Global Standard — AZ150 — 55% Al + 43.4% Zn + 1.6% Si — Proven Performance',
  overview:`<p><strong>55% aluminum-zinc steel coil</strong> refers to the standard Galvalume coating composition: 55% aluminum, 43.4% zinc and 1.6% silicon by weight. This specific alloy ratio was developed by Bethlehem Steel Corporation and has been the global industry standard for over 50 years.</p><p>The 55% aluminum content provides excellent barrier corrosion protection and heat reflectivity, while the 43.4% zinc content provides sacrificial protection at coating edges and defects. The 1.6% silicon ensures proper coating adhesion and prevents excessive intermetallic growth during the hot-dip process.</p><p>AZ150 (150 g/m² total coating) is the most commonly specified coating weight for roofing applications worldwide, providing an optimal balance of corrosion protection, formability and cost.</p>`,
  specs:sp('AZ150 (55% Al-Zn, 150 g/m²)'),
  seo:{t:'55% Aluminum Zinc Steel Coil AZ150',d:'55% aluminum-zinc alloy coated steel coil. AZ150 Galvalume — the global roofing standard with 2-4× corrosion life vs galvanized.',k:'55% aluminum zinc coil, AZ150 steel, 55 al zn coil, aluminum zinc alloy steel'}},
{n:'25%镀铝锌钢卷',ne:'25% Aluminum-Zinc Steel Coil - ZAM / Galfan Alternative',feat:0,
  hero:'25% Aluminum-Zinc Steel Coil',sub:'25% Al + 75% Zn Alloy — Enhanced Cut-Edge Protection — Cost-Effective Alternative',
  overview:`<p><strong>25% aluminum-zinc steel coil</strong> uses a lower aluminum content alloy coating (25% Al + 75% Zn) compared to standard 55% Galvalume. This composition provides a different balance of properties: better cut-edge protection than 55% GL (due to higher zinc content) while still offering improved atmospheric corrosion resistance over pure zinc coating.</p><p>This product is positioned as a cost-effective middle ground between standard galvanized (GI) and premium 55% Galvalume (GL). It is sometimes referred to as a Galfan or ZAM alternative depending on the exact alloy composition and regional naming conventions.</p><p>25% Al-Zn steel coil is suitable for construction, general fabrication and applications where enhanced corrosion resistance beyond GI is desired but the full premium of 55% Galvalume is not required.</p>`,
  specs:sp('25% Al-Zn alloy coating','0.25 – 2.0 mm'),
  seo:{t:'25% Aluminum Zinc Steel Coil ZAM Galfan',d:'25% aluminum-zinc alloy steel coil. Cost-effective alternative to 55% Galvalume with better cut-edge protection.',k:'25% aluminum zinc coil, ZAM steel, galfan coil, 25 al zn steel'}}
]
async function main(){
  const ids=[]
  for(let i=0;i<products.length;i++){
    const p=products[i]
    const data={
      name:p.n,name_en:p.ne,category_id:2,
      description:p.ne.split(' - ')[1]||p.ne,description_en:p.ne.split(' - ')[1]||p.ne,
      specs:S(p.specs),faq_items:S(faq.map(f=>({question:f.q,answer:f.a}))),
      is_featured:p.feat||0,sort_order:0,status:1,
      seo_title:p.seo.t,seo_description:p.seo.d,seo_keywords:p.seo.k,
      detail_content:productHtml({
        name:p.n,name_en:p.ne,hero:p.hero,sub:p.sub,accent:'#e67e22',
        overview:p.overview,specs:p.specs,apps,faqs:faq,
        compTitle:'Galvalume (GL) vs Galvanized (GI)',compCol1:'Galvalume Steel Coil (GL)',compCol2:'Galvanized Steel Coil (GI)',
        compIntro:'Galvalume and Galvanized are both coated steel products but differ in coating composition, performance characteristics and optimal applications.',
        compDesc1:'Known for superior atmospheric corrosion resistance, heat reflectivity and long roofing life.',
        compDesc2:'Offers excellent cut-edge protection, superior formability and broad market acceptance.',
        compRows,advantages:adv,
        ctaTitle:'Looking for a Reliable Galvalume Steel Coil Supplier?',
        ctaDesc:'Contact us for GL coil pricing, specifications, AFP treatment, export packing and shipping. Factory direct supply worldwide.'
      })
    }
    const r=await upload('products',data)
    ids.push(r.id)
    console.log(`✅ [${i+1}/7] ${p.n} → id=${r.id}`)
  }
  console.log(`\n🎉 GL products: ${ids.join(', ')}`)
}
main().catch(e=>console.error('❌',e))
