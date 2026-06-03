const https = require('https');

https.get('https://www.sunseasteel.com/assets/index-B7uOBc3E.js', (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status Code:', res.statusCode);
    console.log('JS Size:', body.length);
    console.log('Contains /api/chat/poll:', body.includes('/api/chat/poll'));
    console.log('Contains POST:', body.includes('method:"POST"') || body.includes('method:\'POST\'') || body.includes('method: "POST"'));
    console.log('Contains GET /poll search:', body.includes('visitor_id=') && body.includes('last_id='));
    
    // Find index of /api/chat/poll and log surroundings
    const index = body.indexOf('/api/chat/poll');
    if (index !== -1) {
      console.log('Context:', body.substring(index - 100, index + 300));
    }
  });
}).on('error', (e) => {
  console.error('Error:', e);
});
