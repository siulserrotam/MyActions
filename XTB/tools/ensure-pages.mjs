import { connectChrome, pickBrowserContext, classifyPage } from './chrome-debug.mjs';

const REQUIRED_PAGES = [
  {
    kind: 'xtb',
    url: 'https://xstation5.xtb.com/#/_/loggedIn?detach=charts&detachDoClose=true'
  },
  {
    kind: 'dashboard',
    url: 'https://api.manantiallodge.com/dashboard/'
  }
];

async function main() {
  const browser = await connectChrome();
  const context = pickBrowserContext(browser);

  for (const required of REQUIRED_PAGES) {
    const existing = context.pages().find((page) => classifyPage(page) === required.kind);
    const page = existing || await context.newPage();
    if (!existing || page.url() === 'about:blank') {
      await page.goto(required.url, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
    }
    await page.bringToFront().catch(() => {});
  }

  console.log('Paginas requeridas verificadas: XTB y MyActions/dashboard.');
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
