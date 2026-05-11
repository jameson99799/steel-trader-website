fetch('https://www.sunseasteel.com/en/news/spcc-vs-dc01-vs-dc03-vs-dc04-how-to-choose-the-right-crc-grade')
  .then(r => r.text())
  .then(html => {
    const matches = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/g)];
    console.log('Script 0', matches[0][1]);
  });
