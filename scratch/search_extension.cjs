const fs = require('fs');
const content = fs.readFileSync('C:/Users/Administrator/Desktop/WhatsApp话术助手自己开发/content.js', 'utf8');
const lines = content.split('\n');
const matches = [];
lines.forEach((line, i) => {
  if (line.includes('Translate to') || line.includes('translate') || line.includes('翻译') || line.includes('role') || line.includes('system')) {
    matches.push((i+1) + ': ' + line.trim());
  }
});
console.log('Matches count:', matches.length);
matches.slice(0, 100).forEach(m => console.log(m));
