import { connectChrome, pickBrowserContext, classifyPage } from './chrome-debug.mjs';

async function main() {
  const browser = await connectChrome();
  const context = pickBrowserContext(browser);
  const page = context.pages().find((candidate) => classifyPage(candidate) === 'dashboard');

  if (!page) {
    throw new Error('No se encontro la pagina del dashboard.');
  }

  const fields = await page.evaluate(() => {
    const controls = [...document.querySelectorAll('input, textarea, select, [contenteditable="true"]')];
    return controls.map((el, index) => {
      const label = el.closest('label')?.innerText || '';
      const aria = el.getAttribute('aria-label') || '';
      const placeholder = el.getAttribute('placeholder') || '';
      const name = el.getAttribute('name') || '';
      const id = el.id || '';
      const value = 'value' in el ? el.value : el.textContent;
      const rect = el.getBoundingClientRect();
      return {
        index,
        tag: el.tagName.toLowerCase(),
        type: el.getAttribute('type') || '',
        label: label.trim().slice(0, 120),
        aria,
        placeholder,
        name,
        id,
        value,
        visible: rect.width > 0 && rect.height > 0
      };
    });
  });

  console.log(JSON.stringify(fields, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
