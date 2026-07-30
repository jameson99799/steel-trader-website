const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, 'dist/index.html'), 'utf-8');
const ssrContent = '<p>Test</p>';
const replaced = html.replace('<div id="app">', `<div id="app">\n<div id="ssr-content" class="seo-ssr-content" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;">${ssrContent}</div>`);
console.log('Original has <div id="app">:', html.includes('<div id="app">'));
console.log('Original has </head>:', html.includes('</head>'));
console.log('Replaced app div:\n', replaced.substring(replaced.indexOf('<div id="app">'), replaced.indexOf('<div id="app">') + 200));

const { renderSeoDocument } = require('./server/services/seoDocument.js');
const out = renderSeoDocument({
  html: replaced,
  lang: 'en',
  title: 'Test Title',
  description: 'Test Description',
  keywords: 'test, keywords',
  canonical: 'https://test.com',
  robots: 'index, follow'
});
console.log('Meta injected:\n', out.includes('<meta name="description" content="Test Description">'));
