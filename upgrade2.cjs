const fs = require('fs');
let content = fs.readFileSync('src/views/admin/News.vue', 'utf8');

// Use a regex that replaces the specific string
const findStr = "content: fullItem.content || '', content_en: fullItem.content_en || '',";
const replaceStr = "content: (fullItem.content || '').replace(/<div class=\\"grid-item\\">/g, '<div class=\\"grid-item\\" contenteditable=\\"false\\">'), content_en: (fullItem.content_en || '').replace(/<div class=\\"grid-item\\">/g, '<div class=\\"grid-item\\" contenteditable=\\"false\\">'),";

// since lines might differ by whitespace, I'll just use regex
content = content.replace(/content:\s*fullItem\.content\s*\|\|\s*'',\s*content_en:\s*fullItem\.content_en\s*\|\|\s*'',/g, replaceStr);

fs.writeFileSync('src/views/admin/News.vue', content);
console.log('Fixed');
