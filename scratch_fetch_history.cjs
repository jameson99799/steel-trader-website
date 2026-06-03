const https = require('https');

const postJson = (url, body, token) => new Promise((resolve, reject) => {
  const parsedUrl = new URL(url);
  const data = JSON.stringify(body);
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length
    }
  };
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => resolve({ status: res.statusCode, body: responseData }));
  });
  req.on('error', reject);
  req.write(data);
  req.end();
});

const getJson = (url, token) => new Promise((resolve, reject) => {
  const parsedUrl = new URL(url);
  const options = {
    hostname: parsedUrl.hostname,
    path: parsedUrl.pathname + parsedUrl.search,
    method: 'GET',
    headers: {}
  };
  if (token) {
    options.headers['Authorization'] = 'Bearer ' + token;
  }
  const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', chunk => responseData += chunk);
    res.on('end', () => resolve({ status: res.statusCode, body: responseData }));
  });
  req.on('error', reject);
  req.end();
});

(async () => {
  const site = 'https://www.sunseasteel.com';
  
  // Login as admin
  const loginRes = await postJson(`${site}/api/auth/login`, { username: 'admin', password: 'x9981509' });
  const token = JSON.parse(loginRes.body).token;

  // We want to find the visitor ID that starts with 78c9d7e7
  const visitorsRes = await getJson(`${site}/api/chat/admin/messages`, token);
  const visitors = JSON.parse(visitorsRes.body);
  const targetVisitor = visitors.find(v => v.visitor_id.startsWith('v-mpw421'));
  
  if (!targetVisitor) {
    console.log('Visitor 78c9d7e7 not found. All visitors:', visitors.map(v => v.visitor_id));
    return;
  }

  const visitorId = targetVisitor.visitor_id;
  console.log('Found Visitor Full ID:', visitorId);

  // Fetch full chat history
  const historyRes = await getJson(`${site}/api/chat/admin/messages?visitor_id=${visitorId}`, token);
  const history = JSON.parse(historyRes.body);
  
  console.log('\n--- Chat History ---');
  history.forEach(m => {
    console.log(`[ID: ${m.id}] [${m.sender_type}] [${m.timestamp}] ${m.content}`);
  });
})();
