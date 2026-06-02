const fs = require('fs');

const files = [
  'src/views/admin/News.vue',
  'src/views/admin/Products.vue',
  'src/views/admin/Company.vue',
  'src/views/admin/Factory.vue',
  'src/views/admin/Seo.vue',
  'src/views/admin/Settings.vue'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');

  // Find all literal \n (backslash + n) that are followed by "watch" or "    if"
  content = content.replace(/\\nwatch/g, '\nwatch');
  content = content.replace(/\\n    if/g, '\n    if');
  content = content.replace(/\\n  mediaPicker/g, '\n  mediaPicker');
  content = content.replace(/\\n  newsMedia/g, '\n  newsMedia');

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
