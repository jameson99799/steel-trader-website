const fs = require('fs');
let content = fs.readFileSync('src/views/admin/News.vue', 'utf8');

const targetStr = ".article-body-direct .image-grid-layout .grid-item img {";
if (content.includes(targetStr) && !content.includes(".article-body-direct .image-grid-layout .grid-item:empty {")) {
  content = content.replace(targetStr, ".article-body-direct .image-grid-layout .grid-item:empty { display: none; }\\n" + targetStr);
  fs.writeFileSync('src/views/admin/News.vue', content);
  console.log('Fixed News.vue CSS');
}
