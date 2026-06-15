import os
import json
import urllib.request
import time

api_url = "http://154.12.36.144:8317/v1/chat/completions"
api_key = "x9981509"
model_name = "mimo-v2.5-pro" # Or mimo-v2.5-pro

system_prompt = """You are a sales expert who understands the psychology of steel foreign trade customers. 
Based on the provided title, write a professional foreign trade marketing long article in ENGLISH.

Requirements:
1. The article MUST be written entirely in ENGLISH.
2. The article MUST be formatted using standard HTML with specific classes. Do NOT use markdown. Do NOT wrap the output in ```html. Output raw HTML directly.
3. The structure MUST follow the standard `art-hero`, `sec`, `intro-grid`, `takeaway-box`, `art-cta` format.
4. If you include a "Table of Contents" (TOC), you MUST adhere to these STRICT rules:
   - Do NOT use ANY inline dark background colors or classes like `table-of-contents-dark`.
   - The TOC container MUST be a simple `<div class="toc">` or `<ul class="toc-list">`.
   - Every `href` in the TOC and every `id` on the target headings MUST BE 100% PURE ENGLISH ALPHANUMERIC with hyphens ONLY (e.g. `id="why-choose-ppgi"`). NO numbers at the start, NO spaces, NO question marks, NO extra characters.
   - Example Heading: `<h2 class="sh" id="why-choose-ppgi">1. Why Choose PPGI?</h2>`
   - Example TOC link: `<li><a href="#why-choose-ppgi">1. Why Choose PPGI?</a></li>`
5. At the end, include the Contact CTA exactly like this:
     <div class="art-cta">
       <h2>💬 Need Expert Advice?</h2>
       <p>Our steel specialists are ready to help with product selection, technical questions, and competitive pricing.</p>
       <div class="cta-btns">
         <a href="mailto:jameson@sunseasteel.com" class="cta-email">✉️ Email: jameson@sunseasteel.com</a>
         <a href="https://wa.me/8615553478959" class="cta-wa" target="_blank">💬 WhatsApp: +86 155 5347 8959</a>
       </div>
     </div>
"""

titles = [
    "PPGI vs PPGL Steel Coil: Which Pre-Painted Steel Coil Is Better for Your Project?",
    "Galvanized Steel Coil vs Galvalume Steel Coil: Which One Should You Choose for Your Project?",
    "What Is a PPGL Ridge Cap Roofing Sheet and Why Is It Essential for Metal Roof Protection?",
    "What Is a PPGL T Profile Roofing Sheet and Which Roof Tile Profiles Are Best for Metal Buildings?",
    "What Is a PPGL Corrugated Roofing Sheet and Why Is It Chosen for Long-Lasting Color Metal Roofs?"
]

results = {}

for t in titles:
    print("Generating for:", t)
    data = {
        "model": model_name,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Please write the article for the title: {t}\nFollow all HTML formatting and TOC id rules strictly."}
        ]
    }
    req = urllib.request.Request(api_url, data=json.dumps(data).encode('utf-8'), headers={
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    })
    
    try:
        response = urllib.request.urlopen(req)
        result = json.loads(response.read().decode('utf-8'))
        content = result['choices'][0]['message']['content']
        results[t] = content
        print("Success for", t)
    except Exception as e:
        print("Error for", t, ":", e)
    
    time.sleep(1)

with open("generated_articles.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print("All done!")
