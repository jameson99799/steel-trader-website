const fs = require('fs')
const path = require('path')

const file = path.join(__dirname, '../server/routes/translation.js')
let code = fs.readFileSync(file, 'utf8')

// Fix missing closing brace
const t2 = `                if (!t?.translated_text) {
                    // Unique check using composite string
                    const uniqueKey = \`\${tLang}_\${item.type}_\${item.id}\`;
                    if (!allItemsList.find(x => x.uniqueKey === uniqueKey)) {
                        allItemsList.push({ ...item, targetLang: tLang, uniqueKey });
                    }
                }
            }
        }
    }`
    
const r2 = `                if (!t?.translated_text) {
                    // Unique check using composite string
                    const uniqueKey = \`\${tLang}_\${item.type}_\${item.id}\`;
                    if (!allItemsList.find(x => x.uniqueKey === uniqueKey)) {
                        allItemsList.push({ ...item, targetLang: tLang, uniqueKey });
                    }
                }
            }
        }
    }
    } // End of pages block`

if (!code.includes('End of pages block')) {
    code = code.replace(t2, r2)
    fs.writeFileSync(file, code)
    console.log('Fixed braces')
} else {
    console.log('Already fixed')
}
