import re

path = 'src/components/SiteHeader.vue'
with open(path, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Replace any corrupted span closing tags
content = re.sub(r'<span v-if="lang === l\.code" class="lang-check">.*?/span>', '<span v-if="lang === l.code" class="lang-check">✓</span>', content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print('Fixed corrupted span tags.')
