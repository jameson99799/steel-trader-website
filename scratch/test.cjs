fetch('https://www.sunseasteel.com/en/').then(r => r.text()).then(t => {
  console.log('Aria label Home found:', t.includes('aria-label="Home"'));
  console.log('Aria label Language options found:', t.includes('aria-label="Language options"'));
}).catch(e => console.error(e));
