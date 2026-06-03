const fs = require('fs');
const content = fs.readFileSync('C:/Users/Administrator/Desktop/WhatsApp话术助手自己开发/content.js', 'utf8');
const lines = content.split('\n');
const matches = [];
lines.forEach((line, i) => {
  if (line.includes('message') && (line.includes('chat') || line.includes('history') || line.includes('dialogue') || line.includes('context'))) {
    matches.push((i+1) + ': ' + line.trim());
  }
});
console.log('Matches:');
matches.slice(0, 100).forEach(m => console.log(m));
