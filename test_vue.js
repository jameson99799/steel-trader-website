const fs = require('fs');
const path = require('path');
const { parse } = require('@vue/compiler-sfc');

function checkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    if (fs.statSync(fullPath).isDirectory()) {
      checkDir(fullPath);
    } else if (fullPath.endsWith('.vue')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const res = parse(content);
      if (res.errors.length) {
        console.log('Error in', fullPath);
        console.log(res.errors);
      }
    }
  }
}

checkDir('src');
console.log('Check finished.');
