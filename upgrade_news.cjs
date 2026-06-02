const fs = require('fs');
let content = fs.readFileSync('src/views/admin/News.vue', 'utf8');

// Upgrade old content
const upgradeStr = "content: fullItem.content || '', content_en: fullItem.content_en || '',";
const upgradedContentStr = "content: (fullItem.content || '').replace(/<div class=\\"grid-item\\">/g, '<div class=\\"grid-item\\" contenteditable=\\"false\\">'), content_en: (fullItem.content_en || '').replace(/<div class=\\"grid-item\\">/g, '<div class=\\"grid-item\\" contenteditable=\\"false\\">'),";

if (content.includes(upgradeStr)) {
  content = content.replace(upgradeStr, upgradedContentStr);
  fs.writeFileSync('src/views/admin/News.vue', content);
  console.log('Upgraded old articles in News.vue');
} else {
  console.log('Could not find string to replace');
}
