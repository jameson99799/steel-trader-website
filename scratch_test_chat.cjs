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
  const visitorId = 'test-bot-' + Date.now();
  console.log('Testing with Visitor ID:', visitorId);

  // 1. Login as admin
  const loginRes = await postJson(`${site}/api/auth/login`, { username: 'admin', password: 'x9981509' });
  if (loginRes.status !== 200) {
    console.error('Admin login failed:', loginRes.body);
    return;
  }
  const token = JSON.parse(loginRes.body).token;
  console.log('Logged in as admin successfully.');

  let lastId = 0;

  for (let turn = 1; turn <= 6; turn++) {
    console.log(`\n--- Turn ${turn} ---`);

    // 2. Visitor sends message
    console.log(`[Visitor] Sending: Msg ${turn} from visitor`);
    const sendRes = await postJson(`${site}/api/chat/send`, { visitor_id: visitorId, content: `Msg ${turn} from visitor` });
    console.log(`[Visitor] Send response:`, sendRes.status, sendRes.body);

    // 3. Visitor polls to get their own message ID
    console.log(`[Visitor] Polling with last_id = ${lastId}`);
    const pollRes1 = await postJson(`${site}/api/chat/poll`, { visitor_id: visitorId, last_id: lastId });
    console.log(`[Visitor] Poll response:`, pollRes1.status, pollRes1.body);
    const msgs1 = JSON.parse(pollRes1.body);
    if (msgs1.length > 0) {
      lastId = Math.max(...msgs1.map(m => m.id));
      console.log(`[Visitor] Updated lastId to ${lastId}`);
    }

    // 4. Admin sends reply
    console.log(`[Admin] Sending: Reply ${turn} from admin`);
    const replyRes = await postJson(`${site}/api/chat/admin/messages`, { visitor_id: visitorId, content: `Reply ${turn} from admin` }, token);
    console.log(`[Admin] Reply response:`, replyRes.status, replyRes.body);

    // 5. Visitor polls to get admin's reply
    console.log(`[Visitor] Polling for admin reply with last_id = ${lastId}`);
    const pollRes2 = await postJson(`${site}/api/chat/poll`, { visitor_id: visitorId, last_id: lastId });
    console.log(`[Visitor] Poll response:`, pollRes2.status, pollRes2.body);
    const msgs2 = JSON.parse(pollRes2.body);
    if (msgs2.length > 0) {
      lastId = Math.max(...msgs2.map(m => m.id));
      console.log(`[Visitor] Updated lastId to ${lastId} after admin reply`);
    } else {
      console.error(`[Visitor] ERROR: Did not receive admin reply!`);
    }

    // Wait 1 second
    await new Promise(r => setTimeout(r, 1000));
  }
})();
