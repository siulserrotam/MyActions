const endpoint = "http://127.0.0.1:9222/json";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseNumber(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/[^\d,.\-]/g, "").replace(/\s/g, "");
  if (!cleaned || cleaned === "-" || cleaned === "." || cleaned === ",") return null;
  const value = Number(cleaned.replace(",", "."));
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
    if (forbidden.some((pattern) => pattern.test(normalizeText(text)))) continue;
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

function parseAccount(lines) {
  const joined = lines.join("\n");
  const accountMatch = joined.match(/REAL\s*(\d+)/i);
  return {
    account: accountMatch?.[1] || null,
    total_equity: numberAfterExactLabel(lines, "Valor de Mis Operaciones")
      ?? firstNumberNear(lines, [/mis cuentas/, /valor de mis operaciones/], { requireUsd: true, windowSize: 6 }),
    available_capital: numberAfterExactLabel(lines, "Capital disponible")
      ?? firstNumberNear(lines, [/capital disponible/], { requireUsd: true, windowSize: 4 }),
    open_profit: numberAfterExactLabel(lines, "Beneficio")
      ?? firstNumberNear(lines, [/beneficio/], { requireUsd: true, windowSize: 4, forbidden: [/take profit/] }),
    margin_level_pct: firstNumberNear(lines, [/nivel de margen/], { requirePercent: true, windowSize: 4 }),
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
    const interesting = lines.filter((line) =>
      /USD|CFD|BITCOIN|APPLE|Nvidia|TSMC|Tesla|Capital|Beneficio|Margen|Oferta|Demanda|Compra|Venta|Posiciones|Pendientes|[0-9]+[.,][0-9]+/.test(line)
    ).slice(0, 120);
    return {
      title: document.title,
      url: location.href,
      interesting,
      lines,
      textSample: lines.slice(0, 40)
    };
  })()`;

  try {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    const page = result.result?.result?.value || { title: tab.title, url: tab.url, lines: [], error: result.error?.message || "No se pudo leer DOM" };
    const axLines = await readAccessibilityLines();
    return { ...page, lines: [...axLines, ...(page.lines || [])] };
  } finally {
    cleanup();
  }
}

const tabs = await fetch(endpoint).then((response) => response.json());
const relevantTabs = tabs.filter((tab) => /xstation|manantiallodge|myactions/i.test(`${tab.title} ${tab.url}`));
const summaries = [];

for (const tab of relevantTabs) {
  try {
    const summary = await readTab(tab);
    if (/xstation/i.test(`${summary.title} ${summary.url}`)) {
      summary.account = parseAccount(summary.lines || []);
    }
    delete summary.lines;
    summaries.push(summary);
  } catch (error) {
    summaries.push({ title: tab.title, url: tab.url, error: error.message });
  }
}

console.log(JSON.stringify(summaries, null, 2));
setTimeout(() => process.exit(0), 50);
