const fs = require('fs')

let text = fs.readFileSync('server/index.js', 'utf8')

// Regex replacement for products Match
const productRegex = /let product = getOne\('SELECT p\.\*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.slug=\? AND p.status=1', \[slug\]\)\r?\n\s*if \(!product\) \{\r?\n\s*const idMatch = slug\.match\(\/-\(\\d\+\)\$\/\)\r?\n\s*if \(idMatch\) product = getOne\('SELECT p\.\*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=\? AND p.status=1', \[idMatch\[1\]\]\)\r?\n\s*\}/

const productInsert = `let product = getOne('SELECT p.*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.slug=? AND p.status=1', [slug])
              if (!product) {
                const fallbackProduct = findFuzzyBySlug('products', slug)
                if (fallbackProduct) {
                  product = getOne('SELECT p.*, c.name_en as category_name_en, c.name as category_name FROM products p LEFT JOIN categories c ON p.category_id=c.id WHERE p.id=? AND p.status=1', [fallbackProduct.id])
                }
              }`

text = text.replace(productRegex, productInsert)

const newsRegex = /let article = getOne\('SELECT \* FROM news WHERE slug=\? AND status=1', \[slug\]\)\r?\n\s*if \(!article\) \{\r?\n\s*const idMatch = slug\.match\(\/-\(\\d\+\)\$\/\)\r?\n\s*if \(idMatch\) article = getOne\('SELECT \* FROM news WHERE id=\? AND status=1', \[idMatch\[1\]\]\)\r?\n\s*\}/

const newsInsert = `let article = getOne('SELECT * FROM news WHERE slug=? AND status=1', [slug])
              if (!article) {
                const fallbackArticle = findFuzzyBySlug('news', slug)
                if (fallbackArticle) {
                  article = getOne('SELECT * FROM news WHERE id=? AND status=1', [fallbackArticle.id])
                }
              }`
text = text.replace(newsRegex, newsInsert)

fs.writeFileSync('server/index.js', text, 'utf8')
console.log('done node')
