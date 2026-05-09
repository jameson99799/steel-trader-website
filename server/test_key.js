fetch('https://www.sunseasteel.com/sunseasteel.txt')
  .then(r => r.text())
  .then(t => console.log('CONTENT:', t))
  .catch(console.error);
