const DAILY_KEY = "myactions_daily_records";

async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchOptional(path, fallback) {
  try {
    return await fetchJson(path);
  } catch (error) {
    console.warn(`No se pudo cargar ${path}`, error);
    return fallback;
  }
}

function money(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

async function loadDashboard() {
  setLoadingState();
  renderPortfolioState();
  renderDailySummary();

  const ticker = document.getElementById("orb-ticker").value;
  const fallback = {
    selected_ticker: ticker,
    best_ticker: ticker,
    selected: { ticker, status: "SIN DATOS", action: "ESPERAR", reason: "No se pudieron cargar datos.", news: [] },
    recommendation: { ticker, status: "SIN DATOS", action: "ESPERAR", reason: "No se pudieron cargar datos.", news: [] },
    candidates: [],
    session: { ticker, bars: [], opening_range: null },
    rules: { capital: 2500, risk_amount: 20, reward_amount: 40, buying_power: 10000, risk_reward: "1:2" },
  };
  const data = await fetchOptional(`/orb/dashboard?ticker=${encodeURIComponent(ticker)}`, fallback);

  renderHeader(data);
  renderDecision(data);
  renderCandidates(data.candidates || []);
  renderNews(data.recommendation || data.selected || {});
  renderRules(data.rules || fallback.rules);
  renderWebAlert(data.recommendation || data.selected || {});

  const session = data.session || {};
  if ((session.bars || []).length) {
    renderOrbChart(session);
    hydrateOpeningRange(session);
    hydrateSuggestedEntry(data.selected || data.recommendation || {});
  } else {
    document.getElementById("orb-chart").innerHTML =
      '<div class="chart-fallback">No hay datos intradia 5m disponibles ahora. Reintenta cuando el mercado haya abierto.</div>';
  }
}

function renderHeader(data) {
  const candidate = data.recommendation || data.selected || {};
  document.getElementById("signal").textContent = candidate.status || "ESPERAR";
  document.getElementById("best-ticker").textContent = data.best_ticker || candidate.ticker || "-";
  document.getElementById("side-entry").textContent = money(candidate.suggested_entry);
  document.getElementById("side-sell").textContent = money(candidate.suggested_sell);
  document.getElementById("refresh-status").textContent = refreshLabel();
}

function renderDecision(data) {
  const best = data.recommendation || {};
  const selected = data.selected || best;
  document.getElementById("daily-decision").innerHTML = `
    <p class="kicker">Mejor candidata ahora</p>
    <h3>${best.ticker || "-"} - ${best.action || "ESPERAR"}</h3>
    <p>${best.reason || "Sin lectura suficiente."}</p>
    <div class="metric-row">
      <span>Entrada: <strong>${money(best.suggested_entry)}</strong></span>
      <span>Stop: <strong>${money(best.suggested_stop)}</strong></span>
      <span>Venta: <strong>${money(best.suggested_sell)}</strong></span>
    </div>
    <p class="muted-text">Seleccion actual: ${selected.ticker || "-"} (${selected.status || "SIN DATOS"}). No entrar si no hay ruptura limpia y volumen.</p>
  `;
}

function renderRules(rules) {
  document.getElementById("rules-box").innerHTML = `
    <p><strong>Operacion 1:</strong> si pierde, se cierra el dia.</p>
    <p><strong>Maximo:</strong> ${rules.max_wins || 2} operaciones ganadoras.</p>
    <p><strong>Base:</strong> arriesgar ${money(rules.risk_amount)} para buscar ${money(rules.reward_amount)}.</p>
    <p><strong>Poder compra:</strong> no superar ${money(rules.buying_power)}.</p>
    <p class="muted-text">Usa esto como control educativo; valida en tu broker antes de ejecutar.</p>
  `;
}

function renderCandidates(candidates) {
  document.getElementById("candidates").innerHTML = candidates
    .map((item) => `
      <div class="candidate-row">
        <button type="button" onclick="selectTicker('${item.ticker}')">${item.ticker}</button>
        <div>
          <strong>${item.action || "ESPERAR"}</strong>
          <p>${item.reason || "Sin razon disponible."}</p>
          <small>Precio ${money(item.price)} | Entrada ${money(item.suggested_entry)} | Venta ${money(item.suggested_sell)} | Score ${item.score}</small>
        </div>
      </div>
    `)
    .join("") || "<p>No hay candidatas disponibles ahora.</p>";
}

function renderNews(candidate) {
  const items = candidate.news || [];
  document.getElementById("news-impact").innerHTML = `
    <p><strong>${candidate.ticker || "-"}</strong>: score noticias ${candidate.news_score || 0}.</p>
    ${items.map((item) => `<p><strong>${item.sentiment || "NEUTRAL"}</strong>: ${item.title || ""}</p>`).join("") || "<p>No hay titulares claros ahora.</p>"}
  `;
}

function renderWebAlert(candidate) {
  const alertBox = document.getElementById("web-alert");
  const text = `${candidate.ticker || "ORB"}: ${candidate.action || "ESPERAR"}. Entrada ${money(candidate.suggested_entry)}, venta ${money(candidate.suggested_sell)}, stop ${money(candidate.suggested_stop)}.`;
  if ((candidate.status || "").includes("RUPTURA")) {
    alertBox.className = "web-alert active";
    alertBox.textContent = text;
    maybeNotify("MyActions ORB", text);
    return;
  }
  alertBox.className = "web-alert muted";
  alertBox.textContent = text;
}

async function calculateOrb(event) {
  event.preventDefault();
  const params = new URLSearchParams({
    ticker: document.getElementById("orb-ticker").value,
    opening_high: document.getElementById("orb-high").value,
    opening_low: document.getElementById("orb-low").value,
    entry_price: document.getElementById("orb-entry").value,
    wins_today: document.getElementById("orb-wins").value || "0",
    losses_today: document.getElementById("orb-losses").value || "0",
  });
  const result = await fetchOptional(`/orb/calculate?${params.toString()}`, { error: "No se pudo calcular ORB." });
  renderOrbResult(result);
}

function renderOrbResult(result) {
  const box = document.getElementById("orb-result");
  if (result.error || result.detail) {
    box.innerHTML = `<p class="danger-text">${result.error || result.detail}</p>`;
    return;
  }
  if (!result.allowed && result.direction === "SIN ROMPIMIENTO") {
    box.innerHTML = `<p class="danger-text">${result.reason}</p>`;
    return;
  }
  box.innerHTML = `
    <table>
      <tr><th>Campo</th><th>Resultado</th></tr>
      <tr><td>Direccion</td><td><strong>${result.direction}</strong></td></tr>
      <tr><td>Entrada</td><td>${money(result.entry_price)}</td></tr>
      <tr><td>Stop Loss</td><td>${money(result.stop_loss)}</td></tr>
      <tr><td>Take Profit</td><td>${money(result.take_profit)}</td></tr>
      <tr><td>Acciones exactas</td><td>${result.exact_shares}</td></tr>
      <tr><td>Poder de compra</td><td>${money(result.buying_power_used)} / ${money(result.buying_power_limit)}</td></tr>
      <tr><td>Perdida esperada</td><td>${money(result.expected_loss)}</td></tr>
      <tr><td>Ganancia esperada</td><td>${money(result.expected_profit)}</td></tr>
      <tr><td>Estado diario</td><td>${result.daily_control.message}</td></tr>
    </table>
    <p><strong>${result.status}</strong></p>
  `;
}

function hydrateOpeningRange(session) {
  if (!session.opening_range) return;
  document.getElementById("orb-high").value = session.opening_range.high;
  document.getElementById("orb-low").value = session.opening_range.low;
}

function hydrateSuggestedEntry(candidate) {
  if (candidate.suggested_entry) {
    document.getElementById("orb-entry").value = candidate.suggested_entry;
  }
}

function selectTicker(ticker) {
  document.getElementById("orb-ticker").value = ticker;
  loadDashboard();
}

async function requestBrowserNotifications() {
  const alertBox = document.getElementById("web-alert");
  if (!("Notification" in window)) {
    alertBox.className = "web-alert muted";
    alertBox.textContent = "Este navegador no soporta notificaciones. Las alertas quedan visibles dentro de la web.";
    return;
  }
  if (Notification.permission === "denied") {
    alertBox.className = "web-alert error";
    alertBox.textContent =
      "Permiso bloqueado. En Chrome movil abre candado del sitio > Permisos > Notificaciones > Permitir.";
    return;
  }
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    alertBox.className = "web-alert active";
    alertBox.textContent = "Alertas web activadas en este navegador.";
  } else {
    alertBox.className = "web-alert muted";
    alertBox.textContent = "Permiso no concedido. Las alertas seguiran visibles dentro del dashboard.";
  }
}

function maybeNotify(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  const key = `${title}:${body}`;
  if (sessionStorage.getItem("lastNotification") === key) return;
  sessionStorage.setItem("lastNotification", key);
  new Notification(title, { body });
}

function setLoadingState() {
  document.getElementById("signal").textContent = "Cargando...";
  document.getElementById("web-alert").className = "web-alert muted";
  document.getElementById("web-alert").textContent = "Actualizando ORB, noticias y candidatos...";
}

function readJsonStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeJsonStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function dailyRecords() {
  return readJsonStore(DAILY_KEY, {});
}

function saveDailyRecord(event) {
  event.preventDefault();
  const balance = Number(document.getElementById("daily-balance").value || 0);
  const target = Number(document.getElementById("daily-target").value || 0);
  const targetType = document.getElementById("daily-target-type").value;
  const records = dailyRecords();
  records[todayKey()] = { balance, target, targetType, savedAt: new Date().toISOString() };
  writeJsonStore(DAILY_KEY, records);
  renderDailySummary();
}

function renderDailySummary() {
  const record = dailyRecords()[todayKey()];
  const box = document.getElementById("daily-summary");
  if (!record) {
    box.innerHTML = isAfterClose()
      ? '<strong>Falta guardar el saldo de cierre de hoy.</strong>'
      : "Registra tu saldo y meta para que la perdida limite salga automatica.";
    return;
  }
  document.getElementById("daily-balance").value = record.balance || "";
  document.getElementById("daily-target").value = record.target || "";
  document.getElementById("daily-target-type").value = record.targetType || "money";
  const targetProfit = record.targetType === "percent" ? record.balance * (record.target / 100) : record.target;
  const maxLoss = targetProfit / 2;
  const targetPct = record.balance ? (targetProfit / record.balance) * 100 : 0;
  box.innerHTML = `
    <p><strong>Saldo:</strong> ${money(record.balance)} | <strong>Meta:</strong> ${money(targetProfit)} (${targetPct.toFixed(2)}%).</p>
    <p><strong>Perdida maxima automatica:</strong> ${money(maxLoss)}. Si se alcanza, cerrar el dia.</p>
  `;
}

function isAfterClose() {
  const now = new Date();
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "2-digit", hour12: false }).format(now));
  return hour >= 16;
}

function portfolioItems() {
  return readJsonStore("myactions_portfolio", []);
}

function watchlistItems() {
  return readJsonStore("myactions_watchlist", ["NVDA", "AMD", "AAPL", "SPY"]);
}

function addPortfolioItem(event) {
  event.preventDefault();
  const symbol = document.getElementById("portfolio-symbol").value.trim().toUpperCase();
  if (!symbol) return;
  const shares = Number(document.getElementById("portfolio-shares").value || 0);
  const average = Number(document.getElementById("portfolio-average").value || 0);
  const items = portfolioItems().filter((item) => item.symbol !== symbol);
  items.push({ symbol, shares, average });
  writeJsonStore("myactions_portfolio", items);
  event.target.reset();
  renderPortfolioState();
}

function addWatchlistItem(event) {
  event.preventDefault();
  const symbol = document.getElementById("watchlist-symbol").value.trim().toUpperCase();
  if (!symbol) return;
  const items = Array.from(new Set([...watchlistItems(), symbol]));
  writeJsonStore("myactions_watchlist", items);
  event.target.reset();
  renderPortfolioState();
}

function removePortfolioItem(symbol) {
  writeJsonStore("myactions_portfolio", portfolioItems().filter((item) => item.symbol !== symbol));
  renderPortfolioState();
}

function removeWatchlistItem(symbol) {
  writeJsonStore("myactions_watchlist", watchlistItems().filter((item) => item !== symbol));
  renderPortfolioState();
}

function renderPortfolioState() {
  document.getElementById("portfolio-list").innerHTML = portfolioItems()
    .map((item) => `
      <div class="pill-row">
        <span><strong>${item.symbol}</strong> ${item.shares || 0} acc. @ ${money(item.average || 0)}</span>
        <button type="button" onclick="removePortfolioItem('${item.symbol}')">Quitar</button>
      </div>
    `)
    .join("");
  document.getElementById("watchlist-list").innerHTML = watchlistItems()
    .map((symbol) => `
      <div class="pill-row">
        <span><strong>${symbol}</strong></span>
        <button type="button" onclick="removeWatchlistItem('${symbol}')">Quitar</button>
      </div>
    `)
    .join("");
}

function isMarketWindow() {
  const now = new Date();
  const day = now.getDay();
  if (day === 0 || day === 6) return false;
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", hour: "2-digit", hour12: false }).format(now));
  const minute = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", minute: "2-digit" }).format(now));
  const total = hour * 60 + minute;
  return total >= 8 * 60 + 30 && total <= 15 * 60;
}

function refreshIntervalMs() {
  return isMarketWindow() ? 5 * 60 * 1000 : 60 * 60 * 1000;
}

function refreshLabel() {
  return isMarketWindow() ? "5 min" : "1 hora";
}

function scheduleAutoRefresh() {
  window.setTimeout(async () => {
    await loadDashboard();
    scheduleAutoRefresh();
  }, refreshIntervalMs());
}

function renderOrbChart(session) {
  const rows = session.bars || [];
  if (!rows.length) return;
  const chart = document.getElementById("orb-chart");
  chart.innerHTML = "";
  const width = Math.max(chart.clientWidth, 320);
  const height = 460;
  const padding = { top: 30, right: 24, bottom: 42, left: 58 };
  const lows = rows.map((row) => Number(row.low));
  const highs = rows.map((row) => Number(row.high));
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const span = max - min || 1;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const candleWidth = Math.max(3, (plotWidth / rows.length) * 0.55);
  const y = (price) => padding.top + (1 - (price - min) / span) * plotHeight;
  const x = (index) => padding.left + (index / Math.max(rows.length - 1, 1)) * plotWidth;
  const candles = rows.map((row, index) => {
    const cx = x(index);
    const open = Number(row.open);
    const close = Number(row.close);
    const high = Number(row.high);
    const low = Number(row.low);
    const color = close >= open ? "#178a4c" : "#c62828";
    const bodyTop = Math.min(y(open), y(close));
    const bodyHeight = Math.max(Math.abs(y(open) - y(close)), 2);
    return `
      <line x1="${cx}" y1="${y(high)}" x2="${cx}" y2="${y(low)}" stroke="${color}" stroke-width="1.3"></line>
      <rect x="${cx - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" fill="${color}" opacity="0.85"></rect>
    `;
  }).join("");
  const range = session.opening_range;
  const rangeLines = range ? `
    <line x1="${padding.left}" y1="${y(range.high)}" x2="${width - padding.right}" y2="${y(range.high)}" stroke="#1f5eff" stroke-width="1.5" stroke-dasharray="6 4"></line>
    <line x1="${padding.left}" y1="${y(range.low)}" x2="${width - padding.right}" y2="${y(range.low)}" stroke="#7a3cff" stroke-width="1.5" stroke-dasharray="6 4"></line>
    <text x="${padding.left}" y="${y(range.high) - 6}" fill="#1f5eff" font-size="12">Max ORB ${range.high}</text>
    <text x="${padding.left}" y="${y(range.low) + 16}" fill="#7a3cff" font-size="12">Min ORB ${range.low}</text>
  ` : "";

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Grafico ORB 5 minutos">
      <rect x="0" y="0" width="${width}" height="${height}" fill="white"></rect>
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#dce3ea"></line>
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#dce3ea"></line>
      ${rangeLines}
      ${candles}
      <text x="${padding.left}" y="20" fill="#596878" font-size="13">${session.ticker} ORB 5m intradia</text>
      <text x="${padding.left}" y="${height - 12}" fill="#596878" font-size="12">${rows[0].time}</text>
      <text x="${width - padding.right - 170}" y="${height - 12}" fill="#596878" font-size="12">${rows[rows.length - 1].time}</text>
    </svg>
  `;
}

document.getElementById("refresh").addEventListener("click", loadDashboard);
document.getElementById("enable-notifications").addEventListener("click", requestBrowserNotifications);
document.getElementById("portfolio-form").addEventListener("submit", addPortfolioItem);
document.getElementById("watchlist-form").addEventListener("submit", addWatchlistItem);
document.getElementById("daily-form").addEventListener("submit", saveDailyRecord);
document.getElementById("orb-form").addEventListener("submit", calculateOrb);
document.getElementById("load-orb-session").addEventListener("click", loadDashboard);
document.getElementById("orb-ticker").addEventListener("change", loadDashboard);

loadDashboard().catch((error) => {
  document.getElementById("signal").textContent = "Error";
  document.getElementById("web-alert").className = "web-alert error";
  document.getElementById("web-alert").textContent = "No se pudo cargar ORB. Revisa conexion e intenta Actualizar.";
  console.error(error);
});
scheduleAutoRefresh();
