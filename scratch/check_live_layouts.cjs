const https = require('https');

const checkUrl = (url) => new Promise((resolve) => {
  https.get(url, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      resolve({
        url,
        status: res.statusCode,
        length: body.length,
        containsPoll: body.includes('/api/chat/poll'),
        containsPost: body.includes('method:"POST"') || body.includes('method:\'POST\'') || body.includes('method: "POST"'),
        containsGet: body.includes('visitor_id=') && body.includes('last_id=')
      });
    });
  }).on('error', () => resolve({ url, status: 500 }));
});

(async () => {
  const layouts = ['Layout-CqTfWV09.js', 'Layout-CAmfOzy9.js', 'Layout-BaODD4sI.js'];
  for (const l of layouts) {
    const res = await checkUrl(`https://www.sunseasteel.com/assets/${l}`);
    console.log(res);
  }
})();
