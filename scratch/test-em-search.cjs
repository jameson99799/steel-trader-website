const fetch = require('node-fetch'); // or use native fetch if node 18+

async function searchEM(keyword) {
  const url = `https://searchapi.eastmoney.com/api/Info/Search?appid=el1902262&type=14&token=CCSDCZSDCXYMYZYYSYYXSMDDSMDHHDJT&and14=MultiMatch/Name,Code,PinYin/${keyword}/true&returnfields14=Name,Code,PinYin,MarketType,JYS,MktNum,JYS4App,MktNum4App,ID,Classify,IsExactMatch,SecurityType,SecurityTypeName&pageIndex14=1&pageSize14=20`;
  const res = await fetch(url);
  const data = await res.json();
  console.log(`--- Search results for ${keyword} ---`);
  if (!data || !data.Data || !data.Data[0] || !data.Data[0].Data) {
    console.log("No data found:", JSON.stringify(data));
    return;
  }
  data.Data[0].Data.forEach(item => {
    console.log(`${item.Name} (${item.Code}) - MktNum: ${item.MktNum}, SecType: ${item.SecurityTypeName}`);
  });
}

async function run() {
  await searchEM('HC0');
  await searchEM('RB0');
  await searchEM('I0');
  await searchEM('FG0');
}
run();
