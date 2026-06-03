import https from 'https';

function testApi(url, headers = {}) {
    return new Promise((resolve) => {
        const options = new URL(url);
        const reqOpts = {
            hostname: options.hostname,
            path: options.pathname + options.search,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ...headers
            }
        };
        https.get(reqOpts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({ url, status: res.statusCode, data });
            });
        }).on('error', (err) => {
            resolve({ url, error: err.message });
        });
    });
}

async function runTests() {
    console.log('Testing ip9.com.cn...');
    const res1 = await testApi('https://ip9.com.cn/get?ip=8.8.8.8');
    console.log('ip9.com.cn Result:', res1);

    console.log('\nTesting api.ipapi.is...');
    const res2 = await testApi('https://api.ipapi.is/?ip=8.8.8.8');
    console.log('api.ipapi.is Result:', res2);

    console.log('\nTesting ip-api.com...');
    const res3 = await testApi('http://ip-api.com/json/8.8.8.8?lang=zh-CN');
    console.log('ip-api.com Result:', res3);
}

runTests();
