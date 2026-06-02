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

  content = content.replace(/\\n    if \(mediaPickerFolder\.value/g, '\n    if (mediaPickerFolder.value');
  content = content.replace(/\\n    if \(newsMediaFolder\.value/g, '\n    if (newsMediaFolder.value');
  
  content = content.replace(/\\n  mediaPickerCurrentFolderName\.value/g, '\n  mediaPickerCurrentFolderName.value');
  content = content.replace(/\\n  newsMediaCurrentFolderName\.value/g, '\n  newsMediaCurrentFolderName.value');

  content = content.replace(/}\\nwatch\(mediaPickerCurrentFolderName/g, '}\nwatch(mediaPickerCurrentFolderName');
  content = content.replace(/}\\nwatch\(newsMediaCurrentFolderName/g, '}\nwatch(newsMediaCurrentFolderName');
  
  content = content.replace(/}\\nwatch\(mediaPickerGroup/g, '}\nwatch(mediaPickerGroup');
  content = content.replace(/}\\nwatch\(newsMediaGroup/g, '}\nwatch(newsMediaGroup');

  fs.writeFileSync(file, content);
  console.log('Fixed', file);
}
