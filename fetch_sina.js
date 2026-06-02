import fetch from 'node-fetch';
(async () => {
  const resp = await fetch('https://vip.stock.finance.sina.com.cn/forex/api/jsonp.php/var%20_fx_susdcnh=/NewForexService.getDayKLine?symbol=fx_susdcnh')
  const text = await resp.text()
  console.log(text.substring(text.length - 200))
})()
