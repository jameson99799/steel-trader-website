import{upload,productHtml,IMG}from'./tpl.mjs'
const S=JSON.stringify

// ═══════════════════════════════════════════════════════════════
// 共用数据
// ═══════════════════════════════════════════════════════════════
const giApps=[
  {i:'🏗️',t:'Construction & Roofing',d:'Roofing sheets, wall cladding, purlins, structural decking, and light gauge framing. Z80-Z275 for outdoor exposure.'},
  {i:'🏠',t:'Home Appliance',d:'Air conditioner housings, water heater shells, washing machine panels. Requires Z60-Z100 with smooth surface finish.'},
  {i:'🔧',t:'General Fabrication',d:'Ductwork, cable trays, guard rails, storage racks, shelving, signage, and enclosures. Versatile Z40-Z180 range.'},
  {i:'🚗',t:'Automotive',d:'Floor pans, wheel housings, chassis components, fuel tanks. Automotive-grade surface with precise zinc coating control.'}
]
const glApps=[
  {i:'🏗️',t:'Roofing & Cladding',d:'Premium roofing and wall cladding. 55% Al-Zn provides 2-4× longer life than GI in marine and industrial environments.'},
  {i:'☀️',t:'Solar Energy',d:'Solar panel mounting frames, racking systems, and ground screws. Excellent heat resistance up to 315°C.'},
  {i:'🏭',t:'Industrial Building',d:'Pre-engineered building (PEB) roofing, insulated sandwich panel facings, rain gutters, and ventilation ducts.'},
  {i:'🔧',t:'PPGL Substrate',d:'Base substrate for prepainted Galvalume (PPGL) production on continuous color coating lines (CCL).'}
]
const ppgiApps=[
  {i:'🏗️',t:'Building Envelope',d:'Exterior wall panels, interior partitions, ceiling tiles, decorative facades, and curtain wall infills. RAL and custom colors.'},
  {i:'🏠',t:'Appliance & Furniture',d:'Refrigerator panels, washing machine shells, air conditioner housings, office furniture panels, and whiteboard surfaces.'},
  {i:'🏭',t:'Industrial Cladding',d:'Factory wall cladding, clean room panels, cold storage walls, and pre-engineered building (PEB) roof and wall sheets.'},
  {i:'📦',t:'Roll Forming',d:'Corrugated roofing, trapezoidal sheets, C/Z purlins, door panels, shutter slats, and garage door sections.'}
]
const ppglApps=[
  {i:'🏗️',t:'Premium Roofing',d:'High-end residential and commercial roofing. PPGL combines PPGI color with GL substrate corrosion resistance for 25+ year life.'},
  {i:'☀️',t:'Solar & Heat Zone',d:'Solar carports, desert projects, heat-exposed facades. Al-Zn substrate resists heat up to 315°C vs 230°C for GI.'},
  {i:'🏭',t:'Industrial & Marine',d:'Coastal factories, chemical plants, food processing, and livestock facilities. Superior corrosion resistance in aggressive environments.'},
  {i:'🎨',t:'Architectural Design',d:'Wood-grain, stone-pattern, and custom prints for decorative panels, signage, and architectural accents with UV-resistant coatings.'}
]
const crcApps=[
  {i:'🏠',t:'Home Appliance',d:'Refrigerator, washing machine, air conditioner panels. Ultra-smooth surface for PCM lamination or direct painting.'},
  {i:'🚗',t:'Automotive',d:'Body panels, door inners, structural reinforcements. IF/BH/DP/TRIP grades for formability and crash energy absorption.'},
  {i:'🔧',t:'General Fabrication',d:'Stamping, bending, deep drawing, roll forming. Enclosures, brackets, panels, shelving, drum making, tube welding.'},
  {i:'🏗️',t:'Coating Substrate',d:'Base substrate for GI, GL, PPGI, PPGL production on CGL/CCL lines. Optimized surface chemistry and roughness.'}
]

function giSpecs(z,thk){return[
  {name:'Zinc Coating',value:z},{name:'Thickness',value:thk||'0.12-4.0mm'},
  {name:'Width',value:'600-1500mm'},{name:'Spangle',value:'Regular / Mini / Zero Spangle'},
  {name:'Standard',value:'ASTM A653, EN 10346, JIS G3302, GB/T 2518'},
  {name:'Surface Treatment',value:'Chromate / Oiled / Chromate-free / Dry'},
  {name:'Coil ID',value:'508mm / 610mm'},{name:'Coil Weight',value:'3-12 MT (customizable)'}
]}
function glSpecs(az,thk){return[
  {name:'Coating',value:az},{name:'Thickness',value:thk||'0.12-4.0mm'},
  {name:'Width',value:'600-1500mm'},{name:'Composition',value:'55% Al + 43.4% Zn + 1.6% Si'},
  {name:'Standard',value:'ASTM A792, EN 10346, JIS G3321, GB/T 55441'},
  {name:'Surface Treatment',value:'AFP (Anti-Finger Print) / Oiled / Chromate / Bare'},
  {name:'Coil ID',value:'508mm / 610mm'},{name:'Coil Weight',value:'3-10 MT (customizable)'}
]}
function ppgiSpecs(paint){return[
  {name:'Paint System',value:paint},{name:'Substrate',value:'Hot-Dip Galvanized Steel (GI, Z40-Z275)'},
  {name:'Thickness',value:'0.12-1.2mm'},{name:'Width',value:'600-1250mm'},
  {name:'Top Paint',value:'15-25μm (PE/SMP/HDP/PVDF)'},{name:'Back Paint',value:'5-10μm Epoxy Primer'},
  {name:'Colors',value:'RAL, Pantone, or custom color matching'},{name:'Standard',value:'ASTM A755, EN 10169, JIS G3312, GB/T 12754'}
]}
function ppglSpecs(paint){return[
  {name:'Paint System',value:paint},{name:'Substrate',value:'Galvalume Steel (GL, AZ50-AZ185)'},
  {name:'Thickness',value:'0.12-1.2mm'},{name:'Width',value:'600-1250mm'},
  {name:'Top Paint',value:'15-25μm (PE/SMP/HDP/PVDF)'},{name:'Back Paint',value:'5-10μm Epoxy Primer'},
  {name:'Colors',value:'RAL, Pantone, custom color or pattern print'},{name:'Standard',value:'ASTM A755, EN 10169, JIS G3322'}
]}
function crcSpecs(grade,thk){return[
  {name:'Steel Grade',value:grade},{name:'Thickness',value:thk||'0.15-3.0mm'},
  {name:'Width',value:'600-1500mm'},{name:'Surface Finish',value:'Bright / Matte / 2B / BA'},
  {name:'Standard',value:'ASTM A1008, EN 10130, JIS G3141, GB/T 708'},
  {name:'Coil ID',value:'508mm / 610mm'},{name:'Tolerance',value:'Thickness ±0.02mm, Width ±1mm'}
]}

const giFaq=[
  {q:'What is galvanized steel coil?',a:'Galvanized steel coil (GI) is cold-rolled or hot-rolled steel coated with a zinc layer through the hot-dip galvanizing process. The zinc coating protects the base steel from corrosion through both barrier protection and galvanic (sacrificial) protection. Common coating weights: Z40-Z600 g/m².'},
  {q:'What is the difference between GI coil and GI strip?',a:'GI coil is the full-width product (600-1500mm) from the galvanizing line. GI strip is slit from GI coil to narrower widths (30-600mm) for specific applications like pipe making, cable tray, and roll-formed profiles.'},
  {q:'How long does galvanized steel last?',a:'Service life depends on coating weight and environment: Z80 (urban) 15-20 years, Z180 (industrial) 20-30 years, Z275 (marine/severe) 30-50 years. Higher zinc = longer life.'},
  {q:'What does Z275 mean?',a:'Z275 means 275 g/m² total zinc coating on both sides (approximately 137.5 g/m² per side, or about 20μm per side). This is a heavy coating suitable for outdoor and corrosive environments.'},
  {q:'What is the MOQ?',a:'25 MT per specification for full containers (20GP). Mixed containers: 5 MT/spec minimum with 25 MT total.'}
]
const glFaq=[
  {q:'What is Galvalume steel coil?',a:'Galvalume (GL) is steel coated with an alloy of 55% aluminum, 43.4% zinc, and 1.6% silicon by hot-dip process. It combines aluminum\'s barrier corrosion resistance with zinc\'s sacrificial protection, providing 2-4× longer life than standard galvanized (GI) in most environments.'},
  {q:'What is the difference between GI and GL?',a:'GI uses pure zinc coating; GL uses 55%Al-Zn alloy. GL has 2-4× better flat panel corrosion resistance but GI has better cut-edge protection. GL resists heat to 315°C vs 230°C for GI. GL is preferred for roofing; GI for formed/welded applications.'},
  {q:'What does AZ150 mean?',a:'AZ150 means 150 g/m² total Al-Zn coating on both sides (75 g/m² per side). This is the standard coating for roofing and most GL applications.'},
  {q:'What is AFP surface treatment?',a:'AFP (Anti-Finger Print) is a clear chromate-free coating applied to GL surface. It prevents fingerprint marking during handling and provides additional corrosion protection. AFP is the most popular GL surface treatment globally.'},
  {q:'What is the MOQ?',a:'25 MT per specification for full containers. Mixed containers: 5 MT/spec minimum with 25 MT total.'}
]
const ppgiFaq=[
  {q:'What is PPGI?',a:'PPGI (Prepainted Galvanized Iron) is galvanized steel coated with primer and paint on a continuous coil coating line (CCL). It provides color, aesthetics, and additional corrosion protection beyond the base zinc coating.'},
  {q:'What paint systems are available?',a:'PE (Polyester, 15-20μm, economy), SMP (Silicon Modified Polyester, 20-25μm, enhanced UV), HDP (High Durability Polyester, 20-25μm, premium), PVDF (Polyvinylidene Fluoride, 25μm, ultra-premium 20+ year exterior).'},
  {q:'How to choose RAL color?',a:'Provide RAL number (e.g. RAL 9003 Signal White), Pantone code, or physical sample. We color-match to ΔE ≤ 1.5 (visually identical). Popular colors: RAL 9002, 9003, 9006, 3009, 5015, 6005.'},
  {q:'What is the MOQ?',a:'25 MT per color/specification for full containers. Mixed containers: 5 MT/color minimum with 25 MT total.'}
]
const ppglFaq=[
  {q:'What is PPGL?',a:'PPGL (Prepainted Galvalume) is Galvalume (55% Al-Zn) steel coated with primer and paint. It combines the superior corrosion resistance of GL substrate with color coating, providing the longest service life among all painted steel products.'},
  {q:'PPGI vs PPGL — which is better?',a:'PPGL uses GL (Al-Zn) substrate with 2-4× better corrosion resistance than PPGI\'s GI (zinc) substrate. PPGL costs 5-10% more but lasts 30-50% longer. PPGL is preferred for roofing, exterior walls, marine areas; PPGI is more economical for interior and light-duty use.'},
  {q:'Which paint system for roofing?',a:'HDP or PVDF for premium roofing (20-30+ year warranty). SMP for standard commercial (15-20 year). PE for interior and economy use (10-15 year).'},
  {q:'What is the MOQ?',a:'25 MT per color/specification. Mixed containers: 5 MT/color minimum with 25 MT total.'}
]
const crcFaq=[
  {q:'What is cold rolled steel coil?',a:'CRC is hot-rolled steel further processed at room temperature through cold reduction mills. This reduces thickness (0.15-3.0mm), improves surface finish (Ra 0.4-1.8μm), tightens dimensional tolerances (±0.02mm), and increases strength through work hardening.'},
  {q:'What is the difference between SPCC and DC01?',a:'SPCC (JIS G3141) and DC01 (EN 10130) are equivalent commercial quality CRC grades. Both have yield ≤280MPa, tensile 270-410MPa, elongation ≥28%. Also equivalent: ASTM A1008 CS Type B.'},
  {q:'What is black annealed coil?',a:'Black annealed CRC is annealed without bright finish — the surface has a dark oxide layer. It is cheaper than bright-annealed CRC and used for applications where surface appearance is not critical: drums, tubes, welded pipes.'},
  {q:'What is the MOQ?',a:'25 MT per specification. Mixed containers: 5 MT/spec minimum with 25 MT total.'}
]

// ═══════════════════════════════════════════════════════════════
// PRODUCTS — 24 total, 5 categories
// ═══════════════════════════════════════════════════════════════
const products = [
// ── Cat 1: GI ──────────────────────────────────────────────
{cat:1,sort:100,feat:1,
  n:'镀锌钢卷',ne:'Galvanized Steel Coil - Hot Dip GI Coil Z40-Z275',
  desc:'Premium hot-dip galvanized steel coil with Z40-Z275 zinc coating. Available in regular, mini, and zero spangle. Factory direct for roofing, construction, and appliance applications.',
  hero:'Galvanized Steel Coil',sub:'Hot-Dip Zinc Coated — Z40 to Z275 — Factory Direct Supply',
  badges:['🔩 Z40-Z275','📏 0.12-4.0mm','🏗️ Construction','🏭 Factory Direct'],accent:'#2980b9',
  specs:giSpecs('Z40-Z275 (40-275 g/m²)'),apps:giApps,faqs:giFaq,
  seo:{t:'Galvanized Steel Coil | Hot Dip GI Coil Z40-Z275 Manufacturer',d:'Factory direct galvanized steel coil Z40-Z275. Hot-dip GI coil for roofing, construction, appliances. Competitive pricing, fast delivery to 60+ countries.',k:'galvanized steel coil, GI coil, hot dip galvanized coil, zinc coated steel coil, galvanized steel manufacturer'}},
{cat:1,sort:95,feat:0,
  n:'热镀锌钢卷',ne:'Hot Dip Galvanized Steel Coil - HDG Coil Z60-Z275',
  desc:'Hot-dip galvanized steel coil produced on continuous CGL lines. Uniform zinc coating with excellent adhesion. ASTM A653 / EN 10346 / JIS G3302 certified.',
  hero:'Hot Dip Galvanized Steel Coil',sub:'Continuous Hot-Dip Process — Superior Coating Adhesion & Uniformity',
  badges:['🔥 Hot-Dip Process','📏 0.15-3.5mm','🔬 CGL Line','📋 Multi-Standard'],accent:'#3498db',
  specs:giSpecs('Z60-Z275 (60-275 g/m²)','0.15-3.5mm'),apps:giApps,faqs:giFaq,
  seo:{t:'Hot Dip Galvanized Steel Coil HDG | SunSea Steel',d:'Hot-dip galvanized steel coil (HDG) Z60-Z275. Continuous galvanizing line production. ASTM A653, EN 10346 certified.',k:'hot dip galvanized steel coil, HDG coil, hot dip zinc coating, continuous galvanizing, HDG steel'}},
{cat:1,sort:90,feat:0,
  n:'镀锌带钢',ne:'Galvanized Steel Strip - GI Slit Coil Narrow Width',
  desc:'Precision-slit galvanized steel strip 30-600mm width from full-width GI coil. Burr-free edges for pipe making, cable tray, and roll-formed profiles.',
  hero:'Galvanized Steel Strip',sub:'Precision Slit — 30 to 600mm Width — Burr-Free Edges',
  badges:['📐 30-600mm Width','🔩 Z40-Z275','✂️ Slit Edge','🔧 Pipe & Profile'],accent:'#1abc9c',
  specs:giSpecs('Z40-Z275 (40-275 g/m²)','0.15-3.0mm, Width 30-600mm'),apps:giApps,faqs:giFaq,
  seo:{t:'Galvanized Steel Strip | GI Slit Coil Narrow Width',d:'Galvanized steel strip precision-slit to 30-600mm width. Burr-free edges for pipe, cable tray, and roll forming.',k:'galvanized steel strip, GI strip, slit galvanized coil, narrow GI strip, galvanized steel narrow'}},
{cat:1,sort:85,feat:0,
  n:'GI 钢卷',ne:'GI Steel Coil - Galvanized Iron Coil for Construction & Industry',
  desc:'GI (Galvanized Iron) steel coil with Z40-Z275 zinc coating. The versatile building material for roofing sheets, purlins, ductwork, and general fabrication.',
  hero:'GI Steel Coil',sub:'Galvanized Iron — Versatile Zinc-Coated Steel for Every Application',
  badges:['🏗️ Construction','📏 0.12-4.0mm','🔩 Z40-Z275','🌍 Export Ready'],accent:'#2c3e50',
  specs:giSpecs('Z40-Z275 (40-275 g/m²)'),apps:giApps,faqs:giFaq,
  seo:{t:'GI Steel Coil | Galvanized Iron Coil Manufacturer',d:'GI steel coil manufacturer. Galvanized iron coil Z40-Z275 for construction, roofing, and industrial fabrication. FOB/CIF/CFR terms.',k:'GI steel coil, GI coil, galvanized iron coil, GI steel manufacturer, GI coil factory'}},
{cat:1,sort:80,feat:0,
  n:'GI 带钢',ne:'GI Steel Strip - Galvanized Iron Strip Slit to Width',
  desc:'GI galvanized iron strip slit to custom width 30-600mm. Suitable for tube making, cable tray, strapping, automotive parts, and precision roll forming.',
  hero:'GI Steel Strip',sub:'Custom-Width Galvanized Strip — Tube Making, Cable Tray & More',
  badges:['📐 Custom Width','✂️ Precision Slit','🔧 Tube Making','📦 Small MOQ'],accent:'#16a085',
  specs:giSpecs('Z40-Z275 (40-275 g/m²)','0.15-3.0mm, Width 30-600mm'),apps:giApps,faqs:giFaq,
  seo:{t:'GI Steel Strip | Galvanized Iron Strip Custom Width',d:'GI steel strip slit to custom width 30-600mm. Galvanized iron strip for tube, cable tray, and roll forming.',k:'GI steel strip, GI strip, galvanized iron strip, GI slit strip, narrow galvanized strip'}},

// ── Cat 2: GL ──────────────────────────────────────────────
{cat:2,sort:100,feat:1,
  n:'镀铝锌钢卷',ne:'Galvalume Steel Coil - Al-Zn Coated GL Coil AZ50-AZ185',
  desc:'Galvalume (55% Al-Zn) steel coil AZ50-AZ185. Superior corrosion resistance — 2-4× longer life than standard galvanized. Ideal for roofing, solar, and industrial buildings.',
  hero:'Galvalume Steel Coil',sub:'55% Aluminum-Zinc Alloy Coated — AZ50 to AZ185 — Premium Durability',
  badges:['🔩 AZ50-AZ185','📏 0.12-4.0mm','☀️ Heat Resistant','🏆 2-4× GI Life'],accent:'#e67e22',
  specs:glSpecs('AZ50-AZ185 (50-185 g/m²)'),apps:glApps,faqs:glFaq,
  seo:{t:'Galvalume Steel Coil | GL Coil AZ50-AZ185 Manufacturer',d:'Galvalume steel coil AZ50-AZ185. 55% Al-Zn alloy coating for superior corrosion resistance. Factory direct for roofing and solar.',k:'galvalume steel coil, GL coil, aluzinc steel coil, 55% aluminum zinc coil, galvalume manufacturer'}},
{cat:2,sort:95,feat:0,
  n:'热镀铝锌钢卷',ne:'Hot Dip Galvalume Steel Coil - Aluzinc Coated AZ100-AZ185',
  desc:'Hot-dip Galvalume steel coil produced on modern CGL lines. 55% Al + 43.4% Zn + 1.6% Si alloy coating. Superior corrosion and heat resistance for demanding environments.',
  hero:'Hot Dip Galvalume Steel Coil',sub:'Continuous Hot-Dip Al-Zn Process — Premium Alloy Coating Technology',
  badges:['🔥 Hot-Dip','📏 0.25-2.0mm','🔬 55%Al-Zn','🏭 CGL Line'],accent:'#d35400',
  specs:glSpecs('AZ100-AZ185 (100-185 g/m²)','0.25-2.0mm'),apps:glApps,faqs:glFaq,
  seo:{t:'Hot Dip Galvalume Steel Coil Aluzinc | SunSea Steel',d:'Hot-dip Galvalume steel coil AZ100-AZ185. 55% aluminum-zinc alloy. Superior corrosion and heat resistance.',k:'hot dip galvalume, aluzinc coil, hot dip al-zn steel, AZ150 galvalume, aluzinc steel coil'}},
{cat:2,sort:90,feat:0,
  n:'镀铝锌带钢',ne:'Galvalume Steel Strip - Al-Zn Slit Coil Narrow Width',
  desc:'Precision-slit Galvalume steel strip 30-600mm width. AFP or bare surface. For PPGL substrate, solar mounting, exhaust systems, and precision components.',
  hero:'Galvalume Steel Strip',sub:'Al-Zn Coated Narrow Strip — 30 to 600mm — AFP Available',
  badges:['📐 30-600mm','🔩 AZ50-AZ185','✂️ Precision Slit','☀️ Solar Use'],accent:'#f39c12',
  specs:glSpecs('AZ50-AZ185','0.20-2.0mm, Width 30-600mm'),apps:glApps,faqs:glFaq,
  seo:{t:'Galvalume Steel Strip | Al-Zn Slit Coil Narrow',d:'Galvalume steel strip slit to 30-600mm. AFP anti-fingerprint treatment. For solar, PPGL substrate, and precision applications.',k:'galvalume steel strip, GL strip, aluzinc strip, galvalume slit coil, narrow al-zn strip'}},
{cat:2,sort:85,feat:0,
  n:'GL钢卷',ne:'GL Steel Coil - Galvalume Coil for Roofing & Solar',
  desc:'GL (Galvalume) steel coil with 55% aluminum-zinc alloy coating. The industry standard for metal roofing, solar structures, and PPGL substrate.',
  hero:'GL Steel Coil',sub:'Industry Standard Galvalume — Roofing, Solar & Coating Substrate',
  badges:['🏗️ Roofing','☀️ Solar','📏 0.12-4.0mm','🔩 AZ50-AZ185'],accent:'#c0392b',
  specs:glSpecs('AZ50-AZ185'),apps:glApps,faqs:glFaq,
  seo:{t:'GL Steel Coil | Galvalume Coil Roofing Solar',d:'GL steel coil manufacturer. Galvalume coil for roofing, solar, and industrial buildings. AZ50-AZ185 coating.',k:'GL steel coil, GL coil, galvalume roofing, GL steel manufacturer, GL coil factory'}},
{cat:2,sort:80,feat:0,
  n:'GL带钢',ne:'GL Steel Strip - Galvalume Strip Custom Width',
  desc:'GL Galvalume steel strip slit to customer width. AFP surface for clean handling. Common uses: exhaust tubing, cable tray, solar bracket, narrow roll forming.',
  hero:'GL Steel Strip',sub:'Custom-Width Galvalume Strip — AFP Surface — Precision Edge',
  badges:['📐 Custom Width','✂️ Precision','🔧 Tube & Profile','📦 Flexible MOQ'],accent:'#e74c3c',
  specs:glSpecs('AZ50-AZ185','0.20-2.0mm, Width 30-600mm'),apps:glApps,faqs:glFaq,
  seo:{t:'GL Steel Strip | Galvalume Strip Custom Width',d:'GL steel strip custom width 30-600mm. AFP Galvalume strip for exhaust, solar, and roll forming.',k:'GL steel strip, GL strip, galvalume strip, GL slit coil, aluzinc narrow strip'}},
{cat:2,sort:75,feat:0,
  n:'55%镀铝锌钢卷',ne:'55% Aluminum-Zinc Steel Coil - AZ150 Galvalume Standard',
  desc:'Standard 55% aluminum + 43.4% zinc + 1.6% silicon alloy coated steel coil. AZ150 is the global standard for metal roofing. 2-4× corrosion life vs pure zinc.',
  hero:'55% Aluminum-Zinc Steel Coil',sub:'The Global Standard — AZ150 — 55% Al + 43.4% Zn + 1.6% Si',
  badges:['⚗️ 55% Al-Zn-Si','🔩 AZ150','🌍 Global Standard','🏗️ Roofing'],accent:'#8e44ad',
  specs:glSpecs('AZ150 (55% Al-Zn, 150 g/m²)'),apps:glApps,faqs:glFaq,
  seo:{t:'55% Aluminum Zinc Steel Coil AZ150 | SunSea Steel',d:'55% aluminum-zinc alloy coated steel coil. AZ150 Galvalume — the global roofing standard with 2-4× corrosion life vs galvanized.',k:'55% aluminum zinc coil, AZ150 steel, 55 al zn coil, aluminum zinc alloy steel, Zincalume'}},
{cat:2,sort:70,feat:0,
  n:'25%镀铝锌钢卷',ne:'25% Aluminum-Zinc Steel Coil - ZAM / Galfan Alternative',
  desc:'25% aluminum + 75% zinc alloy coated steel coil. A cost-effective alternative to 55% Galvalume with better cut-edge protection. Suitable for construction and general use.',
  hero:'25% Aluminum-Zinc Steel Coil',sub:'25% Al + 75% Zn Alloy — Enhanced Cut-Edge Protection',
  badges:['⚗️ 25% Al-Zn','💰 Cost Effective','🔧 Good Formability','🏗️ Construction'],accent:'#2ecc71',
  specs:glSpecs('25% Al-Zn alloy (coating to spec)','0.25-2.0mm'),apps:glApps,faqs:glFaq,
  seo:{t:'25% Aluminum Zinc Steel Coil ZAM Galfan | SunSea Steel',d:'25% aluminum-zinc alloy steel coil. Cost-effective alternative to 55% Galvalume with better cut-edge protection and formability.',k:'25% aluminum zinc coil, ZAM steel, galfan coil, 25 al zn steel, low aluminum zinc'}},

// ── Cat 4: PPGI ────────────────────────────────────────────
{cat:4,sort:100,feat:1,
  n:'预涂镀锌钢卷',ne:'Prepainted Galvanized Steel Coil - PPGI Color Coated GI Coil',
  desc:'PPGI prepainted galvanized steel coil with PE/SMP/HDP/PVDF paint systems. RAL and custom colors. For roofing, wall panels, appliances, and interior decoration.',
  hero:'Prepainted Galvanized Steel Coil',sub:'Color Coated GI — PE/SMP/HDP/PVDF — RAL & Custom Colors',
  badges:['🎨 RAL Colors','📏 0.12-1.2mm','🏗️ Roofing','🏠 Appliance'],accent:'#e74c3c',
  specs:ppgiSpecs('PE / SMP / HDP / PVDF (customer choice)'),apps:ppgiApps,faqs:ppgiFaq,
  seo:{t:'Prepainted Galvanized Steel Coil PPGI | Color Coated GI',d:'PPGI prepainted galvanized steel coil. PE/SMP/HDP/PVDF paint. RAL color matching. Factory direct for roofing and appliances.',k:'prepainted galvanized steel coil, PPGI coil, color coated GI, prepainted GI coil, PPGI manufacturer'}},
{cat:4,sort:95,feat:0,
  n:'PPGI钢卷',ne:'PPGI Steel Coil - Pre-Painted GI Coil Factory Direct',
  desc:'PPGI (Pre-Painted Galvanized Iron) steel coil. Economy PE to premium PVDF paint systems. Consistent color, smooth finish, excellent paint adhesion.',
  hero:'PPGI Steel Coil',sub:'Pre-Painted Galvanized Iron — Economy to Premium Paint Systems',
  badges:['🏭 Factory Direct','📏 0.12-1.2mm','🎨 Custom Color','📦 Fast Delivery'],accent:'#3498db',
  specs:ppgiSpecs('PE (economy) / SMP / HDP / PVDF (premium)'),apps:ppgiApps,faqs:ppgiFaq,
  seo:{t:'PPGI Steel Coil | Pre-Painted GI Coil Factory',d:'PPGI steel coil factory direct. Pre-painted galvanized iron coil with PE to PVDF paint. Custom colors and specifications.',k:'PPGI steel coil, PPGI coil, pre-painted GI, PPGI coil factory, color steel coil'}},
{cat:4,sort:90,feat:0,
  n:'彩涂镀锌钢卷',ne:'Color Coated Galvanized Steel Coil - Painted GI Sheet Coil',
  desc:'Color coated galvanized steel coil for roofing, wall panels, and interior applications. Smooth glossy or matte finish. 10-25 year paint warranty available.',
  hero:'Color Coated Galvanized Steel Coil',sub:'Smooth Color + Zinc Protection — 10 to 25 Year Paint Warranty',
  badges:['🎨 Glossy/Matte','🔩 Z40-Z180','💎 Premium Finish','📋 Long Warranty'],accent:'#27ae60',
  specs:ppgiSpecs('PE 15-20μm / SMP 20-25μm / HDP 20-25μm'),apps:ppgiApps,faqs:ppgiFaq,
  seo:{t:'Color Coated Galvanized Steel Coil | Painted GI',d:'Color coated galvanized steel coil with 10-25 year paint warranty. PE/SMP/HDP systems for roofing and walling.',k:'color coated galvanized steel, painted GI coil, color steel coil, painted galvanized, color coated GI'}},
{cat:4,sort:85,feat:0,
  n:'网纹/皱纹彩涂镀锌钢卷',ne:'Wrinkle Textured PPGI Coil - Embossed Matte Color GI Coil',
  desc:'Wrinkle/textured finish PPGI coil with embossed matte surface. Hides minor scratches and fingerprints. Popular for garage doors, shutters, wall cladding, and decorative panels.',
  hero:'Wrinkle Textured PPGI Coil',sub:'Embossed Matte Finish — Scratch-Resistant — Premium Aesthetic',
  badges:['✨ Wrinkle Finish','🔧 Scratch Resist','🏠 Decorative','🎨 Matt Texture'],accent:'#8e44ad',
  specs:ppgiSpecs('Wrinkle PE 25-35μm / Embossed SMP'),apps:ppgiApps,faqs:ppgiFaq,
  seo:{t:'Wrinkle PPGI Coil | Textured Embossed Color GI',d:'Wrinkle textured PPGI coil with embossed matte surface. Scratch-resistant for garage doors, shutters, and decorative panels.',k:'wrinkle PPGI, textured PPGI coil, embossed color steel, wrinkle finish GI, matte PPGI coil'}},

// ── Cat 3: PPGL ────────────────────────────────────────────
{cat:3,sort:100,feat:1,
  n:'预涂镀铝锌钢卷',ne:'Prepainted Galvalume Steel Coil - PPGL Color Coated GL Coil',
  desc:'PPGL prepainted Galvalume steel coil — the highest durability painted steel product. GL substrate provides 2-4× corrosion life vs PPGI. Ideal for premium roofing and exterior.',
  hero:'Prepainted Galvalume Steel Coil',sub:'Color Coated AL-ZN — Ultimate Corrosion Resistance — Premium Roofing',
  badges:['🏆 Premium','📏 0.12-1.2mm','🔩 AZ50-AZ185','☀️ UV Resistant'],accent:'#d35400',
  specs:ppglSpecs('PE / SMP / HDP / PVDF (customer choice)'),apps:ppglApps,faqs:ppglFaq,
  seo:{t:'Prepainted Galvalume Steel Coil PPGL | SunSea Steel',d:'PPGL prepainted Galvalume steel coil. Color coated AL-ZN for premium roofing. 2-4× longer life than PPGI.',k:'prepainted galvalume steel coil, PPGL coil, color coated GL, PPGL manufacturer, painted galvalume'}},
{cat:3,sort:95,feat:0,
  n:'PPGL钢卷',ne:'PPGL Steel Coil - Pre-Painted Galvalume Factory Direct',
  desc:'PPGL (Pre-Painted Galvalume) steel coil. 55% Al-Zn substrate with PE/SMP/HDP/PVDF topcoat. The industry choice for long-life roofing and architectural cladding.',
  hero:'PPGL Steel Coil',sub:'Pre-Painted Galvalume — 55% Al-Zn Substrate — Long-Life Performance',
  badges:['🏭 Factory Direct','📏 0.12-1.2mm','🎨 Custom Color','🏗️ Architecture'],accent:'#e67e22',
  specs:ppglSpecs('PE / SMP / HDP / PVDF'),apps:ppglApps,faqs:ppglFaq,
  seo:{t:'PPGL Steel Coil | Pre-Painted Galvalume Factory',d:'PPGL steel coil factory direct. Pre-painted Galvalume with PE to PVDF paint. Custom colors, fast production.',k:'PPGL steel coil, PPGL coil, pre-painted galvalume, PPGL factory, PPGL manufacturer'}},
{cat:3,sort:90,feat:0,
  n:'彩涂镀铝锌钢卷',ne:'Color Coated Galvalume Steel Coil - Painted AL-ZN Sheet Coil',
  desc:'Color coated Galvalume steel coil for premium roofing and exterior wall panels. GL substrate + color coating = maximum weather resistance and aesthetic durability.',
  hero:'Color Coated Galvalume Steel Coil',sub:'Painted AL-ZN — Maximum Weather Resistance — Architecture Grade',
  badges:['🎨 Full Color Range','🔩 AZ50-AZ185','💎 Architecture','📋 25+ Year Life'],accent:'#c0392b',
  specs:ppglSpecs('PE 15-20μm / SMP 20-25μm / HDP 20-25μm / PVDF 25μm'),apps:ppglApps,faqs:ppglFaq,
  seo:{t:'Color Coated Galvalume Steel Coil | Painted AL-ZN',d:'Color coated Galvalume steel coil. Painted AL-ZN for premium roofing and architectural cladding with 25+ year service life.',k:'color coated galvalume, color coated GL, painted galvalume coil, PPGL color steel, painted aluzinc'}},
{cat:3,sort:85,feat:0,
  n:'网纹/皱纹彩涂镀铝锌钢卷',ne:'Wrinkle Textured PPGL Coil - Embossed Matte Color GL Coil',
  desc:'Wrinkle/textured PPGL coil with embossed matte surface on Galvalume substrate. Premium aesthetic + ultimate corrosion resistance. For high-end cladding and decorative panels.',
  hero:'Wrinkle Textured PPGL Coil',sub:'Embossed Matte + Galvalume Substrate — Premium Decorative Solution',
  badges:['✨ Wrinkle Finish','🔩 GL Substrate','🏠 Decorative','🏆 Premium'],accent:'#9b59b6',
  specs:ppglSpecs('Wrinkle PE 25-35μm / Embossed SMP / HDP'),apps:ppglApps,faqs:ppglFaq,
  seo:{t:'Wrinkle PPGL Coil | Textured Embossed Color GL',d:'Wrinkle textured PPGL coil with embossed matte surface on Galvalume substrate. Premium aesthetic for high-end cladding.',k:'wrinkle PPGL, textured PPGL coil, embossed galvalume, wrinkle finish GL, matte PPGL'}},

// ── Cat 6: CRC ─────────────────────────────────────────────
{cat:6,sort:100,feat:1,
  n:'冷轧钢卷',ne:'Cold Rolled Steel Coil - CRC SPCC/DC01-DC06 Full Range',
  desc:'Cold rolled steel coil (CRC) from CQ to super deep drawing quality. SPCC/DC01 to DC06. Bright or matte surface. For appliances, automotive, coating substrate, and fabrication.',
  hero:'Cold Rolled Steel Coil',sub:'SPCC/DC01 to DC06 — Full Range — Appliance, Auto & Coating Substrate',
  badges:['📋 SPCC-DC06','📏 0.15-3.0mm','🏠 Appliance','🚗 Automotive'],accent:'#2c3e50',
  specs:crcSpecs('SPCC / DC01-DC06 (CQ to SDDQ)'),apps:crcApps,faqs:crcFaq,
  seo:{t:'Cold Rolled Steel Coil | CRC SPCC DC01-DC06 Manufacturer',d:'Cold rolled steel coil CRC. SPCC/DC01 to DC06. Full range from CQ to super deep drawing. Factory direct supply.',k:'cold rolled steel coil, CRC coil, SPCC steel coil, DC01 coil, cold rolled steel manufacturer'}},
{cat:6,sort:95,feat:0,
  n:'CRC钢卷',ne:'CRC Steel Coil - Cold Rolled Carbon Steel Coil Factory Direct',
  desc:'CRC (Cold Rolled Coil) factory direct. 0.15-3.0mm thickness, ±0.02mm tolerance. Bright and matte finish. For fabrication, coating substrate, and precision applications.',
  hero:'CRC Steel Coil',sub:'Factory Direct Cold Rolled — Precision Gauge ±0.02mm — Multi-Finish',
  badges:['🏭 Factory Direct','📏 0.15-3.0mm','🔬 ±0.02mm','✨ Multi-Finish'],accent:'#34495e',
  specs:crcSpecs('CQ / DQ / DDQ (SPCC-DC04)'),apps:crcApps,faqs:crcFaq,
  seo:{t:'CRC Steel Coil | Cold Rolled Carbon Steel Factory',d:'CRC steel coil factory direct. Cold rolled carbon steel 0.15-3.0mm. ±0.02mm tolerance for precision applications.',k:'CRC steel coil, CRC coil, cold rolled carbon steel, CRC manufacturer, CRC factory'}},
{cat:6,sort:90,feat:0,
  n:'SPCC钢卷',ne:'SPCC Steel Coil - Commercial Quality Cold Rolled Coil',
  desc:'SPCC (JIS G3141) commercial quality cold rolled steel coil. Equivalent to DC01 (EN 10130) / A1008 CS (ASTM). The most widely used CRC grade for general fabrication.',
  hero:'SPCC Steel Coil',sub:'Commercial Quality CRC — JIS G3141 — The Industry Standard',
  badges:['📋 JIS G3141','📏 0.20-3.0mm','🔧 CQ Grade','🌍 Global Standard'],accent:'#7f8c8d',
  specs:crcSpecs('SPCC / DC01 / A1008 CS Type B','0.20-3.0mm'),apps:crcApps,faqs:crcFaq,
  seo:{t:'SPCC Steel Coil | Commercial Quality CRC DC01',d:'SPCC steel coil - commercial quality CRC equivalent to DC01 (EN 10130). The standard cold rolled grade for general fabrication.',k:'SPCC steel coil, SPCC coil, DC01 steel coil, commercial quality CRC, SPCC cold rolled'}},
{cat:6,sort:85,feat:0,
  n:'黑退钢卷',ne:'Black Annealed Steel Coil - BA Cold Rolled for Tubes & Drums',
  desc:'Black annealed cold rolled steel coil. Annealed without bright finish for cost-effective applications: drum making, tube welding, pipe, and general fabrication.',
  hero:'Black Annealed Steel Coil',sub:'Cost-Effective Annealed CRC — Drum Making, Tube & Pipe',
  badges:['🔵 Black Annealed','📏 0.15-2.0mm','🥫 Drum Making','💰 Economy'],accent:'#95a5a6',
  specs:crcSpecs('Black Annealed (SPCC base)','0.15-2.0mm'),apps:crcApps,faqs:crcFaq,
  seo:{t:'Black Annealed Steel Coil | BA Cold Rolled for Tubes',d:'Black annealed cold rolled steel coil for drum making, tube welding, pipe, and general fabrication. Cost-effective CRC solution.',k:'black annealed steel coil, BA coil, annealed cold rolled, drum making steel, black annealed CRC'}}
]

// ═══════════════════════════════════════════════════════════════
// UPLOAD
// ═══════════════════════════════════════════════════════════════
async function main(){
  let idx=0
  for(const p of products){
    idx++
    const ov=`<p><strong>${p.ne}</strong> — ${p.desc}</p><p>Manufactured on our modern continuous production lines with full quality certification (ISO 9001:2015, SGS/BV). Every coil supplied with Mill Test Certificate per EN 10204 Type 3.1 including chemistry, mechanical properties, and coating thickness.</p>`
    const data={
      name: p.n,
      name_en: p.ne,
      category_id: p.cat,
      description: p.desc,
      description_en: p.desc,
      specs: S(p.specs),
      faq_items: S(p.faqs.map(f=>({question:f.q,answer:f.a}))),
      is_featured: p.feat,
      sort_order: p.sort,
      status: 1,
      seo_title: p.seo.t,
      seo_description: p.seo.d,
      seo_keywords: p.seo.k,
      detail_content: productHtml({
        name: p.n, name_en: p.ne, hero: p.hero, sub: p.sub,
        badges: p.badges, accent: p.accent,
        overview: ov, specs: p.specs, apps: p.apps, faqs: p.faqs
      })
    }
    const r = await upload('products', data)
    console.log(`✅ [${idx}/24] Cat${p.cat} sort=${p.sort} ${p.feat?'⭐':' '} ${p.n} → id=${r.id}`)
  }
  console.log(`\n🎉 All ${idx} products uploaded!`)
}
main().catch(e=>console.error('❌',e))
