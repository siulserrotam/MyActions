import { connectChrome, pickBrowserContext, classifyPage, normalize } from './chrome-debug.mjs';

async function main() {
  const browser = await connectChrome();
  const context = pickBrowserContext(browser);
  const page = context.pages().find((candidate) => classifyPage(candidate) === 'dashboard');

  if (!page) {
    throw new Error('No se encontro la pagina del dashboard.');
  }

  const text = normalize(await page.evaluate(() => document.body?.innerText || ''));
  const markers = [
    'MEMORIA IA',
    'Aprendizaje:',
    'Registros:',
    'Acierto:',
    'Resultado aprendido:',
    'RESULTADO REAL DEL DIA',
    'Resultado cerrado:',
    'Capital operativo',
    'Operacion 1 USD',
    'Operacion 2 USD'
  ];

  const result = Object.fromEntries(markers.map((marker) => {
    const index = text.indexOf(marker);
    return [marker, index === -1 ? null : text.slice(index, index + 360)];
  }));

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
