import fs from 'fs/promises';
import path from 'path';
import { connectChrome, pickBrowserContext, classifyPage, gatherPageSnapshot, normalize, parseMoney } from './chrome-debug.mjs';

const INTERVAL_MS = Number.parseInt(process.env.XTB_MONITOR_INTERVAL_MS || '60000', 10);
const DATA_DIR = 'data/xtb-snapshots';

function todayStamp() {
  return new Date().toISOString().slice(0, 10);
}

function extractAccount(text) {
  const cleaned = normalize(text);
  const raw = String(text || '');
  const candidates = [
    ...cleaned.matchAll(/\bREAL\s*(\d{5,})\b/gi),
    ...cleaned.matchAll(/\b(?:account|cuenta)\D{0,20}(\d{5,})\b/gi),
    ...raw.matchAll(/\bREAL\s*(\d{5,})\b/gi),
    ...raw.matchAll(/\b(?:account|cuenta)\D{0,20}(\d{5,})\b/gi)
  ];
  const equityMatch = cleaned.match(/(?:total\s*equity|equity|patrimonio total)\D{0,20}([0-9.,]+)/i);
  const capitalMatch = cleaned.match(/(?:available\s*capital|capital disponible|saldo disponible)\D{0,20}([0-9.,]+)/i);
  const profitMatch = cleaned.match(/(?:open\s*profit|beneficio abierto|profit)\D{0,20}([-0-9.,]+)/i);

  return {
    account: candidates[0]?.[1] || null,
    total_equity: equityMatch ? parseMoney(equityMatch[1]) : null,
    available_capital: capitalMatch ? parseMoney(capitalMatch[1]) : null,
    open_profit: profitMatch ? parseMoney(profitMatch[1]) : null
  };
}

function extractXtbQuotes(text) {
  const cleaned = normalize(text);
  const bigPrice = '([0-9]{4,}(?:[.,][0-9]+)?|[0-9]{1,3}(?:[\\s.,][0-9]{3})+(?:[.,][0-9]+)?)';
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
    ['SOL', /SOLANA CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['XRP', /RIPPLE CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['DOGE', /DOGECOIN CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['ADA', /CARDANO CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['LINK', /CHAINLINK CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['DOT', /POLKADOT CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['EURUSD', /EURUSD CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['GBPUSD', /GBPUSD CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['GOLD', /GOLD CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['NATGAS', /NATGAS CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['OIL', /OIL CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['SILVER', /SILVER CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i],
    ['US100', /US100 CFD\s+[-0-9.,%]+\s+([0-9.,]+)\s+([0-9.,]+)/i]
  ];

  const quotes = Object.fromEntries(instruments.flatMap(([symbol, pattern]) => {
    const match = cleaned.match(pattern);
    if (!match) return [];
    return [[symbol, { bid: quotePrice(match[1] ?? match[3]), ask: quotePrice(match[2] ?? match[4]) }]];
  }));
  const activeUs100 = cleaned.match(new RegExp(`US100\\s+CFD[\\s\\S]{0,220}?${bigPrice}\\s+(?:SL\\/TP|M1|M5|H1|Gr[aá]ficos)`, 'i'))
    || cleaned.match(new RegExp(`US100\\s+CFD[\\s\\S]{0,220}?${bigPrice}`, 'i'));
  const activeUs100Price = activeUs100 ? quotePrice(activeUs100[1]) : null;
  if (activeUs100Price && (!quotes.US100 || Math.abs(activeUs100Price - pickMidPrice(quotes.US100)) > 25)) {
    quotes.US100 = { bid: activeUs100Price, ask: activeUs100Price, source_hint: 'active-chart-header' };
  }
  return quotes;
}

function pickMidPrice(quote) {
  if (!quote) return null;
  if (quote.bid && quote.ask) return Number(((quote.bid + quote.ask) / 2).toFixed(2));
  return quote.bid || quote.ask || null;
}

async function sendQuoteBatchToDashboard(page, quotes) {
  const items = Object.entries(quotes).map(([symbol, quote]) => ({
    symbol,
    bid: quote.bid,
    ask: quote.ask,
    price: pickMidPrice(quote),
    change_pct: 0
  })).filter((item) => item.price !== null);
  if (!items.length) return false;
  return page.evaluate((quoteItems) => {
    window.dispatchEvent(new CustomEvent('xtb-quotes', { detail: { items: quoteItems } }));
    return true;
  }, items);
}

async function writeSnapshot(payload) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const latestPath = path.join(DATA_DIR, 'latest.json');
  const historyPath = path.join(DATA_DIR, `${todayStamp()}.jsonl`);
  await fs.writeFile(latestPath, JSON.stringify(payload, null, 2), 'utf8');
  await fs.appendFile(historyPath, `${JSON.stringify(payload)}\n`, 'utf8');
}

async function once() {
  const browser = await connectChrome();
  const context = pickBrowserContext(browser);
  const pages = context.pages();
  const xtbPage = pages.find((page) => classifyPage(page) === 'xtb');
  const dashboardPage = pages.find((page) => classifyPage(page) === 'dashboard');

  const snapshot = {
    timestamp: new Date().toISOString(),
    account: { account: null, total_equity: null, available_capital: null, open_profit: null },
    xtb: null,
    dashboard: null
  };

  if (xtbPage) {
    const pageSnapshot = await gatherPageSnapshot(xtbPage);
    snapshot.account = extractAccount(pageSnapshot.text);
    snapshot.xtb = {
      url: pageSnapshot.url,
      title: pageSnapshot.title,
      has_portfolio: /mi cartera|mis operaciones|cartera|operaciones abiertas|positions|portfolio/i.test(pageSnapshot.text),
      quotes: extractXtbQuotes(pageSnapshot.text),
      source: 'xtb-terminal'
    };
  }

  if (dashboardPage) {
    const pageSnapshot = await gatherPageSnapshot(dashboardPage);
    snapshot.dashboard = {
      url: pageSnapshot.url,
      title: pageSnapshot.title,
      source: 'myactions-dashboard'
    };
  }

  if (snapshot.xtb && snapshot.dashboard) {
    try {
      await sendQuoteBatchToDashboard(dashboardPage, snapshot.xtb.quotes);
      snapshot.dashboard.synced_quotes_to_page = true;
    } catch (error) {
      snapshot.dashboard.synced_quotes_to_page = false;
      snapshot.dashboard.sync_error = error.message;
    }
    snapshot.note = 'Lectura activa: compara el precio de mercado con quotes.*.bid/ask de XTB antes de operar.';
  }

  await writeSnapshot(snapshot);
  console.log(JSON.stringify(snapshot, null, 2));
  await browser.close();
}

async function main() {
  while (true) {
    try {
      await once();
    } catch (error) {
      console.error(`[xtb-monitor] ${error.message}`);
    }
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
