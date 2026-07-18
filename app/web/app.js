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
const defaultRiskPct = 0.5;
const minAiRiskPct = 0.25;
const maxAiRiskPct = 1;
const defaultsVersion = "capital-1000-risk-ai-v1";

let activeCategory = "favorites";
let selectedAsset = getFavoriteAssets()[0] || assetGroups.stocks[0];
let lastResult = null;
let notificationsEnabled = false;
let postbackTimer = null;
let autoRefreshTimer = null;
let lastResetSymbol = selectedAsset.symbol;
let liveQuotes = {};

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

function cfdMarginPct() {
  return 20;
}

function cfdLeverageRatio() {
  return 100 / cfdMarginPct();
}

function minStopPct(asset) {
  if (asset.category === "forex") return 0.05;
  if (asset.category === "crypto") return 0.5;
  if (asset.category === "indices" || asset.category === "commodities") return 0.2;
  return 0.35;
}

function riskModeValue() {
  return document.getElementById("risk-pct")?.value || "dynamic";
}

function riskPctFromConfidence(confidence) {
  if (confidence >= 85) return 1;
  if (confidence >= 75) return 0.75;
  if (confidence >= 60) return 0.5;
  if (confidence >= 45) return 0.35;
  return minAiRiskPct;
}

function buildRiskConfidenceProfile() {
  const asset = selectedAssetFromForm();
  const selectedDirection = document.getElementById("direction")?.value || "LONG";
  const driftPct = Number(asset.liveChangePct ?? 0);
  const driftDirection = directionFromMove(driftPct);
  const balance = Number(document.getElementById("account-balance")?.value || defaultAccountBalance);
  const available = Number(document.getElementById("available-capital")?.value || 0);
  const openProfit = Number(document.getElementById("open-profit")?.value || 0);
  const marginLevel = Number(document.getElementById("margin-level-pct")?.value || 0);
  const entry = Number(document.getElementById("entry-price")?.value || 0);
  const stop = Number(document.getElementById("stop-price")?.value || 0);
  const stopPct = entry > 0 ? Math.abs(entry - stop) / entry * 100 : 0;
  const minimumStopPct = minStopPct(asset);
  const timing = marketTimingProfile();
  let confidence = 50;
  const reasons = [];

  if (driftDirection === "WAIT") {
    confidence -= 10;
    reasons.push("sin direccion intradia clara");
  } else if (driftDirection === selectedDirection) {
    confidence += 20;
    reasons.push("direccion coincide con movimiento");
  } else {
    confidence -= 25;
    reasons.push("direccion contra el movimiento");
  }

  confidence += timing.score;
  reasons.push(timing.message);

  if (marginLevel > 0 && marginLevel < 200) {
    confidence -= 25;
    reasons.push("nivel de margen bajo");
  } else if (marginLevel >= 300) {
    confidence += 10;
    reasons.push("margen sano");
  }

  if (available > 0) {
    const availablePct = balance > 0 ? available / balance * 100 : 0;
    if (availablePct < 35) {
      confidence -= 15;
      reasons.push("disponible ajustado");
    } else {
      confidence += 5;
      reasons.push("disponible suficiente");
    }
  }

  if (openProfit < 0 && balance > 0 && Math.abs(openProfit) >= balance * 0.005) {
    confidence -= 15;
    reasons.push("perdida abierta defensiva");
  }

  if (entry > 0 && stop > 0) {
    if (stopPct < minimumStopPct) {
      confidence -= 20;
      reasons.push("stop demasiado cercano");
    } else {
      confidence += 10;
      reasons.push("stop aceptable");
    }
  }

  confidence = Math.max(0, Math.min(95, Math.round(confidence)));
  const riskPct = Math.max(minAiRiskPct, Math.min(maxAiRiskPct, timing.riskCap, riskPctFromConfidence(confidence)));
  return { confidence, riskPct, reasons, timing };
}

function getEffectiveRiskPct() {
  const mode = riskModeValue();
  if (mode === "dynamic") {
    return buildRiskConfidenceProfile().riskPct;
  }
  return Number(mode || defaultRiskPct);
}

function renderRiskModeNote() {
  const note = document.getElementById("risk-mode-note");
  if (!note) return;
  const mode = riskModeValue();
  const riskPct = getEffectiveRiskPct();
  if (mode === "dynamic") {
    const profile = buildRiskConfidenceProfile();
    note.textContent = `IA sugiere ${riskPct}% por confianza ${profile.confidence}%. Hora: ${profile.timing.quality}. Techo duro: ${maxAiRiskPct}%.`;
  } else {
    note.textContent = `Riesgo fijo elegido: ${riskPct}%. La IA no lo sube ni lo baja.`;
  }
}

function nyTimeParts() {
  const now = new Date();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
}

function nyMarketMinutes() {
  const parts = nyTimeParts();
  return {
    weekday: parts.weekday,
    total: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function marketTimingProfile() {
  const { weekday, total } = nyMarketMinutes();
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  if (!isWeekday || total < 9 * 60 + 30 || total >= 16 * 60) {
    return {
      quality: "CERRADO",
      score: -10,
      riskCap: 0.5,
      message: "Mercado cerrado: solo preparar ordenes, no ejecutar.",
    };
  }
  if (total < 9 * 60 + 35) {
    return {
      quality: "NO OPERAR",
      score: -35,
      riskCap: 0.25,
      message: "9:30-9:35 NY: ruido inicial. Espera cierre de la primera vela ORB.",
    };
  }
  if (total < 9 * 60 + 45) {
    return {
      quality: "ALTA VOLATILIDAD",
      score: -10,
      riskCap: 0.5,
      message: "9:35-9:45 NY: ventana ORB valida, pero usa riesgo moderado y stop realista.",
    };
  }
  if (total < 11 * 60 + 30) {
    return {
      quality: "MEJOR VENTANA",
      score: 15,
      riskCap: 1,
      message: "9:45-11:30 NY: mejor equilibrio entre direccion y ruido.",
    };
  }
  if (total < 14 * 60) {
    return {
      quality: "BAJA CALIDAD",
      score: -15,
      riskCap: 0.5,
      message: "11:30-14:00 NY: suele bajar volumen. Evita entradas si no hay ruptura clara.",
    };
  }
  return {
    quality: "CIERRE VOLATIL",
    score: -10,
    riskCap: 0.5,
    message: "14:00-16:00 NY: puede haber reversas fuertes. Reduce riesgo o espera confirmacion.",
  };
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

function updateLiveStatus(text, tone = "muted") {
  const box = document.getElementById("live-status");
  if (!box) return;
  box.textContent = text;
  box.className = "mt-3 rounded-xl border bg-ink p-3 text-xs font-bold";
  if (tone === "ok") box.classList.add("border-bull/40", "text-bull");
  else if (tone === "error") box.classList.add("border-bear/40", "text-bear");
  else box.classList.add("border-white/10", "text-zinc-500");
}

function applyLiveQuote(quote) {
  const price = Number(quote.price || 0);
  if (!price) return;
  liveQuotes[quote.symbol] = quote;
  Object.values(assetGroups).flat().forEach((asset) => {
    if (asset.symbol === quote.symbol) {
      asset.marketPrice = price;
      asset.liveChangePct = quote.change_pct;
      asset.liveSource = quote.source;
      asset.liveUpdatedAt = quote.updated_at;
    }
  });
}

async function refreshLivePrices({ resetSelected = false } = {}) {
  const symbols = uniqueAssets().map((asset) => asset.symbol).join(",");
  try {
    updateLiveStatus("Live prices: actualizando...");
    const response = await fetch(`/market/live?symbols=${encodeURIComponent(symbols)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    (payload.items || []).forEach(applyLiveQuote);
    if (liveQuotes[selectedAsset.symbol] && resetSelected) {
      selectedAsset = findAsset(selectedAsset.symbol);
      resetOrderFieldsForAssetDirection(selectedAsset, directionFromMove(selectedAsset.liveChangePct ?? 0));
    }
    updateLiveStatus(`Live prices: ${payload.count || 0} activos actualizados desde yfinance.`, "ok");
    renderAssets();
    renderTopOpportunities();
    calculate();
  } catch (error) {
    updateLiveStatus("Live prices: no disponibles, usando ultimo valor manual/estatico.", "error");
    calculate();
  }
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
  if (asset.symbol === "OIL" || asset.symbol === "NATGAS") return 3;
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

function applyVolumeFirstTargets() {
  const requestedVolume = Number(document.getElementById("requested-volume").value || 0);
  if (!requestedVolume || requestedVolume <= 0) return;
  const asset = selectedAssetFromForm();
  const entry = Number(document.getElementById("entry-price").value || 0);
  const balance = Number(document.getElementById("account-balance").value || defaultAccountBalance);
  const direction = document.getElementById("direction").value;
  const volume = roundVolumeForXtb(requestedVolume, asset);
  if (!entry || !volume) return;
  const riskAmount = balance * getEffectiveRiskPct() / 100;
  const stopDistance = riskAmount / (volume * asset.multiplier);
  const targetDistance = stopDistance * 2;
  const stop = direction === "LONG" ? entry - stopDistance : entry + stopDistance;
  const takeProfit = direction === "LONG" ? entry + targetDistance : entry - targetDistance;
  document.getElementById("stop-price").value = formatPriceForAsset(stop, asset);
  document.getElementById("take-profit-price").value = formatPriceForAsset(takeProfit, asset);
}

function resetOrderForCurrentMode(asset) {
  resetOrderFieldsForAsset(asset);
  applyVolumeFirstTargets();
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
    refreshLivePrices({ resetSelected: true });
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
      resetOrderForCurrentMode(selectedAsset);
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
      <span class="mt-1 text-xs font-bold ${asset.liveChangePct < 0 ? "text-bear" : "text-bull"}">${asset.marketPrice ? numberText(asset.marketPrice) : "-"} ${asset.liveChangePct !== undefined ? `(${numberText(asset.liveChangePct)}%)` : ""}</span>
    </button>
  `).join("");
  document.querySelectorAll(".asset-card").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAsset = findAsset(button.dataset.symbol);
      document.getElementById("symbol").value = selectedAsset.symbol;
      resetOrderForCurrentMode(selectedAsset);
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
  const guardrail = buildPortfolioGuardrail();
  document.getElementById("best-decision-note").innerHTML = `
    <div class="grid gap-1">
      <span class="text-xs uppercase tracking-wide text-gold/80">Modo ORB manual</span>
      <strong>${suggestion.title}</strong>
      <span class="text-sm text-zinc-200">${suggestion.reason}</span>
      <span class="text-sm ${guardrail.toneClass}">${guardrail.message}</span>
      <span class="text-xs text-zinc-400">IA local sin noticias externas: usa movimiento intradia, direccion elegida, horario, margen, stop y riesgo dinamico.</span>
    </div>
  `;
  renderAiConfirmation();
  renderTopOpportunities();
}

function buildPortfolioGuardrail() {
  const balance = Number(document.getElementById("account-balance")?.value || 0);
  const available = Number(document.getElementById("available-capital")?.value || 0);
  const openProfit = Number(document.getElementById("open-profit")?.value || 0);
  const marginLevel = Number(document.getElementById("margin-level-pct")?.value || 0);
  const availablePct = balance > 0 ? (available / balance) * 100 : 0;
  if (marginLevel > 0 && marginLevel < 200) {
    return { toneClass: "text-bear", message: "Semaforo cartera: NO OPERAR. Nivel de margen bajo; primero libera margen o reduce exposicion." };
  }
  if (openProfit < 0 && Math.abs(openProfit) >= balance * 0.005) {
    return { toneClass: "text-gold", message: "Semaforo cartera: modo defensivo. Ya hay perdida abierta; usa riesgo bajo y espera confirmacion fuerte." };
  }
  if (available > 0 && availablePct < 35) {
    return { toneClass: "text-gold", message: "Semaforo cartera: capital disponible ajustado. Evita abrir mas volumen si XTB muestra poco disponible." };
  }
  return { toneClass: "text-bull", message: "Semaforo cartera: margen y disponible permiten evaluar una operacion, respetando el stop." };
}

function buildDailySuggestion() {
  const symbol = document.getElementById("symbol")?.value?.trim().toUpperCase() || selectedAsset.symbol;
  const asset = findAsset(symbol);
  const driftPct = Number(asset.liveChangePct ?? 0);
  const bias = driftPct < -0.35 ? "bajista" : driftPct > 0.35 ? "alcista" : "neutral";
  return {
    title: `${symbol}: sesgo ${bias} (${numberText(driftPct)}%)`,
    reason: bias === "bajista"
      ? "Movimiento intradia negativo: favorece SHORT/SELL STOP si pierde el minimo de la primera vela."
      : bias === "alcista"
        ? "Movimiento intradia positivo: favorece LONG/BUY STOP si rompe el maximo de la primera vela."
        : "Movimiento sin ventaja clara: espera ruptura real de la primera vela antes de operar.",
  };
}

function buildAiConfirmation() {
  if (!lastResult) {
    return {
      title: "Confirmacion IA: esperando calculo",
      status: "ESPERAR",
      bias: "ESPERAR",
      confidence: 0,
      toneClass: "border-sky-400/30 bg-sky-500/10 text-sky-100",
      reasons: ["Calcula el ticket XTB para validar riesgo, margen y direccion."],
    };
  }
  const asset = lastResult.asset;
  const driftPct = Number(asset.liveChangePct ?? 0);
  const driftDirection = directionFromMove(driftPct);
  const selectedDirection = document.getElementById("direction").value;
  const positionValue = lastResult.position_value ?? Number((lastResult.entry_price * lastResult.multiplier * lastResult.volume).toFixed(2));
  const marginRequired = positionValue * cfdMarginPct() / 100;
  const availableCapital = Number(document.getElementById("available-capital").value || 0);
  const stopDistance = Math.abs(lastResult.entry_price - lastResult.stop_loss);
  const stopPct = lastResult.entry_price > 0 ? stopDistance / lastResult.entry_price * 100 : 0;
  const minimumStopPct = minStopPct(asset);
  const marketOpen = isMarketOpenNow();
  const timing = marketTimingProfile();
  const reasons = [];
  let score = 50;

  if (driftDirection === "WAIT") {
    score -= 10;
    reasons.push("Movimiento intradia sin ventaja clara: no persigas precio.");
  } else if (driftDirection === selectedDirection) {
    score += 20;
    reasons.push(`Movimiento ${numberText(driftPct)}% coincide con ${labelFromDirection(selectedDirection)}.`);
  } else {
    score -= 25;
    reasons.push(`Movimiento ${numberText(driftPct)}% va contra la direccion seleccionada.`);
  }

  if (lastResult.risk_ok) {
    score += 10;
    reasons.push(`Riesgo fijo respetado: perdida estimada ${money(lastResult.expected_loss)} de maximo ${money(lastResult.risk_amount)}.`);
  } else {
    score -= 40;
    reasons.push(`Riesgo excedido: perderias ${money(lastResult.expected_loss)} y el maximo es ${money(lastResult.risk_amount)}.`);
  }

  if (availableCapital > 0 && marginRequired > availableCapital) {
    score -= 45;
    reasons.push(`Margen insuficiente: XTB podria bloquear ${money(marginRequired)} y tienes ${money(availableCapital)} disponible.`);
  } else if (availableCapital > 0) {
    score += 10;
    reasons.push(`Margen estimado dentro del disponible: ${money(marginRequired)}.`);
  } else {
    reasons.push("Capital disponible no informado: valida margen manualmente en XTB.");
  }

  if (stopPct < minimumStopPct) {
    score -= 20;
    reasons.push(`Stop muy cercano: ${numberText(stopPct)}% vs minimo sugerido ${numberText(minimumStopPct)}%.`);
  } else {
    score += 10;
    reasons.push(`Stop con distancia aceptable: ${numberText(stopPct)}%.`);
  }

  if (!marketOpen) {
    score -= 5;
    reasons.push("Mercado cerrado o fuera de ventana: prepara, no ejecutes.");
  }
  if (timing.quality === "NO OPERAR") {
    score -= 25;
    reasons.push("Horario demasiado volatil: espera que cierre la primera vela.");
  } else if (timing.quality === "MEJOR VENTANA") {
    score += 10;
    reasons.push("Horario mas confiable para ejecutar intradia.");
  }

  const confidence = Math.max(0, Math.min(95, Math.round(score)));
  const hardBlock = !lastResult.risk_ok || (availableCapital > 0 && marginRequired > availableCapital) || stopPct < minimumStopPct || timing.quality === "NO OPERAR";
  const status = hardBlock ? "NO OPERAR" : confidence >= 70 && marketOpen ? "OPERABLE" : "ESPERAR";
  const bias = driftDirection === "WAIT" ? selectedDirection : driftDirection;
  const toneClass = status === "NO OPERAR"
    ? "border-bear/60 bg-bear/15 text-bear"
    : status === "OPERABLE"
      ? "border-bull/60 bg-bull/15 text-bull"
      : "border-gold/50 bg-gold/10 text-gold";

  return {
    title: "Confirmacion IA local",
    status,
    bias,
    confidence,
    toneClass,
    reasons: reasons.slice(0, 4),
  };
}

function renderAiConfirmation() {
  const target = document.getElementById("ai-confirmation");
  if (!target) return;
  const ai = buildAiConfirmation();
  target.className = `mt-4 rounded-xl border p-3 text-sm ${ai.toneClass}`;
  target.innerHTML = `
    <div class="grid gap-2">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <span class="text-xs font-black uppercase tracking-wide opacity-80">${ai.title}</span>
        <strong>${ai.status} - ${labelFromDirection(ai.bias)} - ${ai.confidence}%</strong>
      </div>
      <ul class="grid gap-1 text-xs text-zinc-200">
        ${ai.reasons.map((reason) => `<li>- ${reason}</li>`).join("")}
      </ul>
      <span class="text-xs text-zinc-500">Modelo usado: scoring heuristico local, no machine learning externo. El riesgo sigue dependiendo de saldo real, volumen, stop y multiplicador.</span>
    </div>
  `;
}

function directionFromMove(changePct) {
  if (changePct <= -0.35) return "SHORT";
  if (changePct >= 0.35) return "LONG";
  return "WAIT";
}

function labelFromDirection(direction) {
  if (direction === "SHORT") return "SHORT / SELL STOP";
  if (direction === "LONG") return "LONG / BUY STOP";
  return "ESPERAR";
}

function resetOrderFieldsForAssetDirection(asset, direction) {
  const directionInput = document.getElementById("direction");
  if (direction === "LONG" || direction === "SHORT") {
    directionInput.value = direction;
  }
  resetOrderFieldsForAsset(asset);
  applyVolumeFirstTargets();
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
  const riskPct = getEffectiveRiskPct();
  const selectedDirection = document.getElementById("direction").value;
  return uniqueAssets().map((asset) => {
    const changePct = Number(asset.liveChangePct ?? 0);
    const direction = directionFromMove(changePct);
    const step = priceStepPct(asset);
    const entry = direction === "SHORT" ? asset.marketPrice * (1 - step) : asset.marketPrice * (1 + step);
    const stop = direction === "SHORT" ? asset.marketPrice * (1 + step * 1.5) : asset.marketPrice * (1 - step * 1.5);
    const distance = Math.abs(entry - stop);
    const riskAmount = accountBalance * riskPct / 100;
    const riskVolume = riskAmount / (distance * asset.multiplier);
    const capitalVolume = accountBalance / (entry * asset.multiplier);
    const volume = roundVolumeForXtb(riskVolume, asset);
    const usable = asset.category !== "stocks" || volume >= 1;
    const movementScore = Math.abs(changePct) * 20;
    const directionPenalty = direction === "WAIT" ? -30 : 0;
    const score = (usable ? 50 : -50) + movementScore + directionPenalty;
    return {
      asset,
      volume,
      score,
      direction,
      directionLabel: labelFromDirection(direction),
      reason: usable
        ? `${numberText(changePct)}% intradia. ${direction === "WAIT" ? "Sin direccion clara." : `Preparar ${labelFromDirection(direction)}.`} Volumen sugerido ${numberText(volume)} por riesgo.`
        : "No operable con regla actual: volumen entero quedaria menor a 1.",
    };
  })
    .filter((item) => item.direction === selectedDirection)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function renderTopOpportunities() {
  const target = document.getElementById("top-opportunities");
  if (!target) return;
  const opportunities = buildTopOpportunities();
  const selectedDirection = document.getElementById("direction").value;
  const directionLabel = labelFromDirection(selectedDirection);
  target.innerHTML = `
    <div class="rounded-xl border border-white/10 bg-ink p-3">
      <p class="text-xs font-black uppercase text-zinc-500">Top 3 ${directionLabel}</p>
      <p class="mt-1 text-xs text-zinc-400">${marketPhaseLabel()}</p>
      <p class="mt-1 text-xs text-bear">Ranking por movimiento 5m/intradia y regla volumen/riesgo. Verifica en XTB antes de enviar.</p>
      <div class="mt-3 grid gap-2">
        ${opportunities.length ? opportunities.map((item, index) => `
          <button type="button" class="asset-card text-left" data-top-symbol="${item.asset.symbol}">
            <span class="text-xs text-gold">#${index + 1}</span>
            <span class="block text-base font-black">${item.asset.symbol}</span>
            <span class="block text-xs ${item.direction === "SHORT" ? "text-bear" : "text-bull"}">${item.directionLabel}</span>
            <span class="mt-1 block text-xs text-zinc-500">${item.reason}</span>
          </button>
        `).join("") : `<div class="rounded-xl border border-white/10 bg-panel2 p-3 text-xs text-zinc-400">No hay 3 activos claros para ${directionLabel}. Cambia direccion o espera el proximo refresh.</div>`}
      </div>
    </div>
  `;
  document.querySelectorAll("[data-top-symbol]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAsset = findAsset(button.dataset.topSymbol);
      document.getElementById("symbol").value = selectedAsset.symbol;
      const picked = buildTopOpportunities().find((item) => item.asset.symbol === selectedAsset.symbol);
      resetOrderFieldsForAssetDirection(selectedAsset, picked?.direction || "WAIT");
      applyVolumeFirstTargets();
      renderAssets();
      calculate();
    });
  });
}

async function calculate() {
  const symbol = document.getElementById("symbol").value.trim().toUpperCase();
  selectedAsset = selectedAssetFromForm();
  applyVolumeFirstTargets();
  const riskPct = getEffectiveRiskPct();
  const payload = {
    symbol,
    direction: document.getElementById("direction").value,
    account_balance: Number(document.getElementById("account-balance").value || 0),
    risk_pct: riskPct,
    entry_price: Number(document.getElementById("entry-price").value || 0),
    stop_price: Number(document.getElementById("stop-price").value || 0),
    take_profit_price: Number(document.getElementById("take-profit-price").value || 0) || null,
    requested_volume: Number(document.getElementById("requested-volume").value || 0) || null,
  };
  saveConfigLocal();
  document.getElementById("risk-usd-pill").textContent = money(payload.account_balance * payload.risk_pct / 100);
  renderRiskModeNote();
  renderLeverageCapacity();
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
  renderBestDecisionNote();
  renderTopOpportunities();
  notifyIfNeeded();
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function currentConfigPayload() {
  const accountBalance = Number(document.getElementById("account-balance").value || defaultAccountBalance);
  const riskPct = getEffectiveRiskPct();
  const availableCapital = Number(document.getElementById("available-capital").value || 0);
  const openProfit = Number(document.getElementById("open-profit").value || 0);
  const marginLevelPct = Number(document.getElementById("margin-level-pct").value || 0);
  return {
    trade_date: todayKey(),
    balance: accountBalance,
    symbol: document.getElementById("symbol").value.trim().toUpperCase(),
    market_price: Number(document.getElementById("market-price").value || 0),
    entry_price: Number(document.getElementById("entry-price").value || 0),
    stop_price: Number(document.getElementById("stop-price").value || 0),
    take_profit_price: Number(document.getElementById("take-profit-price").value || 0),
    requested_volume: Number(document.getElementById("requested-volume").value || 0) || null,
    direction: document.getElementById("direction").value,
    expiry_mode: document.getElementById("expiry-mode").value,
    risk_mode: riskModeValue(),
    target_value: Number((accountBalance * riskPct / 100 * 2).toFixed(2)),
    target_type: "money",
    monthly_contribution: 0,
    daily_profit: openProfit,
    invested_accumulated: 0,
    monthly_invested: 0,
    gains_accumulated: 0,
    daily_gains: openProfit,
    available_capital: availableCapital,
    margin_level_pct: marginLevelPct,
    open_profit: openProfit,
    risk_pct: riskPct,
    notes: "Auto postback Decision Engine XTB",
  };
}

function saveConfigLocal() {
  localStorage.setItem("decision_engine_config", JSON.stringify(currentConfigPayload()));
}

function dailyCapitalPayload() {
  const config = currentConfigPayload();
  return {
    trade_date: config.trade_date,
    balance: config.balance,
    target_value: config.target_value,
    target_type: config.target_type,
    monthly_contribution: 0,
    daily_profit: config.open_profit,
    invested_accumulated: 0,
    monthly_invested: 0,
    gains_accumulated: 0,
    daily_gains: config.open_profit,
    available_capital: config.available_capital,
    margin_level_pct: config.margin_level_pct,
    open_profit: config.open_profit,
    risk_pct: config.risk_pct,
    notes: "Intradia XTB: patrimonio, disponible, beneficio abierto, margen y riesgo.",
  };
}

function loadConfigLocal() {
  try {
    const config = JSON.parse(localStorage.getItem("decision_engine_config") || "null");
    const alreadyMigrated = localStorage.getItem("decision_engine_defaults_version") === defaultsVersion;
    if (!config) {
      document.getElementById("account-balance").value = defaultAccountBalance;
      document.getElementById("risk-pct").value = "dynamic";
      localStorage.setItem("decision_engine_defaults_version", defaultsVersion);
      return;
    }
    if (config.balance) document.getElementById("account-balance").value = config.balance;
    if (config.risk_mode) document.getElementById("risk-pct").value = config.risk_mode;
    else if (config.risk_pct) document.getElementById("risk-pct").value = String(config.risk_pct);
    if (config.available_capital !== undefined) document.getElementById("available-capital").value = config.available_capital;
    if (config.margin_level_pct !== undefined) document.getElementById("margin-level-pct").value = config.margin_level_pct;
    if (config.open_profit !== undefined) document.getElementById("open-profit").value = config.open_profit;
    if (config.symbol) document.getElementById("symbol").value = config.symbol;
    if (config.direction) document.getElementById("direction").value = config.direction;
    if (config.market_price) document.getElementById("market-price").value = config.market_price;
    if (config.entry_price) document.getElementById("entry-price").value = config.entry_price;
    if (config.stop_price) document.getElementById("stop-price").value = config.stop_price;
    if (config.take_profit_price) document.getElementById("take-profit-price").value = config.take_profit_price;
    if (config.requested_volume) document.getElementById("requested-volume").value = config.requested_volume;
    if (config.expiry_mode) document.getElementById("expiry-mode").value = config.expiry_mode;
    if (!alreadyMigrated) {
      document.getElementById("account-balance").value = defaultAccountBalance;
      document.getElementById("risk-pct").value = "dynamic";
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

function renderLeverageCapacity() {
  const balance = Number(document.getElementById("account-balance")?.value || defaultAccountBalance);
  const available = Number(document.getElementById("available-capital")?.value || 0);
  const leverage = cfdLeverageRatio();
  const riskPct = getEffectiveRiskPct();
  const riskUsd = balance * riskPct / 100;
  const targetUsd = riskUsd * 2;
  const nominalByBalance = balance * leverage;
  const nominalByAvailable = (available || balance) * leverage;
  const box = document.getElementById("leverage-capacity");
  if (!box) return;
  box.innerHTML = `
    <p class="text-xs font-bold uppercase text-gold">Capacidad CFD 1:${numberText(leverage)}</p>
    <div class="mt-2 grid gap-2">
      <div class="summary-row"><span>Capital real</span><strong>${money(balance)}</strong></div>
      <div class="summary-row"><span>Garantia estimada</span><strong>${cfdMarginPct()}%</strong></div>
      <div class="summary-row"><span>Nominal por capital</span><strong>${money(nominalByBalance)}</strong></div>
      <div class="summary-row"><span>Nominal por disponible</span><strong>${money(nominalByAvailable)}</strong></div>
      <div class="summary-row"><span>Riesgo / meta</span><strong>${riskPct}% = ${money(riskUsd)} / ${money(targetUsd)}</strong></div>
    </div>
    <p class="mt-2 text-xs text-zinc-500">El nominal ayuda a saber si cabe por margen. El riesgo maximo sigue siendo ${money(riskUsd)}.</p>
  `;
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
      if (payload.latest.risk_pct && riskModeValue() !== "dynamic") document.getElementById("risk-pct").value = String(payload.latest.risk_pct);
      if (payload.latest.available_capital !== undefined) document.getElementById("available-capital").value = payload.latest.available_capital;
      if (payload.latest.margin_level_pct !== undefined) document.getElementById("margin-level-pct").value = payload.latest.margin_level_pct;
      if (payload.latest.open_profit !== undefined) document.getElementById("open-profit").value = payload.latest.open_profit;
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
  const payload = dailyCapitalPayload();
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
  const normalizedRiskPct = Math.max(minAiRiskPct, Math.min(maxAiRiskPct, Number(payload.risk_pct || defaultRiskPct)));
  const riskAmount = payload.account_balance * normalizedRiskPct / 100;
  const rawVolume = riskAmount / (distance * asset.multiplier);
  const capitalVolume = payload.account_balance / (payload.entry_price * asset.multiplier);
  const autoVolume = roundVolumeForXtb(rawVolume, asset);
  const volume = payload.requested_volume ? roundVolumeForXtb(payload.requested_volume, asset) : autoVolume;
  const volumeBasis = payload.requested_volume ? "manual" : "riesgo";
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
    auto_volume: autoVolume,
    requested_volume: payload.requested_volume ? volume : null,
    volume_basis: volumeBasis,
    volume,
    position_value: positionValue,
    capital_usage_pct: capitalUsagePct,
    expected_loss: Number((distance * asset.multiplier * volume).toFixed(2)),
    expected_profit: Number((Math.abs(takeProfit - payload.entry_price) * asset.multiplier * volume).toFixed(2)),
    risk_ok: Number((distance * asset.multiplier * volume).toFixed(2)) <= Number(riskAmount.toFixed(2)),
    risk_excess: Number(Math.max((distance * asset.multiplier * volume) - riskAmount, 0).toFixed(2)),
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
  const positionValue = lastResult?.position_value ?? 0;
  const availableCapital = Number(document.getElementById("available-capital").value || 0);
  const marginRequired = positionValue * cfdMarginPct() / 100;
  const timing = marketTimingProfile();
  if (timing.quality === "NO OPERAR") {
    warnings.push({ level: "danger", message: `HORARIO NO CONFIABLE: ${timing.message}` });
  } else if (["ALTA VOLATILIDAD", "BAJA CALIDAD", "CIERRE VOLATIL"].includes(timing.quality)) {
    warnings.push({ level: "info", message: `FILTRO HORARIO: ${timing.message}` });
  }
  if (availableCapital > 0 && marginRequired > availableCapital) {
    warnings.push({ level: "danger", message: `NO OPERAR: margen estimado ${money(marginRequired)} supera tu capital disponible ${money(availableCapital)}. El apalancamiento no evita este bloqueo.` });
  }
  if (lastResult?.requested_volume && !lastResult.risk_ok) {
    warnings.push({ level: "danger", message: `NO OPERAR ASI: con volumen ${numberText(lastResult.volume)} pierdes aprox. ${money(lastResult.expected_loss)}, que supera tu riesgo permitido de ${money(lastResult.risk_amount)} por ${money(lastResult.risk_excess)}.` });
  }
  if (lastResult?.requested_volume && lastResult.entry_price) {
    const stopDistance = Math.abs(lastResult.entry_price - lastResult.stop_loss);
    const stopPct = stopDistance / lastResult.entry_price * 100;
    const minimum = minStopPct(lastResult.asset);
    if (stopPct < minimum) {
      warnings.push({ level: "danger", message: `STOP MUY CERCANO: con volumen ${numberText(lastResult.volume)} el stop queda a ${numberText(stopPct)}% del precio. Minimo sugerido para este activo: ${numberText(minimum)}%. Baja volumen o espera mejor entrada.` });
    }
  }
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
    updateNotificationStatus("Alertas IA: tu navegador no las soporta.");
    return;
  }
  const permission = await Notification.requestPermission();
  notificationsEnabled = permission === "granted";
  updateNotificationStatus(notificationsEnabled ? "Alertas IA: activas cuando una receta sea OPERABLE." : "Alertas IA: permiso no concedido.");
}

function notifyIfNeeded() {
  if (!notificationsEnabled || !lastResult || !("Notification" in window)) return;
  const ai = buildAiConfirmation();
  if (ai.status !== "OPERABLE") return;
  const timing = marketTimingProfile();
  const body = `${lastResult.asset.symbol} ${lastResult.order_type}: entrada ${numberText(lastResult.entry_price)}, stop ${numberText(lastResult.stop_loss)}, meta ${numberText(lastResult.take_profit)}, volumen ${numberText(lastResult.volume)}. Riesgo ${lastResult.risk_pct}%. ${timing.quality}.`;
  const key = `ai-operable:${lastResult.asset.symbol}:${lastResult.order_type}:${lastResult.entry_price}:${lastResult.stop_loss}:${lastResult.take_profit}:${lastResult.volume}:${lastResult.risk_pct}`;
  if (sessionStorage.getItem("lastDecisionNotification") === key) return;
  sessionStorage.setItem("lastDecisionNotification", key);
  new Notification("MyActions IA: momento operable", { body });
}

function renderTicket() {
  if (!lastResult) return;
  const positionValue = lastResult.position_value ?? Number((lastResult.entry_price * lastResult.multiplier * lastResult.volume).toFixed(2));
  const estimatedMarginPct = cfdMarginPct();
  const estimatedMargin = positionValue * estimatedMarginPct / 100;
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
    ["Margen estimado bloqueado", `${money(estimatedMargin)} (${estimatedMarginPct}%)`, false],
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
  const availableCapital = Number(document.getElementById("available-capital").value || 0);
  const positionValue = lastResult.position_value ?? Number((lastResult.entry_price * lastResult.multiplier * lastResult.volume).toFixed(2));
  const estimatedMarginPct = cfdMarginPct();
  const estimatedMargin = positionValue * estimatedMarginPct / 100;
  const availableAfterMargin = availableCapital ? availableCapital - estimatedMargin : 0;
  const movementAgainst = Math.abs(lastResult.entry_price - lastResult.stop_loss);
  const stopPct = lastResult.entry_price > 0 ? movementAgainst / lastResult.entry_price * 100 : 0;
  document.getElementById("math-summary").innerHTML = `
    <div class="summary-row"><span>Patrimonio total XTB</span><strong>${money(lastResult.account_balance)}</strong></div>
    <div class="summary-row"><span>Capital disponible XTB</span><strong>${money(availableCapital)}</strong></div>
    <div class="summary-row"><span>Riesgo elegido</span><strong>${lastResult.risk_pct}% = ${money(lastResult.risk_amount)}</strong></div>
    <div class="summary-row"><span>Objetivo</span><strong class="text-bull">${money(lastResult.risk_amount * 2)}</strong></div>
    <div class="summary-row"><span>Resultado si toca stop</span><strong class="text-bear">${money(lastResult.expected_loss)}</strong></div>
    <div class="summary-row"><span>Resultado si toca meta</span><strong class="text-bull">${money(lastResult.expected_profit)}</strong></div>
    <div class="summary-row"><span>Distancia stop</span><strong class="${stopPct < minStopPct(lastResult.asset) ? "text-bear" : "text-bull"}">${numberText(movementAgainst)} (${numberText(stopPct)}%)</strong></div>
    <div class="summary-row"><span>Valor nominal operacion</span><strong>${money(positionValue)}</strong></div>
    <div class="summary-row"><span>Margen estimado XTB</span><strong>${money(estimatedMargin)} (${estimatedMarginPct}%)</strong></div>
    <div class="summary-row"><span>Disponible despues margen</span><strong class="${availableAfterMargin < 0 ? "text-bear" : "text-bull"}">${availableCapital ? money(availableAfterMargin) : "Sin dato"}</strong></div>
    <div class="summary-row"><span>Estado del riesgo</span><strong class="${lastResult.risk_ok ? "text-bull" : "text-bear"}">${lastResult.risk_ok ? `Cumple ${lastResult.risk_pct}%` : `Se pasa por ${money(lastResult.risk_excess || 0)}`}</strong></div>
    <div class="rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs text-zinc-300">Recuerda: el margen permite abrir; el stop define cuanto puedes perder.</div>
  `;
}

function bindInputs() {
  ["account-balance", "risk-pct", "entry-price", "stop-price", "take-profit-price", "requested-volume", "expiry-mode", "available-capital", "open-profit", "margin-level-pct"].forEach((id) => {
    document.getElementById(id).addEventListener("input", calculate);
    document.getElementById(id).addEventListener("change", calculate);
  });
  ["account-balance", "entry-price", "requested-volume"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      applyVolumeFirstTargets();
      calculate();
    });
    document.getElementById(id).addEventListener("change", () => {
      applyVolumeFirstTargets();
      calculate();
    });
  });
  document.getElementById("direction").addEventListener("change", () => {
    if (Number(document.getElementById("requested-volume").value || 0) > 0) {
      applyVolumeFirstTargets();
    } else {
      resetOrderFieldsForAsset(selectedAsset);
    }
    renderTopOpportunities();
    calculate();
  });
  document.getElementById("symbol").addEventListener("change", () => {
    selectedAsset = findAsset(document.getElementById("symbol").value.trim().toUpperCase());
    resetOrderForCurrentMode(selectedAsset);
    renderAssets();
    calculate();
  });
  document.getElementById("symbol").addEventListener("input", () => {
    const typedSymbol = document.getElementById("symbol").value.trim().toUpperCase();
    const typedAsset = uniqueAssets().find((asset) => asset.symbol === typedSymbol);
    if (typedAsset) {
      selectedAsset = typedAsset;
      resetOrderForCurrentMode(selectedAsset);
      renderAssets();
      calculate();
    }
  });
  document.getElementById("market-price").addEventListener("change", () => {
    resetOrderFieldsFromMarketInput();
    calculate();
  });
  ["account-balance", "risk-pct", "available-capital", "open-profit", "margin-level-pct"].forEach((id) => {
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
resetOrderForCurrentMode(selectedAsset);
calculate();
refreshLivePrices({ resetSelected: true });
scheduleAutoRefresh();
