import { connectChrome, pickBrowserContext, classifyPage, normalize, parseMoney } from './chrome-debug.mjs';

const SIDE = (process.env.XTB_SYNC_SIDE || 'mid').toLowerCase();
const INTERVAL_MS = Number.parseInt(process.env.XTB_SYNC_INTERVAL_MS || '10000', 10);
const RUN_ONCE = process.argv.includes('--once');

function quotePrice(value) {
  const parsed = parseMoney(value);
  return parsed === null ? null : Number(parsed.toFixed(2));
}

function quoteChangePct(text, index = 0) {
  const fragment = text.slice(Math.max(0, index - 80), index + 180);
  const match = fragment.match(/(-?\d+(?:[.,]\d+)?)%/);
  return match ? Number(match[1].replace(',', '.')) : 0;
}

function extractXtbQuotes(text) {
  const cleaned = normalize(text);
  const instruments = [
    ['AMD.US', /AMD CFD(?:\s+VENTA\s+([0-9.,]+\s*[0-9]*)\s+.*?COMPRA\s+([0-9.,]+\s*[0-9]*)|\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+))/i],
    ['TSLA.US', /Tesla CFD(?:\s+VENTA\s+([0-9.,]+\s*[0-9]*)\s+.*?COMPRA\s+([0-9.,]+\s*[0-9]*)|\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+))/i],
    ['AAPL.US', /Apple CFD(?:\s+VENTA\s+([0-9.,]+\s*[0-9]*)\s+.*?COMPRA\s+([0-9.,]+\s*[0-9]*)|\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+))/i],
    ['NVDA.US', /Nvidia CFD(?:\s+VENTA\s+([0-9.,]+\s*[0-9]*)\s+.*?COMPRA\s+([0-9.,]+\s*[0-9]*)|\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+))/i],
    ['TSM.US', /TSMC CFD(?:\s+VENTA\s+([0-9.,]+\s*[0-9]*)\s+.*?COMPRA\s+([0-9.,]+\s*[0-9]*)|\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+))/i],
    ['BTCUSD', /BITCOIN CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['ETHUSD', /ETHEREUM CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
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
    return [[symbol, {
      bid: quotePrice(match[1] ?? match[3]),
      ask: quotePrice(match[2] ?? match[4]),
      change_pct: quoteChangePct(cleaned, match.index || 0)
    }]];
  }));
}

function extractActiveXtbSymbol(text, quotes) {
  const cleaned = normalize(text);
  const activePatterns = [
    ['AMD.US', /AMD CFD\s+VENTA/i],
    ['TSLA.US', /Tesla CFD\s+VENTA/i],
    ['AAPL.US', /Apple CFD\s+VENTA/i],
    ['NVDA.US', /Nvidia CFD\s+VENTA/i],
    ['TSM.US', /TSMC CFD\s+VENTA/i],
    ['BTCUSD', /BITCOIN CFD\s+VENTA/i],
    ['ETHUSD', /ETHEREUM CFD\s+VENTA/i],
    ['EURUSD', /EURUSD CFD\s+VENTA/i],
    ['GBPUSD', /GBPUSD CFD\s+VENTA/i],
    ['GOLD', /GOLD CFD\s+VENTA/i],
    ['NATGAS', /NATGAS CFD\s+VENTA/i],
    ['OIL', /OIL CFD\s+VENTA/i],
    ['SILVER', /SILVER CFD\s+VENTA/i],
    ['US100', /US100 CFD\s+VENTA/i]
  ];

  return activePatterns.find(([symbol, pattern]) => quotes[symbol] && pattern.test(cleaned))?.[0] || null;
}

function pickPrice(quote) {
  if (!quote) return null;
  if (SIDE === 'bid') return quote.bid;
  if (SIDE === 'ask') return quote.ask;
  return Number((((quote.bid || 0) + (quote.ask || 0)) / 2).toFixed(2));
}

async function setDashboardPrice(page, symbol, value) {
  const formatted = value.toFixed(2);
  await page.evaluate(({ nextSymbol, price }) => {
    const symbolInput = document.querySelector('#symbol');
    const marketInput = document.querySelector('#market-price');
    const xtbInput = document.querySelector('#xtb-price');
    if (!xtbInput) {
      throw new Error('No se encontro #xtb-price en el dashboard.');
    }

    if (symbolInput && nextSymbol) {
      symbolInput.value = nextSymbol;
      symbolInput.dispatchEvent(new Event('input', { bubbles: true }));
      symbolInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (marketInput) {
      marketInput.value = price;
      marketInput.dispatchEvent(new Event('input', { bubbles: true }));
      marketInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    xtbInput.value = price;
    xtbInput.dispatchEvent(new Event('input', { bubbles: true }));
    xtbInput.dispatchEvent(new Event('change', { bubbles: true }));
  }, { nextSymbol: symbol, price: formatted });
  return formatted;
}

async function sendQuoteBatchToDashboard(page, quotes) {
  const items = Object.entries(quotes).map(([symbol, quote]) => {
    const price = pickPrice(quote);
    return {
      symbol,
      bid: quote.bid,
      ask: quote.ask,
      price,
      change_pct: quote.change_pct || 0
    };
  }).filter((item) => item.price !== null);

  if (!items.length) return { applied: false, items: [] };

  const applied = await page.evaluate((quoteItems) => {
    if (typeof window.dispatchEvent !== 'function') return false;
    window.dispatchEvent(new CustomEvent('xtb-quotes', { detail: { items: quoteItems } }));
    return true;
  }, items);

  return { applied, items };
}

async function syncOnce() {
  const browser = await connectChrome();
  try {
    const context = pickBrowserContext(browser);
    const xtbPage = context.pages().find((page) => classifyPage(page) === 'xtb');
    const dashboardPage = context.pages().find((page) => classifyPage(page) === 'dashboard');

    if (!xtbPage || !dashboardPage) {
      throw new Error('Faltan pestanas: abre XTB y MyActions/dashboard con npm.cmd run start.');
    }

    const dashboardState = await dashboardPage.evaluate(() => ({
      symbol: document.querySelector('#symbol')?.value || '',
      marketPrice: document.querySelector('#market-price')?.value || '',
      xtbPrice: document.querySelector('#xtb-price')?.value || ''
    }));
    const selectedSymbol = dashboardState.symbol.trim().toUpperCase();

    const xtbText = await xtbPage.evaluate(() => document.body?.innerText || '');
    const quotes = extractXtbQuotes(xtbText);
    const quoteBatch = await sendQuoteBatchToDashboard(dashboardPage, quotes);
    await dashboardPage.waitForTimeout(500);
    const afterBatchState = await dashboardPage.evaluate(() => ({
      symbol: document.querySelector('#symbol')?.value || '',
      marketPrice: document.querySelector('#market-price')?.value || '',
      xtbPrice: document.querySelector('#xtb-price')?.value || ''
    }));
    const activeSymbol = extractActiveXtbSymbol(xtbText, quotes);
    const syncSymbol = afterBatchState.symbol?.trim().toUpperCase() || (quotes[selectedSymbol] ? selectedSymbol : activeSymbol);
    const quote = quotes[syncSymbol];
    const price = pickPrice(quote);

    if (!quoteBatch.items.length && !syncSymbol) {
      throw new Error('No encontre un activo sincronizable. Selecciona o deja visible el activo en XTB.');
    }
    if (!quoteBatch.applied && (!quote || price === null)) {
      throw new Error(`No encontre cotizacion XTB para ${syncSymbol}. Pon ese activo visible en favoritos/lista de XTB.`);
    }

    const applied = quoteBatch.applied && afterBatchState.xtbPrice
      ? Number(afterBatchState.xtbPrice).toFixed(2)
      : await setDashboardPrice(dashboardPage, syncSymbol, price);
    const result = {
      timestamp: new Date().toISOString(),
      symbol: afterBatchState.symbol?.trim().toUpperCase() || syncSymbol,
      dashboard_symbol_before: selectedSymbol,
      active_xtb_symbol: activeSymbol,
      visible_xtb_symbols: quoteBatch.items.map((item) => item.symbol),
      side: SIDE,
      xtb: quote || null,
      applied_xtb_price: applied,
      dashboard_market_price_before: dashboardState.marketPrice,
      dashboard_xtb_price_before: dashboardState.xtbPrice,
      dashboard_symbol_after: afterBatchState.symbol,
      dashboard_xtb_price_after: afterBatchState.xtbPrice
    };

    console.log(JSON.stringify(result, null, 2));
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main() {
  do {
    try {
      await syncOnce();
    } catch (error) {
      console.error(`[xtb-sync] ${error.message}`);
    }
    if (!RUN_ONCE) {
      await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
    }
  } while (!RUN_ONCE);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
