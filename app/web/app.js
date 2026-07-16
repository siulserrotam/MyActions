const assetGroups = {
  favorites: [
    { symbol: "TSM.US", name: "Taiwan Semiconductor CFD", category: "stocks", multiplier: 1, marketPrice: 420.5 },
    { symbol: "NVDA.US", name: "NVIDIA CFD", category: "stocks", multiplier: 1, marketPrice: 172.2 },
    { symbol: "US100", name: "Nasdaq 100 CFD", category: "indices", multiplier: 1, marketPrice: 23000 },
    { symbol: "GOLD", name: "Gold CFD", category: "commodities", multiplier: 100, marketPrice: 3400 },
    { symbol: "BTCUSD", name: "Bitcoin CFD", category: "crypto", multiplier: 1, marketPrice: 62000 },
  ],
  forex: [
    { symbol: "EURUSD", name: "Euro / US Dollar", category: "forex", multiplier: 100000, marketPrice: 1.09 },
    { symbol: "GBPUSD", name: "British Pound / US Dollar", category: "forex", multiplier: 100000, marketPrice: 1.34 },
    { symbol: "USDJPY", name: "US Dollar / Yen", category: "forex", multiplier: 100000, marketPrice: 148 },
  ],
  indices: [
    { symbol: "US100", name: "Nasdaq 100 CFD", category: "indices", multiplier: 1, marketPrice: 23000 },
    { symbol: "US500", name: "S&P 500 CFD", category: "indices", multiplier: 1, marketPrice: 6500 },
    { symbol: "DE40", name: "DAX 40 CFD", category: "indices", multiplier: 1, marketPrice: 24000 },
  ],
  commodities: [
    { symbol: "GOLD", name: "Gold CFD", category: "commodities", multiplier: 100, marketPrice: 3400 },
    { symbol: "OIL", name: "Oil CFD", category: "commodities", multiplier: 1000, marketPrice: 85 },
    { symbol: "NATGAS", name: "Natural Gas CFD", category: "commodities", multiplier: 10000, marketPrice: 2.9 },
  ],
  crypto: [
    { symbol: "BTCUSD", name: "Bitcoin CFD", category: "crypto", multiplier: 1, marketPrice: 62000 },
    { symbol: "ETHUSD", name: "Ethereum CFD", category: "crypto", multiplier: 1, marketPrice: 3400 },
  ],
  stocks: [
    { symbol: "TSM.US", name: "Taiwan Semiconductor CFD", category: "stocks", multiplier: 1, marketPrice: 420.5 },
    { symbol: "NVDA.US", name: "NVIDIA CFD", category: "stocks", multiplier: 1, marketPrice: 172.2 },
    { symbol: "AMD.US", name: "AMD CFD", category: "stocks", multiplier: 1, marketPrice: 155 },
    { symbol: "AAPL.US", name: "Apple CFD", category: "stocks", multiplier: 1, marketPrice: 230 },
    { symbol: "SPY.US", name: "SPY ETF CFD", category: "stocks", multiplier: 1, marketPrice: 625 },
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

const defaultAccountBalance = 1000;
const defaultRiskPct = 1;
const defaultsVersion = "capital-1000-risk-1";

let activeCategory = "favorites";
let selectedAsset = getFavoriteAssets()[0] || assetGroups.stocks[0];
let lastResult = null;
let notificationsEnabled = false;
let postbackTimer = null;
let autoRefreshTimer = null;
let lastResetSymbol = selectedAsset.symbol;

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

function roundVolumeForXtb(volume, asset) {
  if (asset.category === "stocks") return Math.floor(volume);
  return Number(volume.toFixed(3));
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
    marketPrice: 100,
  };
}

function priceDecimals(asset) {
  if (asset.category === "forex") return asset.symbol.includes("JPY") ? 3 : 5;
  if (asset.category === "crypto" || asset.category === "indices") return 1;
  return 2;
}

function formatPriceForAsset(value, asset) {
  return Number(value).toFixed(priceDecimals(asset));
}

function priceStepPct(asset) {
  if (asset.category === "forex") return 0.0015;
  if (asset.category === "indices") return 0.003;
  if (asset.category === "commodities") return 0.004;
  if (asset.category === "crypto") return 0.006;
  return 0.01;
}

function resetOrderFieldsForAsset(asset) {
  const direction = document.getElementById("direction").value;
  const market = Number(asset.marketPrice || 100);
  const step = priceStepPct(asset);
  const entry = direction === "LONG" ? market * (1 + step) : market * (1 - step);
  const stop = direction === "LONG" ? market * (1 - step * 1.5) : market * (1 + step * 1.5);
  const riskDistance = Math.abs(entry - stop);
  const takeProfit = direction === "LONG" ? entry + riskDistance * 2 : entry - riskDistance * 2;

  document.getElementById("market-price").value = formatPriceForAsset(market, asset);
  document.getElementById("entry-price").value = formatPriceForAsset(entry, asset);
  document.getElementById("stop-price").value = formatPriceForAsset(stop, asset);
  document.getElementById("take-profit-price").value = formatPriceForAsset(takeProfit, asset);
  lastResetSymbol = asset.symbol;
}

function resetOrderFieldsFromMarketInput() {
  const marketInput = Number(document.getElementById("market-price").value || 0);
  selectedAsset = {
    ...findAsset(document.getElementById("symbol").value.trim().toUpperCase()),
    marketPrice: marketInput > 0 ? marketInput : selectedAsset.marketPrice,
  };
  resetOrderFieldsForAsset(selectedAsset);
}

function selectedAssetFromForm() {
  const symbol = document.getElementById("symbol").value.trim().toUpperCase();
  const baseAsset = findAsset(symbol);
  const marketInput = Number(document.getElementById("market-price").value || 0);
  if (symbol !== lastResetSymbol) {
    return baseAsset;
  }
  return {
    ...baseAsset,
    marketPrice: marketInput > 0 ? marketInput : baseAsset.marketPrice,
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

function isMarketOpenNow() {
  const now = new Date();
  const nyParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const weekday = nyParts.weekday;
  const hour = Number(nyParts.hour);
  const minute = Number(nyParts.minute);
  const total = hour * 60 + minute;
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  return isWeekday && total >= 9 * 60 + 30 && total < 16 * 60;
}

function scheduleAutoRefresh() {
  window.clearTimeout(autoRefreshTimer);
  const marketOpen = isMarketOpenNow();
  const refreshMs = marketOpen ? 5 * 60 * 1000 : 60 * 60 * 1000;
  const label = marketOpen ? "mercado abierto, cada 5 min" : "mercado cerrado, cada 1 hora";
  document.getElementById("refresh-status").textContent = `Auto refresh: ${label}.`;
  autoRefreshTimer = window.setTimeout(() => {
    calculate();
    scheduleAutoRefresh();
  }, refreshMs);
}

function renderTabs() {
  assetGroups.favorites = getFavoriteAssets();
  document.querySelectorAll(".tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.category === activeCategory);
    button.addEventListener("click", () => {
      activeCategory = button.dataset.category;
      selectedAsset = assetGroups[activeCategory][0] || selectedAsset;
      document.getElementById("symbol").value = selectedAsset.symbol;
      resetOrderFieldsForAsset(selectedAsset);
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
      resetOrderFieldsForAsset(selectedAsset);
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
  const suggestion = buildDailySuggestion();
  document.getElementById("best-decision-note").innerHTML = `
    <div class="grid gap-1">
      <span class="text-xs uppercase tracking-wide text-gold/80">Sugerencia principal del dia</span>
      <strong>${suggestion.symbol} ${suggestion.directionLabel}</strong>
      <span class="text-sm text-zinc-200">${suggestion.reason}</span>
      <span class="text-xs text-zinc-400">Sin feed de noticias real conectado: esta sugerencia usa precios manuales, ventana ORB y categorias CFD.</span>
    </div>
  `;
  renderTopOpportunities();
}

function buildDailySuggestion() {
  const candidates = uniqueAssets().map((asset) => {
    const step = priceStepPct(asset);
    const momentumScore = step * 1000;
    const capitalFit = asset.marketPrice * asset.multiplier <= defaultAccountBalance ? 2 : 0;
    const categoryScore = ({ indices: 5, commodities: 4, stocks: 3, crypto: 2, forex: 1 }[asset.category] || 0);
    return {
      asset,
      score: categoryScore + momentumScore + capitalFit,
    };
  }).sort((a, b) => b.score - a.score);
  const pick = candidates[0]?.asset || selectedAsset;
  const directionLabel = pick.category === "commodities" || pick.category === "indices" ? "LONG/SHORT segun ruptura" : "LONG si rompe, SHORT si pierde soporte";
  return {
    symbol: pick.symbol,
    directionLabel,
    reason: `Prioriza ${pick.name}: buena liquidez relativa, multiplicador x${numberText(pick.multiplier)} y lectura rapida para operar un solo CFD del dia.`,
  };
}

function marketPhaseLabel() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const total = Number(parts.hour) * 60 + Number(parts.minute);
  if (total < 9 * 60 + 35) return "Esperando cierre de la primera vela 9:30-9:35 NY.";
  if (total < 16 * 60) return "Estrategia activa despues de la primera vela ORB.";
  return "Mercado cerrado: preparar lista para la proxima apertura.";
}

function buildTopOpportunities() {
  const accountBalance = Number(document.getElementById("account-balance").value || defaultAccountBalance);
  const riskPct = Number(document.getElementById("risk-pct").value || defaultRiskPct);
  return uniqueAssets().map((asset) => {
    const step = priceStepPct(asset);
    const entry = asset.marketPrice * (1 + step);
    const stop = asset.marketPrice * (1 - step * 1.5);
    const distance = Math.abs(entry - stop);
    const riskAmount = accountBalance * riskPct / 100;
    const riskVolume = riskAmount / (distance * asset.multiplier);
    const capitalVolume = accountBalance / (entry * asset.multiplier);
    const volume = roundVolumeForXtb(Math.min(riskVolume, capitalVolume), asset);
    const usable = asset.category !== "stocks" || volume >= 1;
    const categoryScore = ({ indices: 9, commodities: 7, stocks: 5, crypto: 3, forex: 2 }[asset.category] || 0);
    const score = (usable ? 50 : -50) + step * 1000 + categoryScore;
    return {
      asset,
      volume,
      score,
      direction: "LONG si rompe maximo / SHORT si pierde minimo",
      reason: usable
        ? `Operable con volumen ${numberText(volume)} y freno de riesgo ${riskPct}%.`
        : "No operable con regla actual: volumen entero quedaria menor a 1.",
    };
  }).sort((a, b) => b.score - a.score).slice(0, 3);
}

function renderTopOpportunities() {
  const target = document.getElementById("top-opportunities");
  if (!target) return;
  const opportunities = buildTopOpportunities();
  target.innerHTML = `
    <div class="rounded-xl border border-white/10 bg-ink p-3">
      <p class="text-xs font-black uppercase text-zinc-500">Top 3 alternativas del dia</p>
      <p class="mt-1 text-xs text-zinc-400">${marketPhaseLabel()}</p>
      <div class="mt-3 grid gap-2">
        ${opportunities.map((item, index) => `
          <button type="button" class="asset-card text-left" data-top-symbol="${item.asset.symbol}">
            <span class="text-xs text-gold">#${index + 1}</span>
            <span class="block text-base font-black">${item.asset.symbol}</span>
            <span class="block text-xs text-zinc-400">${item.direction}</span>
            <span class="mt-1 block text-xs text-zinc-500">${item.reason}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
  document.querySelectorAll("[data-top-symbol]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAsset = findAsset(button.dataset.topSymbol);
      document.getElementById("symbol").value = selectedAsset.symbol;
      resetOrderFieldsForAsset(selectedAsset);
      renderAssets();
      calculate();
    });
  });
}

async function calculate() {
  const symbol = document.getElementById("symbol").value.trim().toUpperCase();
  selectedAsset = selectedAssetFromForm();
  const riskPct = Math.min(Math.max(Number(document.getElementById("risk-pct").value || defaultRiskPct), 0.5), 1);
  document.getElementById("risk-pct").value = String(riskPct);
  const payload = {
    symbol,
    direction: document.getElementById("direction").value,
    account_balance: Number(document.getElementById("account-balance").value || 0),
    risk_pct: riskPct,
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
  renderTopOpportunities();
  notifyIfNeeded();
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function currentConfigPayload() {
  const accountBalance = Number(document.getElementById("account-balance").value || defaultAccountBalance);
  const riskPct = Math.min(Math.max(Number(document.getElementById("risk-pct").value || defaultRiskPct), 0.5), 1);
  const investedAccumulated = Number(document.getElementById("invested-accumulated").value || 0);
  const monthlyInvested = Number(document.getElementById("monthly-invested").value || 0);
  const gainsAccumulated = Number(document.getElementById("gains-accumulated").value || 0);
  const dailyGains = Number(document.getElementById("daily-gains").value || 0);
  return {
    trade_date: todayKey(),
    balance: accountBalance,
    symbol: document.getElementById("symbol").value.trim().toUpperCase(),
    market_price: Number(document.getElementById("market-price").value || 0),
    entry_price: Number(document.getElementById("entry-price").value || 0),
    stop_price: Number(document.getElementById("stop-price").value || 0),
    take_profit_price: Number(document.getElementById("take-profit-price").value || 0),
    direction: document.getElementById("direction").value,
    expiry_mode: document.getElementById("expiry-mode").value,
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
    const alreadyMigrated = localStorage.getItem("decision_engine_defaults_version") === defaultsVersion;
    if (!config) {
      document.getElementById("account-balance").value = defaultAccountBalance;
      document.getElementById("risk-pct").value = defaultRiskPct;
      localStorage.setItem("decision_engine_defaults_version", defaultsVersion);
      return;
    }
    if (config.balance) document.getElementById("account-balance").value = config.balance;
    if (config.risk_pct) document.getElementById("risk-pct").value = config.risk_pct;
    if (config.invested_accumulated !== undefined) document.getElementById("invested-accumulated").value = config.invested_accumulated;
    if (config.monthly_invested !== undefined) document.getElementById("monthly-invested").value = config.monthly_invested;
    if (config.gains_accumulated !== undefined) document.getElementById("gains-accumulated").value = config.gains_accumulated;
    if (config.daily_gains !== undefined) document.getElementById("daily-gains").value = config.daily_gains;
    if (config.symbol) document.getElementById("symbol").value = config.symbol;
    if (config.direction) document.getElementById("direction").value = config.direction;
    if (config.market_price) document.getElementById("market-price").value = config.market_price;
    if (config.entry_price) document.getElementById("entry-price").value = config.entry_price;
    if (config.stop_price) document.getElementById("stop-price").value = config.stop_price;
    if (config.take_profit_price) document.getElementById("take-profit-price").value = config.take_profit_price;
    if (config.expiry_mode) document.getElementById("expiry-mode").value = config.expiry_mode;
    if (!alreadyMigrated) {
      document.getElementById("account-balance").value = defaultAccountBalance;
      document.getElementById("risk-pct").value = defaultRiskPct;
      localStorage.setItem("decision_engine_defaults_version", defaultsVersion);
    }
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

function updateDbStatus(text, tone = "muted") {
  const box = document.getElementById("db-status");
  box.textContent = text;
  box.className = "mt-3 rounded-xl border bg-ink p-3 text-xs font-bold";
  if (tone === "ok") box.classList.add("border-bull/40", "text-bull");
  else if (tone === "error") box.classList.add("border-bear/40", "text-bear");
  else box.classList.add("border-white/10", "text-zinc-500");
}

async function verifyDatabaseAndLoadLatest() {
  try {
    const healthResponse = await fetch("/capital/health");
    if (!healthResponse.ok) throw new Error(`HTTP ${healthResponse.status}`);
    const health = await healthResponse.json();
    const dbType = health.is_sqlite ? "SQLite local" : "Supabase/Postgres";
    updateDbStatus(`DB: conectada (${dbType}). Ultimo saldo: ${health.latest_balance ?? "sin registro"}.`, health.is_sqlite ? "error" : "ok");

    const response = await fetch("/capital/daily?limit=1");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload.latest?.balance) {
      document.getElementById("account-balance").value = payload.latest.balance;
      if (payload.latest.risk_pct) document.getElementById("risk-pct").value = String(payload.latest.risk_pct);
      if (payload.latest.invested_accumulated !== undefined) document.getElementById("invested-accumulated").value = payload.latest.invested_accumulated;
      if (payload.latest.monthly_invested !== undefined) document.getElementById("monthly-invested").value = payload.latest.monthly_invested;
      if (payload.latest.gains_accumulated !== undefined) document.getElementById("gains-accumulated").value = payload.latest.gains_accumulated;
      if (payload.latest.daily_gains !== undefined) document.getElementById("daily-gains").value = payload.latest.daily_gains;
      calculate();
    }
  } catch (error) {
    updateDbStatus("DB: sin conexion. Revisa DATABASE_URL en Vercel y tabla daily_capital.", "error");
  }
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
  const normalizedRiskPct = Math.min(Math.max(payload.risk_pct, 0.5), 1);
  const riskAmount = payload.account_balance * normalizedRiskPct / 100;
  const rawVolume = riskAmount / (distance * asset.multiplier);
  const capitalVolume = payload.account_balance / (payload.entry_price * asset.multiplier);
  const selectedRawVolume = Math.min(rawVolume, capitalVolume);
  const volume = roundVolumeForXtb(selectedRawVolume, asset);
  const volumeBasis = rawVolume <= capitalVolume ? "riesgo" : "saldo";
  const orderType = payload.direction === "LONG" ? "BUY STOP" : "SELL STOP";
  const takeProfit = payload.take_profit_price ||
    (payload.direction === "LONG" ? payload.entry_price + distance * 2 : payload.entry_price - distance * 2);
  const positionValue = Number((payload.entry_price * asset.multiplier * volume).toFixed(2));
  const capitalUsagePct = payload.account_balance > 0 ? Number((positionValue / payload.account_balance * 100).toFixed(2)) : 0;
  return {
    asset,
    direction: payload.direction,
    order_type: orderType,
    simple_order_explanation: payload.direction === "LONG" ? "Compra si rompe hacia arriba." : "Vende si rompe hacia abajo.",
    entry_price: payload.entry_price,
    stop_loss: payload.stop_price,
    take_profit: takeProfit,
    account_balance: payload.account_balance,
    risk_pct: normalizedRiskPct,
    risk_amount: Number(riskAmount.toFixed(2)),
    multiplier: asset.multiplier,
    raw_volume: rawVolume,
    capital_volume: capitalVolume,
    volume_basis: volumeBasis,
    volume,
    position_value: positionValue,
    capital_usage_pct: capitalUsagePct,
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
  const warnings = [...(lastResult?.warnings || [])];
  if (lastResult?.asset?.category === "stocks" && lastResult.volume < 1) {
    warnings.push({ level: "danger", message: "NO OPERAR: XTB exige volumen entero en este CFD y el volumen seguro queda por debajo de 1. Con 1 unidad podrias superar tu riesgo permitido." });
  }
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
  if (!lastResult) return;
  const positionValue = lastResult.position_value ?? Number((lastResult.entry_price * lastResult.multiplier * lastResult.volume).toFixed(2));
  const capitalUsagePct = lastResult.capital_usage_pct ?? Number((positionValue / lastResult.account_balance * 100).toFixed(2));
  const volumeBasis = lastResult.volume_basis === "saldo" ? "saldo disponible" : "riesgo maximo";
  const volumeLabel = lastResult.asset.category === "stocks" ? "Volumen entero XTB" : "Volumen a colocar";
  const marketPrice = Number(document.getElementById("market-price").value || 0);
  const expiryMode = document.getElementById("expiry-mode").value;
  const expiryLabel = expiryMode === "DAY" ? "Hoy / fin del dia" : "Sin vencimiento manual";
  const rows = [
    ["Activo", lastResult.asset.symbol, true],
    ["Precio mercado base", numberText(marketPrice), false],
    ["Tipo de Orden", `${lastResult.order_type} - ${lastResult.simple_order_explanation}`, true],
    ["Precio de Entrada", numberText(lastResult.entry_price), true],
    ["Stop Loss (Escudo)", numberText(lastResult.stop_loss), true],
    ["Take Profit (Meta)", numberText(lastResult.take_profit), true],
    ["Vencimiento", expiryLabel, true],
    [volumeLabel, numberText(lastResult.volume), true],
    ["Volumen maximo por riesgo", numberText(lastResult.raw_volume), false],
    ["Volumen maximo por saldo", numberText(lastResult.capital_volume ?? lastResult.raw_volume), false],
    ["Regla que manda", volumeBasis, false],
    ["Valor aprox. de posicion", money(positionValue), false],
    ["Uso aprox. de tu capital", `${numberText(capitalUsagePct)}%`, false],
    ["Perdida maxima estimada", money(lastResult.expected_loss), false],
    ["Ganancia objetivo estimada", money(lastResult.expected_profit), false],
  ];
  document.getElementById("ticket").innerHTML = rows.map(([label, value, canCopy]) => `
    <div class="copy-row">
      <div>
        <p class="text-xs font-bold uppercase text-zinc-500">${label}</p>
        <p class="mt-1 text-lg font-black text-white">${value}</p>
      </div>
      ${canCopy ? `<button type="button" class="copy-btn" data-copy="${String(value).replace(/"/g, "&quot;")}">Copiar</button>` : ""}
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
    <div class="summary-row"><span>Riesgo sobre saldo total</span><strong>${lastResult.risk_pct}% de ${money(lastResult.account_balance)}</strong></div>
    <div class="summary-row"><span>Perdida maxima permitida</span><strong>${money(lastResult.risk_amount)}</strong></div>
    <div class="summary-row"><span>Multiplicador</span><strong>x${numberText(lastResult.multiplier)}</strong></div>
    <div class="summary-row"><span>Volumen bruto</span><strong>${numberText(lastResult.raw_volume)}</strong></div>
    <div class="summary-row"><span>Volumen por saldo</span><strong>${numberText(lastResult.capital_volume ?? lastResult.raw_volume)}</strong></div>
    <div class="summary-row"><span>Freno activo</span><strong>${lastResult.volume_basis === "saldo" ? "saldo disponible" : "riesgo maximo"}</strong></div>
    <div class="summary-row"><span>Perdida esperada</span><strong class="text-bear">${money(lastResult.expected_loss)}</strong></div>
    <div class="summary-row"><span>Ganancia esperada</span><strong class="text-bull">${money(lastResult.expected_profit)}</strong></div>
    <div class="summary-row"><span>Relacion R/B</span><strong>${lastResult.risk_reward}</strong></div>
  `;
}

function bindInputs() {
  ["account-balance", "risk-pct", "entry-price", "stop-price", "take-profit-price", "expiry-mode", "invested-accumulated", "monthly-invested", "gains-accumulated", "daily-gains"].forEach((id) => {
    document.getElementById(id).addEventListener("input", calculate);
    document.getElementById(id).addEventListener("change", calculate);
  });
  document.getElementById("direction").addEventListener("change", () => {
    resetOrderFieldsForAsset(selectedAsset);
    calculate();
  });
  document.getElementById("symbol").addEventListener("change", () => {
    selectedAsset = findAsset(document.getElementById("symbol").value.trim().toUpperCase());
    resetOrderFieldsForAsset(selectedAsset);
    renderAssets();
    calculate();
  });
  document.getElementById("symbol").addEventListener("input", () => {
    const typedSymbol = document.getElementById("symbol").value.trim().toUpperCase();
    const typedAsset = uniqueAssets().find((asset) => asset.symbol === typedSymbol);
    if (typedAsset) {
      selectedAsset = typedAsset;
      resetOrderFieldsForAsset(selectedAsset);
      renderAssets();
      calculate();
    }
  });
  document.getElementById("market-price").addEventListener("change", () => {
    resetOrderFieldsFromMarketInput();
    calculate();
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
verifyDatabaseAndLoadLatest();
updateGoldenWindow();
setInterval(updateGoldenWindow, 1000);
selectedAsset = selectedAssetFromForm();
resetOrderFieldsForAsset(selectedAsset);
calculate();
scheduleAutoRefresh();
