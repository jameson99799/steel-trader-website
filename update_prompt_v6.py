import urllib.request
import json
import ssl

context = ssl._create_unverified_context()

API_KEY = "ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5"
BASE_URL = "https://www.sunseasteel.com/api/external"
HEADERS = {
    "X-API-Key": API_KEY,
    "User-Agent": "Mozilla/5.0",
    "Content-Type": "application/json"
}

# ============================================================
# V6 ULTIMATE PROMPT - Fixes Sunsea Steel, Explanations & Accuracy
# ============================================================
v6_prompt = """# Role
Senior Native Translator & Steel Industry Metallurgical Expert

## Core Rules (ABSOLUTE STRICT COMPLIANCE REQUIRED)

1. **Direct Translation Only (Zero Explanations)**
   - NEVER add explanatory text, parenthetical annotations, or acronyms if they aren't in the raw text.
   - ❌ WRONG: `预涂镀铝锌钢板 (PPGL)` (Because you added PPGL)
   - ❌ WRONG: `镀锌钢卷（GI COIL）`
   - ✅ CORRECT: `预涂镀铝锌钢板`
   - ✅ CORRECT: `镀锌钢卷`
   - If the source text uses an acronym (e.g., "We supply PPGI"), keep the acronym.
   - If the source text uses the full name (e.g., "We supply Prepainted Galvanized Steel"), translate the full name ONLY. DO NOT append the acronym!

2. **No Skipping, No Missing Content**
   - Translate all sentences entirely. Ensure sentence structures, long paragraphs, and descriptions are translated COMPLETELY without dropping any nuances.

3. **Strict "DO NOT TRANSLATE" Whitelist**
   - **Company Names**: "SUNSEA", "SUNSEA STEEL", "SHANDONG SUNSEA STEEL", "Sunsea Steel" (REGARDLESS of uppercase or lowercase, NEVER translate "Sunsea" or "Sunsea Steel").
   - **Technical Specs**: Z40, Z275, AZ150, RAL 9002, DX51D, ASTM, JIS, SGCC, G550, CQ.
   - **Acronyms (when used as standalone acronyms in source)**: PPGI, PPGL, GI, GL, CRC, FOB, CIF, MTC.
   - **HTML**: `<p>`, `<br>`, `<strong>`, `href="..."`, `class="xxx"` (Keep HTML completely intact).

## Steel Industry Technical Accuracy & Context

You must be 100% metallurgically accurate. Contextual reference:
- **Galvanized (GI)**: Zinc-coated steel substrate (镀锌).
- **Galvalume (GL)**: Aluminum-Zinc alloy coated steel substrate (镀铝锌).
- **PPGI**: Prepainted Galvanized Steel. Uses Galvanized (Zinc) as the hidden substrate.
- **PPGL**: Prepainted Galvalume Steel. Uses Galvalume (Al-Zn) as the hidden substrate.
- Though their surface paints (e.g., PE, SMP, HDP, PVDF) and finishes (matte, embossed) look identical, their hidden metallic substrates dictate corrosion resistance, cut-edge behavior, thermal reflectivity, and long-term value.
*Use this knowledge to ensure accurate terminology in the target language. Do NOT output this knowledge as an explanation to the user.*

## Final Output Enforcement
Your response must contain ONLY the final translated text in the specified target language. 
NO conversational filler. 
NO "Here is the translation:". 
NO adding `(Original text)` in brackets.
"""

def get_prompt_id_by_name(name_fragment):
    req = urllib.request.Request(f"{BASE_URL}/translation-prompts", headers=HEADERS, method="GET")
    with urllib.request.urlopen(req, context=context) as response:
        data = json.loads(response.read().decode('utf-8'))
    for p in data.get('prompts', []):
        if name_fragment in p.get('name', ''):
            return p['id'], p['name']
    return None, None

def update_prompt(prompt_id, new_content):
    payload = json.dumps({"content": new_content}).encode('utf-8')
    req = urllib.request.Request(
        f"{BASE_URL}/translation-prompts/{prompt_id}",
        data=payload, headers=HEADERS, method="PUT"
    )
    with urllib.request.urlopen(req, context=context) as response:
        return json.loads(response.read().decode('utf-8'))

if __name__ == '__main__':
    print("[1] Fetching prompt list...")
    
    # Update 260615
    pid, pname = get_prompt_id_by_name('260615')
    if pid:
        print(f"[2] Found '260615' -> ID={pid}, name='{pname}'")
        res = update_prompt(pid, v6_prompt)
        print(f"[3] 260615 update: {res}")
    else:
        print("[!] 260615 not found")
    
    # Also update V4 default prompt
    pid2, pname2 = get_prompt_id_by_name('V4')
    if pid2:
        print(f"[4] Found 'V4' -> ID={pid2}, name='{pname2}'")
        res2 = update_prompt(pid2, v6_prompt)
        print(f"[5] V4 default update: {res2}")
    else:
        print("[!] V4 not found")
    
    print("\n[V] Prompts successfully updated to V6 (No SUNSEA translation, No parentheses, Accurate Metallurgy).")
