async function fetchJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function money(value) {
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

async function loadDashboard() {
  const [prediction, history, backtesting] = await Promise.all([
    fetchJson("/predict"),
    fetchJson("/history?limit=260"),
    fetchJson("/backtesting"),
  ]);

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

  const rows = history.data;
  renderChart(rows);
}

document.getElementById("refresh").addEventListener("click", loadDashboard);
loadDashboard().catch((error) => {
  document.getElementById("signal").textContent = "Error";
  document.getElementById("chart-fallback").textContent = "No se pudieron cargar los datos.";
  console.error(error);
});

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
