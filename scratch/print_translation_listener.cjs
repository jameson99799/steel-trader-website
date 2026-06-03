const fs = require('fs');
const content = fs.readFileSync('C:/Users/Administrator/Desktop/WhatsApp话术助手自己开发/content.js', 'utf8');
const lines = content.split('\n');
console.log(lines.slice(3770, 3950).join('\n'));
