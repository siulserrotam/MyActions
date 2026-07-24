import { mkdir, appendFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const endpoint = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9222/json";
const intervalMs = Number(process.env.XTB_MONITOR_INTERVAL_MS || 60_000);
const outputDir = process.env.XTB_SNAPSHOT_DIR || "data/xtb-snapshots";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function parseNumber(text) {
  if (!text) return null;
  const cleaned = String(text)
    .replace(/[^\d,.\-]/g, "")
    .replace(/\s/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === ",") return null;
  const normalized = cleaned.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function firstNumberNear(lines, labelPatterns, options = {}) {
  const windowSize = options.windowSize ?? 5;
  const requireUsd = options.requireUsd ?? false;
  const requirePercent = options.requirePercent ?? false;
  const forbidden = options.forbidden || [];
  for (let index = 0; index < lines.length; index += 1) {
    const normalized = normalizeText(lines[index]);
    if (!labelPatterns.some((pattern) => pattern.test(normalized))) continue;
    const segment = lines.slice(index, index + windowSize + 1);
    const text = segment.join(" ");
    const forbiddenHit = forbidden.some((pattern) => pattern.test(normalizeText(text)));
    if (forbiddenHit) continue;
    const regex = requirePercent
      ? /(-?\d+(?:[.,]\d+)?)\s*%/g
      : requireUsd
        ? /(-?\d+(?:[.,]\d+)?)\s*USD/g
        : /-?\d+(?:[.,]\d+)?/g;
    const matches = [...text.matchAll(regex)];
    for (const match of matches) {
      const value = parseNumber(match[1] || match[0]);
      if (value !== null) return value;
    }
  }
  return null;
}

function numberAfterExactLabel(lines, label) {
  const expected = normalizeText(label);
  const index = lines.findIndex((line) => normalizeText(line) === expected);
  if (index === -1) return null;
  for (const line of lines.slice(index + 1, index + 8)) {
    const value = parseNumber(line);
    if (value !== null) return value;
  }
  return null;
}

function parseQuotes(lines) {
  const wanted = new Set(["Tesla", "Apple", "Nvidia", "TSMC", "BITCOIN", "ETHEREUM", "EURUSD", "GBPUSD", "GOLD", "NATGAS", "OIL", "SILVER", "US100", "US30"]);
  const quotes = [];
  const labelWords = new Set(["VENTA", "COMPRA", "LOW", "HIGH", "SPREAD", "VARIACION DIARIA", "VARIACIÓN DIARIA"]);
  for (let index = 0; index < lines.length - 3; index += 1) {
    const symbol = lines[index];
    if (!wanted.has(symbol)) continue;
    const type = lines[index + 1];
    if (type !== "CFD") continue;
    const windowLines = lines.slice(index + 2, index + 14);
    const change = windowLines.find((line) => /-?\d+(?:[.,]\d+)?%/.test(line)) || null;
    const ventaIndex = windowLines.findIndex((line) => normalizeText(line) === "venta");
    const compraIndex = windowLines.findIndex((line) => normalizeText(line) === "compra");
    let bid = null;
    let ask = null;
    if (ventaIndex >= 0) {
      bid = parseNumber(windowLines[ventaIndex + 1]);
    }
    if (compraIndex >= 0) {
      ask = parseNumber(windowLines[compraIndex + 1]);
    }
    if (bid === null || ask === null) {
      const numericValues = windowLines
        .filter((line) => !String(line).includes("≈"))
        .filter((line) => !String(line).includes("%"))
        .filter((line) => !labelWords.has(String(line).trim().toUpperCase()))
        .map((line) => parseNumber(line))
        .filter((value) => value !== null);
      bid = bid ?? numericValues[0] ?? null;
      ask = ask ?? numericValues[1] ?? null;
    }
    if (bid !== null && ask !== null) {
      quotes.push({ symbol, type, change, bid, ask, mid: Number(((bid + ask) / 2).toFixed(5)) });
    }
  }
  return quotes;
}

function parseAccount(lines) {
  const joined = lines.join("\n");
  const accountMatch = joined.match(/REAL\s*(\d+)/i);
  const usdValues = [...joined.matchAll(/(-?\d+(?:[.,]\d+)?)\s*USD/g)].map((match) => parseNumber(match[1])).filter((value) => value !== null);
  const totalEquity = numberAfterExactLabel(lines, "Valor de Mis Operaciones")
    ?? firstNumberNear(lines, [/mis cuentas/, /valor de mis operaciones/], { requireUsd: true, windowSize: 6 });
  const availableCapital = numberAfterExactLabel(lines, "Capital disponible")
    ?? firstNumberNear(lines, [/capital disponible/], { requireUsd: true, windowSize: 4 });
  const openProfit = numberAfterExactLabel(lines, "Beneficio")
    ?? firstNumberNear(lines, [/beneficio/], { requireUsd: true, windowSize: 4, forbidden: [/take profit/] });
  const marginLevelPct = firstNumberNear(lines, [/nivel de margen/], { requirePercent: true, windowSize: 4 });
  return {
    account: accountMatch?.[1] || null,
    total_equity: totalEquity,
    available_capital: availableCapital,
    open_profit: openProfit,
    margin_level_pct: marginLevelPct,
    usd_values_seen: usdValues.slice(0, 10),
  };
}

async function readTab(tab) {
  if (!tab.webSocketDebuggerUrl) {
    return { title: tab.title, url: tab.url, error: "Sin WebSocket debugger URL" };
  }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  let closed = false;

  const cleanup = () => {
    if (!closed) {
      closed = true;
      try {
        ws.close();
      } catch {
        // ignore close errors
      }
    }
  };

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  await Promise.race([
    new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    }),
    wait(3000).then(() => {
      throw new Error("Timeout abriendo WebSocket");
    }),
  ]);

  const send = (method, params = {}) => Promise.race([
    new Promise((resolve) => {
      const messageId = ++id;
      pending.set(messageId, resolve);
      ws.send(JSON.stringify({ id: messageId, method, params }));
    }),
    wait(5000).then(() => ({ error: { message: "Timeout Runtime.evaluate" } })),
  ]);

  const readAccessibilityLines = async () => {
    const result = await send("Accessibility.getFullAXTree");
    return (result.result?.nodes || [])
      .map((node) => node.name?.value)
      .filter(Boolean)
      .map((value) => String(value).trim())
      .filter(Boolean);
  };

  const expression = `(() => {
    const rawText = document.body ? document.body.innerText : "";
    const lines = rawText.split(/\\n+/).map((x) => x.trim()).filter(Boolean);
    return { title: document.title, url: location.href, lines };
  })()`;

  try {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    const page = result.result?.result?.value || { title: tab.title, url: tab.url, lines: [], error: result.error?.message || "No se pudo leer DOM" };
    const axLines = await readAccessibilityLines();
    return { ...page, axLines };
  } finally {
    cleanup();
  }
}

async function collectSnapshot() {
  const tabs = await fetch(endpoint).then((response) => response.json());
  const xstation = tabs.find((tab) => /xstation/i.test(`${tab.title} ${tab.url}`));
  if (!xstation) {
    throw new Error("No encontre pestaña xStation. Abre Chrome debug e inicia sesion.");
  }
  const page = await readTab(xstation);
  const accountLines = [...(page.axLines || []), ...(page.lines || [])];
  const quoteLines = page.lines || [];
  const snapshot = {
    captured_at: new Date().toISOString(),
    source: "xstation-chrome-debug",
    url: page.url,
    title: page.title,
    account: parseAccount(accountLines),
    quotes: parseQuotes(quoteLines),
    raw_sample: quoteLines.slice(0, 80),
    error: page.error || null,
  };
  return snapshot;
}

async function saveSnapshot(snapshot) {
  await mkdir(outputDir, { recursive: true });
  const day = todayKey();
  const jsonlPath = join(outputDir, `${day}.jsonl`);
  const latestPath = join(outputDir, "latest.json");
  await appendFile(jsonlPath, `${JSON.stringify(snapshot)}\n`, "utf8");
  await mkdir(dirname(latestPath), { recursive: true });
  await writeFile(latestPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
}

async function tick() {
  const snapshot = await collectSnapshot();
  await saveSnapshot(snapshot);
  const quoteText = snapshot.quotes.map((quote) => `${quote.symbol} ${quote.bid}/${quote.ask}`).join(" | ");
  console.log(`[${snapshot.captured_at}] ${snapshot.quotes.length} quotes ${quoteText}`);
}

console.log(`Monitor XTB iniciado. Intervalo: ${Math.round(intervalMs / 1000)}s. Salida: ${outputDir}`);
while (true) {
  try {
    await tick();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${error.message}`);
  }
  await wait(intervalMs);
}
