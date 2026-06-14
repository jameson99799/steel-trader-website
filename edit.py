import io

with io.open('src/views/admin/News.vue', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace(
    "title: '', title_en: '',",
    "title: '', title_en: '', slug: '',"
)

text = text.replace(
    "form.value = { title: '', title_en: '', summary:",
    "form.value = { title: '', title_en: '', slug: '', summary:"
)

text = text.replace(
    "title: fullItem.title || '', title_en: fullItem.title_en || '',\n",
    "title: fullItem.title || '', title_en: fullItem.title_en || '', slug: fullItem.slug || '',\n"
)

text = text.replace(
    "fd.append('title_en', form.value.title_en || '')",
    "fd.append('title_en', form.value.title_en || '')\n    fd.append('slug', form.value.slug || '')"
)

target = 'placeholder="Article title in English" />\n            </div>'
insert = '''placeholder="Article title in English" />
            </div>
            <div class="form-group">
              <label>自定义链接 (Slug) - 留空自动生成</label>
              <input v-model="form.slug" class="form-control" placeholder="例如: galvanized-steel-coil" />
            </div>'''
text = text.replace(target, insert)

with io.open('src/views/admin/News.vue', 'w', encoding='utf-8') as f:
    f.write(text)

with io.open('src/views/admin/Products.vue', 'r', encoding='utf-8') as f:
    prod = f.read()

prod = prod.replace(
    "name: '', name_en: '',",
    "name: '', name_en: '', slug: '',"
)

prod = prod.replace(
    "form.value = { name: '', name_en: '', base_price:",
    "form.value = { name: '', name_en: '', slug: '', base_price:"
)

prod = prod.replace(
    "name: fullItem.name || '', name_en: fullItem.name_en || '',\n",
    "name: fullItem.name || '', name_en: fullItem.name_en || '', slug: fullItem.slug || '',\n"
)

prod = prod.replace(
    "fd.append('name_en', form.value.name_en || '')",
    "fd.append('name_en', form.value.name_en || '')\n    fd.append('slug', form.value.slug || '')"
)

prod_target = 'placeholder="Product name in English" />\n            </div>'
prod_insert = '''placeholder="Product name in English" />
            </div>
            <div class="form-group">
              <label>自定义链接 (Slug) - 留空自动生成</label>
              <input v-model="form.slug" class="form-control" placeholder="例如: galvanized-steel-coil" />
            </div>'''
prod = prod.replace(prod_target, prod_insert)

with io.open('src/views/admin/Products.vue', 'w', encoding='utf-8') as f:
    f.write(prod)

print("Done")
