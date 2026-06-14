const html = '<link rel="stylesheet" crossorigin href="/assets/index-BJRb2yrG.css">';
const reg = /<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
console.log('Matches?', reg.test(html));
