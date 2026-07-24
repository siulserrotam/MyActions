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
  const normalized = String(text).replace(/\s/g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseQuotes(lines) {
  const wanted = new Set(["Tesla", "Apple", "Nvidia", "TSMC", "BITCOIN", "ETHEREUM", "EURUSD", "GBPUSD", "GOLD", "NATGAS", "OIL", "SILVER"]);
  const quotes = [];
  for (let index = 0; index < lines.length - 4; index += 1) {
    const symbol = lines[index];
    if (!wanted.has(symbol)) continue;
    const type = lines[index + 1];
    const change = lines[index + 2];
    const bid = parseNumber(lines[index + 3]);
    const ask = parseNumber(lines[index + 4]);
    if (type === "CFD" && bid !== null && ask !== null) {
      quotes.push({ symbol, type, change, bid, ask, mid: Number(((bid + ask) / 2).toFixed(5)) });
    }
  }
  return quotes;
}

function parseAccount(lines) {
  const joined = lines.join("\n");
  const accountMatch = joined.match(/REAL\s*(\d+)/i);
  const usdValues = [...joined.matchAll(/(-?\d+(?:[.,]\d+)?)\s*USD/g)].map((match) => parseNumber(match[1])).filter((value) => value !== null);
  return {
    account: accountMatch?.[1] || null,
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

  const expression = `(() => {
    const rawText = document.body ? document.body.innerText : "";
    const lines = rawText.split(/\\n+/).map((x) => x.trim()).filter(Boolean);
    return { title: document.title, url: location.href, lines };
  })()`;

  try {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    return result.result?.result?.value || { title: tab.title, url: tab.url, lines: [], error: result.error?.message || "No se pudo leer DOM" };
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
  const lines = page.lines || [];
  const snapshot = {
    captured_at: new Date().toISOString(),
    source: "xstation-chrome-debug",
    url: page.url,
    title: page.title,
    account: parseAccount(lines),
    quotes: parseQuotes(lines),
    raw_sample: lines.slice(0, 80),
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
