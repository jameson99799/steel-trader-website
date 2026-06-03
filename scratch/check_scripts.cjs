const https = require('https');

https.get('https://www.sunseasteel.com/en', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    // Find all script tags
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    console.log('--- Script Tags in HTML ---');
    while ((match = scriptRegex.exec(body)) !== null) {
      const tagContent = match[0];
      if (tagContent.includes('src=')) {
        console.log(tagContent);
      }
    }
  });
}).on('error', (e) => {
  console.error('Error:', e);
});
