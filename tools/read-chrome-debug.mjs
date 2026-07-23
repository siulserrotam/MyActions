const endpoint = "http://127.0.0.1:9222/json";

const tabs = await fetch(endpoint).then((response) => response.json());
const summaries = await Promise.all(tabs.map(async (tab) => {
  if (!tab.webSocketDebuggerUrl) {
    return { title: tab.title, url: tab.url, error: "Sin WebSocket debugger URL" };
  }

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();

  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      pending.get(message.id)(message);
      pending.delete(message.id);
    }
  });

  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  const send = (method, params = {}) => new Promise((resolve) => {
    const messageId = ++id;
    pending.set(messageId, resolve);
    ws.send(JSON.stringify({ id: messageId, method, params }));
  });

  const expression = `(() => {
    const texts = Array.from(document.querySelectorAll('body *'))
      .filter((el) => {
        const box = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        return box.width > 0 && box.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      })
      .map((el) => (el.innerText || el.textContent || '').trim())
      .filter(Boolean)
      .slice(0, 80);
    return { title: document.title, url: location.href, texts };
  })()`;

  const result = await send("Runtime.evaluate", { expression, returnByValue: true });
  ws.close();
  return result.result?.result?.value || { title: tab.title, url: tab.url, error: "No se pudo leer DOM" };
}));

console.log(JSON.stringify(summaries, null, 2));
