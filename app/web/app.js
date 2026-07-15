const assetGroups = {
  favorites: [
    { symbol: "TSM.US", name: "Taiwan Semiconductor CFD", category: "stocks", multiplier: 1 },
    { symbol: "NVDA.US", name: "NVIDIA CFD", category: "stocks", multiplier: 1 },
    { symbol: "US100", name: "Nasdaq 100 CFD", category: "indices", multiplier: 1 },
    { symbol: "GOLD", name: "Gold CFD", category: "commodities", multiplier: 100 },
    { symbol: "BTCUSD", name: "Bitcoin CFD", category: "crypto", multiplier: 1 },
  ],
  forex: [
    { symbol: "EURUSD", name: "Euro / US Dollar", category: "forex", multiplier: 100000 },
    { symbol: "GBPUSD", name: "British Pound / US Dollar", category: "forex", multiplier: 100000 },
    { symbol: "USDJPY", name: "US Dollar / Yen", category: "forex", multiplier: 100000 },
  ],
  indices: [
    { symbol: "US100", name: "Nasdaq 100 CFD", category: "indices", multiplier: 1 },
    { symbol: "US500", name: "S&P 500 CFD", category: "indices", multiplier: 1 },
    { symbol: "DE40", name: "DAX 40 CFD", category: "indices", multiplier: 1 },
  ],
  commodities: [
    { symbol: "GOLD", name: "Gold CFD", category: "commodities", multiplier: 100 },
    { symbol: "OIL", name: "Oil CFD", category: "commodities", multiplier: 1000 },
    { symbol: "NATGAS", name: "Natural Gas CFD", category: "commodities", multiplier: 10000 },
  ],
  crypto: [
    { symbol: "BTCUSD", name: "Bitcoin CFD", category: "crypto", multiplier: 1 },
    { symbol: "ETHUSD", name: "Ethereum CFD", category: "crypto", multiplier: 1 },
  ],
  stocks: [
    { symbol: "TSM.US", name: "Taiwan Semiconductor CFD", category: "stocks", multiplier: 1 },
    { symbol: "NVDA.US", name: "NVIDIA CFD", category: "stocks", multiplier: 1 },
    { symbol: "AMD.US", name: "AMD CFD", category: "stocks", multiplier: 1 },
    { symbol: "AAPL.US", name: "Apple CFD", category: "stocks", multiplier: 1 },
    { symbol: "SPY.US", name: "SPY ETF CFD", category: "stocks", multiplier: 1 },
  ],
};

const categoryLabels = {
  favorites: "Favoritos",
  forex: "Divisas / Forex",
  indices: "Indices",
  commodities: "Materias Primas",
  crypto: "Criptomonedas",
  stocks: "Acciones / ETFs CFD",
};

let activeCategory = "favorites";
let selectedAsset = getFavoriteAssets()[0] || assetGroups.stocks[0];
let lastResult = null;
let notificationsEnabled = false;
let postbackTimer = null;

function favoriteSymbols() {
  try {
    return JSON.parse(localStorage.getItem("decision_engine_favorites") || "null") || ["TSM.US", "NVDA.US", "US100", "GOLD", "BTCUSD"];
  } catch {
    return ["TSM.US", "NVDA.US", "US100", "GOLD", "BTCUSD"];
  }
}

function setFavoriteSymbols(symbols) {
  localStorage.setItem("decision_engine_favorites", JSON.stringify(Array.from(new Set(symbols))));
}

function getFavoriteAssets() {
  return favoriteSymbols().map(findAsset);
}

function money(value) {
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function numberText(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function allAssets() {
  return Object.entries(assetGroups)
    .filter(([category]) => category !== "favorites")
    .flatMap(([, assets]) => assets);
}

function uniqueAssets() {
  const seen = new Set();
  return allAssets().filter((asset) => {
    if (seen.has(asset.symbol)) return false;
    seen.add(asset.symbol);
    return true;
  });
}

function findAsset(symbol) {
  return uniqueAssets().find((asset) => asset.symbol === symbol.toUpperCase()) || {
    symbol: symbol.toUpperCase(),
    name: `${symbol.toUpperCase()} CFD`,
    category: symbol.toUpperCase().endsWith(".US") ? "stocks" : "indices",
    multiplier: 1,
  };
}

function updateGoldenWindow() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const hour = Number(parts.hour);
  const minute = Number(parts.minute);
  const second = Number(parts.second);
  const total = hour * 60 + minute + second / 60;
  document.getElementById("co-clock").textContent = `${parts.hour}:${parts.minute}:${parts.second}`;

  const widget = document.getElementById("golden-window");
  widget.className = "mt-4 rounded-xl border p-3 text-sm font-bold transition-all";
  if (total >= 9 * 60 && total < 9 * 60 + 30) {
    widget.classList.add("border-gold/50", "bg-gold/10", "text-gold");
    widget.textContent = "Esperando apertura del mercado...";
  } else if (total >= 9 * 60 + 30 && total < 9 * 60 + 35) {
    widget.classList.add("blink", "border-orange-400/60", "bg-orange-500/10", "text-orange-300");
    widget.textContent = "Esperando cierre del Rango de 5 Minutos (ORB)...";
  } else if (total >= 9 * 60 + 35 && total < 9 * 60 + 45) {
    widget.classList.add("border-bull/70", "bg-bull/15", "text-bull", "shadow-lg", "shadow-bull/20");
    widget.textContent = "VENTANA DE ORO: Toma la decision del dia y programa tus ordenes ahora.";
  } else {
    widget.classList.add("border-white/10", "bg-panel2", "text-zinc-400");
    widget.textContent = "Fuera de la ventana operativa principal.";
  }
}

function renderTabs() {
  assetGroups.favorites = getFavoriteAssets();
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === activeCategory);
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      selectedAsset = assetGroups[activeCategory][0] || selectedAsset;
      document.getElementById("symbol").value = selectedAsset.symbol;
      renderTabs();
      renderAssets();
      calculate();
    }, { once: true });
  });
}

function renderAssets() {
  assetGroups.favorites = getFavoriteAssets();
  const activeAssets = assetGroups[activeCategory] || [];
  document.getElementById("category-copy").textContent =
    `${categoryLabels[activeCategory]}: multiplicadores aplicados automaticamente.`;
  document.getElementById("asset-grid").innerHTML = activeAssets.map((asset) => `
    <button type="button" class="asset-card ${asset.symbol === selectedAsset.symbol ? "selected" : ""}" data-symbol="${asset.symbol}">
      <span class="text-base font-black">${asset.symbol}</span>
      <span class="text-xs text-zinc-400">${asset.name}</span>
      <span class="mt-2 text-xs font-bold text-zinc-500">Multiplicador x${numberText(asset.multiplier)}</span>
    </button>
  `).join("");
  document.querySelectorAll(".asset-card").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAsset = findAsset(button.dataset.symbol);
      document.getElementById("symbol").value = selectedAsset.symbol;
      renderAssets();
      calculate();
    });
  });
  renderFavoriteButton();
  renderBestDecisionNote();
}

function renderFavoriteButton() {
  const button = document.getElementById("toggle-favorite-btn");
  const isFavorite = favoriteSymbols().includes(selectedAsset.symbol);
  button.textContent = isFavorite ? "Quitar favorito" : "Agregar favorito";
  button.className = isFavorite
    ? "rounded-xl border border-bear/40 px-4 py-3 text-sm font-black text-bear"
    : "rounded-xl border border-bull/40 px-4 py-3 text-sm font-black text-bull";
}

function toggleFavorite() {
  const symbols = favoriteSymbols();
  const exists = symbols.includes(selectedAsset.symbol);
  setFavoriteSymbols(exists ? symbols.filter((symbol) => symbol !== selectedAsset.symbol) : [...symbols, selectedAsset.symbol]);
  renderTabs();
  renderAssets();
}

function renderBestDecisionNote() {
  document.getElementById("best-decision-note").textContent =
    "Modo manual seguro: eliges activo y precios. La app calcula el volumen exacto y el ticket para XTB; no se conecta a tu cuenta.";
}

async function calculate() {
  const symbol = document.getElementById("symbol").value.trim().toUpperCase();
  selectedAsset = findAsset(symbol);
  const payload = {
    symbol,
    direction: document.getElementById("direction").value,
    account_balance: Number(document.getElementById("account-balance").value || 0),
    risk_pct: Number(document.getElementById("risk-pct").value || 0),
    entry_price: Number(document.getElementById("entry-price").value || 0),
    stop_price: Number(document.getElementById("stop-price").value || 0),
    take_profit_price: Number(document.getElementById("take-profit-price").value || 0) || null,
  };
  saveConfigLocal();
  document.getElementById("risk-usd-pill").textContent = money(payload.account_balance * payload.risk_pct / 100);
  try {
    const response = await fetch("/engine/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    lastResult = await response.json();
  } catch (error) {
    console.warn("Usando calculo local", error);
    lastResult = localCalculate(payload);
  }
  renderWarnings();
  renderTicket();
  renderMath();
  notifyIfNeeded();
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function currentConfigPayload() {
  const accountBalance = Number(document.getElementById("account-balance").value || 0);
  const riskPct = Number(document.getElementById("risk-pct").value || 0.8);
  const investedAccumulated = Number(document.getElementById("invested-accumulated").value || 0);
  const monthlyInvested = Number(document.getElementById("monthly-invested").value || 0);
  const gainsAccumulated = Number(document.getElementById("gains-accumulated").value || 0);
  const dailyGains = Number(document.getElementById("daily-gains").value || 0);
  return {
    trade_date: todayKey(),
    balance: accountBalance,
    target_value: Number((accountBalance * riskPct / 100 * 2).toFixed(2)),
    target_type: "money",
    monthly_contribution: monthlyInvested,
    daily_profit: dailyGains,
    invested_accumulated: investedAccumulated,
    monthly_invested: monthlyInvested,
    gains_accumulated: gainsAccumulated,
    daily_gains: dailyGains,
    risk_pct: riskPct,
    notes: "Auto postback Decision Engine XTB",
  };
}

function saveConfigLocal() {
  localStorage.setItem("decision_engine_config", JSON.stringify(currentConfigPayload()));
}

function loadConfigLocal() {
  try {
    const config = JSON.parse(localStorage.getItem("decision_engine_config") || "null");
    if (!config) return;
    if (config.balance) document.getElementById("account-balance").value = config.balance;
    if (config.risk_pct) document.getElementById("risk-pct").value = config.risk_pct;
    if (config.invested_accumulated !== undefined) document.getElementById("invested-accumulated").value = config.invested_accumulated;
    if (config.monthly_invested !== undefined) document.getElementById("monthly-invested").value = config.monthly_invested;
    if (config.gains_accumulated !== undefined) document.getElementById("gains-accumulated").value = config.gains_accumulated;
    if (config.daily_gains !== undefined) document.getElementById("daily-gains").value = config.daily_gains;
  } catch {
    return;
  }
}

function updatePostbackStatus(text, tone = "muted") {
  const box = document.getElementById("postback-status");
  box.textContent = text;
  box.className = "mt-3 rounded-xl border bg-ink p-3 text-xs font-bold";
  if (tone === "ok") box.classList.add("border-bull/40", "text-bull");
  else if (tone === "error") box.classList.add("border-bear/40", "text-bear");
  else box.classList.add("border-white/10", "text-zinc-500");
}

function schedulePostback() {
  saveConfigLocal();
  updatePostbackStatus("Postback: preparando guardado...");
  window.clearTimeout(postbackTimer);
  postbackTimer = window.setTimeout(postbackConfig, 900);
}

async function postbackConfig() {
  const payload = currentConfigPayload();
  if (!payload.balance || payload.balance <= 0) return;
  try {
    const response = await fetch("/capital/daily", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    updatePostbackStatus("Postback: guardado en base de datos.", "ok");
  } catch (error) {
    updatePostbackStatus("Postback: guardado local. Base de datos no disponible.", "error");
  }
}

function localCalculate(payload) {
  const asset = findAsset(payload.symbol);
  const distance = Math.abs(payload.entry_price - payload.stop_price);
  const riskAmount = payload.account_balance * payload.risk_pct / 100;
  const rawVolume = riskAmount / (distance * asset.multiplier);
  const volume = asset.category === "stocks" ? Number(rawVolume.toFixed(4)) : Number(rawVolume.toFixed(3));
  const orderType = payload.direction === "LONG" ? "BUY STOP" : "SELL STOP";
  const takeProfit = payload.take_profit_price ||
    (payload.direction === "LONG" ? payload.entry_price + distance * 2 : payload.entry_price - distance * 2);
  return {
    asset,
    direction: payload.direction,
    order_type: orderType,
    simple_order_explanation: payload.direction === "LONG" ? "Compra si rompe hacia arriba." : "Vende si rompe hacia abajo.",
    entry_price: payload.entry_price,
    stop_loss: payload.stop_price,
    take_profit: takeProfit,
    account_balance: payload.account_balance,
    risk_pct: payload.risk_pct,
    risk_amount: Number(riskAmount.toFixed(2)),
    multiplier: asset.multiplier,
    raw_volume: rawVolume,
    volume,
    expected_loss: Number((distance * asset.multiplier * volume).toFixed(2)),
    expected_profit: Number((Math.abs(takeProfit - payload.entry_price) * asset.multiplier * volume).toFixed(2)),
    risk_reward: "1:2",
    warnings: buildWarnings(asset, payload.direction),
  };
}

function buildWarnings(asset, direction) {
  const warnings = [];
  if (direction === "SHORT") {
    warnings.push({ level: "danger", message: `ATENCION: Esta es una operacion bajista. Abre la pestana ${asset.symbol} [CFD] en XTB. NUNCA uses la pestana de Acciones Reales.` });
  }
  if (asset.category === "forex" || asset.category === "crypto") {
    warnings.push({ level: "info", message: "APALANCAMIENTO ALTO: Verifica el spread en XTB antes de activar." });
  }
  return warnings;
}

function renderWarnings() {
  const box = document.getElementById("warnings");
  const warnings = lastResult?.warnings || [];
  box.innerHTML = warnings.map((warning) => `
    <div class="rounded-2xl border p-4 text-sm font-black ${warning.level === "danger" ? "border-bear/70 bg-bear/15 text-bear" : "border-sky-400/60 bg-sky-500/10 text-sky-300"}">
      ${warning.message}
    </div>
  `).join("");
}

function updateNotificationStatus(text) {
  document.getElementById("notification-status").textContent = text;
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    updateNotificationStatus("Notificaciones web: tu navegador no las soporta.");
    return;
  }
  const permission = await Notification.requestPermission();
  notificationsEnabled = permission === "granted";
  updateNotificationStatus(notificationsEnabled ? "Notificaciones web: activas." : "Notificaciones web: permiso no concedido.");
}

function notifyIfNeeded() {
  if (!notificationsEnabled || !lastResult || !("Notification" in window)) return;
  const importantWarning = (lastResult.warnings || [])[0]?.message;
  const body = importantWarning || `${lastResult.asset.symbol}: ${lastResult.order_type}, entrada ${lastResult.entry_price}, volumen ${lastResult.volume}.`;
  const key = `decision:${body}`;
  if (sessionStorage.getItem("lastDecisionNotification") === key) return;
  sessionStorage.setItem("lastDecisionNotification", key);
  new Notification("Decision Engine XTB", { body });
}

function renderTicket() {
  const rows = [
    ["Activo", lastResult.asset.symbol],
    ["Tipo de Orden", `${lastResult.order_type} - ${lastResult.simple_order_explanation}`],
    ["Precio de Entrada", numberText(lastResult.entry_price)],
    ["Stop Loss (Escudo)", numberText(lastResult.stop_loss)],
    ["Take Profit (Meta)", numberText(lastResult.take_profit)],
    ["Volumen a colocar", numberText(lastResult.volume)],
  ];
  document.getElementById("ticket").innerHTML = rows.map(([label, value]) => `
    <div class="copy-row">
      <div>
        <p class="text-xs font-bold uppercase text-zinc-500">${label}</p>
        <p class="mt-1 text-lg font-black text-white">${value}</p>
      </div>
      <button type="button" class="copy-btn" data-copy="${String(value).replace(/"/g, "&quot;")}">Copiar</button>
    </div>
  `).join("");
  document.querySelectorAll(".copy-btn").forEach((button) => {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "Copiado";
      setTimeout(() => button.textContent = "Copiar", 900);
    });
  });
}

function renderMath() {
  const investedAccumulated = Number(document.getElementById("invested-accumulated").value || 0);
  const monthlyInvested = Number(document.getElementById("monthly-invested").value || 0);
  const gainsAccumulated = Number(document.getElementById("gains-accumulated").value || 0);
  const dailyGains = Number(document.getElementById("daily-gains").value || 0);
  const estimatedEquity = investedAccumulated + gainsAccumulated + dailyGains;
  document.getElementById("math-summary").innerHTML = `
    <div class="summary-row"><span>Saldo</span><strong>${money(lastResult.account_balance)}</strong></div>
    <div class="summary-row"><span>Invertido acumulado</span><strong>${money(investedAccumulated)}</strong></div>
    <div class="summary-row"><span>Invertido mensual</span><strong>${money(monthlyInvested)}</strong></div>
    <div class="summary-row"><span>Ganancias acumuladas</span><strong class="text-bull">${money(gainsAccumulated)}</strong></div>
    <div class="summary-row"><span>Ganancias dia</span><strong class="text-bull">${money(dailyGains)}</strong></div>
    <div class="summary-row"><span>Patrimonio manual estimado</span><strong>${money(estimatedEquity)}</strong></div>
    <div class="summary-row"><span>Riesgo configurado</span><strong>${lastResult.risk_pct}% = ${money(lastResult.risk_amount)}</strong></div>
    <div class="summary-row"><span>Multiplicador</span><strong>x${numberText(lastResult.multiplier)}</strong></div>
    <div class="summary-row"><span>Volumen bruto</span><strong>${numberText(lastResult.raw_volume)}</strong></div>
    <div class="summary-row"><span>Perdida esperada</span><strong class="text-bear">${money(lastResult.expected_loss)}</strong></div>
    <div class="summary-row"><span>Ganancia esperada</span><strong class="text-bull">${money(lastResult.expected_profit)}</strong></div>
    <div class="summary-row"><span>Relacion R/B</span><strong>${lastResult.risk_reward}</strong></div>
  `;
}

function bindInputs() {
  ["account-balance", "risk-pct", "direction", "symbol", "entry-price", "stop-price", "take-profit-price", "invested-accumulated", "monthly-invested", "gains-accumulated", "daily-gains"].forEach((id) => {
    document.getElementById(id).addEventListener("input", calculate);
    document.getElementById(id).addEventListener("change", calculate);
  });
  ["account-balance", "risk-pct", "invested-accumulated", "monthly-invested", "gains-accumulated", "daily-gains"].forEach((id) => {
    document.getElementById(id).addEventListener("input", schedulePostback);
    document.getElementById(id).addEventListener("change", schedulePostback);
  });
  document.getElementById("calculate-btn").addEventListener("click", calculate);
  document.getElementById("toggle-favorite-btn").addEventListener("click", toggleFavorite);
  document.getElementById("enable-notifications").addEventListener("click", enableNotifications);
}

loadConfigLocal();
renderTabs();
renderAssets();
bindInputs();
updateGoldenWindow();
setInterval(updateGoldenWindow, 1000);
calculate();
