const indexNowBody = {
    host: 'www.sunseasteel.com',
    key: 'sunseasteel',
    keyLocation: 'https://www.sunseasteel.com/sunseasteel.txt',
    urlList: ['https://www.sunseasteel.com/en/about']
};

fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(indexNowBody)
}).then(async r => {
    console.log(r.status);
    console.log(await r.text());
}).catch(console.error);
