const fs = require('fs');
let content = fs.readFileSync('src/views/admin/News.vue', 'utf8');

// Use regex to replace '<div class="grid-item">' with '<div class="grid-item" contenteditable="false">' inside insertImageGrid
content = content.replace(/<div class="grid-item">/g, '<div class="grid-item" contenteditable="false">');

fs.writeFileSync('src/views/admin/News.vue', content);
console.log('Regex fixed News.vue');
