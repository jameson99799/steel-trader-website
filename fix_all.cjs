const fs = require('fs');
const glob = require('glob'); // wait, glob might not be installed, I'll just hardcode the files

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

  // 1. Fix contenteditable=false for insertImageGrid (only in News.vue, Products.vue if exists)
  content = content.replace('<div class="grid-item">\\n    <img src="\" />\\n  </div>', '<div class="grid-item" contenteditable="false">\\n    <img src="\" />\\n  </div>');
  content = content.replace('<div class="grid-item">\\r\\n    <img src="\" />\\r\\n  </div>', '<div class="grid-item" contenteditable="false">\\n    <img src="\" />\\n  </div>');

  // 2. Fix localStorage memory for folder
  // Find where mediaPickerFolder / newsMediaFolder is cleared: .value = ''
  content = content.replace(/mediaPickerFolder\.value = ''/g, "mediaPickerFolder.value = localStorage.getItem('_lastMediaFolder') || ''\\n  mediaPickerCurrentFolderName.value = localStorage.getItem('_lastMediaFolderName') || ''");
  content = content.replace(/newsMediaFolder\.value = ''/g, "newsMediaFolder.value = localStorage.getItem('_lastMediaFolder') || ''\\n  newsMediaCurrentFolderName.value = localStorage.getItem('_lastMediaFolderName') || ''");

  // 3. Fix watch for mediaPickerFolder
  if (!content.includes("watch(mediaPickerFolder")) {
    content = content.replace(
      /watch\(mediaPickerGroup[^\n\r]+/,
      "$&\\nwatch(mediaPickerFolder, v => { if (v !== undefined) localStorage.setItem('_lastMediaFolder', v); if (!v) { localStorage.removeItem('_lastMediaFolderName'); mediaPickerCurrentFolderName.value = ''; } })\\nwatch(mediaPickerCurrentFolderName, v => { if (v !== undefined) localStorage.setItem('_lastMediaFolderName', v) })"
    );
  }
  
  if (!content.includes("watch(newsMediaFolder")) {
    content = content.replace(
      /watch\(newsMediaGroup[^\n\r]+/,
      "$&\\nwatch(newsMediaFolder, v => { if (v !== undefined) localStorage.setItem('_lastMediaFolder', v); if (!v) { localStorage.removeItem('_lastMediaFolderName'); newsMediaCurrentFolderName.value = ''; } })\\nwatch(newsMediaCurrentFolderName, v => { if (v !== undefined) localStorage.setItem('_lastMediaFolderName', v) })"
    );
  }

  // 4. Update folder name in loadMediaPicker
  const loadMediaStr = "mediaPickerFolders.value = data.folders || []";
  if (content.includes(loadMediaStr) && !content.includes("mediaPickerFolders.value.find")) {
    content = content.replace(loadMediaStr, loadMediaStr + "\\n    if (mediaPickerFolder.value && !mediaPickerCurrentFolderName.value) { const folder = mediaPickerFolders.value.find(f => f.id === mediaPickerFolder.value); if (folder) mediaPickerCurrentFolderName.value = folder.name; }");
  }

  const loadNewsMediaStr = "newsMediaFolders.value = data.folders || []";
  if (content.includes(loadNewsMediaStr) && !content.includes("newsMediaFolders.value.find")) {
    content = content.replace(loadNewsMediaStr, loadNewsMediaStr + "\\n    if (newsMediaFolder.value && !newsMediaCurrentFolderName.value) { const folder = newsMediaFolders.value.find(f => f.id === newsMediaFolder.value); if (folder) newsMediaCurrentFolderName.value = folder.name; }");
  }

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
