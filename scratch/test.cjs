fetch('https://www.sunseasteel.com/zh/products').then(r => r.text()).then(t => { 
  console.log('Hreflang en found:', t.includes('hreflang="en"')); 
  console.log('Hreflang zh-CN found:', t.includes('hreflang="zh-CN"')); 
  console.log('INITIAL_STATE found:', t.includes('__INITIAL_STATE__')); 
  console.log('seoSettings found in state:', t.includes('seoSettings')); 
}).catch(e => console.error(e));
