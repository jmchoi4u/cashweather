import { chromium } from '@playwright/test';

const OUT = '/Users/jm/Desktop/Projects/cashweather-mvp/제출/shots';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 1000 }, deviceScaleFactor: 2 });
await p.goto('http://localhost:5173', { waitUntil: 'networkidle' });
await p.waitForTimeout(2500);

const frameSel = await p.evaluate(() => {
  for (const s of ['.phone-device']) {
    if (document.querySelector(s)) return s;
  }
  return 'body';
});
console.log('frame selector:', frameSel);
const shot = async (name) => {
  const el = await p.$(frameSel);
  await el.screenshot({ path: `${OUT}/${name}.png` });
  console.log('saved', name);
};

await p.evaluate(() => localStorage.clear());
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(2500);
await shot('01-lock');

await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('밀어서'))?.click());
await p.waitForTimeout(2500);
await shot('02-market');

// replay chip -> featured yes -> bet sheet
await p.evaluate(() => [...document.querySelectorAll('.market-chip')].find(x => x.textContent.includes('복기'))?.click());
await p.waitForTimeout(900);
await shot('03-replay');

await p.evaluate(() => document.querySelector('.featured-market .outcome.yes')?.click());
await p.waitForTimeout(900);
await shot('04-bet');

await p.evaluate(() => [...document.querySelectorAll('button')].find(x => x.textContent.includes('YES 예측하기') && x.className.includes('submit-report'))?.click());
await p.waitForTimeout(2600);
await p.evaluate(() => [...document.querySelectorAll('nav button')].find(x => x.textContent.includes('내예측'))?.click());
await p.waitForTimeout(1800);
await shot('05-ledger');

// calibration sheet
await p.evaluate(() => [...document.querySelectorAll('nav button')].find(x => x.textContent.includes('마켓'))?.click());
await p.waitForTimeout(900);
await p.evaluate(() => { const c=document.querySelector('.ghost-button'); if(c) c.scrollIntoView(); c?.click(); });
await p.waitForTimeout(1200);
await shot('06-calibration');

await b.close();
