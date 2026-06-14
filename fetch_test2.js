const https = require('https');
https.get('https://www.sunseasteel.com/', (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    console.log("Found stylesheet links:");
    const matches = html.match(/<link[^>]*rel="stylesheet"[^>]*>/g);
    console.log(matches || 'None');
    console.log("\nFound inline styles in head:");
    const styles = html.match(/<style[^>]*>[\s\S]*?<\/style>/g);
    console.log(styles ? styles.length : 0, 'style tags');
  });
}).on('error', e => console.error(e));
