const fs = require('fs')
let content = fs.readFileSync('server/index.js', 'utf8')

// 1. Fix productMatch regex
content = content.replace(
  /const productMatch = subPath\.match\(\/\^\\\/products\\/\(\.\+\)\$\/\)/,
  "const productMatch = subPath.match(/^\\/products\\/(?!category\\/)(.+)$/)"
)

// 2. Add matchedRoute variable
content = content.replace(
  "let isNotFound = false  // Track soft 404\n        let ssrContent = ''",
  "let isNotFound = false  // Track soft 404\n        let matchedRoute = false\n        let ssrContent = ''"
)

// 3. Add matchedRoute = true to all valid blocks
content = content.replace(
  /if \(productMatch\) \{/,
  "if (productMatch) {\n            matchedRoute = true"
)
content = content.replace(
  /if \(newsMatch\) \{/,
  "if (newsMatch) {\n            matchedRoute = true"
)
content = content.replace(
  /if \(catPageMatch\) \{/,
  "if (catPageMatch) {\n            matchedRoute = true"
)
content = content.replace(
  /if \(prodCatMatch\) \{/,
  "if (prodCatMatch) {\n            matchedRoute = true"
)

// 4. In catPageMatch:
content = content.replace(
  /ssrContent = `<section id="ssr-category"><h1>\$\{esc\(catName\)\}<\/h1><ul>\$\{articleLinks\}<\/ul><\/section>`\n              \}\n            \}/,
  'ssrContent = `<section id="ssr-category"><h1>${esc(catName)}</h1><ul>${articleLinks}</ul></section>`\n              }\n            } else {\n              isNotFound = true\n              pageTitle = \'Category Not Found | \' + companyName\n              pageDesc = \'The requested category could not be found.\'\n            }'
)

// 5. In prodCatMatch:
content = content.replace(
  /ssrContent = `<section id="ssr-cat-products"><h1>\$\{esc\(catName\)\}<\/h1><ul>\$\{catProdItems\}<\/ul><\/section>`\n                extraSchemas \+= jsonLd\(\{\s+'@context': 'https:\/\/schema\.org', '@type': 'ItemList',\n                  name: catName,\n                  itemListElement: catProducts\.map\(\(p, i\) => \(\{\n                    '@type': 'ListItem', position: i \+ 1,\n                    name: p\.name_en \|\| p\.name,\n                    url: `\$\{siteUrl\}\/\$\{lang\}\/products\/\$\{p\.slug \|\| p\.id\}`\n                  \}\)\)\n                \}\)\n              \}\n            \}/,
  'ssrContent = `<section id="ssr-cat-products"><h1>${esc(catName)}</h1><ul>${catProdItems}</ul></section>`\n                extraSchemas += jsonLd({ \'@context\': \'https://schema.org\', \'@type\': \'ItemList\',\n                  name: catName,\n                  itemListElement: catProducts.map((p, i) => ({\n                    \'@type\': \'ListItem\', position: i + 1,\n                    name: p.name_en || p.name,\n                    url: `${siteUrl}/${lang}/products/${p.slug || p.id}`\n                  }))\n                })\n              }\n            } else {\n              isNotFound = true\n              pageTitle = \'Category Not Found | \' + companyName\n              pageDesc = \'The requested category could not be found.\'\n            }'
)

// 6. Other static routes
content = content.replace(
  /if \(subPath === '\/products' \|\| subPath === '\/products\/'\) \{/,
  "if (subPath === '/products' || subPath === '/products/') {\n            matchedRoute = true"
)
content = content.replace(
  /else if \(subPath === '\/news' \|\| subPath === '\/news\/'\) \{/,
  "else if (subPath === '/news' || subPath === '/news/') {\n            matchedRoute = true"
)
content = content.replace(
  /else if \(subPath === '\/about' \|\| subPath === '\/about\/'\) \{/,
  "else if (subPath === '/about' || subPath === '/about/') {\n            matchedRoute = true"
)
content = content.replace(
  /else if \(subPath === '\/contact' \|\| subPath === '\/contact\/'\) \{/,
  "else if (subPath === '/contact' || subPath === '/contact/') {\n            matchedRoute = true"
)
content = content.replace(
  /if \(!subPath \|\| subPath === '\/'\) \{/,
  "if (!subPath || subPath === '/') {\n            matchedRoute = true"
)

// 7. Add fallback at the end of the routing section
content = content.replace(
  /ssrContent = `<section id="ssr-home"><h1>\$\{esc\(companyName\)\}<\/h1><p>\$\{companyDesc\}<\/p><h2>Main Products<\/h2><ul>\$\{homeProductList\}<\/ul><\/section>`\n          \}/,
  'ssrContent = `<section id="ssr-home"><h1>${esc(companyName)}</h1><p>${companyDesc}</p><h2>Main Products</h2><ul>${homeProductList}</ul></section>`\n          }\n\n          // ── Catch-all for invalid routes ──\n          if (!matchedRoute) {\n            isNotFound = true\n            pageTitle = \'Page Not Found | \' + companyName\n            pageDesc = \'The requested page could not be found.\'\n          }'
)

fs.writeFileSync('server/index.js', content)
console.log('patched successfully')
