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
  Plotly.newPlot(
    "chart",
    [
      {
        type: "candlestick",
        x: rows.map((row) => row.date),
        open: rows.map((row) => row.open),
        high: rows.map((row) => row.high),
        low: rows.map((row) => row.low),
        close: rows.map((row) => row.close),
        name: "TSM",
      },
    ],
    {
      margin: { l: 42, r: 20, t: 24, b: 36 },
      paper_bgcolor: "white",
      plot_bgcolor: "white",
      xaxis: { rangeslider: { visible: false } },
      yaxis: { title: "Precio" },
    },
    { responsive: true, displayModeBar: false },
  );
}

document.getElementById("refresh").addEventListener("click", loadDashboard);
loadDashboard().catch((error) => {
  document.getElementById("signal").textContent = "Error";
  console.error(error);
});
