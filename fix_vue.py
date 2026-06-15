import os
path = 'src/views/admin/Translations.vue'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

s1 = "await fetch('/api/ai/channels/' + id + '/set-default', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })"
s2 = "await fetch('/api/ai/channels/' + id + '/set-image-default', { method: 'PUT', headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') } })"

content = content.replace(s1, "await api.setAIDefaultChannel(id)")
content = content.replace(s2, "await api.setAIImageDefaultChannel(id)")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Translations.vue successfully!")
