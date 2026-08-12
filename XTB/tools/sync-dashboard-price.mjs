import { connectChrome, pickBrowserContext, classifyPage, normalize, parseMoney } from './chrome-debug.mjs';

const SIDE = (process.env.XTB_SYNC_SIDE || 'mid').toLowerCase();
const INTERVAL_MS = Number.parseInt(process.env.XTB_SYNC_INTERVAL_MS || '1000', 10);
const SNAPSHOT_ENDPOINT = process.env.XTB_SNAPSHOT_ENDPOINT || 'https://api.manantiallodge.com/xtb/snapshot';
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
    const bid = quotePrice(match[1] ?? match[3]);
    const ask = quotePrice(match[2] ?? match[4]);
    if (bid === null && ask === null) return [];
    return [[symbol, {
      bid,
      ask,
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
  const values = [quote.bid, quote.ask].filter((value) => Number.isFinite(value));
  if (!values.length) return null;
  return Number((values.reduce((total, value) => total + value, 0) / values.length).toFixed(2));
}

function currentTradingSession(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const total = hour * 60 + minute;
  const active = [];
  const asia = total >= 18 * 60 || total < 3 * 60;
  const london = total >= 3 * 60 && total < 11 * 60 + 30;
  const ny = total >= 9 * 60 + 30 && total < 16 * 60;
  if (asia) active.push('Asia');
  if (london) active.push('London');
  if (ny) active.push('NY');
  const session = active.length ? active.join('/') : 'Fuera de sesion principal';
  return {
    session,
    session_code: session.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    active,
    ny_time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    ny_weekday: parts.weekday || '',
    timezone: 'America/New_York'
  };
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

function extractXtbAccount(text) {
  const cleaned = normalize(text);
  const raw = String(text || '');
  const accountCandidates = [
    ...cleaned.matchAll(/\bREAL\s*(\d{5,})\b/gi),
    ...cleaned.matchAll(/\b#\s*(\d{5,})\b/gi),
    ...cleaned.matchAll(/\b(?:account|cuenta)\D{0,25}(\d{5,})\b/gi),
    ...raw.matchAll(/\bREAL\s*(\d{5,})\b/gi),
    ...raw.matchAll(/\b#\s*(\d{5,})\b/gi),
    ...raw.matchAll(/\b(?:account|cuenta)\D{0,25}(\d{5,})\b/gi)
  ];
  const accountUsdCandidates = [
    ...cleaned.matchAll(/\b#?\d{5,}\s+([0-9.,\s]+)\s*USD\b/gi),
    ...cleaned.matchAll(/\bMis\s+cuentas\s+([0-9.,\s]+)\s*USD\b/gi)
  ];
  const equityMatch = cleaned.match(/(?:total\s*equity|equity|patrimonio\s+total|valor\s+de\s+mis\s+operaciones|mis\s+cuentas)\D{0,35}([0-9.,\s]+)\s*USD/i)
    || accountUsdCandidates[0];
  const capitalMatch = cleaned.match(/(?:available\s*capital|capital\s+disponible|saldo\s+disponible)\D{0,35}([0-9.,\s]+)\s*USD/i)
    || cleaned.match(/Capital\s+Disponible\s+([0-9.,\s]+)\s+Beneficio/i);
  const profitMatch = cleaned.match(/(?:open\s*profit|beneficio\s+abierto)\D{0,35}([-0-9.,\s]+)\s*USD/i)
    || cleaned.match(/\bBeneficio\s+([-0-9.,\s]+)\s*USD\b/i)
    || cleaned.match(/Capital\s+Disponible\s+[0-9.,\s]+\s+Beneficio\s+([-0-9.,\s]+)\s+Nivel\s+de\s+margen/i);
  const marginLevelMatch = cleaned.match(/(?:nivel\s+de\s+margen|margin\s+level)\D{0,35}([0-9.,\s]+)\s*%/i);
  const account = {
    account: accountCandidates[0]?.[1] || null,
    total_equity: equityMatch ? parseMoney(equityMatch[1]) : null,
    available_capital: capitalMatch ? parseMoney(capitalMatch[1]) : null,
    open_profit: profitMatch ? parseMoney(profitMatch[1]) : null,
    margin_level_pct: marginLevelMatch ? parseMoney(marginLevelMatch[1]) : null,
    source: 'xtb-visible-account',
    detected_at: new Date().toISOString()
  };
  const hasData = account.total_equity !== null
    || account.available_capital !== null
    || account.open_profit !== null
    || account.margin_level_pct !== null;
  return hasData ? account : null;
}

async function getAccessibleText(page) {
  try {
    const session = await page.context().newCDPSession(page);
    const tree = await session.send('Accessibility.getFullAXTree');
    return (tree.nodes || [])
      .flatMap((node) => [node.name?.value, node.value?.value])
      .filter(Boolean)
      .map((value) => normalize(value))
      .filter(Boolean)
      .join('\n');
  } catch {
    return '';
  }
}

function parseAccessibleValueAfter(lines, label) {
  const labelIndex = lines.findIndex((line) => line.toLowerCase() === label.toLowerCase());
  if (labelIndex < 0) return null;
  for (const line of lines.slice(labelIndex + 1, labelIndex + 6)) {
    const value = parseMoney(line);
    if (value !== null) return value;
  }
  return null;
}

function parseSelectedAccountBalance(lines) {
  const accountCombo = lines.find((line) => /#\s*\d{5,}.*USD/i.test(line));
  if (!accountCombo) return null;
  const match = accountCombo.match(/#\s*\d{5,}\s+([0-9.,\s]+)\s*USD/i);
  return match ? parseMoney(match[1]) : null;
}

function extractXtbAccountFromAccessibleText(text) {
  const lines = String(text || '')
    .split('\n')
    .map((line) => normalize(line))
    .filter(Boolean);
  if (!lines.length) return null;

  const accountMatch = text.match(/\b#\s*(\d{5,})\b/i) || text.match(/\bREAL\s*(\d{5,})\b/i);
  const selectedBalance = parseSelectedAccountBalance(lines);
  const account = {
    account: accountMatch?.[1] || null,
    total_equity: parseAccessibleValueAfter(lines, 'Valor de Mis Operaciones') ?? selectedBalance,
    available_capital: parseAccessibleValueAfter(lines, 'Capital disponible'),
    open_profit: parseAccessibleValueAfter(lines, 'Beneficio'),
    margin_level_pct: parseAccessibleValueAfter(lines, 'Nivel de margen'),
    source: 'xtb-accessibility-account',
    detected_at: new Date().toISOString()
  };
  const hasData = account.total_equity !== null
    || account.available_capital !== null
    || account.open_profit !== null
    || account.margin_level_pct !== null;
  return hasData ? account : null;
}

function numberMatch(text, pattern) {
  const match = text.match(pattern);
  return match?.[1] ? parseMoney(match[1]) : null;
}

function textHash(value) {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function buildPositionId(position) {
  return [
    position.symbol,
    position.status,
    position.direction,
    position.volume,
    position.entry_price,
    position.close_price,
    position.actual_result,
    position.stop_loss,
    position.take_profit
  ].map((part) => String(part ?? '')).join('|');
}

function extractPositionFromFragment(fragment, status) {
  const directionText = fragment.match(/\b(Comprar|Vender)\b/i)?.[1] || '';
  const direction = /^Comprar$/i.test(directionText) ? 'LONG' : /^Vender$/i.test(directionText) ? 'SHORT' : '';
  const volume = numberMatch(fragment, /Volumen\s+(-?[0-9]+(?:[.,][0-9]+)?)/i);
  const entryFromAt = numberMatch(fragment, /@\s*([0-9]{1,3}(?:[\s.,][0-9]{3})*(?:[.,][0-9]+)?|[0-9]+(?:[.,][0-9]+)?)/i);
  const entryFromLabel = numberMatch(fragment, /Precio\s+de\s+apertura\s+([0-9.,\s]+)/i);
  const closePrice = numberMatch(fragment, /Precio\s+del\s+cierre\s+([0-9.,\s]+)/i);
  const result = numberMatch(fragment, /Beneficio\s+neto(?:\/P[eé]rdida)?\s+(-?[0-9.,\s]+)\s*USD/i);
  const stopLoss = numberMatch(fragment, /Stop\s+Loss\s+([0-9.,\s-]+)/i);
  const takeProfit = numberMatch(fragment, /Take\s+Profit\s+([0-9.,\s-]+)/i);
  const entryPrice = entryFromLabel ?? entryFromAt;
  if (!direction || volume === null || entryPrice === null) return null;
  const position = {
    symbol: 'US100',
    status,
    direction,
    volume: Math.abs(volume),
    entry_price: entryPrice,
    close_price: closePrice,
    actual_result: result,
    stop_loss: stopLoss,
    take_profit: takeProfit,
    source: status === 'closed' ? 'xtb-visible-history' : 'xtb-visible-open-position',
    detected_at: new Date().toISOString()
  };
  position.id = textHash(buildPositionId(position));
  return position;
}

function extractXtbPositions(text) {
  const cleaned = normalize(text);
  const positions = [];

  if (/Detalles\s+de\s+la\s+posici[oó]n/i.test(cleaned) && /US100\s+CFD/i.test(cleaned)) {
    const detailStart = cleaned.search(/Detalles\s+de\s+la\s+posici[oó]n/i);
    const detail = cleaned.slice(detailStart, detailStart + 1800);
    const closed = extractPositionFromFragment(detail, 'closed');
    if (closed && closed.close_price !== null && closed.actual_result !== null) positions.push(closed);
  }

  if (/Posiciones\s+abiertas/i.test(cleaned) && /US100\s+CFD/i.test(cleaned)) {
    const us100Index = cleaned.search(/US100\s+CFD/i);
    const openFragment = cleaned.slice(Math.max(0, us100Index - 400), us100Index + 1600);
    const openPosition = extractPositionFromFragment(openFragment, 'open');
    if (openPosition) positions.push(openPosition);
  }

  return positions;
}

function extractXtbDayHistoryResult(text) {
  const cleaned = normalize(text);
  const looksLikeHistory = /Historial\s+de\s+la\s+cuenta|Posiciones\s+cerradas|Precio\s+del\s+cierre|Beneficio\s+neto/i.test(cleaned);
  if (!looksLikeHistory) return null;

  const patterns = [
    /Beneficio\s+neto\s*\/\s*P[eÃ©]rdida\s*:?\s*(-?[0-9.,\s]+)\s*USD/i,
    /Beneficio\s+neto\s*:?\s*(-?[0-9.,\s]+)\s*USD/i,
    /P[eÃ©]rdida\s*:?\s*(-?[0-9.,\s]+)\s*USD/i
  ];
  const value = patterns
    .map((pattern) => numberMatch(cleaned, pattern))
    .find((result) => Number.isFinite(result));
  if (!Number.isFinite(value)) return null;

  return {
    closed_result: Number(value.toFixed(2)),
    source: 'xtb-visible-history-summary',
    detected_at: new Date().toISOString()
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
  const updatedAt = new Date().toISOString();
  const items = Object.entries(quotes).map(([symbol, quote]) => {
    const price = pickPrice(quote);
    return {
      symbol,
      bid: quote.bid,
      ask: quote.ask,
      price,
      change_pct: quote.change_pct || 0,
      source: 'xtb',
      updated_at: updatedAt
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

async function publishQuoteSnapshot(items, marketSession = null) {
  if (!items?.length || !SNAPSHOT_ENDPOINT) return { published: false, count: 0 };
  try {
    const response = await fetch(SNAPSHOT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'xtb-browser-sync', items, market_session: marketSession }),
      signal: AbortSignal.timeout(2500)
    });
    return { published: response.ok, count: items.length, status: response.status };
  } catch (error) {
    return { published: false, count: 0, error: error.message };
  }
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

async function sendPositionsToDashboard(page, positions, dayResult = null, marketSession = null) {
  if (!positions?.length && !dayResult) return false;
  return page.evaluate(({ positionItems, dayResultPayload, marketSessionPayload }) => {
    if (typeof window.dispatchEvent !== 'function') return false;
    window.dispatchEvent(new CustomEvent('xtb-positions', {
      detail: {
        positions: positionItems,
        day_result: dayResultPayload,
        market_session: marketSessionPayload,
        updated_at: new Date().toISOString()
      }
    }));
    return true;
  }, { positionItems: positions || [], dayResultPayload: dayResult, marketSessionPayload: marketSession });
}

async function sendAccountToDashboard(page, account, marketSession = null) {
  if (!account) return false;
  return page.evaluate(({ accountPayload, marketSessionPayload }) => {
    if (typeof window.dispatchEvent !== 'function') return false;
    window.dispatchEvent(new CustomEvent('xtb-account', {
      detail: {
        ...accountPayload,
        market_session: marketSessionPayload,
        updated_at: new Date().toISOString()
      }
    }));
    return true;
  }, { accountPayload: account, marketSessionPayload: marketSession });
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
  await updateDashboardOrderRequest(
    dashboardPage,
    request,
    'disabled',
    'Modo analisis activo: Playwright solo lee XTB y no prepara ordenes.'
  );
  return { ok: false, disabled: true, message: 'Modo analisis activo: no se preparan ordenes en XTB.' };
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
  const marketSession = currentTradingSession();
  const browser = await connectChrome();
  try {
    const context = pickBrowserContext(browser);
    const xtbPages = context.pages().filter((page) => classifyPage(page) === 'xtb');
    const dashboardPage = context.pages().find((page) => classifyPage(page) === 'dashboard');

    if (!xtbPages.length || !dashboardPage) {
      throw new Error('Faltan pestanas: abre XTB y MyActions/dashboard con npm.cmd run start.');
    }

    const dashboardState = await dashboardPage.evaluate(() => ({
      symbol: document.querySelector('#symbol')?.value || '',
      marketPrice: document.querySelector('#market-price')?.value || '',
      xtbPrice: document.querySelector('#xtb-price')?.value || ''
    }));
    const selectedSymbol = dashboardState.symbol.trim().toUpperCase();

    const xtbSnapshots = await Promise.all(xtbPages.map(async (page) => ({
      page,
      url: page.url(),
      text: await page.evaluate(() => document.body?.innerText || '').catch(() => ''),
      accessibleText: await getAccessibleText(page)
    })));
    const snapshotQuotes = xtbSnapshots.map((snapshot) => ({
      ...snapshot,
      quotes: extractXtbQuotes(snapshot.text)
    }));
    const quoteSnapshot = snapshotQuotes.find((snapshot) => snapshot.quotes[selectedSymbol])
      || snapshotQuotes.find((snapshot) => snapshot.quotes.US100)
      || snapshotQuotes.find((snapshot) => Object.keys(snapshot.quotes).length)
      || snapshotQuotes[0];
    const xtbPage = quoteSnapshot.page;
    const xtbText = quoteSnapshot.text;
    const quotes = extractXtbQuotes(xtbText);
    const quoteBatch = await sendQuoteBatchToDashboard(dashboardPage, quotes);
    const snapshotPublish = await publishQuoteSnapshot(quoteBatch.items, marketSession);
    const ticket = extractXtbTicket(xtbText);
    const account = xtbSnapshots
      .map((snapshot) => {
        const extracted = extractXtbAccount(snapshot.text)
          || extractXtbAccountFromAccessibleText(snapshot.accessibleText);
        return extracted ? { ...extracted, source_url: snapshot.url } : null;
      })
      .find(Boolean) || null;
    const accountApplied = await sendAccountToDashboard(dashboardPage, account, marketSession);
    const positions = Array.from(new Map(
      xtbSnapshots
        .flatMap((snapshot) => extractXtbPositions(`${snapshot.text}\n${snapshot.accessibleText}`))
        .map((position) => [position.id, position])
    ).values());
    const dayHistoryResult = xtbSnapshots
      .map((snapshot) => extractXtbDayHistoryResult(`${snapshot.text}\n${snapshot.accessibleText}`))
      .find(Boolean) || null;
    const positionsApplied = await sendPositionsToDashboard(dashboardPage, positions, dayHistoryResult, marketSession);
    await dashboardPage.waitForTimeout(100);
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
    const fallbackPrice = parseMoney(afterBatchState.xtbPrice)
      ?? parseMoney(dashboardState.xtbPrice)
      ?? parseMoney(dashboardState.marketPrice);
    const usablePrice = price ?? fallbackPrice;
    if (!quoteBatch.applied && (!quote || usablePrice === null)) {
      throw new Error(`No encontre cotizacion XTB para ${syncSymbol}. Pon ese activo visible en favoritos/lista de XTB.`);
    }
    if (usablePrice === null) {
      throw new Error(`No encontre precio valido para ${syncSymbol}. Revisa que XTB muestre oferta/demanda o que el dashboard tenga un precio de respaldo.`);
    }

    const dashboardAppliedPrice = parseMoney(afterBatchState.xtbPrice);
    const priceMatchesXtb = dashboardAppliedPrice !== null && usablePrice !== null && Math.abs(dashboardAppliedPrice - usablePrice) < 0.01;
    const applied = quoteBatch.applied && priceMatchesXtb
      ? dashboardAppliedPrice.toFixed(2)
      : await setDashboardPrice(dashboardPage, syncSymbol, usablePrice);
    await dashboardPage.waitForTimeout(100);
    const finalDashboardState = await dashboardPage.evaluate(() => ({
      symbol: document.querySelector('#symbol')?.value || '',
      marketPrice: document.querySelector('#market-price')?.value || '',
      xtbPrice: document.querySelector('#xtb-price')?.value || ''
    }));
    const result = {
      timestamp: new Date().toISOString(),
      symbol: finalDashboardState.symbol?.trim().toUpperCase() || syncSymbol,
      dashboard_symbol_before: selectedSymbol,
      active_xtb_symbol: activeSymbol,
      visible_xtb_symbols: quoteBatch.items.map((item) => item.symbol),
      side: SIDE,
      xtb: quote || null,
      xtb_ticket: ticket ? { ...ticket, applied: ticketApplied } : null,
      xtb_account: account ? { ...account, applied: accountApplied } : null,
      xtb_positions: { detected: positions.length, applied: positionsApplied },
      xtb_day_history: dayHistoryResult,
      market_session: marketSession,
      snapshot_publish: snapshotPublish,
      order_preparation: orderPreparation,
      applied_xtb_price: applied,
      dashboard_market_price_before: dashboardState.marketPrice,
      dashboard_xtb_price_before: dashboardState.xtbPrice,
      dashboard_symbol_after: finalDashboardState.symbol,
      dashboard_xtb_price_after: finalDashboardState.xtbPrice
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
      console.error(`[xtb-sync] ${error?.message || error}`);
      if (process.env.XTB_SYNC_DEBUG === '1' && error?.stack) console.error(error.stack);
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
