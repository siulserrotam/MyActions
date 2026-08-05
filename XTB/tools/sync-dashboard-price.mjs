import { connectChrome, pickBrowserContext, classifyPage, normalize, parseMoney } from './chrome-debug.mjs';

const SIDE = (process.env.XTB_SYNC_SIDE || 'mid').toLowerCase();
const INTERVAL_MS = Number.parseInt(process.env.XTB_SYNC_INTERVAL_MS || '5000', 10);
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
  const bigPrice = '([0-9]{4,}(?:[.,][0-9]+)?|[0-9]{1,3}(?:[\\s.,][0-9]{3})+(?:[.,][0-9]+)?)';
  const activeOrList = (label) => new RegExp(`${label}\\s+CFD(?:\\s+VENTA\\s+([0-9.,]+(?:\\s+[0-9]+)?)\\s+.*?COMPRA\\s+([0-9.,]+(?:\\s+[0-9]+)?)|\\s+[-0-9.,%]+\\s+([0-9.,]+(?:\\s+[0-9]+)?)\\s+([0-9.,]+(?:\\s+[0-9]+)?))`, 'i');
  const instruments = [
    ['AMD.US', activeOrList('AMD')],
    ['TSLA.US', activeOrList('Tesla')],
    ['AAPL.US', activeOrList('Apple')],
    ['NVDA.US', activeOrList('Nvidia')],
    ['TSM.US', activeOrList('TSMC')],
    ['BTCUSD', activeOrList('BITCOIN')],
    ['ETHUSD', activeOrList('ETHEREUM')],
    ['AVAX', activeOrList('AVALANCHE')],
    ['SOL', activeOrList('SOLANA')],
    ['XRP', activeOrList('RIPPLE')],
    ['DOGE', activeOrList('DOGECOIN')],
    ['ADA', activeOrList('CARDANO')],
    ['LINK', activeOrList('CHAINLINK')],
    ['DOT', activeOrList('POLKADOT')],
    ['EURUSD', activeOrList('EURUSD')],
    ['GBPUSD', activeOrList('GBPUSD')],
    ['GOLD', activeOrList('GOLD')],
    ['NATGAS', activeOrList('NATGAS')],
    ['OIL', activeOrList('OIL')],
    ['SILVER', activeOrList('SILVER')],
    ['US100', activeOrList('US100')]
  ];

  const quotes = Object.fromEntries(instruments.flatMap(([symbol, pattern]) => {
    const match = cleaned.match(pattern);
    if (!match) return [];
    return [[symbol, {
      bid: quotePrice(match[1] ?? match[3]),
      ask: quotePrice(match[2] ?? match[4]),
      change_pct: quoteChangePct(cleaned, match.index || 0)
    }]];
  }));
  const activeUs100 = cleaned.match(new RegExp(`US100\\s+CFD[\\s\\S]{0,220}?${bigPrice}\\s+(?:SL\\/TP|M1|M5|H1|Gr[aá]ficos)`, 'i'))
    || cleaned.match(new RegExp(`US100\\s+CFD[\\s\\S]{0,220}?${bigPrice}`, 'i'));
  const activeUs100Price = activeUs100 ? quotePrice(activeUs100[1]) : null;
  if (activeUs100Price && (!quotes.US100 || Math.abs(activeUs100Price - pickPrice(quotes.US100)) > 25)) {
    quotes.US100 = {
      bid: activeUs100Price,
      ask: activeUs100Price,
      change_pct: quotes.US100?.change_pct || 0,
      source_hint: 'active-chart-header'
    };
  }
  return quotes;
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
    ['AVAX', /AVALANCHE CFD\s+VENTA/i],
    ['SOL', /SOLANA CFD\s+VENTA/i],
    ['XRP', /RIPPLE CFD\s+VENTA/i],
    ['DOGE', /DOGECOIN CFD\s+VENTA/i],
    ['ADA', /CARDANO CFD\s+VENTA/i],
    ['LINK', /CHAINLINK CFD\s+VENTA/i],
    ['DOT', /POLKADOT CFD\s+VENTA/i],
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

function extractXtbTicket(text) {
  const cleaned = normalize(text);
  const contractMatch = cleaned.match(/Valor\s+del\s+contrato\s*(?:≈|~|=)?\s*([0-9.,\s]+)\s*USD/i);
  const spreadMatch = cleaned.match(/Spread\s*:\s*([0-9.,\s]+)\s*USD/i);
  const marginMatch = cleaned.match(/Margen\s*(?:≈|~|=)?\s*([0-9.,\s]+)\s*USD/i);
  const volumeMatch = cleaned.match(/Volumen\s+(?:Margen\s+)?(?:-|−|\+|\s)*([0-9]+(?:[.,][0-9]+)?)/i);
  const contractValue = contractMatch ? parseMoney(contractMatch[1]) : null;
  const spreadUsd = spreadMatch ? parseMoney(spreadMatch[1]) : null;
  const marginUsd = marginMatch ? parseMoney(marginMatch[1]) : null;
  const volume = volumeMatch ? parseMoney(volumeMatch[1]) : null;

  if (contractValue === null && spreadUsd === null && marginUsd === null && volume === null) return null;
  return {
    contract_value: contractValue,
    spread_usd: spreadUsd,
    margin_usd: marginUsd,
    volume,
    source: 'xtb-visible-ticket'
  };
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

async function sendTicketToDashboard(page, ticket, symbol) {
  if (!ticket) return false;
  return page.evaluate(({ ticketPayload, ticketSymbol }) => {
    if (typeof window.dispatchEvent !== 'function') return false;
    window.dispatchEvent(new CustomEvent('xtb-ticket', {
      detail: {
        ...ticketPayload,
        symbol: ticketSymbol || '',
        updated_at: new Date().toISOString()
      }
    }));
    return true;
  }, { ticketPayload: ticket, ticketSymbol: symbol });
}

async function readDashboardOrderRequest(page) {
  return page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('decision_engine_xtb_order_request') || 'null');
    } catch {
      return null;
    }
  });
}

async function updateDashboardOrderRequest(page, request, status, message) {
  const next = {
    ...request,
    status,
    message,
    updated_at: new Date().toISOString()
  };
  await page.evaluate((payload) => {
    localStorage.setItem('decision_engine_xtb_order_request', JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent('xtb-order-request-status', { detail: payload }));
  }, next);
}

async function preparePendingOrderInXtb(page, request) {
  await page.bringToFront().catch(() => {});
  const result = await page.evaluate((order) => {
    const visible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const setValue = (input, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      const text = String(value);
      if (setter) setter.call(input, text);
      else input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const text = normalize(document.body?.innerText || '');
    if (!text.includes('US100')) {
      return { ok: false, message: 'XTB no tiene US100 visible en la ventana actual.' };
    }
    if (!/Orden\s+Stop\/limitada/i.test(text)) {
      return { ok: false, message: 'Abre la ventana de US100 en la pestana Orden Stop/limitada.' };
    }

    const inputs = [...document.querySelectorAll('input')]
      .filter(visible)
      .map((input, index) => {
        const rect = input.getBoundingClientRect();
        const parentText = normalize(input.closest('div, label, section, form')?.innerText || '');
        return { input, index, x: rect.x, y: rect.y, w: rect.width, h: rect.height, parentText };
      })
      .sort((a, b) => a.y - b.y || a.x - b.x);

    const findByContext = (label) => inputs.find((item) => item.parentText.toLowerCase().includes(label.toLowerCase()))?.input;
    const visibleNumberInputs = inputs
      .filter((item) => ['text', 'number', 'tel', ''].includes((item.input.getAttribute('type') || '').toLowerCase()))
      .map((item) => item.input);

    const priceInput = findByContext('Precio') || visibleNumberInputs[0];
    const volumeInput = findByContext('Volumen') || visibleNumberInputs.find((input) => input !== priceInput);
    if (!priceInput || !volumeInput) {
      return {
        ok: false,
        message: `No pude ubicar campos de Precio/Volumen. Inputs visibles: ${inputs.length}.`
      };
    }

    setValue(priceInput, Number(order.entry_price).toFixed(2));
    setValue(volumeInput, String(order.volume));

    const clickLabel = (label) => {
      const nodes = [...document.querySelectorAll('label, span, div, p')]
        .filter(visible)
        .filter((node) => normalize(node.innerText).toLowerCase() === label.toLowerCase());
      const node = nodes[0];
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      const candidates = [...document.querySelectorAll('input[type="checkbox"], [role="checkbox"]')]
        .filter(visible)
        .map((candidate) => {
          const box = candidate.getBoundingClientRect();
          return { candidate, distance: Math.abs(box.y - rect.y) + Math.abs(box.x - rect.x) };
        })
        .sort((a, b) => a.distance - b.distance);
      const target = candidates[0]?.candidate || node;
      target.click();
      return true;
    };

    const stopClicked = order.stop_loss ? clickLabel('Stop loss') : false;
    const takeClicked = order.take_profit ? clickLabel('Take Profit') : false;

    return {
      ok: true,
      message: `Orden preparada en XTB sin confirmar boton final. Precio ${Number(order.entry_price).toFixed(2)}, volumen ${order.volume}. ${stopClicked ? 'SL activado.' : 'SL no activado automaticamente.'} ${takeClicked ? 'TP activado.' : 'TP no activado automaticamente.'}`,
    };
  }, request);

  if (!result.ok) return result;
  await page.waitForTimeout(700);
  const secondPass = await page.evaluate((order) => {
    const visible = (el) => {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    };
    const normalize = (value) => String(value || '').replace(/\s+/g, ' ').trim();
    const setValue = (input, value) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      const text = String(value);
      if (setter) setter.call(input, text);
      else input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const inputs = [...document.querySelectorAll('input')]
      .filter(visible)
      .map((input) => ({
        input,
        text: normalize(input.closest('div, label, section, form')?.innerText || ''),
        y: input.getBoundingClientRect().y,
        x: input.getBoundingClientRect().x
      }))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    const setContext = (label, value) => {
      const item = inputs.find((candidate) => candidate.text.toLowerCase().includes(label.toLowerCase()));
      if (!item) return false;
      setValue(item.input, value);
      return true;
    };
    const stopSet = order.stop_loss ? setContext('Stop loss', Number(order.stop_loss).toFixed(2)) : false;
    const takeSet = order.take_profit ? setContext('Take Profit', Number(order.take_profit).toFixed(2)) : false;
    return { stopSet, takeSet };
  }, request);

  return {
    ok: true,
    message: `${result.message} Stop llenado: ${secondPass.stopSet ? 'si' : 'revisar manual'}. Take llenado: ${secondPass.takeSet ? 'si' : 'revisar manual'}.`
  };
}

async function processDashboardOrderRequest(dashboardPage, xtbPage) {
  const request = await readDashboardOrderRequest(dashboardPage);
  if (!request || request.status !== 'pending') return null;
  if (request.symbol !== 'US100') {
    await updateDashboardOrderRequest(dashboardPage, request, 'error', 'Por seguridad esta automatizacion solo prepara US100.');
    return null;
  }
  try {
    await updateDashboardOrderRequest(dashboardPage, request, 'processing', 'Preparando ventana XTB...');
    const result = await preparePendingOrderInXtb(xtbPage, request);
    await updateDashboardOrderRequest(dashboardPage, request, result.ok ? 'prepared' : 'error', result.message);
    return result;
  } catch (error) {
    await updateDashboardOrderRequest(dashboardPage, request, 'error', error.message);
    return { ok: false, message: error.message };
  }
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
    const ticket = extractXtbTicket(xtbText);
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
    const ticketApplied = await sendTicketToDashboard(dashboardPage, ticket, syncSymbol);
    const orderPreparation = await processDashboardOrderRequest(dashboardPage, xtbPage);

    if (!quoteBatch.items.length && !syncSymbol) {
      throw new Error('No encontre un activo sincronizable. Selecciona o deja visible el activo en XTB.');
    }
    if (!quoteBatch.applied && (!quote || price === null)) {
      throw new Error(`No encontre cotizacion XTB para ${syncSymbol}. Pon ese activo visible en favoritos/lista de XTB.`);
    }

    const dashboardAppliedPrice = parseMoney(afterBatchState.xtbPrice);
    const priceMatchesXtb = dashboardAppliedPrice !== null && Math.abs(dashboardAppliedPrice - price) < 0.01;
    const applied = quoteBatch.applied && priceMatchesXtb
      ? dashboardAppliedPrice.toFixed(2)
      : await setDashboardPrice(dashboardPage, syncSymbol, price);
    const result = {
      timestamp: new Date().toISOString(),
      symbol: afterBatchState.symbol?.trim().toUpperCase() || syncSymbol,
      dashboard_symbol_before: selectedSymbol,
      active_xtb_symbol: activeSymbol,
      visible_xtb_symbols: quoteBatch.items.map((item) => item.symbol),
      side: SIDE,
      xtb: quote || null,
      xtb_ticket: ticket ? { ...ticket, applied: ticketApplied } : null,
      order_preparation: orderPreparation,
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
