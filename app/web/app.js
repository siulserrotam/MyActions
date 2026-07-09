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
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

async function loadDashboard() {
  setLoadingState();
  renderPortfolioState();
  const symbols = combinedSymbols();
  const orbTicker = document.getElementById("orb-ticker").value;
  const prediction = await fetchJson("/predict");
  const [history, backtesting, alertEvaluation, intraday, activePlan, news, orbNews, opportunities, dividends, orbSession] = await Promise.all([
    fetchOptional("/history?limit=66", { data: [] }),
    fetchOptional("/backtesting", { strategies: [] }),
    fetchOptional("/alerts/evaluate", { should_alert: false }),
    fetchOptional("/alerts/intraday", { should_alert: false, direction: "SIN DATOS", change_pct: 0, trend: "SIN DATOS", open_price: 0, current_price: 0, projected_close_pct: 0 }),
    fetchOptional("/plan/active-trading", { decision: "Sin plan", buy_zone: "-", sell_zone: "-", reentry_zone: "-", holding_rule: "-", explanation: [] }),
    fetchOptional("/intelligence/news", { path: "Sin datos de noticias", news_score: 0, combined_score: 0, summary: "No se pudieron cargar noticias." }),
    fetchOptional(`/intelligence/news?ticker=${encodeURIComponent(orbTicker)}`, { path: "Sin noticias", news: [], summary: "Sin noticias ORB disponibles." }),
    fetchOptional(`/intelligence/opportunities${symbols ? `?symbols=${encodeURIComponent(symbols)}` : ""}`, { assets: [], cheap_candidates: [] }),
    fetchOptional("/intelligence/dividends", { estimated_yield_pct: 0, estimated_annual_dividend: 0, official_source: "https://investor.tsmc.com/english/latest-dividend" }),
    fetchOptional(`/orb/session?ticker=${encodeURIComponent(orbTicker)}`, { bars: [], opening_range: null }),
  ]);

  document.getElementById("signal").textContent = prediction.senal;
  document.getElementById("price").textContent = money(prediction.precio_actual);
  document.getElementById("confidence").textContent = `${prediction.confianza}%`;
  document.getElementById("risk").textContent = prediction.riesgo;
  document.getElementById("model").textContent = prediction.modelo;
  document.getElementById("refresh-status").textContent = refreshLabel();
  document.getElementById("explanation").innerHTML = prediction.explicacion
    .map((item) => `<li>${item}</li>`)
    .join("");
  document.getElementById("active-plan").innerHTML = `
    <p><strong>${activePlan.decision}</strong></p>
    <p><strong>Comprar barato:</strong> ${activePlan.buy_zone}</p>
    <p><strong>Vender:</strong> ${activePlan.sell_zone}</p>
    <p><strong>Recomprar:</strong> ${activePlan.reentry_zone}</p>
    <p><strong>Regla:</strong> ${activePlan.holding_rule}</p>
  `;
  document.getElementById("risk-plan").textContent =
    `Objetivo ${money(prediction.precio_objetivo)}, stop ${money(prediction.stop_loss)}, ` +
    `take profit ${money(prediction.take_profit)}, relacion ${prediction.riesgo_beneficio}.`;
  document.getElementById("backtesting").innerHTML = backtesting.strategies
    .map((item) => `<p><strong>${item.strategy}</strong>: ${money(item.final_capital)} (${(item.total_return * 100).toFixed(2)}%)</p>`)
    .join("") || "<p>No se pudo cargar backtesting.</p>";
  document.getElementById("intraday-alert").innerHTML = `
    <p><strong>${intraday.direction}</strong>: ${intraday.change_pct}% vs apertura.</p>
    <p>Tendencia: <strong>${intraday.trend}</strong></p>
    <p>Apertura ${money(intraday.open_price)} / actual ${money(intraday.current_price)}</p>
    <p>Proyeccion cierre: ${intraday.projected_close_pct}%</p>
  `;
  document.getElementById("news-intelligence").innerHTML = `
    <p><strong>${news.path}</strong></p>
    <p>Noticias: ${news.news_score} / Score: ${news.combined_score}</p>
    <p>${news.summary}</p>
    ${(news.news || []).slice(0, 3).map((item) => `<p><strong>${item.sentiment}</strong>: ${item.title}</p>`).join("")}
  `;
  document.getElementById("orb-news").innerHTML = `
    <p><strong>${orbTicker}</strong>: ${orbNews.summary}</p>
    ${(orbNews.news || []).slice(0, 4).map((item) => `<p><strong>${item.sentiment}</strong>: ${item.title}</p>`).join("") || "<p>No hay titulares claros ahora.</p>"}
  `;
  document.getElementById("opportunities").innerHTML = opportunities.assets
    .slice(0, 4)
    .map((item) => `<p><strong>${item.symbol}</strong>: ${item.action} (${item.score})<br><span>${item.return_30d_pct}% 30d / ${item.drawdown_pct}% desde max.</span></p>`)
    .join("") || "<p>No se pudieron cargar oportunidades.</p>";
  document.getElementById("cheap-opportunities").innerHTML = opportunities.cheap_candidates
    .slice(0, 5)
    .map((item) => `
      <p>
        <strong>${item.symbol}</strong>: ${item.cheap_action} (${item.cheap_rebound_score})<br>
        Comprar: ${item.buy_zone}<br>
        Vender: ${item.sell_zone}<br>
        <span>${(item.why || []).slice(0, 2).join(" ")}</span>
      </p>
    `)
    .join("") || "<p>No hay candidata barata clara. Mejor esperar.</p>";
  document.getElementById("dividends").innerHTML = `
    <p>Yield estimado: <strong>${dividends.estimated_yield_pct}%</strong></p>
    <p>Dividendo anual estimado: ${money(dividends.estimated_annual_dividend)}</p>
    <p><a href="${dividends.official_source}" target="_blank" rel="noreferrer">Fuente oficial TSMC</a></p>
  `;
  renderWebAlert(alertEvaluation, intraday);

  if (orbSession.bars.length) {
    renderOrbChart(orbSession);
    hydrateOpeningRange(orbSession);
  } else if (history.data.length) {
    renderLineChart(history.data);
  } else {
    document.getElementById("orb-chart").innerHTML = '<div class="chart-fallback">No se pudieron cargar los datos del grafico.</div>';
  }
}

document.getElementById("refresh").addEventListener("click", loadDashboard);
document.getElementById("enable-notifications").addEventListener("click", requestBrowserNotifications);
document.getElementById("portfolio-form").addEventListener("submit", addPortfolioItem);
document.getElementById("watchlist-form").addEventListener("submit", addWatchlistItem);
document.getElementById("orb-form").addEventListener("submit", calculateOrb);
document.getElementById("load-orb-session").addEventListener("click", loadDashboard);
document.getElementById("orb-ticker").addEventListener("change", loadDashboard);
loadDashboard().catch((error) => {
  document.getElementById("signal").textContent = "Error";
  document.getElementById("web-alert").className = "web-alert error";
  document.getElementById("web-alert").textContent =
    "No se pudo cargar la senal principal. Revisa conexion e intenta Actualizar.";
  const fallback = document.getElementById("chart-fallback");
  if (fallback) fallback.textContent = "No se pudieron cargar los datos.";
  console.error(error);
});

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
      "Permiso bloqueado. En Chrome movil abre el candado del sitio > Permisos > Notificaciones > Permitir.";
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

function renderWebAlert(alertEvaluation, intraday) {
  const alertBox = document.getElementById("web-alert");
  const messages = [];
  if (alertEvaluation.should_alert) {
    messages.push(`${alertEvaluation.signal}: ${alertEvaluation.confidence}% de confianza.`);
  }
  if (intraday.should_alert) {
    messages.push(`${intraday.direction}: ${intraday.change_pct}% vs apertura.`);
  }
  if (!messages.length) {
    alertBox.className = "web-alert muted";
    alertBox.textContent = "Sin alertas activas. La API sigue monitoreando TSM.";
    return;
  }
  alertBox.className = "web-alert active";
  alertBox.textContent = messages.join(" ");
  maybeNotify("MyActions alerta TSM", messages.join("\n"));
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
  document.getElementById("web-alert").textContent = "Actualizando datos...";
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

function portfolioItems() {
  return readJsonStore("myactions_portfolio", [{ symbol: "TSM", shares: 0, average: 0 }]);
}

function watchlistItems() {
  return readJsonStore("myactions_watchlist", ["NVDA", "AMD", "ASML", "QQQ"]);
}

function combinedSymbols() {
  const symbols = new Set(["TSM"]);
  portfolioItems().forEach((item) => symbols.add(item.symbol));
  watchlistItems().forEach((symbol) => symbols.add(symbol));
  return Array.from(symbols).filter(Boolean).join(",");
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
  loadDashboard();
}

function addWatchlistItem(event) {
  event.preventDefault();
  const symbol = document.getElementById("watchlist-symbol").value.trim().toUpperCase();
  if (!symbol) return;
  const items = Array.from(new Set([...watchlistItems(), symbol]));
  writeJsonStore("myactions_watchlist", items);
  event.target.reset();
  loadDashboard();
}

function removePortfolioItem(symbol) {
  writeJsonStore("myactions_portfolio", portfolioItems().filter((item) => item.symbol !== symbol));
  loadDashboard();
}

function removeWatchlistItem(symbol) {
  writeJsonStore("myactions_watchlist", watchlistItems().filter((item) => item !== symbol));
  loadDashboard();
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
  const bogotaHour = Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Bogota",
      hour: "2-digit",
      hour12: false,
    }).format(now)
  );
  return bogotaHour >= 8 && bogotaHour < 16;
}

function refreshIntervalMs() {
  return isMarketWindow() ? 15 * 60 * 1000 : 60 * 60 * 1000;
}

function refreshLabel() {
  return isMarketWindow() ? "15 min" : "1 hora";
}

function scheduleAutoRefresh() {
  window.setTimeout(async () => {
    await loadDashboard();
    scheduleAutoRefresh();
  }, refreshIntervalMs());
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
      <tr><td>Stop Loss</td><td>${money(result.stop_loss)}</td></tr>
      <tr><td>Take Profit</td><td>${money(result.take_profit)}</td></tr>
      <tr><td>Acciones exactas</td><td>${result.exact_shares}</td></tr>
      <tr><td>Acciones enteras</td><td>${result.whole_shares}</td></tr>
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
  const high = document.getElementById("orb-high");
  const low = document.getElementById("orb-low");
  if (!high.value) high.value = session.opening_range.high;
  if (!low.value) low.value = session.opening_range.low;
}

function renderOrbChart(session) {
  const rows = session.bars;
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
  const candleWidth = Math.max(3, plotWidth / rows.length * 0.55);
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
    <text x="${padding.left}" y="${y(range.high) - 6}" fill="#1f5eff" font-size="12">ORB High ${range.high}</text>
    <text x="${padding.left}" y="${y(range.low) + 16}" fill="#7a3cff" font-size="12">ORB Low ${range.low}</text>
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

function renderLineChart(rows) {
  if (!rows.length) return;
  const chart = document.getElementById("orb-chart");
  chart.innerHTML = "";

  const width = Math.max(chart.clientWidth, 320);
  const height = 440;
  const padding = { top: 24, right: 24, bottom: 34, left: 54 };
  const closes = rows.map((row) => Number(row.close));
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const points = closes.map((close, index) => {
    const x = padding.left + (index / Math.max(closes.length - 1, 1)) * plotWidth;
    const y = padding.top + (1 - (close - min) / span) * plotHeight;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = closes[closes.length - 1];
  const first = closes[0];
  const stroke = last >= first ? "#178a4c" : "#c62828";

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" role="img" aria-label="Grafico de precio TSM">
      <rect x="0" y="0" width="${width}" height="${height}" fill="white"></rect>
      <line x1="${padding.left}" y1="${padding.top}" x2="${padding.left}" y2="${height - padding.bottom}" stroke="#dce3ea"></line>
      <line x1="${padding.left}" y1="${height - padding.bottom}" x2="${width - padding.right}" y2="${height - padding.bottom}" stroke="#dce3ea"></line>
      <polyline points="${points.join(" ")}" fill="none" stroke="${stroke}" stroke-width="2.5"></polyline>
      <text x="${padding.left}" y="20" fill="#596878" font-size="13">TSM ultimos 3 meses</text>
      <text x="${padding.left}" y="${height - 10}" fill="#596878" font-size="12">${rows[0].date}</text>
      <text x="${width - padding.right - 86}" y="${height - 10}" fill="#596878" font-size="12">${rows[rows.length - 1].date}</text>
      <text x="${width - padding.right - 90}" y="24" fill="${stroke}" font-size="14" font-weight="700">${money(last)}</text>
    </svg>
  `;
}

scheduleAutoRefresh();
