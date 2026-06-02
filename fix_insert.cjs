const fs = require('fs');
let content = fs.readFileSync('src/views/admin/News.vue', 'utf8');

const targetStr = "document.execCommand('insertHTML', false, html)\n    syncNewsFromVisual()";
const targetStrCRLF = "document.execCommand('insertHTML', false, html)\r\n    syncNewsFromVisual()";

const replaceStr = "document.execCommand('insertHTML', false, html)\n    setTimeout(() => {\n      if (newsVisualEl.value) {\n        newsVisualEl.value.querySelectorAll('.grid-item').forEach(item => item.setAttribute('contenteditable', 'false'));\n        syncNewsFromVisual();\n      }\n    }, 50);";

if (content.includes("document.execCommand('insertHTML', false, html)")) {
  content = content.replace("document.execCommand('insertHTML', false, html)\n    syncNewsFromVisual()", replaceStr);
  content = content.replace("document.execCommand('insertHTML', false, html)\r\n    syncNewsFromVisual()", replaceStr);
  fs.writeFileSync('src/views/admin/News.vue', content);
  console.log('Fixed insertHTML');
} else {
  console.log('Could not find insertHTML');
}
