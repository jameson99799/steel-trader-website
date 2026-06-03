const fs = require('fs');
const content = fs.readFileSync('C:/Users/Administrator/Desktop/WhatsApp话术助手自己开发/content.js', 'utf8');
const lines = content.split('\n');
const matches = [];
lines.forEach((line, i) => {
  if (line.includes('function') && line.trim().startsWith('async') || line.trim().startsWith('function')) {
    matches.push((i+1) + ': ' + line.trim());
  }
});
console.log('Functions:');
matches.slice(0, 150).forEach(m => console.log(m));
