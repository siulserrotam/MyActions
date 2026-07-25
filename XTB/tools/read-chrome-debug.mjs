import { connectChrome, pickBrowserContext, classifyPage, gatherPageSnapshot, normalize, parseMoney } from './chrome-debug.mjs';

function extractAccountFromText(text) {
  const cleaned = normalize(text);
  const raw = String(text || '');
  const candidates = [
    ...cleaned.matchAll(/\bREAL\s*(\d{5,})\b/gi),
    ...cleaned.matchAll(/\b(?:account|cuenta)\D{0,20}(\d{5,})\b/gi),
    ...raw.matchAll(/\bREAL\s*(\d{5,})\b/gi),
    ...raw.matchAll(/\b(?:account|cuenta)\D{0,20}(\d{5,})\b/gi)
  ];
  const accountMatch = cleaned.match(/(?:account|cuenta)\D{0,20}(\d{4,})/i);
  const equityMatch = cleaned.match(/(?:total\s*equity|equity|patrimonio total)\D{0,20}([0-9.,]+)/i);
  const capitalMatch = cleaned.match(/(?:available\s*capital|capital disponible|saldo disponible)\D{0,20}([0-9.,]+)/i);
  const profitMatch = cleaned.match(/(?:open\s*profit|beneficio abierto|profit)\D{0,20}([-0-9.,]+)/i);

  return {
    account: candidates[0]?.[1] || accountMatch?.[1] || null,
    total_equity: equityMatch ? parseMoney(equityMatch[1]) : null,
    available_capital: capitalMatch ? parseMoney(capitalMatch[1]) : null,
    open_profit: profitMatch ? parseMoney(profitMatch[1]) : null
  };
}

function extractSignals(snapshot) {
  const text = snapshot.text || '';
  const lower = text.toLowerCase();
  const hasLogin = /iniciar sesi[oó]n|login|password|contrase[nñ]a|usuario|clave|acceso privado/.test(lower);
  const hasPortfolio = /mi cartera|mis operaciones|cartera|operaciones abiertas|positions|portfolio/.test(lower);
  const hasDashboard = /receta xtb|capital operativo|activo seleccionado|live prices|auto refresh|scanner multi-activo/.test(lower);
  return { hasLogin, hasPortfolio, hasDashboard };
}

function extractXtbQuotes(text) {
  const cleaned = normalize(text);
  const quotePrice = (value) => {
    const parsed = parseMoney(value);
    return parsed === null ? null : Number(parsed.toFixed(2));
  };
  const instruments = [
    ['AMD.US', /AMD CFD(?:\s+VENTA\s+([0-9.,]+\s*[0-9]*)\s+.*?COMPRA\s+([0-9.,]+\s*[0-9]*)|\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+))/i],
    ['TSLA.US', /Tesla CFD(?:\s+VENTA\s+([0-9.,]+\s*[0-9]*)\s+.*?COMPRA\s+([0-9.,]+\s*[0-9]*)|\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+))/i],
    ['AAPL.US', /Apple CFD(?:\s+VENTA\s+([0-9.,]+\s*[0-9]*)\s+.*?COMPRA\s+([0-9.,]+\s*[0-9]*)|\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+))/i],
    ['NVDA.US', /Nvidia CFD(?:\s+VENTA\s+([0-9.,]+\s*[0-9]*)\s+.*?COMPRA\s+([0-9.,]+\s*[0-9]*)|\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+))/i],
    ['TSM.US', /TSMC CFD(?:\s+VENTA\s+([0-9.,]+\s*[0-9]*)\s+.*?COMPRA\s+([0-9.,]+\s*[0-9]*)|\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+))/i],
    ['BTCUSD', /BITCOIN CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['ETHUSD', /ETHEREUM CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['AVAX', /AVALANCHE CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['EURUSD', /EURUSD CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['GBPUSD', /GBPUSD CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['GOLD', /GOLD CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['NATGAS', /NATGAS CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['OIL', /OIL CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['SILVER', /SILVER CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['US100', /US100 CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i]
  ];

  return Object.fromEntries(instruments.flatMap(([symbol, pattern]) => {
    const match = cleaned.match(pattern);
    if (!match) return [];
    return [[symbol, { bid: quotePrice(match[1] ?? match[3]), ask: quotePrice(match[2] ?? match[4]) }]];
  }));
}

async function main() {
  const browser = await connectChrome();
  const context = pickBrowserContext(browser);
  const pages = context.pages();

  const snapshots = [];
  for (const page of pages) {
    const kind = classifyPage(page);
    if (kind === 'other') continue;
    const snapshot = await gatherPageSnapshot(page);
    snapshots.push({ kind, ...snapshot });
  }

  const xtbPage = snapshots.find((item) => item.kind === 'xtb');
  const dashboardPage = snapshots.find((item) => item.kind === 'dashboard');

  const account = xtbPage ? extractAccountFromText(xtbPage.text) : { account: null, total_equity: null, available_capital: null, open_profit: null };
  const xtbSignals = xtbPage ? extractSignals(xtbPage) : { hasLogin: false, hasPortfolio: false, hasDashboard: false };
  const dashboardSignals = dashboardPage ? extractSignals(dashboardPage) : { hasLogin: false, hasPortfolio: false, hasDashboard: false };

  const result = {
    timestamp: new Date().toISOString(),
    status: {
      xtb_page_found: Boolean(xtbPage),
      dashboard_page_found: Boolean(dashboardPage),
      xtb_login_required: Boolean(xtbPage && xtbSignals.hasLogin && !account.account),
      dashboard_login_required: Boolean(dashboardPage && (dashboardPage.url.includes('/login') || (dashboardSignals.hasLogin && !dashboardSignals.hasDashboard)))
    },
    account,
    xtb: xtbPage ? {
      url: xtbPage.url,
      title: xtbPage.title,
      has_login: xtbSignals.hasLogin,
      has_portfolio: xtbSignals.hasPortfolio,
      quotes: extractXtbQuotes(xtbPage.text),
      source: 'xtb-terminal'
    } : null,
    dashboard: dashboardPage ? {
      url: dashboardPage.url,
      title: dashboardPage.title,
      visible: true,
      has_login: dashboardSignals.hasLogin,
      has_dashboard: dashboardSignals.hasDashboard,
      source: 'myactions-dashboard'
    } : null,
    next_step: 'Si login_required es true, inicia sesion en la ventana del navegador controlable y vuelve a ejecutar npm.cmd run read.'
  };

  if (xtbPage && dashboardPage) {
    result.note = 'Lectura activa: compara el precio de mercado con quotes.*.bid/ask de XTB antes de operar.';
  }

  console.log(JSON.stringify(result, null, 2));
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
