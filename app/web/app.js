async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function money(value) {
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

async function loadDashboard() {
  const [prediction, history, backtesting, alertEvaluation, news, opportunities, dividends] = await Promise.all([
    fetchJson("/predict"),
    fetchJson("/history?limit=260"),
    fetchJson("/backtesting"),
    fetchJson("/alerts/evaluate"),
    fetchJson("/intelligence/news"),
    fetchJson("/intelligence/opportunities"),
    fetchJson("/intelligence/dividends"),
  ]);
  const intraday = await fetchJson("/alerts/intraday");

  document.getElementById("signal").textContent = prediction.senal;
  document.getElementById("price").textContent = money(prediction.precio_actual);
  document.getElementById("confidence").textContent = `${prediction.confianza}%`;
  document.getElementById("risk").textContent = prediction.riesgo;
  document.getElementById("model").textContent = prediction.modelo;
  document.getElementById("explanation").innerHTML = prediction.explicacion
    .map((item) => `<li>${item}</li>`)
    .join("");
  document.getElementById("risk-plan").textContent =
    `Objetivo ${money(prediction.precio_objetivo)}, stop ${money(prediction.stop_loss)}, ` +
    `take profit ${money(prediction.take_profit)}, relacion ${prediction.riesgo_beneficio}.`;
  document.getElementById("backtesting").innerHTML = backtesting.strategies
    .map((item) => `<p><strong>${item.strategy}</strong>: ${money(item.final_capital)} (${(item.total_return * 100).toFixed(2)}%)</p>`)
    .join("");
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
  `;
  document.getElementById("opportunities").innerHTML = opportunities.assets
    .slice(0, 4)
    .map((item) => `<p><strong>${item.asset_type}</strong> ${item.symbol}: ${item.action} (${item.score})</p>`)
    .join("");
  document.getElementById("dividends").innerHTML = `
    <p>Yield estimado: <strong>${dividends.estimated_yield_pct}%</strong></p>
    <p>Dividendo anual estimado: ${money(dividends.estimated_annual_dividend)}</p>
    <p><a href="${dividends.official_source}" target="_blank" rel="noreferrer">Fuente oficial TSMC</a></p>
  `;
  renderWebAlert(alertEvaluation, intraday);

  const rows = history.data;
  renderChart(rows);
}

document.getElementById("refresh").addEventListener("click", loadDashboard);
document.getElementById("enable-notifications").addEventListener("click", requestBrowserNotifications);
loadDashboard().catch((error) => {
  document.getElementById("signal").textContent = "Error";
  document.getElementById("chart-fallback").textContent = "No se pudieron cargar los datos.";
  console.error(error);
});

async function requestBrowserNotifications() {
  if (!("Notification" in window)) {
    document.getElementById("web-alert").textContent = "Este navegador no soporta notificaciones.";
    return;
  }
  const permission = await Notification.requestPermission();
  document.getElementById("web-alert").textContent =
    permission === "granted" ? "Alertas web activadas en este navegador." : "Permiso de alertas web no concedido.";
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

function renderChart(rows) {
  const chart = document.getElementById("chart");
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
      <text x="${padding.left}" y="20" fill="#596878" font-size="13">TSM 260 sesiones</text>
      <text x="${padding.left}" y="${height - 10}" fill="#596878" font-size="12">${rows[0].date}</text>
      <text x="${width - padding.right - 86}" y="${height - 10}" fill="#596878" font-size="12">${rows[rows.length - 1].date}</text>
      <text x="${width - padding.right - 90}" y="24" fill="${stroke}" font-size="14" font-weight="700">${money(last)}</text>
    </svg>
  `;
}
