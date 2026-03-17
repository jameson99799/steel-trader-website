// Shared HTML template generators for bulk content upload
const IMG='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
const API_BASE='https://www.sunseasteel.com/api/external'
const API_KEY='ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5'

export {IMG,API_BASE,API_KEY}

export async function upload(endpoint,data){
  const r=await fetch(`${API_BASE}/${endpoint}`,{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':API_KEY},body:JSON.stringify(data)})
  return r.json()
}

export function productHtml(p){
  const badges=p.badges.map(b=>`<span class="hb">${b}</span>`).join('')
  const specRows=p.specs.map(s=>`<tr><td><strong>${s.n}</strong></td><td>${s.v}</td></tr>`).join('')
  const apps=p.apps.map(a=>`<div class="ac"><h4>${a.i} ${a.t}</h4><p>${a.d}</p></div>`).join('')
  const advs=(p.advs||[
    {i:'🏭',t:'Factory Direct',d:'Own production line, no middlemen, competitive pricing.'},
    {i:'🔬',t:'Quality Certified',d:'ISO 9001, SGS/BV inspected. MTC per EN 10204 Type 3.1.'},
    {i:'📦',t:'Custom Specs',d:'Full customization on thickness, width, coating, and packing.'},
    {i:'🚢',t:'Global Export',d:'Shipped to 60+ countries. FOB/CIF/CFR. 15-25 day delivery.'}
  ]).map(a=>`<div class="cd"><div class="ci">${a.i}</div><h4>${a.t}</h4><p>${a.d}</p></div>`).join('')
  const faqs=p.faqs.map(f=>`<div class="fi"><h4>Q: ${f.q}</h4><p>${f.a}</p></div>`).join('')
  return`<style>
:root{--p:#1f4e79;--s:#2980b9;--a:#e67e22;--bg:#f8f9fa;--td:#2c3e50;--bd:#e0e6ed;--r:12px;--sh:0 4px 20px rgba(0,0,0,.08)}
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',Arial,sans-serif;color:var(--td);line-height:1.8}
.hero{background:linear-gradient(135deg,#1a3a5c,#2980b9 60%,${p.accent||'#e67e22'});color:#fff;padding:60px 30px;text-align:center}
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
.cg{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:18px}.cd{background:#fff;border-radius:var(--r);padding:18px;text-align:center;box-shadow:var(--sh)}.ci{font-size:2em;margin-bottom:8px}.cd h4{color:var(--p);margin-bottom:4px}
.fl{margin-top:14px}.fi{background:#fff;border-radius:var(--r);padding:16px 20px;margin-bottom:10px;box-shadow:var(--sh);border-left:4px solid #27ae60}.fi h4{color:var(--p);margin-bottom:4px}.fi p{color:#555;font-size:.95em}
.cta{background:linear-gradient(135deg,var(--p),var(--s));padding:45px 30px;text-align:center;color:#fff;margin-top:35px}.cta h2{font-size:1.9em;margin-bottom:10px}.cta p{font-size:1.05em;margin-bottom:18px;opacity:.92}
.cb{display:flex;gap:14px;justify-content:center;flex-wrap:wrap}.cb a{display:inline-block;padding:12px 28px;border-radius:8px;font-size:1em;font-weight:700;text-decoration:none}.ce{background:#fff;color:var(--p)}.cw{background:#25d366;color:#fff}
.replace-tip{display:block;background:#fffbeb;color:#d97706;font-weight:bold;padding:8px;margin-top:6px;border-radius:6px;border:1px dashed #fbbf24;font-size:12px}
@media(max-width:768px){.og,.ag{grid-template-columns:1fr}.cg{grid-template-columns:1fr 1fr}.di{flex-direction:column}.hero h1{font-size:1.7em}}
</style>
<div class="hero"><h1>${p.hero}</h1><p>${p.sub}</p><div>${badges}</div></div>
<div class="sec" id="overview"><h2 class="st">Product Overview</h2><div class="og"><div>${p.overview}</div><div class="ib"><img src="${IMG}" alt="${p.name_en}"/><span class="replace-tip">📷 请上传${p.name}产品照片</span></div></div></div>
<div class="sec sa" id="specs"><h2 class="st">Technical Specifications</h2><table class="sp"><tr><th style="width:35%">Parameter</th><th>Specification</th></tr>${specRows}</table></div>
<div class="sec" id="apps"><h2 class="st">Applications</h2><div class="ag">${apps}</div><div class="di"><div class="fif"><img src="${IMG}" alt="${p.name_en} application"/><span class="replace-tip">📷 请上传应用场景照片1</span></div><div class="fif"><img src="${IMG}" alt="${p.name_en} factory"/><span class="replace-tip">📷 请上传应用场景照片2</span></div></div></div>
<div class="sec sa" id="advantages"><h2 class="st">Why Choose Us</h2><div class="cg">${advs}</div></div>
<div class="sec" id="faq"><h2 class="st">Frequently Asked Questions</h2><div class="fl">${faqs}</div></div>
<div class="cta"><h2>📩 Get Your Quote Today</h2><p>Factory direct pricing. Custom specs welcome. Fast delivery worldwide.</p><div class="cb"><a href="mailto:{{email}}" class="cb ce">✉️ Email: {{email}}</a><a href="{{whatsapp_link}}" class="cb cw">💬 WhatsApp: {{phone}}</a></div></div>`
}

export function articleHtml(a){
  const secs=a.sections.map(s=>`<h2>${s.h}</h2>${s.c}`).join('\n')
  return`${a.intro}
<div style="display:flex;gap:16px;margin:20px 0"><div style="flex:1;aspect-ratio:4/3;overflow:hidden;border-radius:12px;background:#f0f4f8"><img src="${IMG}" alt="${a.title_en}" style="width:100%;height:100%;object-fit:cover"/><span class="replace-tip">📷 请上传文章配图1</span></div><div style="flex:1;aspect-ratio:4/3;overflow:hidden;border-radius:12px;background:#f0f4f8"><img src="${IMG}" alt="${a.title_en} detail" style="width:100%;height:100%;object-fit:cover"/><span class="replace-tip">📷 请上传文章配图2</span></div></div>
${secs}
<h2>Conclusion</h2>${a.conclusion}
<p>📧 Contact us at <a href="mailto:{{email}}">{{email}}</a> or chat on <a href="{{whatsapp_link}}">WhatsApp</a> for expert advice and competitive quotes.</p>`
}
