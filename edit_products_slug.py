import io

filepath = 'src/views/admin/Products.vue'
try:
    with io.open(filepath, 'r', encoding='utf-8') as f:
        text = f.read()
except Exception as e:
    print(f'Skipping {filepath}: {e}')
    exit()

if "formData.append('slug', form.slug || '')" not in text:
    text = text.replace("formData.append('seo_keywords', form.seo_keywords || '')", "formData.append('seo_keywords', form.seo_keywords || '')\n    formData.append('slug', form.slug || '')")

    text = text.replace("seo_keywords: '',\n", "seo_keywords: '',\n  slug: '',\n")
    text = text.replace("seo_keywords: product.seo_keywords || '',\n", "seo_keywords: product.seo_keywords || '',\n    slug: product.slug || '',\n")

    seo_form_html = '''
              <div class="mb-3">
                <label>自定义链接 (Slug) - 留空自动生成</label>
                <input v-model="form.slug" class="form-control" placeholder="例如: galvanized-steel-coil" />
              </div>
              <div class="mb-3">
                <label>SEO标题</label>
'''
    text = text.replace('''
              <div class="mb-3">
                <label>SEO标题</label>
''', seo_form_html, 1)

    with io.open(filepath, 'w', encoding='utf-8') as f:
        f.write(text)
    print(f'Success! Updated {filepath} with custom slug field.')
else:
    print('Already has slug.')
