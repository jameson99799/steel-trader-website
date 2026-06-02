const https = require('https');

function checkUrl(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data
        });
      });
    }).on('error', err => {
      console.log('Error fetching ' + url + ':', err.message);
      resolve(null);
    });
  });
}

async function main() {
  console.log("Checking mismatched URL for 301 redirect...");
  const res1 = await checkUrl('https://www.sunseasteel.com/ru/news/color-coated-steel-coils-what-are-the-differences-between-pe-smp-hdp-and-pvdf-an-124');
  console.log("Status:", res1?.status);
  console.log("Location header:", res1?.headers?.location);

  console.log("\nChecking canonical URL for SSR state hydration...");
  const res2 = await checkUrl('https://www.sunseasteel.com/ru/news/color-coated-steel-coils-what-are-the-differences-between-pe-smp-hdp-and-pvdf-an');
  console.log("Status:", res2?.status);
  if (res2 && res2.data) {
    const hasInitialState = res2.data.includes('__INITIAL_STATE__');
    const hasSsrArticle = res2.data.includes('ssrArticle');
    console.log("Has __INITIAL_STATE__:", hasInitialState);
    console.log("Has ssrArticle:", hasSsrArticle);
  }
}
main();
