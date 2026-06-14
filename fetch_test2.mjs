import fs from 'fs';

fetch('https://www.sunseasteel.com/api/external/news?limit=15', {
    headers: {
        'X-API-Key': 'ext_e908ef54648057f200690374b20914d15cd072dfc6f3b3a5',
        'User-Agent': 'Mozilla/5.0'
    }
})
.then(r => r.json())
.then(d => {
    const articles = d.data || [];
    console.log(`Found ${articles.length} articles`);
    const a = articles[0];
    if (a) {
        fs.writeFileSync('article_dump.html', a.content);
        console.log('Dumped article ID:', a.id, a.title_en);
    }
})
.catch(e => console.error(e));
