const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '../server/routes/translation.js')
let code = fs.readFileSync(file, 'utf8')

code = code.replace(
    "const { pages, lang, concurrency } = req.body;",
    "const { pages, lang, concurrency, explicitItems } = req.body;"
)

const target = `    const allItemsList = [];
    for (const page of pages) {
        if (!PAGES[page]) continue;
        const items = PAGES[page]();
        // Check untranslated
        for (const item of items) {
            if (item.long_html) continue;
            for (const tLang of targetLangs) {`

const replacement = `    const allItemsList = [];
    if (explicitItems && explicitItems.length > 0) {
        // Granular selection
        for (const exItem of explicitItems) {
            for (const tLang of targetLangs) {
                const uniqueKey = \`\${tLang}_\${exItem.type}_\${exItem.id}\`;
                if (!allItemsList.find(x => x.uniqueKey === uniqueKey)) {
                    allItemsList.push({ ...exItem, targetLang: tLang, uniqueKey });
                }
            }
        }
    } else if (pages && pages.length > 0) {
        for (const page of pages) {
            if (!PAGES[page]) continue;
            const items = PAGES[page]();
            // Check untranslated
            for (const item of items) {
                if (item.long_html) continue;
                for (const tLang of targetLangs) {`

code = code.replace(target, replacement)
fs.writeFileSync(file, code)
console.log('patched')
