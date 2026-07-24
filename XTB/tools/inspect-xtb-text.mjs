import { connectChrome, pickBrowserContext, classifyPage, normalize } from './chrome-debug.mjs';

async function main() {
  const browser = await connectChrome();
  const context = pickBrowserContext(browser);
  const page = context.pages().find((candidate) => classifyPage(candidate) === 'xtb');

  if (!page) {
    throw new Error('No se encontro la pagina XTB.');
  }

  const text = normalize(await page.evaluate(() => document.body?.innerText || ''));
  const tokens = [
    'AMD CFD',
    'Tesla CFD',
    'Apple CFD',
    'Nvidia CFD',
    'TSMC CFD',
    'OIL CFD',
    'GOLD CFD',
    'NATGAS CFD',
    'SILVER CFD',
    'US100 CFD'
  ];

  const found = tokens.map((token) => ({
    token,
    found: text.includes(token),
    nearby: text.includes(token) ? text.slice(Math.max(0, text.indexOf(token) - 80), text.indexOf(token) + 160) : ''
  }));

  console.log(JSON.stringify(found, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
