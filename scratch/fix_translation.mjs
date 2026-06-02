import fs from 'fs';

let f = 'server/routes/translation.js';
let t = fs.readFileSync(f, 'utf8');

t = t.replace('"futuresChartDays": "Trend ({days} Days)"', '"futuresChartDays": "Trend ({days} Days)",\n    "futuresPriceBtn": "Futures Price",\n    "futuresTitle": "Live Futures Prices",\n    "futuresDesc": "Real-time commodity futures for steel-related products."');

fs.writeFileSync(f, t);
console.log('Updated translation.js');
