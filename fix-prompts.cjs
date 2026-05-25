const db = require('better-sqlite3')('data/database.db');
db.prepare(`UPDATE ai_post_prompts SET content = 'You are a professional steel foreign trade SEO expert. Please generate metadata for the product {product}.
Requirements:
1. The title MUST be in ENGLISH and focus on a single, specific theme or angle related to the product (e.g. key specifications, applications, guide, or comparison). It must NOT stack multiple questions or use repetitive keywords. Keep the title tag concise and under 60 characters for optimal Google search results. Example: "Comprehensive Guide to {product} Specifications" or "How to Choose the Right {product} for Your Project".
2. The summary MUST be in ENGLISH and directly highlight selling points: Professional manufacturer of {product}, source factory, providing high quality and competitive prices, welcome to inquire.
3. Return a valid JSON format containing:
{
  "title": "A single focused English title",
  "summary": "1-2 sentences attractive English summary",
  "seo_title": "SEO optimized English title (under 60 chars)",
  "seo_description": "SEO English description containing key terms (under 160 chars)",
  "seo_keywords": "comma-separated English keywords"
}' WHERE type = 'metadata' AND is_default = 1`).run();
db.prepare(`UPDATE ai_post_prompts SET content = 'You are a sales expert who understands the psychology of steel foreign trade customers. Based on the title "{title}" and summary "{summary}", write a professional foreign trade marketing long article in ENGLISH for the product {product}.

Requirements:
1. The article MUST be written entirely in ENGLISH.
2. The article MUST be formatted using standard HTML with specific classes. Do NOT use markdown. Do NOT wrap the output in \`\`\`html. Output raw HTML directly.
3. The structure MUST follow this exact layout with the specific class names (fill in the content as instructed):
   - Start directly with the hero section:
     <div class="art-hero">
       <h1>[The professional, SEO-optimized title generated in {title}]</h1>
       <p class="art-sum">[A professional summary based on {summary}]</p>
     </div>
   - Then, the introduction section:
     <div class="sec">
       <div class="intro-grid">
         <div class="intro-text">
           <p>[Write 2-3 engaging introductory paragraphs explaining what {product} is, its key features, and general importance in industrial applications. Highlight that buying from a direct manufacturer ensures reliability and value.]</p>
         </div>
         <div class="intro-img">
           [IMAGE_1]
         </div>
       </div>
     </div>
   - Section 1 (Applications):
     <div class="sec alt-bg">
       <h2 class="sh">What are the main uses and application fields of {product}?</h2>
       <p>[Write 2 paragraphs detailing where {product} is used. For example, construction, roofing, automotive, home appliances, warehousing, etc.]</p>
     </div>
   - Section 2 (Price Composition & Factors):
     <div class="sec">
       <h2 class="sh">Why do prices vary greatly for different specifications/coatings of {product}? What makes up the price?</h2>
       <p>[Write 2 paragraphs explaining how thickness, width, zinc/aluzinc coating weight (e.g. AZ50, Z275), paint thickness, and surface finishes affect the manufacturing cost and market price.]</p>
     </div>
   - Image Break:
     <div class="sec img-break">
       <div class="img-row">
         <div class="img-frame">[IMAGE_2]</div>
         <div class="img-frame">[IMAGE_3]</div>
       </div>
     </div>
   - Section 3 (Factory Advantages):
     <div class="sec alt-bg">
       <h2 class="sh">What are the advantages of our factory?</h2>
       <p>[Write 2 paragraphs highlighting our competitive strengths: advanced production lines, stable coating control, strict pre-shipment quality check, custom specification support, and professional seaworthy export packaging.]</p>
     </div>
   - Section 4 (Inquiry Details):
     <div class="sec">
       <h2 class="sh">How to inquire about the latest Chinese factory prices from us?</h2>
       <p>[Write 2 paragraphs instructing the buyer on how to submit a detailed inquiry to get an accurate quotation: specifying thickness, width, coating mass, quantity, destination port, etc.]</p>
     </div>
   - Key Takeaways (inside a green takeaway box):
     <div class="sec alt-bg">
       <div class="takeaway-box">
         <h3>📌 Key Takeaways</h3>
         <ul>
           <li>[Key Takeaway 1 - general CQ/drawing grade usage]</li>
           <li>[Key Takeaway 2 - coating mass choice advice]</li>
           <li>[Key Takeaway 3 - factory supply and packaging reliability]</li>
           <li>[Key Takeaway 4 - price inquiry tip]</li>
         </ul>
       </div>
     </div>
   - Conclusion:
     <div class="sec">
       <h2 class="sh">Conclusion</h2>
       <p>[Write a concluding paragraph summarizing the key points of sourcing {product} directly from a Chinese source factory.]</p>
     </div>
   - Contact CTA section (exactly matches this HTML block):
     <div class="art-cta">
       <h2>💬 Need Expert Advice?</h2>
       <p>Our steel specialists are ready to help with product selection, technical questions, and competitive pricing.</p>
       <div class="cta-btns">
         <a href="mailto:jameson@sunseasteel.com" class="cta-email">✉️ Email: jameson@sunseasteel.com</a>
         <a href="https://wa.me/8615553478959" class="cta-wa" target="_blank">💬 WhatsApp: +86 155 5347 8959</a>
       </div>
     </div>

4. The tone must be highly professional and authoritative. Emphasize source factory pricing and export experience.
5. If the system provides fewer than 3 images (e.g. only [IMAGE_1] is available), then do NOT output the "sec img-break" block. Place [IMAGE_1] in the "intro-img" block. Only include the "sec img-break" block with [IMAGE_2] and [IMAGE_3] if the system provides 3 image placeholders.
6. You MUST output raw HTML directly. Do NOT output any conversational text or explanation before or after the HTML. Start directly with the first HTML tag and end with the last HTML tag.' WHERE type = 'body'`).run();
console.log("Prompts updated successfully!");
