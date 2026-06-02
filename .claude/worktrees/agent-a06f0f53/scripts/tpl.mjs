// ── Shared HTML template generators for bulk content upload ─────────────
const IMG='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const API_BASE='https://www.sunseasteel.com/api/external'
const API_KEY='ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5'

export {IMG,API_BASE,API_KEY}

export async function upload(endpoint,data){
  const r=await fetch(`${API_BASE}/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':API_KEY},body:JSON.stringify(data)})
  return r.json()
}

/* ═══════════════════════ PRODUCT HTML (rich, full-page, matches reference) ═══════════════════════ */
export function productHtml(p){
  const a=p.accent||'#e67e22'
  // Quick links
  const ql=(p.quickLinks||[
    {id:'overview',l:'Overview'},{id:'specifications',l:'Specifications'},{id:'applications',l:'Applications'},
    {id:'comparison',l:p.compTitle||'Comparison'},{id:'advantages',l:'Advantages'},{id:'why-choose-us',l:'Why Choose Us'},
    {id:'factory-strength',l:'Factory Strength'},{id:'quality-control',l:'Quality Control'},
    {id:'packaging',l:'Packaging'},{id:'shipping',l:'Shipping'},{id:'faq',l:'FAQ'}
  ]).map(q=>`<a href="#${q.id}">${q.l}</a>`).join('')

  // Specs table rows
  const specRows=p.specs.map(s=>`<tr><th>${s.name}</th><td>${s.value}</td></tr>`).join('')

  // Applications
  const appCards=p.apps.map((ap,i)=>`<div class="image-box" style="margin:0;">
    <img src="${IMG}" alt="${ap.t} application for ${p.name_en}" loading="lazy">
    <span class="replace-tip">📷 替换为${ap.t}应用场景图</span>
    <h3 style="margin-top:15px;color:var(--heading);">${ap.i} ${ap.t}</h3>
    <p>${ap.d}</p>
  </div>`).join('')

  // Comparison section
  const compHead=p.compTitle||`${p.name_en} vs Alternatives`
  const compIntro=p.compIntro||`Understanding the differences helps buyers select the most suitable material for their specific application and budget requirements.`
  let compTable=''
  if(p.compRows){
    const compTh=`<tr><th>Comparison Item</th><th>${p.compCol1||p.name_en}</th><th>${p.compCol2||'Alternative'}</th></tr>`
    const compTd=p.compRows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')
    compTable=`<div class="table-responsive"><table><thead>${compTh}</thead><tbody>${compTd}</tbody></table></div>`
  }

  // Advantages
  const advItems=(p.advantages||[]).map(a=>`<li><strong>${a.t}</strong> — ${a.d}</li>`).join('')

  // FAQ
  const faqItems=p.faqs.map(f=>`<div class="faq-item"><h3>${f.q}</h3><p>${f.a}</p></div>`).join('')

  // Why choose us cards
  const wcuCards=(p.whyUs||[
    {t:'Stable Product Quality',d:'Uniform coating mass, reliable base steel quality and stable surface condition help ensure consistent performance in export orders.'},
    {t:'Custom Specification Support',d:'Thickness, width, coating mass, steel grade, surface treatment and packing can be customized according to project requirements.'},
    {t:'Professional Export Service',d:'Support for packing, loading, shipping documents and delivery coordination helps customers manage international orders more efficiently.'},
    {t:'Fast Response and Quotation',d:'Buyers can quickly get specification confirmation, technical support and quotation feedback for distribution, project procurement and manufacturing use.'}
  ]).map(c=>`<div class="card"><h3>${c.t}</h3><p>${c.d}</p></div>`).join('')

  // QC cards
  const qcCards=(p.qcCards||[
    {t:'Thickness and Width Verification',d:'Thickness tolerance, width and coil dimensions are checked to ensure the material is suitable for roll forming, profiling and project processing needs.'},
    {t:'Coating and Surface Checking',d:'Coating weight requirements and surface appearance are reviewed before packing and shipment.'},
    {t:'Packing Inspection',d:'Export packing is examined to ensure moisture-proof protection, steel straps and edge protectors are correctly applied.'},
    {t:'Shipment Preparation',d:'Quantity, identification, loading readiness and related documentation are confirmed before export delivery.'}
  ]).map(c=>`<div class="card"><h3>${c.t}</h3><p>${c.d}</p></div>`).join('')

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
:root{--primary:#1d4f73;--primary-dark:#12354d;--secondary:${a};--bg:#f8fafc;--white:#ffffff;--text:#334155;--heading:#0f172a;--muted:#64748b;--border:#e2e8f0;--soft:#f1f5f9;--img-window-h:360px}
*{box-sizing:border-box}html{scroll-behavior:smooth}
body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.75;color:var(--text);background:var(--bg)}
img{display:block;max-width:100%;height:auto;border-radius:8px}
a{color:var(--primary);text-decoration:none;font-weight:500}a:hover{text-decoration:underline}
.container{max-width:1200px;margin:0 auto;background:var(--white);box-shadow:0 10px 30px rgba(0,0,0,0.05);padding-bottom:40px}
.hero{position:relative;text-align:center;color:#fff;background:#111;height:520px;display:flex;align-items:center;justify-content:center}
.hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0.5;border-radius:0;z-index:1}
.hero-content{position:relative;z-index:2;width:90%;max-width:980px}
.hero h1{font-size:48px;line-height:1.2;margin:0 0 16px;font-weight:800;text-shadow:0 2px 4px rgba(0,0,0,0.8)}
.hero p{font-size:18px;color:#f8fafc;text-shadow:0 1px 3px rgba(0,0,0,0.8);margin-bottom:20px}
.hero-tip{background:rgba(230,126,34,0.92);padding:8px 16px;border-radius:4px;font-size:14px;font-weight:bold;color:#fff;display:none}
.content{padding:0 48px}
.quick-links{background:var(--white);border:1px solid var(--border);border-left:5px solid var(--secondary);border-radius:8px;padding:20px 24px;margin:-30px auto 40px;position:relative;z-index:10;box-shadow:0 4px 15px rgba(0,0,0,0.05);display:flex;flex-wrap:wrap;align-items:center;gap:12px}
.quick-links strong{color:var(--heading);font-size:18px;margin-right:12px}
.quick-links a{background:var(--soft);color:var(--primary);padding:8px 16px;border-radius:50px;font-size:14px;transition:0.3s;border:1px solid var(--border)}
.quick-links a:hover{background:var(--primary);color:#fff;text-decoration:none;border-color:var(--primary)}
h2{color:var(--heading);font-size:30px;margin:50px 0 20px;padding-bottom:10px;border-bottom:2px solid var(--soft);position:relative}
h2::after{content:'';position:absolute;left:0;bottom:-2px;width:60px;height:3px;background:var(--primary)}
h3{color:var(--primary);font-size:22px;margin-top:30px;margin-bottom:12px}
p{font-size:16px;margin-bottom:18px}
ul{margin:10px 0 24px 20px;padding:0}li{margin-bottom:10px}
.split-section{display:flex;flex-wrap:wrap;gap:40px;align-items:center;margin:40px 0}
.split-text{flex:1 1 420px}.split-image{flex:1 1 420px}
.grid-2{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:30px;margin:30px 0}
.grid-3{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;margin:30px 0}
.card{background:var(--white);border:1px solid var(--border);border-radius:10px;padding:24px;box-shadow:0 4px 10px rgba(0,0,0,0.03)}
.card h3{margin-top:0;color:var(--heading);font-size:20px;border-bottom:1px solid var(--soft);padding-bottom:10px}
.image-box{background:#e2e8f0;border:2px dashed #94a3b8;border-radius:8px;padding:20px;text-align:center;margin:30px 0;position:relative}
.image-box img{width:auto;max-width:100%;max-height:520px;margin:0 auto;background:#fff;object-fit:contain;outline:1px solid #cbd5e1}
.compare-image-grid,.shipping-image-grid,.qc-image-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:30px;margin:30px 0}
.fixed-image-card{background:var(--white);border:1px solid var(--border);border-radius:10px;padding:18px;box-shadow:0 4px 10px rgba(0,0,0,0.03)}
.fixed-image-frame{width:100%;height:var(--img-window-h);background:#fff;border:1px solid #d8dee6;border-radius:8px;display:flex;align-items:center;justify-content:center;overflow:hidden}
.fixed-image-frame img{width:100%;height:100%;background:#fff;object-fit:contain;border-radius:6px}
.replace-tip{background:#fffbeb;color:#d97706;font-weight:bold;padding:10px;margin-top:15px;border-radius:4px;border:1px solid #fcd34d;font-size:15px;display:none}
.table-responsive{overflow-x:auto;margin:30px 0}
table{width:100%;border-collapse:collapse;background:var(--white);font-size:15px;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
th,td{border:1px solid var(--border);padding:14px 18px;text-align:left;vertical-align:top}
th{background:#f8fafc;color:var(--heading);font-weight:700}
.info-box{background:#f0f9ff;border-left:4px solid #0284c7;padding:20px 24px;border-radius:0 8px 8px 0;margin:30px 0;color:#0369a1}
.check-list li{position:relative;padding-left:20px;margin-bottom:12px;list-style:none}
.check-list li::before{content:'✓';position:absolute;left:0;color:var(--secondary);font-weight:bold}
.pack-steps li{position:relative;padding-left:20px;margin-bottom:12px;list-style:none}
.pack-steps li::before{content:'✓';position:absolute;left:0;color:var(--secondary);font-weight:bold}
.faq-list{margin-top:30px}
.faq-item{background:#fff;border:1px solid var(--border);border-radius:10px;padding:22px 24px;margin-bottom:18px;box-shadow:0 4px 10px rgba(0,0,0,0.03)}
.faq-item h3{margin:0 0 10px;font-size:20px;color:var(--heading);border:none;padding:0}
.faq-item p{margin:0}
.simple-adv-box{background:#f8fbfe;border:1px solid var(--border);border-radius:12px;padding:24px;margin-top:30px}
.cta-section{background:linear-gradient(135deg,var(--primary) 0%,var(--primary-dark) 100%);color:#fff;text-align:center;padding:60px 48px;border-radius:12px;margin:40px 48px 0}
.cta-section h2{border:none;padding:0;margin:0 0 16px;color:#fff}.cta-section h2::after{display:none}
.cta-section p{font-size:18px;color:#cbd5e1;max-width:780px;margin:0 auto 30px}
.btn{display:inline-block;padding:16px 36px;border-radius:6px;font-weight:bold;font-size:16px;margin:0 10px 10px;transition:0.3s;text-decoration:none}
.btn-primary{background:var(--secondary);color:#fff;border:2px solid var(--secondary)}
.btn-primary:hover{background:transparent;color:var(--secondary);text-decoration:none}
.btn-white{background:#fff;color:var(--primary);border:2px solid #fff}
.btn-white:hover{background:transparent;color:#fff;text-decoration:none}
.hero>img[src*="placeholder"]~.hero-content .hero-tip{display:inline-block}
.image-box img[src*="placeholder"]~.replace-tip{display:block}
.fixed-image-card img[src*="placeholder"]+.replace-tip{display:block}
@media(max-width:768px){.hero{height:430px}.hero h1{font-size:32px}.content,.cta-section{padding-left:20px;padding-right:20px}.quick-links{margin:-20px 20px 30px;padding:15px}.cta-section{margin-left:20px;margin-right:20px}.compare-image-grid,.shipping-image-grid,.qc-image-grid,.grid-2,.grid-3{grid-template-columns:1fr}.fixed-image-frame{height:280px}.split-section{flex-direction:column}}
</style>
</head><body>
<div class="container">

<header class="hero">
  <img src="${IMG}" alt="${p.name_en} supplier manufacturer" style="--focus-x:50%;--focus-y:50%;">
  <div class="hero-content">
    <h1>${p.hero}</h1>
    <p>${p.sub}</p>
    <span class="hero-tip">👉 替换图提示：请替换为${p.name}横幅大图，建议展示钢卷仓库、生产线或成品库存场景。</span>
  </div>
</header>

<main class="content">

<nav class="quick-links" aria-label="Quick Navigation">
  <strong>Quick Links:</strong>
  ${ql}
</nav>

<!-- ═══ OVERVIEW ═══ -->
<section id="overview" class="split-section" style="margin-top:20px;">
  <div class="split-text">
    <h2 style="margin-top:0;">What Is ${p.name_en.split(' - ')[0]}?</h2>
    ${p.overview}
  </div>
  <div class="split-image image-box">
    <img src="${IMG}" alt="${p.name_en} surface close up" loading="lazy">
    <span class="replace-tip">👉 替换图提示：放一张${p.name}表面特写或产品实拍图。</span>
  </div>
</section>

<!-- ═══ SPECIFICATIONS ═══ -->
<section id="specifications">
  <h2>Technical Specifications</h2>
  <p>Available in various thicknesses, widths and coating options. Common standards include <strong>ASTM</strong>, <strong>JIS</strong>, <strong>EN</strong> and <strong>GB/T</strong>. Different industries may choose different specifications depending on service life, corrosion requirements and fabrication method.</p>
  <div class="table-responsive">
    <table><tbody>${specRows}</tbody></table>
  </div>
  <div class="info-box">
    <strong>Specification Advice:</strong>
    <p style="margin:10px 0 0">${p.specAdvice||'Contact our technical team for specific grade and coating recommendations based on your application environment and processing requirements.'}</p>
  </div>
</section>

<!-- ═══ APPLICATIONS ═══ -->
<section id="applications">
  <h2>Applications</h2>
  <p>${p.appIntro||'Thanks to its corrosion resistance, processing flexibility and cost-performance ratio, this product is widely used across construction, manufacturing and industrial sectors.'}</p>
  <div class="grid-2">${appCards}</div>
</section>

<!-- ═══ COMPARISON ═══ -->
<section id="comparison">
  <h2>${compHead}</h2>
  <p>${compIntro}</p>
  <div class="compare-image-grid">
    <div class="fixed-image-card">
      <div class="fixed-image-frame">
        <img src="${IMG}" alt="${p.compCol1||p.name_en} appearance" loading="lazy">
      </div>
      <span class="replace-tip">👉 替换为${p.compCol1||p.name}实拍图</span>
      <h3 style="margin-top:15px;color:var(--heading);">${p.compCol1||p.name_en.split(' - ')[0]}</h3>
      <p>${p.compDesc1||'Known for reliable performance and wide application range.'}</p>
    </div>
    <div class="fixed-image-card">
      <div class="fixed-image-frame">
        <img src="${IMG}" alt="${p.compCol2||'Alternative product'} appearance" loading="lazy">
      </div>
      <span class="replace-tip">👉 替换为${p.compCol2||'对比产品'}实拍图</span>
      <h3 style="margin-top:15px;color:var(--heading);">${p.compCol2||'Alternative'}</h3>
      <p>${p.compDesc2||'A widely used option with its own performance characteristics.'}</p>
    </div>
  </div>
  ${compTable}
</section>

<!-- ═══ ADVANTAGES ═══ -->
<section id="advantages" class="split-section">
  <div class="split-image image-box">
    <img src="${IMG}" alt="${p.name_en} advantages" loading="lazy">
    <span class="replace-tip">👉 替换为${p.name}优势展示图</span>
  </div>
  <div class="split-text">
    <h2 style="margin-top:0;">Main Advantages</h2>
    <p>${p.advIntro||'This product combines durability, processing flexibility and cost-effectiveness for a wide range of applications.'}</p>
    <ul class="check-list">${advItems}</ul>
  </div>
</section>

<!-- ═══ WHY CHOOSE US ═══ -->
<section id="why-choose-us">
  <h2>Why Choose SunSea Steel?</h2>
  <p>Choosing the right supplier means more than buying steel. It also means stable quality, export experience, efficient communication and reliable delivery support.</p>
  <div class="grid-2">${wcuCards}</div>
</section>

<!-- ═══ FACTORY STRENGTH ═══ -->
<section id="factory-strength" class="split-section">
  <div class="split-text">
    <h2 style="margin-top:0;">Factory Strength and Production Capability</h2>
    <p>Our production system focuses on coating uniformity, thickness control, clean surface quality and export-standard packing. From raw material selection to final inspection and shipment preparation, every stage is managed to improve product consistency and reduce customer risk.</p>
    <p>For buyers, factory capability means more than output volume. It also means communication efficiency, documentation support, shipment coordination and the ability to provide stable product supply over time.</p>
    <ul class="check-list">
      <li>Stable production planning for export orders</li>
      <li>Support for customized sizes and coating requirements</li>
      <li>Professional handling of packing and shipment preparation</li>
      <li>Inspection and tolerance control before delivery</li>
    </ul>
  </div>
  <div class="split-image image-box">
    <img src="${IMG}" alt="${p.name_en} factory production line" loading="lazy">
    <span class="replace-tip">👉 替换为生产线、检验区或工厂实拍图</span>
  </div>
</section>

<!-- ═══ QUALITY CONTROL ═══ -->
<section id="quality-control">
  <h2>Quality Control and Inspection</h2>
  <p>Product quality is one of the key concerns for overseas buyers. Quality should be controlled not only by final visual inspection, but also by process stability, specification verification and export packing inspection.</p>
  <div class="qc-image-grid">
    <div class="fixed-image-card">
      <div class="fixed-image-frame">
        <img src="${IMG}" alt="Quality inspection for ${p.name_en}" loading="lazy">
      </div>
      <span class="replace-tip">👉 替换为质检人员检查表面图片</span>
      <h3 style="margin-top:15px;color:var(--heading);">Surface and Dimension Inspection</h3>
      <p>Surface condition, width, edge quality and dimensional tolerance are checked before delivery.</p>
    </div>
    <div class="fixed-image-card">
      <div class="fixed-image-frame">
        <img src="${IMG}" alt="Pre-shipment quality control for ${p.name_en}" loading="lazy">
      </div>
      <span class="replace-tip">👉 替换为出货前检验或实验室图片</span>
      <h3 style="margin-top:15px;color:var(--heading);">Pre-Shipment Quality Control</h3>
      <p>Packing condition, identification, quantity confirmation and shipment readiness are reviewed before export.</p>
    </div>
  </div>
  <div class="grid-2">${qcCards}</div>
</section>

<!-- ═══ PACKAGING ═══ -->
<section id="packaging" class="split-section" style="background:#f1f5f9;padding:40px;border-radius:12px;">
  <div class="split-image image-box" style="background:#fff;margin:0;">
    <img src="${IMG}" alt="Seaworthy export packaging of ${p.name_en}" loading="lazy">
    <span class="replace-tip">👉 替换为钢卷海运包装实拍图</span>
  </div>
  <div class="split-text">
    <h2 style="margin-top:0;border-bottom:none;">Standard Export Seaworthy Packaging</h2>
    <p>For steel export, correct packaging is extremely important. Even high-quality product can suffer surface damage, moisture exposure or edge deformation if packing is not suitable for sea shipment.</p>
    <ul class="pack-steps">
      <li><strong>Inner Moisture Protection:</strong> Waterproof kraft paper and plastic film help reduce moisture contact.</li>
      <li><strong>Outer Steel Cover:</strong> Additional outer steel sheet gives stronger protection during handling.</li>
      <li><strong>Edge Protection:</strong> Edge protectors reduce impact damage during lifting and stacking.</li>
      <li><strong>Steel Strapping:</strong> Radial and circumferential straps help keep the coil stable.</li>
      <li><strong>Pallet Support:</strong> Wooden or steel pallets can be used according to shipping requirements.</li>
    </ul>
  </div>
</section>

<!-- ═══ SHIPPING ═══ -->
<section id="shipping">
  <h2>Shipping, Loading and Delivery Solutions</h2>
  <p>Shipping method depends on order quantity, coil size and destination requirements. Container shipment and break bulk vessel are the most common methods for steel coil export.</p>
  <div class="shipping-image-grid">
    <div class="fixed-image-card">
      <div class="fixed-image-frame">
        <img src="${IMG}" alt="Container shipment of ${p.name_en}" loading="lazy">
      </div>
      <span class="replace-tip">👉 替换为集装箱装运图片</span>
      <h3 style="margin-top:15px;color:var(--heading);">Container Shipment</h3>
      <p>Suitable for regular export orders. Coils packed on pallets and loaded into containers for safe sea transport. FOB/CIF/CFR available.</p>
    </div>
    <div class="fixed-image-card">
      <div class="fixed-image-frame">
        <img src="${IMG}" alt="Break bulk vessel shipment of ${p.name_en}" loading="lazy">
      </div>
      <span class="replace-tip">👉 替换为散货船运输图片</span>
      <h3 style="margin-top:15px;color:var(--heading);">Break Bulk Vessel Shipment</h3>
      <p>For large volume orders or oversized coils. Professional lifting, lashing and port handling for bulk steel procurement.</p>
    </div>
  </div>
  <div class="info-box">
    <strong>Shipping Advice:</strong>
    <p style="margin:10px 0 0">Small to medium orders: container shipment is preferred. Large-scale or project orders: break bulk vessel may be more efficient.</p>
  </div>
</section>

<!-- ═══ FAQ ═══ -->
<section id="faq">
  <h2>Frequently Asked Questions</h2>
  <div class="faq-list">${faqItems}</div>
</section>

</main>

<!-- ═══ CTA ═══ -->
<section class="cta-section">
  <h2>${p.ctaTitle||'Looking for a Reliable Supplier?'}</h2>
  <p>${p.ctaDesc||'Contact us now for the latest price, technical specifications, export packing details and shipping recommendations. We support customized supply for construction, appliance and industrial applications worldwide.'}</p>
  <a href="mailto:{{email}}" class="btn btn-primary">✉️ Send Email</a>
  <a href="{{whatsapp_link}}" class="btn btn-white" target="_blank" rel="noopener">💬 Chat on WhatsApp</a>
</section>

</div>
</body></html>`
}

/* ═══════════════════════ ARTICLE HTML (rich, styled, iframe mode) ═══════════════════════ */
export function articleHtml(a){
  const accent=a.accent||'#2980b9'
  let body=''
  body+=`<div class="art-hero"><h1>${a.title_en}</h1><p class="art-sum">${a.sum_en||''}</p></div>`
  body+=`<div class="sec"><div class="intro-grid"><div class="intro-text">${a.intro}</div><div class="intro-img"><img src="${IMG}" alt="${a.title_en}"/><span class="replace-tip">📷 请上传文章主题配图 (建议800×500px)</span></div></div></div>`
  a.sections.forEach((s,i)=>{
    const alt=i%2===0?'':' alt-bg'
    body+=`<div class="sec${alt}"><h2 class="sh">${s.h}</h2>${s.c}</div>`
    if(i===0||i===2){
      body+=`<div class="sec img-break"><div class="img-row"><div class="img-frame"><img src="${IMG}" alt="${s.h}"/><span class="replace-tip">📷 请上传${s.h}相关配图</span></div><div class="img-frame"><img src="${IMG}" alt="${s.h} detail"/><span class="replace-tip">📷 请上传${s.h}细节图</span></div></div></div>`
    }
  })
  if(a.takeaways){
    body+=`<div class="sec alt-bg"><div class="takeaway-box"><h3>📌 Key Takeaways</h3><ul>${a.takeaways.map(t=>`<li>${t}</li>`).join('')}</ul></div></div>`
  }
  body+=`<div class="sec"><h2 class="sh">Conclusion</h2>${a.conclusion}</div>`
  body+=`<div class="art-cta"><h2>💬 Need Expert Advice?</h2><p>Our steel specialists are ready to help with product selection, technical questions, and competitive pricing.</p><div class="cta-btns"><a href="mailto:{{email}}" class="cta-email">✉️ Email: {{email}}</a><a href="{{whatsapp_link}}" class="cta-wa" target="_blank">💬 WhatsApp: {{phone}}</a></div></div>`
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:#2c3e50;line-height:1.9;font-size:16px}
.art-hero{background:linear-gradient(135deg,#1a3a5c 0%,#2980b9 50%,${accent} 100%);color:#fff;padding:50px 30px;text-align:center}
.art-hero h1{font-size:2em;margin-bottom:12px;text-shadow:1px 1px 6px rgba(0,0,0,.25);max-width:900px;margin-left:auto;margin-right:auto}
.art-sum{font-size:1.05em;opacity:.9;max-width:700px;margin:0 auto}
.sec{padding:35px 30px;max-width:1000px;margin:0 auto}.alt-bg{background:#f8f9fa}
.sh{font-size:1.5em;color:#1f4e79;margin-bottom:14px;padding-bottom:6px;border-bottom:3px solid #2980b9}
.sec p{margin-bottom:14px;text-align:justify}.sec ul,.sec ol{padding-left:24px;margin:12px 0 16px}.sec li{margin-bottom:8px}.sec strong{color:#1f4e79}
.intro-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:24px;align-items:start}
.intro-img{border-radius:12px;overflow:hidden;background:#f0f4f8;box-shadow:0 4px 16px rgba(0,0,0,.08)}.intro-img img{width:100%;display:block}
.img-break{padding-top:10px;padding-bottom:10px}.img-row{display:flex;gap:16px}
.img-frame{flex:1;aspect-ratio:16/10;overflow:hidden;border-radius:12px;background:#f0f4f8;box-shadow:0 4px 16px rgba(0,0,0,.08)}.img-frame img{width:100%;height:100%;object-fit:cover}
table{width:100%;border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)}
table th{background:#1f4e79;color:#fff;padding:10px 14px;text-align:left;font-weight:600}
table td{padding:10px 14px;border-bottom:1px solid #e8ecf0}table tr:nth-child(even){background:#f8fafe}table tr:hover{background:#edf2fa}
.takeaway-box{background:#e8f5e9;border-left:4px solid #27ae60;border-radius:8px;padding:20px 24px}
.takeaway-box h3{color:#1b5e20;margin-bottom:10px}.takeaway-box li{margin-bottom:6px}
blockquote{border-left:4px solid #2980b9;margin:16px 0;padding:12px 20px;background:#f0f7ff;border-radius:0 8px 8px 0;font-style:italic;color:#34495e}
.art-cta{background:linear-gradient(135deg,#1f4e79,#2980b9);padding:40px 30px;text-align:center;color:#fff;margin-top:30px}
.art-cta h2{font-size:1.7em;margin-bottom:10px}.art-cta p{font-size:1em;margin-bottom:16px;opacity:.92;max-width:600px;margin-left:auto;margin-right:auto}
.cta-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.cta-email{display:inline-block;padding:11px 24px;border-radius:8px;font-weight:700;text-decoration:none;background:#fff;color:#1f4e79;font-size:.95em}
.cta-wa{display:inline-block;padding:11px 24px;border-radius:8px;font-weight:700;text-decoration:none;background:#25d366;color:#fff;font-size:.95em}
.replace-tip{display:block;background:#fffbeb;color:#d97706;font-weight:bold;padding:6px 10px;margin-top:4px;border-radius:6px;border:1px dashed #fbbf24;font-size:12px}
@media(max-width:768px){.intro-grid{grid-template-columns:1fr}.img-row{flex-direction:column}.art-hero h1{font-size:1.5em}}
</style>
</head><body>${body}</body></html>`
}
