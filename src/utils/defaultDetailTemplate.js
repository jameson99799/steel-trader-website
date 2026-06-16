// Default product detail HTML template for AI generation
// AI will replace all text content while keeping the same HTML structure
export const DEFAULT_DETAIL_TEMPLATE = `<style>
:root{--primary:#1d4f73;--primary-dark:#12354d;--secondary:#2980b9;--bg:#f8fafc;--white:#ffffff;--text:#334155;--heading:#0f172a;--muted:#64748b;--border:#e2e8f0;--soft:#f1f5f9;--img-window-h:360px}
*{box-sizing:border-box}
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
.image-box{background:#f8fafc;border:1px solid var(--border);border-radius:8px;padding:20px;text-align:center;margin:30px 0;position:relative}
.image-box img{width:auto;max-width:100%;max-height:520px;margin:0 auto;background:#fff;object-fit:contain;outline:1px solid #cbd5e1}
.grid-2 .image-box img,.grid-3 .image-box img{width:100%;height:var(--img-window-h);object-fit:contain;background:#fff;border-radius:6px;border:1px solid #d8dee6}
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
.check-list li::before{content:'鉁?;position:absolute;left:0;color:var(--secondary);font-weight:bold}
.pack-steps li{position:relative;padding-left:20px;margin-bottom:12px;list-style:none}
.pack-steps li::before{content:'鉁?;position:absolute;left:0;color:var(--secondary);font-weight:bold}
.faq-list{margin-top:30px}
.faq-item{background:#fff;border:1px solid var(--border);border-radius:10px;padding:22px 24px;margin-bottom:18px;box-shadow:0 4px 10px rgba(0,0,0,0.03)}
.faq-item h3{margin:0 0 10px;font-size:20px;color:var(--heading);border:none;padding:0}
.faq-item p{margin:0}
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
@media(max-width:768px){.hero{height:320px}.hero h1{font-size:32px}.content,.cta-section{padding-left:20px;padding-right:20px}.quick-links{margin:-20px 20px 30px;padding:15px}.cta-section{margin-left:20px;margin-right:20px}.compare-image-grid,.shipping-image-grid,.qc-image-grid,.grid-2,.grid-3{grid-template-columns:1fr}.fixed-image-frame{height:280px}.split-section{flex-direction:column}}
</style>

<div class="container">
<header class="hero">
  <img src="images/placeholder-hero.jpg" alt="PRODUCT_NAME supplier manufacturer">
  <div class="hero-content">
    <h1>PRODUCT_NAME</h1>
    <p>Product subtitle and key selling points</p>
    
  </div>
</header>
<main class="content">
<nav class="quick-links"><strong>Quick Links:</strong><a href="#overview">Overview</a><a href="#specifications">Specifications</a><a href="#applications">Applications</a><a href="#comparison">Comparison</a><a href="#advantages">Advantages</a><a href="#why-choose-us">Why Choose Us</a><a href="#factory-strength">Factory</a><a href="#quality-control">QC</a><a href="#packaging">Packaging</a><a href="#shipping">Shipping</a><a href="#faq">FAQ</a></nav>
<section id="overview" class="split-section" style="margin-top:20px;">
  <div class="split-text">
    <h2 style="margin-top:0;">What Is PRODUCT_NAME?</h2>
    <p><strong>PRODUCT_NAME</strong> overview paragraph 1.</p><p>Overview paragraph 2 with applications.</p><p>Overview paragraph 3 with edge conditions and treatments.</p>
  </div>
  <div class="split-image image-box">
    <img src="images/placeholder-overview.jpg" alt="PRODUCT_NAME surface" loading="lazy">
    <span class="replace-tip">馃憠 鏇挎崲鍥炬彁绀猴細浜у搧鐗瑰啓鍥?/span>
  </div>
</section>
<section id="specifications">
  <h2>Technical Specifications</h2>
  <p>Available in various specs. Common standards include ASTM, JIS, EN and GB/T.</p>
  <div class="table-responsive">
    <table><tbody><tr><th>Product</th><td>Product full name</td></tr><tr><th>Coating</th><td>Coating details</td></tr><tr><th>Thickness</th><td>Range</td></tr><tr><th>Width</th><td>Range</td></tr><tr><th>Standard</th><td>Standards list</td></tr><tr><th>Surface</th><td>Surface options</td></tr><tr><th>Steel Grade</th><td>Grade list</td></tr><tr><th>Coil ID</th><td>508mm / 610mm</td></tr><tr><th>Coil Weight</th><td>Weight range</td></tr></tbody></table>
  </div>
</section>
<section id="applications">
  <h2>Applications</h2>
  <p>Application overview paragraph.</p>
  <div class="grid-2"><div class="image-box" style="margin:0;">
    <img src="images/placeholder-app1.jpg" alt="Application 1" loading="lazy">
    <span class="replace-tip">馃摲 鏇挎崲搴旂敤鍦烘櫙鍥?/span>
    <h3 style="margin-top:15px;color:var(--heading);">馃彈锔?Application Area 1</h3>
    <p>Description of application area 1.</p>
  </div><div class="image-box" style="margin:0;">
    <img src="images/placeholder-app2.jpg" alt="Application 2" loading="lazy">
    <span class="replace-tip">馃摲 鏇挎崲搴旂敤鍦烘櫙鍥?/span>
    <h3 style="margin-top:15px;color:var(--heading);">馃彔 Application Area 2</h3>
    <p>Description of application area 2.</p>
  </div><div class="image-box" style="margin:0;">
    <img src="images/placeholder-app3.jpg" alt="Application 3" loading="lazy">
    <span class="replace-tip">馃摲 鏇挎崲搴旂敤鍦烘櫙鍥?/span>
    <h3 style="margin-top:15px;color:var(--heading);">馃敡 Application Area 3</h3>
    <p>Description of application area 3.</p>
  </div><div class="image-box" style="margin:0;">
    <img src="images/placeholder-app4.jpg" alt="Application 4" loading="lazy">
    <span class="replace-tip">馃摲 鏇挎崲搴旂敤鍦烘櫙鍥?/span>
    <h3 style="margin-top:15px;color:var(--heading);">馃殫 Application Area 4</h3>
    <p>Description of application area 4.</p>
  </div></div>
</section>
<section id="comparison">
  <h2>Product Comparison</h2>
  <p>Comparison overview paragraph.</p>
  <div class="compare-image-grid">
    <div class="fixed-image-card"><div class="fixed-image-frame"><img src="images/placeholder-compare1.jpg" alt="Product Type A" loading="lazy"></div><span class="replace-tip">馃憠 鏇挎崲浜у搧A瀹炴媿鍥?/span><h3 style="margin-top:15px;color:var(--heading);">Product Type A</h3><p>Description of product type A.</p></div>
    <div class="fixed-image-card"><div class="fixed-image-frame"><img src="images/placeholder-compare2.jpg" alt="Product Type B" loading="lazy"></div><span class="replace-tip">馃憠 鏇挎崲浜у搧B瀹炴媿鍥?/span><h3 style="margin-top:15px;color:var(--heading);">Product Type B</h3><p>Description of product type B.</p></div>
  </div>
  <div class="table-responsive"><table><thead><tr><th>Item</th><th>Type A</th><th>Type B</th></tr></thead><tbody><tr><td>Feature 1</td><td>Value A</td><td>Value B</td></tr><tr><td>Feature 2</td><td>Value A</td><td>Value B</td></tr><tr><td>Best For</td><td>Use case A</td><td>Use case B</td></tr></tbody></table></div>
</section>
<section id="advantages" class="split-section">
  <div class="split-image image-box"><img src="images/placeholder-advantages.jpg" alt="PRODUCT_NAME advantages" loading="lazy"><span class="replace-tip">馃憠 鏇挎崲浼樺娍灞曠ず鍥?/span></div>
  <div class="split-text">
    <h2 style="margin-top:0;">Main Advantages</h2>
    <p>Advantages overview.</p>
    <ul class="check-list"><li><strong>Advantage 1</strong> 鈥?Detail</li><li><strong>Advantage 2</strong> 鈥?Detail</li><li><strong>Advantage 3</strong> 鈥?Detail</li><li><strong>Advantage 4</strong> 鈥?Detail</li><li><strong>Advantage 5</strong> 鈥?Detail</li><li><strong>Advantage 6</strong> 鈥?Detail</li></ul>
  </div>
</section>
<section id="why-choose-us">
  <h2>Why Choose SunSea Steel?</h2>
  <p>Why choose us overview.</p>
  <div class="grid-2"><div class="card"><h3>Reason 1</h3><p>Detail.</p></div><div class="card"><h3>Reason 2</h3><p>Detail.</p></div><div class="card"><h3>Reason 3</h3><p>Detail.</p></div><div class="card"><h3>Reason 4</h3><p>Detail.</p></div></div>
</section>
<section id="factory-strength" class="split-section">
  <div class="split-text">
    <h2 style="margin-top:0;">Factory Strength</h2>
    <p>Factory description paragraph 1.</p><p>Factory description paragraph 2.</p>
    <ul class="check-list"><li>Factory point 1</li><li>Factory point 2</li><li>Factory point 3</li><li>Factory point 4</li></ul>
  </div>
  <div class="split-image image-box"><img src="images/placeholder-factory.jpg" alt="factory production line" loading="lazy"><span class="replace-tip">馃憠 鏇挎崲宸ュ巶瀹炴媿鍥?/span></div>
</section>
<section id="quality-control">
  <h2>Quality Control</h2>
  <p>QC overview.</p>
  <div class="qc-image-grid">
    <div class="fixed-image-card"><div class="fixed-image-frame"><img src="images/placeholder-qc1.jpg" alt="Quality inspection" loading="lazy"></div><h3 style="margin-top:15px;color:var(--heading);">QC Step 1</h3><p>QC step 1 description.</p></div>
    <div class="fixed-image-card"><div class="fixed-image-frame"><img src="images/placeholder-qc2.jpg" alt="Pre-shipment QC" loading="lazy"></div><h3 style="margin-top:15px;color:var(--heading);">QC Step 2</h3><p>QC step 2 description.</p></div>
  </div>
  <div class="grid-2"><div class="card"><h3>QC Card 1</h3><p>Detail.</p></div><div class="card"><h3>QC Card 2</h3><p>Detail.</p></div><div class="card"><h3>QC Card 3</h3><p>Detail.</p></div><div class="card"><h3>QC Card 4</h3><p>Detail.</p></div></div>
</section>
<section id="packaging" class="split-section" style="background:#f1f5f9;padding:40px;border-radius:12px;">
  <div class="split-image image-box" style="background:#fff;margin:0;"><img src="images/placeholder-packing.jpg" alt="Export packaging" loading="lazy"><span class="replace-tip">馃憠 鏇挎崲鍖呰瀹炴媿鍥?/span></div>
  <div class="split-text">
    <h2 style="margin-top:0;border-bottom:none;">Standard Export Packaging</h2>
    <p>Packaging overview.</p>
    <ul class="pack-steps"><li><strong>Step 1:</strong> Detail.</li><li><strong>Step 2:</strong> Detail.</li><li><strong>Step 3:</strong> Detail.</li><li><strong>Step 4:</strong> Detail.</li><li><strong>Step 5:</strong> Detail.</li></ul>
  </div>
</section>
<section id="shipping">
  <h2>Shipping Solutions</h2>
  <p>Shipping overview.</p>
  <div class="shipping-image-grid">
    <div class="fixed-image-card"><div class="fixed-image-frame"><img src="images/placeholder-ship1.jpg" alt="Container shipment" loading="lazy"></div><span class="replace-tip">馃憠 鏇挎崲闆嗚绠卞浘鐗?/span><h3 style="margin-top:15px;color:var(--heading);">Container Shipment</h3><p>Container shipping description.</p></div>
    <div class="fixed-image-card"><div class="fixed-image-frame"><img src="images/placeholder-ship2.jpg" alt="Bulk vessel" loading="lazy"></div><span class="replace-tip">馃憠 鏇挎崲鏁ｈ揣鑸瑰浘鐗?/span><h3 style="margin-top:15px;color:var(--heading);">Break Bulk Vessel</h3><p>Bulk vessel description.</p></div>
  </div>
</section>
<section id="faq">
  <h2>Frequently Asked Questions</h2>
  <div class="faq-list"><div class="faq-item"><h3>FAQ Question 1?</h3><p>Answer 1.</p></div><div class="faq-item"><h3>FAQ Question 2?</h3><p>Answer 2.</p></div><div class="faq-item"><h3>FAQ Question 3?</h3><p>Answer 3.</p></div><div class="faq-item"><h3>FAQ Question 4?</h3><p>Answer 4.</p></div><div class="faq-item"><h3>FAQ Question 5?</h3><p>Answer 5.</p></div><div class="faq-item"><h3>FAQ Question 6?</h3><p>Answer 6.</p></div><div class="faq-item"><h3>FAQ Question 7?</h3><p>Answer 7.</p></div></div>
</section>
</main>
<section class="cta-section">
  <h2>Looking for a Reliable PRODUCT_NAME Supplier?</h2>
  <p>Contact us for pricing, specifications, coating options, export packing and shipping solutions.</p>
  <a href="mailto:{{email}}" class="btn btn-primary">鉁夛笍 Send Email</a>
  <a href="{{whatsapp_link}}" class="btn btn-white" target="_blank" rel="noopener">馃挰 Chat on WhatsApp</a>
</section>
</div>`
