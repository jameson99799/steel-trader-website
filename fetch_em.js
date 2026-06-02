import fetch from 'node-fetch';
(async () => {
  const resp = await fetch('https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58,f59,f60,f61&klt=101&fqt=1&secid=113.HC0&end=20500101&lmt=1')
  const json = await resp.json()
  console.log(json.data.klines)
})()
