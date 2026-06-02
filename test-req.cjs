const http = require('http');

http.get('http://localhost:3001/ru/news/color-coated-steel-coils-what-are-the-differences-between-pe-smp-hdp-and-pvdf-an-124', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    const titleMatch = data.match(/<title>(.*?)<\/title>/);
    console.log('Title:', titleMatch ? titleMatch[1] : 'No title found');
    console.log('Contains ssr-article:', data.includes('ssr-article'));
    console.log('Contains Article Not Found:', data.includes('Article Not Found'));
  });
}).on('error', (err) => {
  console.log('Error:', err.message);
});
