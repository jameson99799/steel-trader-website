// ── Shared HTML template generators for bulk content upload ─────────────
const IMG='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const API_BASE='https://www.sunseasteel.com/api/external'
const API_KEY='ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5'

export {IMG,API_BASE,API_KEY}

export async function upload(endpoint,data){
  const r=await fetch(`${API_BASE}/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':API_KEY},body:JSON.stringify(data)})
  return r.json()
}

/* ═══════════════════════ PRODUCT HTML ═══════════════════════ */
export function productHtml(p){
  const accent=p.accent||'#e67e22'
  const badges=p.badges.map(b=>`<span class="hb">${b}</span>`).join('')
  const specRows=p.specs.map(s=>`<tr><td><strong>${s.name}</strong></td><td>${s.value}</td></tr>`).join('')
  const apps=p.apps.map(a=>`<div class="ac"><h4>${a.i} ${a.t}</h4><p>${a.d}</p></div>`).join('')
  const advs=(p.advs||[
    {i:'🏭',t:'Factory Direct',d:'Own CGL/CCL production lines. No middlemen — competitive ex-works pricing with full traceability.'},
    {i:'🔬',t:'Quality Certified',d:'ISO 9001:2015, SGS/BV inspected every shipment. Mill Test Certificate per EN 10204 Type 3.1 with every order.'},
    {i:'📦',t:'Custom Specifications',d:'Full customization: thickness ±0.02mm, width to 1500mm, any coating weight, custom stenciling and packing.'},
    {i:'🚢',t:'Global Export Network',d:'Exported to 60+ countries across 5 continents. FOB/CIF/CFR terms. 15-25 day production, 3-5 day port delivery.'},
    {i:'📋',t:'Technical Support',d:'Eng. team provides grade selection, application optimization, and fabrication guidance. Free sample evaluation.'},
    {i:'💰',t:'Flexible Payment',d:'T/T, L/C, D/P accepted. 30% deposit + 70% against B/L copy. Trade insurance available through Sinosure.'}
  ]).map(a=>`<div class="cd"><div class="ci">${a.i}</div><h4>${a.t}</h4><p>${a.d}</p></div>`).join('')
  const faqs=p.faqs.map(f=>`<div class="fi"><h4>Q: ${f.q}</h4><p>${f.a}</p></div>`).join('')

  return`<style>
:root{--p:#1f4e79;--s:#2980b9;--a:${accent};--bg:#f8f9fa;--td:#2c3e50;--bd:#e0e6ed;--r:12px;--sh:0 4px 20px rgba(0,0,0,.08)}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:var(--td);line-height:1.8}
.hero{background:linear-gradient(135deg,#1a3a5c,#2980b9 60%,${accent});color:#fff;padding:60px 30px;text-align:center}
.hero h1{font-size:2.2em;margin-bottom:10px;text-shadow:2px 2px 8px rgba(0,0,0,.3)}.hero p{font-size:1.1em;opacity:.92;max-width:750px;margin:0 auto 16px}
.hb{background:rgba(255,255,255,.18);padding:6px 16px;border-radius:20px;font-size:.85em;font-weight:600;display:inline-block;margin:4px}
.sec{padding:45px 30px;max-width:1100px;margin:0 auto}.sa{background:var(--bg)}
.st{font-size:1.7em;color:var(--p);margin-bottom:18px;padding-bottom:8px;border-bottom:3px solid var(--s)}
.og{display:grid;grid-template-columns:1fr 1fr;gap:28px;align-items:center}
.ib{border-radius:var(--r);overflow:hidden;box-shadow:var(--sh);background:#f0f4f8}.ib img{width:100%;display:block}
.fif{position:relative;aspect-ratio:4/3;overflow:hidden;border-radius:var(--r);background:#f0f4f8;box-shadow:var(--sh)}.fif img{width:100%;height:100%;object-fit:cover}
.di{display:flex;gap:16px;margin:20px 0}.di .fif{flex:1}
table.sp{width:100%;border-collapse:collapse;margin:16px 0;border-radius:var(--r);overflow:hidden;box-shadow:var(--sh)}
.sp th,.sp td{padding:11px 15px;text-align:left;border-bottom:1px solid var(--bd)}.sp th{background:var(--p);color:#fff;font-weight:600}.sp tr:nth-child(even){background:#f1f5f9}.sp tr:hover{background:#e8f0fe}
.ag{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:18px}.ac{background:#fff;border-radius:var(--r);padding:18px;box-shadow:var(--sh);border-left:4px solid var(--s)}.ac h4{color:var(--p);margin-bottom:6px}
.cg{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:18px}.cd{background:#fff;border-radius:var(--r);padding:18px;text-align:center;box-shadow:var(--sh)}.ci{font-size:2em;margin-bottom:8px}.cd h4{color:var(--p);margin-bottom:4px}
.fl{margin-top:14px}.fi{background:#fff;border-radius:var(--r);padding:16px 20px;margin-bottom:10px;box-shadow:var(--sh);border-left:4px solid #27ae60}.fi h4{color:var(--p);margin-bottom:4px}.fi p{color:#555;font-size:.95em}
.cta{background:linear-gradient(135deg,var(--p),var(--s));padding:45px 30px;text-align:center;color:#fff;margin-top:35px}.cta h2{font-size:1.9em;margin-bottom:10px}.cta p{font-size:1.05em;margin-bottom:18px;opacity:.92}
.cb{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}.cb a{display:inline-block;padding:12px 28px;border-radius:8px;font-size:1em;font-weight:700;text-decoration:none}.ce{background:#fff;color:var(--p)}.cw{background:#25d366;color:#fff}
.replace-tip{display:block;background:#fffbeb;color:#d97706;font-weight:bold;padding:8px;margin-top:6px;border-radius:6px;border:1px dashed #fbbf24;font-size:12px}
@media(max-width:768px){.og,.ag{grid-template-columns:1fr}.cg{grid-template-columns:1fr 1fr}.di{flex-direction:column}.hero h1{font-size:1.7em}}
</style>
<div class="hero"><h1>${p.hero}</h1><p>${p.sub}</p><div>${badges}</div></div>
<div class="sec" id="overview"><h2 class="st">Product Overview</h2><div class="og"><div>${p.overview}</div><div class="ib"><img src="${IMG}" alt="${p.name_en}"/><span class="replace-tip">📷 请上传${p.name}产品照片 (建议800×600px)</span></div></div></div>
<div class="sec sa" id="specs"><h2 class="st">Technical Specifications</h2><table class="sp"><tr><th style="width:35%">Parameter</th><th>Specification</th></tr>${specRows}</table></div>
<div class="sec" id="apps"><h2 class="st">Applications</h2><div class="ag">${apps}</div><div class="di"><div class="fif"><img src="${IMG}" alt="${p.name_en} application"/><span class="replace-tip">📷 请上传应用场景照片1</span></div><div class="fif"><img src="${IMG}" alt="${p.name_en} factory"/><span class="replace-tip">📷 请上传应用场景照片2</span></div></div></div>
<div class="sec sa" id="advantages"><h2 class="st">Why Choose SunSea Steel</h2><div class="cg">${advs}</div></div>
<div class="sec" id="faq"><h2 class="st">Frequently Asked Questions</h2><div class="fl">${faqs}</div></div>
<div class="cta"><h2>📩 Get Your Quote Today</h2><p>Factory direct pricing — custom specifications welcome — fast delivery to 60+ countries</p><div class="cb"><a href="mailto:{{email}}" class="ce">✉️ Email: {{email}}</a><a href="{{whatsapp_link}}" class="cw" target="_blank">💬 WhatsApp: {{phone}}</a></div></div>`
}

/* ═══════════════════════ ARTICLE HTML (rich, styled, iframe mode) ═══════════════════════ */
export function articleHtml(a){
  // Build full styled HTML page for iframe rendering
  const accent=a.accent||'#2980b9'
  
  // Build sections with alternating backgrounds and image placeholders between sections
  let body=''
  
  // Hero/Header
  body+=`<div class="art-hero"><h1>${a.title_en}</h1><p class="art-sum">${a.sum_en||''}</p></div>`
  
  // Introduction with side image
  body+=`<div class="sec"><div class="intro-grid"><div class="intro-text">${a.intro}</div><div class="intro-img"><img src="${IMG}" alt="${a.title_en}"/><span class="replace-tip">📷 请上传文章主题配图 (建议800×500px)</span></div></div></div>`
  
  // Sections with varying layouts
  a.sections.forEach((s,i)=>{
    const alt=i%2===0?'':' alt-bg'
    body+=`<div class="sec${alt}"><h2 class="sh">${s.h}</h2>${s.c}</div>`
    // Add image pair after first and third sections
    if(i===0 || i===2){
      body+=`<div class="sec img-break"><div class="img-row"><div class="img-frame"><img src="${IMG}" alt="${s.h}"/><span class="replace-tip">📷 请上传${s.h}相关配图</span></div><div class="img-frame"><img src="${IMG}" alt="${s.h} detail"/><span class="replace-tip">📷 请上传${s.h}细节图</span></div></div></div>`
    }
  })
  
  // Key takeaways box if provided
  if(a.takeaways){
    body+=`<div class="sec alt-bg"><div class="takeaway-box"><h3>📌 Key Takeaways</h3><ul>${a.takeaways.map(t=>`<li>${t}</li>`).join('')}</ul></div></div>`
  }
  
  // Conclusion
  body+=`<div class="sec"><h2 class="sh">Conclusion</h2>${a.conclusion}</div>`
  
  // CTA with real contact info (template vars resolved by NewsDetail.vue)
  body+=`<div class="art-cta"><h2>💬 Need Expert Advice?</h2><p>Our steel specialists are ready to help with product selection, technical questions, and competitive pricing.</p><div class="cta-btns"><a href="mailto:{{email}}" class="cta-email">✉️ Email: {{email}}</a><a href="{{whatsapp_link}}" class="cta-wa" target="_blank">💬 WhatsApp: {{phone}}</a></div></div>`

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Arial,sans-serif;color:#2c3e50;line-height:1.9;font-size:16px}
.art-hero{background:linear-gradient(135deg,#1a3a5c 0%,#2980b9 50%,${accent} 100%);color:#fff;padding:50px 30px;text-align:center}
.art-hero h1{font-size:2em;margin-bottom:12px;text-shadow:1px 1px 6px rgba(0,0,0,.25);max-width:900px;margin-left:auto;margin-right:auto}
.art-sum{font-size:1.05em;opacity:.9;max-width:700px;margin:0 auto}
.sec{padding:35px 30px;max-width:1000px;margin:0 auto}
.alt-bg{background:#f8f9fa}
.sh{font-size:1.5em;color:#1f4e79;margin-bottom:14px;padding-bottom:6px;border-bottom:3px solid #2980b9}
.sec p{margin-bottom:14px;text-align:justify}
.sec ul,.sec ol{padding-left:24px;margin:12px 0 16px}
.sec li{margin-bottom:8px}
.sec strong{color:#1f4e79}
.intro-grid{display:grid;grid-template-columns:1.2fr 1fr;gap:24px;align-items:start}
.intro-img{border-radius:12px;overflow:hidden;background:#f0f4f8;box-shadow:0 4px 16px rgba(0,0,0,.08)}
.intro-img img{width:100%;display:block}
.img-break{padding-top:10px;padding-bottom:10px}
.img-row{display:flex;gap:16px}
.img-frame{flex:1;aspect-ratio:16/10;overflow:hidden;border-radius:12px;background:#f0f4f8;box-shadow:0 4px 16px rgba(0,0,0,.08)}
.img-frame img{width:100%;height:100%;object-fit:cover}
table{width:100%;border-collapse:collapse;margin:16px 0;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.06)}
table th{background:#1f4e79;color:#fff;padding:10px 14px;text-align:left;font-weight:600}
table td{padding:10px 14px;border-bottom:1px solid #e8ecf0}
table tr:nth-child(even){background:#f8fafe}
table tr:hover{background:#edf2fa}
.takeaway-box{background:#e8f5e9;border-left:4px solid #27ae60;border-radius:8px;padding:20px 24px}
.takeaway-box h3{color:#1b5e20;margin-bottom:10px}
.takeaway-box li{margin-bottom:6px}
blockquote{border-left:4px solid #2980b9;margin:16px 0;padding:12px 20px;background:#f0f7ff;border-radius:0 8px 8px 0;font-style:italic;color:#34495e}
.art-cta{background:linear-gradient(135deg,#1f4e79,#2980b9);padding:40px 30px;text-align:center;color:#fff;margin-top:30px}
.art-cta h2{font-size:1.7em;margin-bottom:10px}
.art-cta p{font-size:1em;margin-bottom:16px;opacity:.92;max-width:600px;margin-left:auto;margin-right:auto}
.cta-btns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}
.cta-email{display:inline-block;padding:11px 24px;border-radius:8px;font-weight:700;text-decoration:none;background:#fff;color:#1f4e79;font-size:.95em}
.cta-wa{display:inline-block;padding:11px 24px;border-radius:8px;font-weight:700;text-decoration:none;background:#25d366;color:#fff;font-size:.95em}
.replace-tip{display:block;background:#fffbeb;color:#d97706;font-weight:bold;padding:6px 10px;margin-top:4px;border-radius:6px;border:1px dashed #fbbf24;font-size:12px}
@media(max-width:768px){.intro-grid{grid-template-columns:1fr}.img-row{flex-direction:column}.art-hero h1{font-size:1.5em}}
</style>
</head><body>${body}</body></html>`
}
