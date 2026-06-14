import io

with io.open('server/index.js', 'r', encoding='utf-8') as f:
    text = f.read()

# productMatch replacement
target1 = '''            if (productMatch) {
              matchedRoute = true
              const slug = productMatch[1]
              let product = getOne('SELECT p.*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.slug=? AND p.status=1', [slug])
              if (!product) {
                const idMatch = slug.match(/-(\d+)$/)
                if (idMatch) product = getOne('SELECT p.*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=? AND p.status=1', [idMatch[1]])
              }'''

insert1 = '''            if (productMatch) {
              matchedRoute = true
              const slug = productMatch[1]
              let product = getOne('SELECT p.*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.slug=? AND p.status=1', [slug])
              if (!product) {
                const fallbackProduct = findFuzzyBySlug('products', slug)
                if (fallbackProduct) {
                  product = getOne('SELECT p.*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=? AND p.status=1', [fallbackProduct.id])
                }
              }'''

# newsMatch replacement
target2 = '''            const newsMatch = subPath.match(/^\\/news\\/(?!category\\/|ral-colors\\/?$|roofing-profiles\\/?$|futures-price\\/?$)(.+)$/)
            if (newsMatch) {
              matchedRoute = true
              const slug = newsMatch[1]
              let article = getOne('SELECT * FROM news WHERE slug=? AND status=1', [slug])
              if (!article) {
                const idMatch = slug.match(/-(\\d+)$/)
                if (idMatch) article = getOne('SELECT * FROM news WHERE id=? AND status=1', [idMatch[1]])
              }'''

insert2 = '''            const newsMatch = subPath.match(/^\\/news\\/(?!category\\/|ral-colors\\/?$|roofing-profiles\\/?$|futures-price\\/?$)(.+)$/)
            if (newsMatch) {
              matchedRoute = true
              const slug = newsMatch[1]
              let article = getOne('SELECT * FROM news WHERE slug=? AND status=1', [slug])
              if (!article) {
                const fallbackArticle = findFuzzyBySlug('news', slug)
                if (fallbackArticle) {
                  article = getOne('SELECT * FROM news WHERE id=? AND status=1', [fallbackArticle.id])
                }
              }'''

text = text.replace(target1, insert1)
text = text.replace(target2, insert2)

with io.open('server/index.js', 'w', encoding='utf-8') as f:
    f.write(text)

print('Done SSR fuzzy match update')
