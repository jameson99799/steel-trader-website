import{upload,productHtml,IMG}from'./tpl.mjs'
const S=JSON.stringify
const apps=[
  {i:'🏗️',t:'Premium Roofing',d:'High-end residential and commercial roofing. PPGL combines color coating with GL substrate for 25+ year service life in harsh environments.'},
  {i:'☀️',t:'Solar & Heat Zone',d:'Solar carports, desert projects, heat-exposed facades. Al-Zn substrate resists heat to 315°C vs 230°C for GI substrate.'},
  {i:'🏭',t:'Industrial & Marine',d:'Coastal factories, chemical plants, food processing, livestock facilities. Superior corrosion resistance in aggressive environments.'},
  {i:'🎨',t:'Architectural Design',d:'Wood-grain, stone-pattern, custom prints for decorative panels, signage, and architectural accents with UV-resistant coatings.'}
]
const faq=[
  {q:'What is PPGL?',a:'PPGL (Prepainted Galvalume) is Galvalume (55% Al-Zn) steel coated with primer and paint. It combines the superior corrosion resistance of GL substrate with color coating for the longest service life among all painted steel products.'},
  {q:'PPGI vs PPGL — which is better?',a:'PPGL uses GL substrate with 2-4× better corrosion resistance. PPGL costs 5-10% more but lasts 30-50% longer. PPGL for premium exterior; PPGI for economy interior.'},
  {q:'Which paint system for roofing?',a:'HDP or PVDF for premium roofing (20-30+ years). SMP for standard commercial (15-20 years). PE for interior and economy (10-15 years).'},
  {q:'What is the MOQ?',a:'25 MT per color/specification. Mixed containers: 5 MT/color minimum with 25 MT total.'},
  {q:'Can you match custom colors?',a:'Yes. RAL, Pantone and custom color matching to ΔE ≤ 1.5. Wood-grain and stone-pattern prints also available.'}
]
function sp(paint){return[
  {name:'Product',value:'Prepainted Galvalume Steel Coil / PPGL'},{name:'Paint System',value:paint},
  {name:'Substrate',value:'Galvalume (GL, AZ50-AZ185, 55% Al-Zn)'},{name:'Thickness',value:'0.12 – 1.2 mm'},
  {name:'Width',value:'600 – 1250 mm'},{name:'Top Paint',value:'15-25μm (PE/SMP/HDP/PVDF)'},
  {name:'Back Paint',value:'5-10μm Epoxy Primer'},{name:'Colors',value:'RAL, Pantone, custom color or pattern'},
  {name:'Standard',value:'ASTM A755, EN 10169, JIS G3322'}
]}
const compRows=[
  ['Substrate','GL (55% Al-Zn)','GI (Zinc)'],
  ['Substrate Corrosion','2-4× better than GI','Standard zinc protection'],
  ['Service Life','30-50% longer','Standard'],
  ['Heat Resistance','GL substrate 315°C','GI substrate 230°C'],
  ['Cost','5-10% higher','More economical'],
  ['Best For','Premium roofing, marine, harsh exterior','Interior, light exterior, appliances']
]
const adv=[
  {t:'Longest painted steel life',d:'GL substrate + paint = maximum service life among all color coated steel products'},
  {t:'Superior substrate corrosion',d:'55% Al-Zn substrate provides 2-4× better corrosion resistance than GI substrate'},
  {t:'Heat resistant substrate',d:'GL substrate withstands 315°C vs 230°C for GI — ideal for hot climate roofing'},
  {t:'Premium aesthetic durability',d:'Paint retains color and gloss longer on GL substrate due to superior underlying corrosion protection'},
  {t:'Pattern print available',d:'Wood-grain, marble, stone and custom pattern printing on GL substrate for architectural applications'},
  {t:'25+ year warranty available',d:'PVDF on GL substrate can achieve 25-30+ year paint performance warranty in normal environments'}
]
const products=[
{n:'预涂镀铝锌钢卷',ne:'Prepainted Galvalume Steel Coil - PPGL Color Coated GL',feat:1,
  hero:'Prepainted Galvalume Steel Coil',sub:'Color Coated AL-ZN — Ultimate Corrosion Resistance — Premium Roofing & Exterior',
  overview:`<p><strong>Prepainted Galvalume steel coil (PPGL)</strong> is the highest-durability painted steel product available. It combines the superior corrosion resistance of Galvalume (55% Al-Zn) substrate with factory-applied color paint coatings, delivering maximum service life for demanding exterior applications.</p><p>PPGL outperforms PPGI (GI substrate) in corrosion resistance by 2-4× because the underlying Galvalume coating provides dramatically better atmospheric corrosion protection than pure zinc. This means the paint system is supported by a more durable foundation, resulting in longer overall product life even if the paint is damaged.</p><p>For premium roofing, coastal construction, marine environments and projects requiring 25+ year color performance, PPGL is the recommended specification by steel industry experts worldwide.</p>`},
{n:'PPGL钢卷',ne:'PPGL Steel Coil - Pre-Painted Galvalume Factory Direct',feat:0,
  hero:'PPGL Steel Coil',sub:'Pre-Painted Galvalume — 55% Al-Zn Substrate — The Industry Choice for Long-Life Roofing',
  overview:`<p><strong>PPGL steel coil</strong> (Pre-Painted Galvalume) is the premium segment of the color-coated steel market. Using GL (Galvalume, 55% Al-Zn) as substrate instead of standard GI (zinc), PPGL delivers superior long-term performance for applications where paint durability and substrate corrosion resistance are critical.</p><p>The PPGL market is growing rapidly as architects, engineers and building owners increasingly specify Al-Zn substrate for exterior metal cladding. The proven 25-50 year field performance of Galvalume substrate provides confidence in long-term building envelope performance.</p>`},
{n:'彩涂镀铝锌钢卷',ne:'Color Coated Galvalume Steel Coil - Painted AL-ZN',feat:0,
  hero:'Color Coated Galvalume Steel Coil',sub:'Painted AL-ZN — Maximum Weather Resistance — Architecture Grade — 25+ Year Life',
  overview:`<p><strong>Color coated Galvalume steel coil</strong> is the descriptive term for PPGL — Galvalume steel that has been factory-coated with color paint. It is widely used in markets where buyers search by descriptive name rather than the PPGL acronym.</p><p>Available with PE/SMP/HDP/PVDF paint systems and 25+ year service life potential, color coated Galvalume is the ultimate weather-resistant colored steel product for premium roofing, exterior wall panels and architectural cladding.</p>`},
{n:'网纹/皱纹彩涂镀铝锌钢卷',ne:'Wrinkle Textured PPGL Coil - Embossed Matte Color GL',feat:0,
  hero:'Wrinkle Textured PPGL Coil',sub:'Embossed Matte + Galvalume Substrate — Premium Decorative Solution',
  overview:`<p><strong>Wrinkle textured PPGL coil</strong> combines the premium Galvalume substrate with specially formulated wrinkle-finish paint, creating a product with both maximum corrosion resistance and premium decorative aesthetics. The embossed matte surface hides minor scratches and fingerprints while the GL substrate provides 2-4× better corrosion life than GI-based alternatives.</p><p>This is the highest-specification decorative steel product available — ideal for premium architectural applications, high-end garage doors, and luxury building facades where both durability and aesthetics are non-negotiable.</p>`}
]
async function main(){
  const ids=[]
  for(let i=0;i<products.length;i++){
    const p=products[i]
    const data={
      name:p.n,name_en:p.ne,category_id:3,
      description:p.ne.split(' - ')[1]||p.ne,description_en:p.ne.split(' - ')[1]||p.ne,
      specs:S(sp(i===3?'Wrinkle PE 25-35μm / Embossed SMP/HDP':'PE / SMP / HDP / PVDF')),
      faq_items:S(faq.map(f=>({question:f.q,answer:f.a}))),
      is_featured:p.feat||0,sort_order:0,status:1,
      seo_title:p.ne,seo_description:`${p.ne} factory direct supply. Premium quality, competitive pricing.`,
      seo_keywords:p.ne.toLowerCase().replace(/ - /g,', ').replace(/ /g,' '),
      detail_content:productHtml({
        name:p.n,name_en:p.ne,hero:p.hero,sub:p.sub,accent:'#d35400',
        overview:p.overview,specs:sp(i===3?'Wrinkle PE 25-35μm / Embossed SMP/HDP':'PE / SMP / HDP / PVDF'),
        apps,faqs:faq,compTitle:'PPGL vs PPGI',compCol1:'PPGL (GL Substrate)',compCol2:'PPGI (GI Substrate)',
        compIntro:'PPGL and PPGI are both color coated steel. The key difference is substrate: PPGL uses Galvalume (Al-Zn), PPGI uses galvanized (zinc).',
        compDesc1:'Premium color coated solution with superior substrate corrosion resistance for maximum service life.',
        compDesc2:'Cost-effective color solution with broad market availability for general applications.',
        compRows,advantages:adv,
        ctaTitle:'Looking for Premium PPGL Color Coated Steel?',
        ctaDesc:'Contact us for PPGL pricing, color options, paint systems and export solutions. Premium quality, factory direct.'
      })
    }
    const r=await upload('products',data)
    ids.push(r.id)
    console.log(`✅ [${i+1}/4] ${p.n} → id=${r.id}`)
  }
  console.log(`\n🎉 PPGL products: ${ids.join(', ')}`)
}
main().catch(e=>console.error('❌',e))
