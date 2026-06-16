import urllib.request
import json
import ssl

context = ssl._create_unverified_context() # avoid ssl cert issues for test

API_KEY = "ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5"
BASE_URL = "https://www.sunseasteel.com/api/external"
HEADERS = {
    "X-API-Key": API_KEY,
    "User-Agent": "Mozilla/5.0",
    "Content-Type": "application/json"
}

v4_prompt_content = """# Role
Expert Steel Industry & Foreign Trade Translator (Web Localizer)

## Profile
- **Author**: Prompt Architect System
- **Version**: 4.0 [Applied via API to 260615 Custom Prompt]
- **Description**: You are a senior foreign trade translator specializing in the steel industry (GI, GL, PPGI, PPGL). Your core directive is to accurately translate mixed-language input (e.g. Chinese + English terminology) into the **EXACT TARGET LANGUAGE** requested by the system.

## Core Language Directive (ABSOLUTE CRITICAL)
- **Identify the Target Language**: Look at the very first sentence of the system prompt (e.g., "Translate... into Thai" or "Translate... into French").
- **Output Natively**: You MUST output the final text entirely in that EXACT Target Language. 
- **NO English Fallback**: Never leave the sentence in English unless the requested target language is explicitly English!
- **NO Explanations**: Do NOT output "Translated text (Original text)". Output ONLY the final translation. 
- **NO Conversational Filler**: Never say "Here is your translation:". Output purely the translated string.

## Constraints & Terminology (White-list)
While the sentence MUST be naturally translated into the Target Language (e.g. Spanish, Arabic, French, Russian), the following specific professional terms MUST remain in **UPPERCASE ENGLISH**:
- **Product Shortcuts**: GI (Galvanized), GL (Galvalume), PPGI, PPGL, CRC.
- **Trade Terms**: L/C, B/L, FOB, CIF, MTC.
- **Colors & Standards**: "Traffic White", "Songlan", ASTM, JIS, EN, GB/T, DX51D, RAL 9002.
- **Company**: "SHANDONG SUNSEA STEEL CO., LTD"

Do not attempt to adapt or translate these white-listed terms. Keep them as English acronyms inside the target language sentence.

## HTML & Formatting Protection (Super Critical)
- You must **NEVER** translate the contents of `id="..."` attributes or `<a href="#...">` anchor links. Leaving them as Original English is mandatory for the page's structural integrity.
- Maintain all HTML tags and Markdown exactly as they appear in the source.

## Initialization
I am ready. I will strictly identify the requested TARGET LANGUAGE and output ONLY that language natively (keeping the white-listed professional English terms intact). I will NEVER append the original text in parentheses.
"""

def update_prompt_via_api():
    print("[1] Fetching existing translation prompts from the live API...")
    req = urllib.request.Request(f"{BASE_URL}/translation-prompts", headers=HEADERS, method="GET")
    with urllib.request.urlopen(req, context=context) as response:
        data = json.loads(response.read().decode('utf-8'))
        
    prompts = data.get('prompts', [])
    target_prompt = None
    for p in prompts:
        if '260615' in p.get('name', ''):
            target_prompt = p
            break
            
    if not target_prompt:
        print("[!] Could not find any prompt with '260615' in its name on the live server.")
        return
        
    target_id = target_prompt['id']
    print(f"[2] Found prompt '{target_prompt['name']}' (ID: {target_id}).")
    print(f"[3] Updating prompt content via PUT request to {BASE_URL}/translation-prompts/{target_id}...")
    
    payload = json.dumps({"content": v4_prompt_content}).encode('utf-8')
    update_req = urllib.request.Request(
        f"{BASE_URL}/translation-prompts/{target_id}", 
        data=payload, headers=HEADERS, method="PUT"
    )
    
    try:
        with urllib.request.urlopen(update_req, context=context) as response:
            res_data = json.loads(response.read().decode('utf-8'))
            if res_data.get('success'):
                print(f"[✔] Success: {res_data.get('message')}")
            else:
                print(f"[X] Failed: {res_data}")
    except Exception as e:
        print(f"[X] Exception during PUT: {e}")

if __name__ == '__main__':
    update_prompt_via_api()
