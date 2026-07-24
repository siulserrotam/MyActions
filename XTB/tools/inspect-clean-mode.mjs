import { connectChrome, pickBrowserContext, classifyPage } from './chrome-debug.mjs';

async function main() {
  const browser = await connectChrome();
  try {
    const context = pickBrowserContext(browser);
    const page = context.pages().find((candidate) => classifyPage(candidate) === 'dashboard');

    if (!page) {
      throw new Error('No se encontro la pagina del dashboard.');
    }

    const result = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      cleanMode: Boolean(document.querySelector('#codex-clean-mode')),
      cleanText: document.querySelector('#codex-clean-mode')?.innerText || ''
    }));

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
