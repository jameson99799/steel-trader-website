import{upload,productHtml,IMG}from'./tpl.mjs'
const S=JSON.stringify
const apps=[
  {i:'🏠',t:'Residential Roofing',d:'Villas, townhouses, rural houses. Color-matched roofing sheets with 15-25+ year life. Lightweight, easy installation.'},
  {i:'🏗️',t:'Commercial Building',d:'Warehouses, factories, shopping centers, airports. Large-span roofing with excellent drainage and wind resistance.'},
  {i:'🏭',t:'Industrial Facility',d:'Steel structure workshops, PEB buildings, cold storage, logistics parks. Cost-effective metal cladding solutions.'},
  {i:'🌾',t:'Agricultural',d:'Poultry houses, barns, grain silos, greenhouses. Corrosion-resistant roofing for high-humidity environments.'}
]
const faq=[
  {q:'What is the standard roofing sheet length?',a:'Standard: 1000-6000mm. Custom up to 12000mm. Most projects use 2000-4000mm to minimize end laps and leak risk.'},
  {q:'What thickness for roofing?',a:'Residential: 0.35-0.50mm. Commercial: 0.40-0.60mm. Industrial: 0.50-0.80mm. Thicker = stronger wind uplift resistance.'},
  {q:'What substrate is best for roofing?',a:'GL (Galvalume AZ150) is the industry standard — 2-4× longer than GI. PPGL for color + max corrosion resistance. Full-hard GI for economy.'},
  {q:'Corrugated vs Trapezoidal — which is better?',a:'Corrugated (wave) is traditional, cost-effective, good drainage. Trapezoidal (IBR/T-profile) has better spanning capability, stronger, more modern.'},
  {q:'What is the MOQ for roofing sheets?',a:'5,000 linear meters or 25 MT per profile/color. Mixed containers with 25 MT total minimum.'},
  {q:'Can roofing sheets be customized?',a:'Yes. Profile, length, color, substrate, thickness, and packing can all be customized to project requirements.'}
]
function sp(profile,sub,thk){return[
  {name:'Product',value:'Metal Roofing Sheet'},{name:'Profile',value:profile},
  {name:'Substrate',value:sub},{name:'Thickness',value:thk||'0.12 – 0.80 mm'},
  {name:'Effective Width',value:'750 – 1050 mm (profile dependent)'},{name:'Length',value:'1000 – 12000 mm (custom)'},
  {name:'Standard',value:'AS 1397, ASTM A653/A792, EN 10346, JIS G3302/3321'},
  {name:'Coating',value:'Z40-Z275 / AZ50-AZ185 / PE/SMP/HDP/PVDF paint'}
]}
const compRows=[
  ['Profile','Sinusoidal wave pattern','IBR / trapezoidal ribs'],
  ['Visual','Traditional, classic look','Modern, clean lines'],
  ['Spanning','Shorter spans','Longer spanning capability'],
  ['Strength','Standard structural performance','Higher section modulus per unit width'],
  ['Drainage','Excellent water flow','Good drainage with flat pans'],
  ['Installation','Simple, well-known technique','May require specific fastening'],
  ['Cost','Generally lower','Slightly higher for equivalent thickness'],
  ['Best For','Residential, agricultural, light commercial','Industrial, commercial, long-span']
]
const adv=[
  {t:'Multiple substrate options',d:'GI, GL, PPGI, PPGL — matched to performance requirement and budget'},
  {t:'Custom profiles and lengths',d:'Corrugated, trapezoidal, tile, standing seam and custom profiles up to 12m length'},
  {t:'Factory roll-formed',d:'Precision roll-formed from certified coil stock — consistent profile dimensions and quality'},
  {t:'Color and finish options',d:'Metallic (GI/GL), RAL colors (PPGI/PPGL), wrinkle/textured, wood-grain print'},
  {t:'Wind and weather tested',d:'Profiles designed and tested for wind uplift, rain penetration and thermal movement resistance'},
  {t:'Export packaging',d:'Bundle-packed with plastic interleaving, steel strapping and container-optimized loading'}
]
const products=[
{n:'波纹屋顶钢板',ne:'Corrugated Roofing Sheet - Wave Profile Metal Roof Panel',feat:1,
  hero:'Corrugated Roofing Sheet',sub:'Classic Wave Profile — Universal Metal Roof — Proven Performance Worldwide',
  overview:`<p><strong>Corrugated roofing sheet</strong> is the most traditional and widely recognized metal roof profile in global construction. The sinusoidal wave pattern provides a natural combination of strength, flexibility and water drainage that has proven effective across decades of use in every climate zone.</p><p>Corrugated sheets are roll-formed from GI, GL, PPGI or PPGL coil stock, with profile pitch typically 76mm and rib depth 18-25mm. The wave pattern creates structural rigidity while allowing the sheet to flex slightly during thermal expansion and contraction without fatigue cracking.</p><p>From residential homes to industrial warehouses, agricultural barns to commercial buildings, corrugated roofing remains the world's most popular metal roof profile due to its proven reliability, simple installation, competitive cost and universal availability.</p>`,
  specs:sp('Corrugated (sinusoidal wave), pitch 76mm, depth 18-25mm','GI / GL / PPGI / PPGL')},
{n:'T型屋顶钢板',ne:'Trapezoidal Roofing Sheet - T-Profile IBR Metal Roof Panel',feat:0,
  hero:'Trapezoidal Roofing Sheet',sub:'T-Profile IBR — Superior Span Capability — The Modern Industrial Standard',
  overview:`<p><strong>Trapezoidal roofing sheet</strong> (also known as T-profile or IBR — Inverted Box Rib) is the modern industrial standard for metal roofing and wall cladding. The trapezoidal rib profile provides significantly higher section modulus per unit width compared to corrugated, enabling longer spanning distances between supports.</p><p>With rib heights of 35-55mm and pitch of 200-333mm, trapezoidal sheets are designed for commercial and industrial buildings where long spans, minimal supports and clean architectural lines are required. The flat pan areas between ribs provide excellent surfaces for foot traffic during installation and maintenance.</p><p>Trapezoidal roofing is the dominant profile for PEB (pre-engineered buildings), warehouses, logistics centers, manufacturing facilities and commercial retail buildings worldwide.</p>`,
  specs:sp('Trapezoidal (IBR), rib height 35-55mm, pitch 200-333mm','GI / GL / PPGI / PPGL','0.25 – 0.80 mm')},
{n:'镀锌波纹屋顶钢板',ne:'Galvanized Corrugated Roofing Sheet - GI Roof Panel',feat:0,
  hero:'Galvanized Corrugated Roofing Sheet',sub:'GI Zinc Coated — Economical Metal Roofing — Z40 to Z275',
  overview:`<p><strong>Galvanized corrugated roofing sheet</strong> combines the classic corrugated wave profile with hot-dip galvanized (GI) zinc coating. This is the most cost-effective metal roofing solution, providing reliable corrosion protection at an economical price point.</p><p>With zinc coating from Z40 (light interior) to Z275 (heavy outdoor), galvanized corrugated sheets serve applications from temporary shelters to permanent residential and agricultural buildings. The bright zinc surface provides a clean metallic appearance without the cost of paint coating.</p><p>GI corrugated roofing remains the highest-volume metal roofing product globally, particularly popular in developing markets where the combination of low cost, easy installation and proven durability makes it the default choice for residential and agricultural roofing.</p>`,
  specs:sp('Corrugated (wave), pitch 76mm, depth 18-25mm','Hot-Dip Galvanized (GI) Z40-Z275','0.12 – 0.60 mm')},
{n:'镀铝锌波纹屋顶钢板',ne:'Galvalume Corrugated Roofing Sheet - GL Roof Panel',feat:0,
  hero:'Galvalume Corrugated Roofing Sheet',sub:'GL Aluzinc Coated — 2-4× Longer Life Than GI — Premium Metallic Roofing',
  overview:`<p><strong>Galvalume corrugated roofing sheet</strong> uses 55% aluminum-zinc (GL) coated steel substrate instead of standard galvanized (GI), providing 2-4× longer service life in equivalent outdoor conditions. The Al-Zn alloy coating offers superior atmospheric corrosion resistance plus excellent heat reflectivity.</p><p>GL corrugated sheets are particularly effective in marine, tropical, industrial and other aggressive environments where standard galvanized roofing requires more frequent replacement. The bright metallic surface also reflects solar radiation, reducing building cooling costs in hot climates.</p><p>For projects requiring maximum metallic-finish roofing life without the cost of paint coating, Galvalume corrugated is the proven premium choice recommended by metal building system engineers worldwide.</p>`,
  specs:sp('Corrugated (wave), pitch 76mm, depth 18-25mm','Galvalume (GL) AZ50-AZ185','0.25 – 0.60 mm')},
{n:'全硬屋顶钢板',ne:'Full Hard Roofing Sheet - High Strength Structural Panel',feat:0,
  hero:'Full Hard Roofing Sheet',sub:'High Strength ≥550 MPa — Maximum Structural Rigidity — Cost-Effective Long Span',
  overview:`<p><strong>Full hard roofing sheet</strong> is manufactured from cold-reduced steel that has not been annealed after rolling. This preserves the work-hardened state, resulting in yield strength ≥550 MPa — significantly higher than standard drawing quality steel (≤280 MPa). The higher strength enables thinner gauge material to achieve equivalent structural performance.</p><p>Full hard roofing is particularly popular in markets where material cost optimization is important. By using high-strength thin-gauge material (0.12-0.50mm), builders can achieve acceptable roof performance at lower material weight and cost compared to standard-strength thicker gauges.</p><p>Available with GI (Z40-Z150) or GL (AZ50-AZ100) coating, full hard roofing sheets are roll-formed into corrugated or trapezoidal profiles for residential, agricultural and light commercial applications.</p>`,
  specs:sp('Corrugated / Trapezoidal (customer choice)','Full Hard GI (Z40-Z150) / Full Hard GL (AZ50-AZ100)','0.12 – 0.50 mm')},
{n:'彩涂屋顶钢板',ne:'Color Coated Roofing Sheet - PPGI PPGL Painted Roof Panel',feat:0,
  hero:'Color Coated Roofing Sheet',sub:'PPGI/PPGL Painted — RAL Colors — Beautiful + Durable Metal Roofing',
  overview:`<p><strong>Color coated roofing sheet</strong> combines the structural performance of profiled metal roofing with factory-applied paint coating, creating a finished product that provides both weather protection and aesthetic appeal. Manufactured from PPGI (painted galvanized) or PPGL (painted Galvalume) coil stock, color roofing sheets are available in thousands of RAL standard and custom colors.</p><p>Paint systems range from economy PE (10-15 year) to premium PVDF (25+ year), with PPGL substrate providing 2-4× longer underlying corrosion protection than PPGI. The combination of color coating with profiled metal creates the complete building envelope solution — structural, weatherproof and beautiful in a single product.</p><p>Color roofing is the fastest-growing segment of the metal roofing market as architects and building owners increasingly demand both performance and aesthetics.</p>`,
  specs:sp('Corrugated / Trapezoidal / Tile profile','PPGI (GI+Paint) or PPGL (GL+Paint)','0.25 – 0.80 mm')}
]
async function main(){
  const ids=[]
  for(let i=0;i<products.length;i++){
    const p=products[i]
    const data={
      name:p.n,name_en:p.ne,category_id:5,
      description:p.ne.split(' - ')[1]||p.ne,description_en:p.ne.split(' - ')[1]||p.ne,
      specs:S(p.specs),faq_items:S(faq.map(f=>({question:f.q,answer:f.a}))),
      is_featured:p.feat||0,sort_order:0,status:1,
      seo_title:p.ne,seo_description:`${p.ne} factory direct. Custom profiles, lengths and coatings.`,
      seo_keywords:p.ne.toLowerCase().replace(/ - /g,', '),
      detail_content:productHtml({
        name:p.n,name_en:p.ne,hero:p.hero,sub:p.sub,accent:'#e74c3c',
        overview:p.overview,specs:p.specs,apps,faqs:faq,
        compTitle:'Corrugated vs Trapezoidal Roofing',compCol1:'Corrugated (Wave) Profile',compCol2:'Trapezoidal (IBR/T) Profile',
        compIntro:'The two most common metal roofing profiles. Choice depends on span requirements, aesthetics and application.',
        compDesc1:'The classic, proven roofing profile with excellent drainage and universal acceptance.',
        compDesc2:'Modern industrial standard with superior spanning capability and clean architectural lines.',
        compRows,advantages:adv,
        ctaTitle:'Looking for Quality Metal Roofing Sheets?',
        ctaDesc:'Contact us for roofing sheet pricing, custom profiles, substrate options and export solutions. Factory direct worldwide.'
      })
    }
    const r=await upload('products',data)
    ids.push(r.id)
    console.log(`✅ [${i+1}/6] ${p.n} → id=${r.id}`)
  }
  console.log(`\n🎉 Roofing products: ${ids.join(', ')}`)
}
main().catch(e=>console.error('❌',e))
