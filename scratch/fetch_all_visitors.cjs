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

  // Fetch all visitors
  const visitorsRes = await getJson(`${site}/api/chat/admin/messages`, token);
  const visitors = JSON.parse(visitorsRes.body);
  
  console.log('--- All Visitors (Sorted by last activity) ---');
  for (const v of visitors) {
    const historyRes = await getJson(`${site}/api/chat/admin/messages?visitor_id=${v.visitor_id}`, token);
    const history = JSON.parse(historyRes.body);
    const lastMsg = history[history.length - 1];
    console.log(`\nVisitor: ${v.visitor_id}`);
    console.log(`Country: ${v.country} | IP: ${v.ip} | Msg Count: ${history.length}`);
    if (lastMsg) {
      console.log(`Last Msg: [${lastMsg.sender_type}] [${lastMsg.timestamp}] ${lastMsg.content}`);
    }
  }
})();
