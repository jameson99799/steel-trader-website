const fs = require('fs');
let content = fs.readFileSync('src/views/admin/News.vue', 'utf8');

// 1. Fix contenteditable=false
content = content.replace('<div class="grid-item">\\n    <img src="\" />\\n  </div>', '<div class="grid-item" contenteditable="false">\\n    <img src="\" />\\n  </div>');
content = content.replace('<div class="grid-item">\\r\\n    <img src="\" />\\r\\n  </div>', '<div class="grid-item" contenteditable="false">\\n    <img src="\" />\\n  </div>');

// 2. Fix localStorage memory for folder
content = content.replace(/newsMediaFolder\\.value = ''/g, "newsMediaFolder.value = localStorage.getItem('_lastMediaFolder') || ''\\n  newsMediaCurrentFolderName.value = localStorage.getItem('_lastMediaFolderName') || ''");

// 3. Fix watch
content = content.replace(
  "// Remember selected group and watermark\\r\\nwatch(newsMediaGroup",
  "// Remember selected group, folder and watermark\\nwatch(newsMediaFolder, v => { if (v !== undefined) localStorage.setItem('_lastMediaFolder', v); if (!v) { localStorage.removeItem('_lastMediaFolderName'); newsMediaCurrentFolderName.value = ''; } })\\nwatch(newsMediaCurrentFolderName, v => { if (v !== undefined) localStorage.setItem('_lastMediaFolderName', v) })\\nwatch(newsMediaGroup"
);
content = content.replace(
  "// Remember selected group and watermark\\nwatch(newsMediaGroup",
  "// Remember selected group, folder and watermark\\nwatch(newsMediaFolder, v => { if (v !== undefined) localStorage.setItem('_lastMediaFolder', v); if (!v) { localStorage.removeItem('_lastMediaFolderName'); newsMediaCurrentFolderName.value = ''; } })\\nwatch(newsMediaCurrentFolderName, v => { if (v !== undefined) localStorage.setItem('_lastMediaFolderName', v) })\\nwatch(newsMediaGroup"
);

// 4. Update folder name in loadNewsMedia
const loadNewsMediaStr = "newsMediaFolders.value = data.folders || []";
content = content.replace(loadNewsMediaStr, loadNewsMediaStr + "\\n    if (newsMediaFolder.value && !newsMediaCurrentFolderName.value) { const folder = newsMediaFolders.value.find(f => f.id === newsMediaFolder.value); if (folder) newsMediaCurrentFolderName.value = folder.name; }");

fs.writeFileSync('src/views/admin/News.vue', content);
console.log('Fixed News.vue');
