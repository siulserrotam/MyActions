const endpoint = "http://127.0.0.1:9222/json";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const interesting = lines.filter((line) =>
      /USD|CFD|BITCOIN|APPLE|Nvidia|TSMC|Tesla|Capital|Beneficio|Margen|Oferta|Demanda|Compra|Venta|Posiciones|Pendientes|[0-9]+[.,][0-9]+/.test(line)
    ).slice(0, 120);
    return {
      title: document.title,
      url: location.href,
      interesting,
      textSample: lines.slice(0, 40)
    };
  })()`;

  try {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true });
    return result.result?.result?.value || { title: tab.title, url: tab.url, error: result.error?.message || "No se pudo leer DOM" };
  } finally {
    cleanup();
  }
}

const tabs = await fetch(endpoint).then((response) => response.json());
const relevantTabs = tabs.filter((tab) => /xstation|manantiallodge|myactions/i.test(`${tab.title} ${tab.url}`));
const summaries = [];

for (const tab of relevantTabs) {
  try {
    summaries.push(await readTab(tab));
  } catch (error) {
    summaries.push({ title: tab.title, url: tab.url, error: error.message });
  }
}

console.log(JSON.stringify(summaries, null, 2));
setTimeout(() => process.exit(0), 50);
