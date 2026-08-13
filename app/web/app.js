const assetGroups = {
  favorites: [
    { symbol: "TSM.US", name: "Taiwan Semiconductor CFD", category: "stocks", multiplier: 1, marketPrice: 420.5 },
    { symbol: "NVDA.US", name: "NVIDIA CFD", category: "stocks", multiplier: 1, marketPrice: 172.2 },
    { symbol: "US100", name: "Nasdaq 100 CFD", category: "indices", multiplier: 20, marketPrice: 29500, marginPct: 0.5, volumeStep: 0.01 },
    { symbol: "GOLD", name: "Gold CFD", category: "commodities", multiplier: 100, marketPrice: 3400 },
    { symbol: "BTCUSD", name: "Bitcoin CFD", category: "crypto", multiplier: 1, marketPrice: 62000 },
    { symbol: "AVAX", name: "Avalanche CFD", category: "crypto", multiplier: 1, marketPrice: 6.5, volumeStep: 1 },
  ],
  forex: [
    { symbol: "EURUSD", name: "Euro / US Dollar", category: "forex", multiplier: 100000, marketPrice: 1.09 },
    { symbol: "GBPUSD", name: "British Pound / US Dollar", category: "forex", multiplier: 100000, marketPrice: 1.34 },
    { symbol: "USDJPY", name: "US Dollar / Yen", category: "forex", multiplier: 100000, marketPrice: 148 },
  ],
  indices: [
    { symbol: "US100", name: "Nasdaq 100 CFD", category: "indices", multiplier: 20, marketPrice: 29500, marginPct: 0.5, volumeStep: 0.01 },
    { symbol: "US500", name: "S&P 500 CFD", category: "indices", multiplier: 1, marketPrice: 6500 },
    { symbol: "DE40", name: "DAX 40 CFD", category: "indices", multiplier: 1, marketPrice: 24000 },
  ],
  commodities: [
    { symbol: "GOLD", name: "Gold CFD", category: "commodities", multiplier: 100, marketPrice: 3400 },
    { symbol: "OIL", name: "Oil CFD", category: "commodities", multiplier: 1000, marketPrice: 85 },
    { symbol: "NATGAS", name: "Natural Gas CFD", category: "commodities", multiplier: 30000, marketPrice: 2.9 },
  ],
  crypto: [
    { symbol: "BTCUSD", name: "Bitcoin CFD", category: "crypto", multiplier: 1, marketPrice: 62000 },
    { symbol: "ETHUSD", name: "Ethereum CFD", category: "crypto", multiplier: 1, marketPrice: 3400 },
    { symbol: "AVAX", name: "Avalanche CFD", category: "crypto", multiplier: 1, marketPrice: 6.5, volumeStep: 1 },
    { symbol: "SOL", name: "Solana CFD", category: "crypto", multiplier: 1, marketPrice: 180, volumeStep: 1 },
    { symbol: "XRP", name: "Ripple / XRP CFD", category: "crypto", multiplier: 1, marketPrice: 3, volumeStep: 1 },
    { symbol: "DOGE", name: "Dogecoin CFD", category: "crypto", multiplier: 1, marketPrice: 0.25, volumeStep: 1 },
    { symbol: "ADA", name: "Cardano CFD", category: "crypto", multiplier: 1, marketPrice: 0.85, volumeStep: 1 },
    { symbol: "LINK", name: "Chainlink CFD", category: "crypto", multiplier: 1, marketPrice: 18, volumeStep: 1 },
    { symbol: "DOT", name: "Polkadot CFD", category: "crypto", multiplier: 1, marketPrice: 4.5, volumeStep: 1 },
  ],
  stocks: [
    { symbol: "TSM.US", name: "Taiwan Semiconductor CFD", category: "stocks", multiplier: 1, marketPrice: 420.5 },
    { symbol: "NVDA.US", name: "NVIDIA CFD", category: "stocks", multiplier: 1, marketPrice: 172.2 },
    { symbol: "AMD.US", name: "AMD CFD", category: "stocks", multiplier: 1, marketPrice: 155 },
    { symbol: "AAPL.US", name: "Apple CFD", category: "stocks", multiplier: 1, marketPrice: 230 },
    { symbol: "MSFT.US", name: "Microsoft CFD", category: "stocks", multiplier: 1, marketPrice: 510 },
    { symbol: "GOOGL.US", name: "Alphabet CFD", category: "stocks", multiplier: 1, marketPrice: 185 },
    { symbol: "AMZN.US", name: "Amazon CFD", category: "stocks", multiplier: 1, marketPrice: 225 },
    { symbol: "META.US", name: "Meta Platforms CFD", category: "stocks", multiplier: 1, marketPrice: 720 },
    { symbol: "TSLA.US", name: "Tesla CFD", category: "stocks", multiplier: 1, marketPrice: 320 },
    { symbol: "SPY.US", name: "SPY ETF CFD", category: "stocks", multiplier: 1, marketPrice: 625 },
    { symbol: "QQQ.US", name: "QQQ ETF CFD", category: "stocks", multiplier: 1, marketPrice: 570 },
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

const defaultAccountBalance = 2016;
const defaultRiskPct = 0.5;
const focusSymbol = "US100";
const defaultTargetProfitUsd = 100;
const defaultStopRiskUsd = 100;
const minAiRiskPct = 0.25;
const maxAiRiskPct = 1;
const maxPlannedTrades = 1;
const operationTargetPct = { 1: 0.75, 2: 0.5, 3: 0.25, 4: 0.25 };
const extensionProfitFactor = 0.4;
const baseProfitShareOfDay = 0.6;
const noStopMode = false;
const defaultsVersion = "capital-itinerary-4ops-1pct-stops-v5";
const chartFrameOptions = {
  "1m": { key: "1m", label: "1M / 30m", interval: "1m", period: "1d", limit: 30, description: "Ultimos 30 minutos, velas de 1 minuto." },
  "15m": { key: "15m", label: "15M / 4h", interval: "15m", period: "5d", limit: 16, description: "Confirmacion operativa, ultimas 4 horas con velas de 15 minutos." },
  "4h": { key: "4h", label: "4H / varios dias", interval: "1h", period: "1mo", limit: 30, aggregateHours: 4, description: "Mapa grande: rango, liquidez y tendencia con velas de 4 horas." },
};

let activeCategory = "favorites";
let selectedAsset = findAsset(focusSymbol);
let lastResult = null;
let notificationsEnabled = false;
let postbackTimer = null;
let autoRefreshTimer = null;
let lastResetSymbol = selectedAsset.symbol;
let liveQuotes = {};
let marketBars = {};
let marketBarMeta = {};
let marketBarsByFrame = {};
let marketBarMetaByFrame = {};
let liveCandleBars = {};
let xtbTicketValidation = null;
let manualOpportunityLockUntil = 0;
const manualOpportunityLockMs = 3 * 60 * 1000;
let currentDashboardUser = "default";
let autoLearningTimer = null;
let analysisCountdownTimer = null;
let activeRecipeTimer = null;
let lastAutoLessonKey = "";
let lastXtbAccountSyncKey = "";
let lessonMemorySummary = null;
const us100SessionStartMinute = 6 * 60;

function storageKey(key) {
  return `${key}:${currentDashboardUser}`;
}

function getLocalValue(key) {
  return localStorage.getItem(storageKey(key)) ?? localStorage.getItem(key);
}

function setLocalValue(key, value) {
  localStorage.setItem(storageKey(key), value);
}

function removeLocalValue(key) {
  localStorage.removeItem(storageKey(key));
}

function chartFrameKey() {
  const stored = getLocalValue("chart-frame-key") || "1m";
  return chartFrameOptions[stored] ? stored : "1m";
}

function chartFrameConfig() {
  return chartFrameOptions[chartFrameKey()] || chartFrameOptions["1m"];
}

function nyDateParts(dateInput = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(dateInput)).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    minuteOfDay: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function formatMinuteOfDay(totalMinutes) {
  const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.round(totalMinutes)));
  const hour = Math.floor(clamped / 60);
  const minute = clamped % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function parseTimeToMinute(value, fallback = us100SessionStartMinute) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = clamp(Number(match[1]), 0, 23);
  const minute = clamp(Number(match[2]), 0, 59);
  return hour * 60 + minute;
}

function thesisConfig() {
  const mode = getLocalValue("us100_thesis_mode") || "rolling";
  const startMinute = parseTimeToMinute(getLocalValue("us100_thesis_start") || "06:00");
  const blockHours = clamp(Number(getLocalValue("us100_thesis_hours") || 4), 2, 6);
  return {
    mode: mode === "fixed" ? "fixed" : "rolling",
    startMinute,
    startTime: formatMinuteOfDay(startMinute),
    blockHours,
    blockMinutes: blockHours * 60,
  };
}

function setChartFrame(key) {
  if (!chartFrameOptions[key]) return;
  setLocalValue("chart-frame-key", key);
}

function isAgentArmed() {
  return getLocalValue("decision_engine_agent_armed") === "true";
}

function isAgentTradeAuthorized() {
  return getLocalValue("decision_engine_agent_trade_authorized") === "true";
}

function technicalAnalysisState() {
  const startedAt = Number(getLocalValue("decision_engine_analysis_started_at") || 0);
  const graphEnabled = startedAt > 0 || getLocalValue("decision_engine_analysis_graph_enabled") === "true";
  const now = Date.now();
  const elapsedMs = startedAt ? Math.max(0, now - startedAt) : 0;
  const remainingMs = 0;
  const completed = Boolean(startedAt);
  return {
    startedAt,
    graphEnabled,
    elapsedMs,
    remainingMs,
    completed,
    running: Boolean(startedAt && !completed),
  };
}

function formatTimer(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function startTechnicalAnalysis() {
  setLocalValue("decision_engine_analysis_started_at", String(Date.now()));
  setLocalValue("decision_engine_analysis_graph_enabled", "true");
  setAgentArmed(true);
  setAgentTradeAuthorized(false);
  setChartFrame("1m");
  saveAutoLearningSnapshot(true);
  loadAnalysisTimeframes().then(() => renderSimpleDashboard());
  renderSimpleDashboard();
}

function resetTechnicalAnalysis() {
  removeLocalValue("decision_engine_analysis_started_at");
  removeLocalValue("decision_engine_analysis_graph_enabled");
  setAgentTradeAuthorized(false);
  renderSimpleDashboard();
}

function enableTechnicalChart() {
  setLocalValue("decision_engine_analysis_graph_enabled", "true");
  loadAnalysisTimeframes().then(() => renderSimpleDashboard());
}

function setAgentArmed(value) {
  setLocalValue("decision_engine_agent_armed", value ? "true" : "false");
  if (!value) setAgentTradeAuthorized(false);
  updateAgentLoop();
  renderSimpleDashboard();
}

function setAgentTradeAuthorized(value) {
  setLocalValue("decision_engine_agent_trade_authorized", value ? "true" : "false");
  updateAgentLoop();
  renderSimpleDashboard();
}

async function loadCurrentDashboardUser() {
  try {
    const response = await fetch("/auth/me", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    currentDashboardUser = payload.username || "default";
  } catch {
    currentDashboardUser = "default";
  }
}

function favoriteSymbols() {
  return [focusSymbol];
}

function setFavoriteSymbols(symbols) {
  setLocalValue("decision_engine_favorites", JSON.stringify(Array.from(new Set(symbols))));
}

function getFavoriteAssets() {
  return favoriteSymbols().map(findAsset);
}

function ensureDefaultFavorites() {
  setFavoriteSymbols([focusSymbol]);
}

function money(value) {
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function numberText(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function priceText(value) {
  return Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function normalizeDecimalInput(value) {
  return String(value ?? "").trim().replace(/\s+/g, "").replace(",", ".");
}

function decimalNumber(value, fallback = 0) {
  const parsed = Number(normalizeDecimalInput(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function decimalValueById(id, fallback = 0) {
  return decimalNumber(document.getElementById(id)?.value, fallback);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cfdMarginPct(asset = selectedAssetFromForm?.() || selectedAsset) {
  return Number(asset?.marginPct || 20);
}

function cfdLeverageRatio(asset = selectedAssetFromForm?.() || selectedAsset) {
  return 100 / cfdMarginPct(asset);
}

function targetProfitUsd() {
  const raw = decimalValueById("target-profit-usd", defaultTargetProfitUsd);
  const allowed = [50, 100, 150, 200];
  if (!Number.isFinite(raw) || raw <= 0) return defaultTargetProfitUsd;
  return allowed.includes(raw) ? raw : 50;
}

function allowedTargetsForConfidence(confidence) {
  const score = Number(confidence || 0);
  const targets = [50];
  if (score >= 65) targets.push(100);
  if (score >= 78) targets.push(150);
  if (score >= 88) targets.push(200);
  return targets;
}

function automaticTargetUsdForOperability(confidence) {
  const allowedTargets = allowedTargetsForConfidence(confidence);
  return allowedTargets[allowedTargets.length - 1] || 50;
}

function targetPolicyForOperability(requestedTarget, confidence) {
  const requested = requestedTarget === undefined || requestedTarget === null
    ? automaticTargetUsdForOperability(confidence)
    : Number(requestedTarget || defaultTargetProfitUsd);
  const allowedTargets = allowedTargetsForConfidence(confidence);
  const cap = allowedTargets[allowedTargets.length - 1] || 50;
  const target = Math.min(requested, cap);
  return {
    allowedTargets,
    cap,
    target,
    requested,
    capped: requested > cap,
    text: `Meta permitida por operabilidad ${Math.round(confidence)}%: maximo ${money(cap)}.`,
  };
}

function automaticStopUsdForTarget(targetUsd = targetProfitUsd()) {
  const target = Number(targetUsd || defaultTargetProfitUsd);
  if (target <= 50) return 50;
  return 100;
}

function stopRiskUsd() {
  return automaticStopUsdForTarget(targetProfitUsd());
}

function us100PointValue(volume) {
  return Number(volume || 0) * findAsset(focusSymbol).multiplier;
}

function minimumStopPointsForAsset(asset) {
  if (asset.symbol === "US100") return 20;
  if (asset.category === "indices") return 15;
  if (asset.category === "commodities") return asset.symbol === "NATGAS" ? 0.06 : 0.35;
  return Math.max(Number(asset.marketPrice || 1) * volatilityStopPct(asset) / 100, 0.01);
}

function minStopPct(asset) {
  if (asset.category === "forex") return 0.08;
  if (asset.category === "crypto") return 0.8;
  if (asset.category === "indices") return 0.35;
  if (asset.category === "commodities") return 0.45;
  return 0.75;
}

function volatilityStopPct(asset) {
  const liveMove = Math.abs(Number(asset.liveChangePct ?? 0));
  return Math.max(minStopPct(asset), liveMove * 0.35);
}

function riskModeValue() {
  return "dynamic";
}

function aiDirectionForAsset(asset) {
  const driftPct = Number(asset.liveChangePct ?? 0);
  if (driftPct <= -0.35) return "SHORT";
  if (driftPct >= 0.35) return "LONG";
  return driftPct < 0 ? "SHORT" : "LONG";
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
  const selectedDirection = aiDirectionForAsset(asset);
  const driftPct = Number(asset.liveChangePct ?? 0);
  const driftDirection = directionFromMove(driftPct);
  const balance = Number(document.getElementById("account-balance")?.value || defaultAccountBalance);
  const available = Number(document.getElementById("available-capital")?.value || 0);
  const openProfit = Number(document.getElementById("open-profit")?.value || 0);
  const marginLevel = Number(document.getElementById("margin-level-pct")?.value || 0);
  const entry = Number(document.getElementById("entry-price")?.value || 0);
  const stop = Number(document.getElementById("stop-price")?.value || 0);
  const stopPct = entry > 0 ? Math.abs(entry - stop) / entry * 100 : 0;
  const minimumStopPct = volatilityStopPct(asset);
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
  return buildDailyTradePlan().currentTradeRiskPct;
}

function extensionTradesAllowed() {
  const { total } = coMarketMinutes();
  const op1 = Number(document.getElementById("operation1-result")?.value || 0);
  const op2 = Number(document.getElementById("operation2-result")?.value || 0);
  return op1 > 0 && op2 > 0 && total < 10 * 60 + 30;
}

function xtbCostPerOperation() {
  const raw = Number(document.getElementById("xtb-cost-per-operation")?.value || 0);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function operationStrategy(slot) {
  const target = targetProfitUsd();
  const stop = stopRiskUsd();
  const strategies = {
    1: {
      label: "Operacion 1",
      entryTime: "Despues de confirmacion",
      closeTime: "Cierre manual si pierde patron",
      targetPct: 0,
      stopPct: 0,
      targetUsd: target,
      stopUsd: stop,
      condition: `US100 unico: objetivo ${money(target)} y escudo ${money(stop)}. Abrir solo con patron confirmado y spread razonable.`,
    },
    2: {
      label: "Operacion 2",
      entryTime: "9:30",
      closeTime: "12:30",
      targetPct: operationTargetPct[2],
      stopPct: 0.5,
      targetUsd: target,
      stopUsd: stop,
      condition: "Operacion secundaria deshabilitada en modo US100. Usa una sola decision limpia.",
    },
    3: {
      label: "Operacion 3",
      entryTime: "10:00",
      closeTime: "13:30",
      targetPct: operationTargetPct[3],
      stopPct: 1,
      targetUsd: target,
      stopUsd: stop,
      condition: "Operacion secundaria deshabilitada en modo US100. Usa una sola decision limpia.",
    },
    4: {
      label: "Operacion 4",
      entryTime: "10:30",
      closeTime: "14:30",
      targetPct: operationTargetPct[4],
      stopPct: 1,
      targetUsd: target,
      stopUsd: stop,
      condition: "Operacion secundaria deshabilitada en modo US100. Usa una sola decision limpia.",
    },
  };
  return strategies[Number(slot)] || strategies[1];
}

function buildDailyTradePlan() {
  const accountBalance = Number(document.getElementById("account-balance")?.value || defaultAccountBalance);
  const estimatedXtbCost = xtbCostPerOperation();
  const extensionEnabled = extensionTradesAllowed();
  const plannedTrades = maxPlannedTrades;
  const currentSlot = "1";
  const contractTargetValue = accountBalance;
  const currentStrategy = operationStrategy(currentSlot);
  const fixedTarget = targetProfitUsd();
  const fixedStop = stopRiskUsd();
  const tradeTargets = Object.fromEntries(
    [1, 2, 3, 4].map((slot) => {
      return [slot, slot === 1 ? fixedTarget : 0];
    })
  );
  const baseTargetAmount = Object.values(tradeTargets).reduce((total, amount) => total + amount, 0);
  const fullDayTargetAmount = baseTargetAmount;
  const extensionTargetAmount = tradeTargets[3] + tradeTargets[4];
  const stopTargets = {
    1: fixedStop,
    2: 0,
    3: 0,
    4: 0,
  };
  const grossTradeTargets = Object.fromEntries(
    Object.entries(tradeTargets).map(([slot, amount]) => [slot, amount + estimatedXtbCost])
  );
  const currentTradeNetTargetAmount = tradeTargets[currentSlot] || tradeTargets[1];
  const currentTradeRiskAmount = grossTradeTargets[currentSlot] || grossTradeTargets[1];
  const currentTradeStopAmount = stopTargets[currentSlot] || 0;
  const currentTradeRiskPct = accountBalance > 0 ? currentTradeRiskAmount / accountBalance * 100 : defaultRiskPct;
  return {
    baseRiskPct: accountBalance > 0 ? Number((baseTargetAmount / accountBalance * 100).toFixed(4)) : defaultRiskPct,
    dailyRiskAmount: baseTargetAmount + estimatedXtbCost * maxPlannedTrades,
    plannedTrades,
    currentSlot,
    firstRiskAmount: grossTradeTargets[1],
    secondRiskAmount: grossTradeTargets[2],
    thirdRiskAmount: grossTradeTargets[3],
    fourthRiskAmount: grossTradeTargets[4],
    firstNetTargetAmount: tradeTargets[1],
    secondNetTargetAmount: tradeTargets[2],
    thirdNetTargetAmount: tradeTargets[3],
    fourthNetTargetAmount: tradeTargets[4],
    currentTradeRiskAmount,
    currentTradeNetTargetAmount,
    currentTradeStopAmount,
    currentTradeStopPct: accountBalance > 0 ? Number((fixedStop / accountBalance * 100).toFixed(4)) : 0,
    currentStrategy,
    operationStrategies: [1, 2, 3, 4].map(operationStrategy),
    currentTradeRiskPct: Number(currentTradeRiskPct.toFixed(4)),
    contractTargetValue,
    baseTradeTargetAmount: tradeTargets[1],
    baseTargetAmount,
    grossBaseTargetAmount: baseTargetAmount + estimatedXtbCost * maxPlannedTrades,
    fullDayTargetAmount,
    extensionTargetAmount,
    grossExtensionTargetAmount: extensionTargetAmount + estimatedXtbCost * 2,
    estimatedXtbCost,
    extensionEnabled,
    dailyNetTargetAmount: baseTargetAmount,
    dailyTargetAmount: baseTargetAmount + estimatedXtbCost * plannedTrades,
  };
}

function renderRiskModeNote() {
  renderAiDecisionSummary();
  renderTradeSchedule();
}

function renderAiDecisionSummary() {
  const target = document.getElementById("ai-decision-summary");
  if (!target) return;
  const asset = selectedAssetFromForm();
  const plan = buildDailyTradePlan();
  const direction = effectiveDirectionForSlot(asset, plan.currentSlot);
  const driftDirection = directionFromMove(Number(asset.liveChangePct ?? 0));
  const action = driftDirection === "WAIT" ? "ESPERAR CONFIRMACION" : labelFromDirection(direction);
  const volumeText = lastResult ? formatVolumeForXtb(lastResult.volume, lastResult.asset) : "Calculando";
  const lossText = lastResult ? money(lastResult.expected_loss) : "Calculando";
  const profitText = lastResult ? money(lastResult.expected_profit) : "Calculando";
  const stopText = lastResult && lastResult.stop_loss ? `${numberText(lastResult.stop_loss)} / ${money(lastResult.expected_loss)}` : "Sin stop";
  const management = tradeManagementProfile(lastResult);
  target.innerHTML = `
    <p class="text-xs font-black uppercase text-sky-300">Decision automatica IA</p>
    <div class="mt-2 grid gap-2">
      <div class="summary-row"><span>Direccion sugerida</span><strong>${action}</strong></div>
      <div class="summary-row"><span>Meta receta actual</span><strong>Op ${plan.currentSlot}: neto ${money(plan.currentTradeNetTargetAmount)} / bruto ${money(plan.currentTradeRiskAmount)}</strong></div>
      <div class="summary-row"><span>Plan del dia</span><strong>${plan.plannedTrades} operaciones / neto ${money(plan.dailyNetTargetAmount)}</strong></div>
      <div class="summary-row"><span>Operacion 1</span><strong>Neto ${money(plan.firstNetTargetAmount)} / bruto ${money(plan.firstRiskAmount)}</strong></div>
      <div class="summary-row"><span>Operacion 2</span><strong>Neto ${money(plan.secondNetTargetAmount)} / bruto ${money(plan.secondRiskAmount)}</strong></div>
      <div class="summary-row"><span>Operacion 3</span><strong>Neto ${money(plan.thirdNetTargetAmount)} / stop 1% si Op1 gano</strong></div>
      <div class="summary-row"><span>Operacion 4</span><strong>Neto ${money(plan.fourthNetTargetAmount)} / stop 1% si Op1 y Op2 ganaron</strong></div>
      <div class="summary-row"><span>Costo XTB estimado</span><strong>${money(plan.estimatedXtbCost)} por operacion</strong></div>
      <div class="summary-row"><span>Contrato buscado</span><strong>${money(plan.contractTargetValue)}</strong></div>
      <div class="summary-row"><span>Volumen IA</span><strong>${volumeText}</strong></div>
      <div class="summary-row"><span>Stop / objetivo</span><strong>${stopText} / ${profitText}</strong></div>
      <div class="summary-row"><span>Horario</span><strong>${marketTimingProfile().quality}</strong></div>
      <div class="summary-row"><span>Gestion ahora</span><strong>${management.action}</strong></div>
      <div class="summary-row"><span>Fecha limite</span><strong>${management.deadline}</strong></div>
    </div>
    <p class="mt-2 text-xs text-zinc-300">${management.message}</p>
    <p class="mt-2 text-xs text-zinc-400">Itinerario: Op1 busca 0.75%, Op2 0.5%, Op3 0.25% y Op4 0.25% del capital operativo.</p>
  `;
}

function tradeSchedulePlan() {
  const { weekday, total } = coMarketMinutes();
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const op1Open = 9 * 60;
  const op2Open = 9 * 60 + 30;
  const op3Open = 10 * 60;
  const op4Open = 10 * 60 + 30;
  const op1Close = 10 * 60 + 30;
  const op2Close = 12 * 60 + 30;
  const op3Close = 13 * 60 + 30;
  const op4Close = 14 * 60 + 30;
  const op1 = Number(document.getElementById("operation1-result")?.value || 0);
  const op2 = Number(document.getElementById("operation2-result")?.value || 0);
  const started = startedOperations();
  const op1Started = Boolean(started["1"]);
  const op2Started = Boolean(started["2"]);

  if (!isWeekday || total < 8 * 60 + 45 || total >= 15 * 60) {
    return {
      title: "Mercado cerrado",
      now: "Prepara lista, no abras operaciones.",
      first: "Op1: 9:00 Colombia, sin stop, cierre 10:30 si no llega a meta.",
      second: "Op2: 9:30 solo si Op1 esta abierta y favorable; stop 0.5%, cierre 12:30.",
      stop: "Op3: 10:00 si Op1 gano; Op4: 10:30 si Op1 y Op2 ganaron.",
      close: "Todas las operaciones requieren confirmacion manual en XTB.",
      tone: "muted",
    };
  }
  if (total < op1Open) {
    return {
      title: "Esperar 9:00",
      now: `No abrir todavia. Faltan ${formatMinutesUntil(op1Open, total)} para Op1.`,
      first: "Op1: preparar mejor activo, direccion, volumen, contrato real XTB y meta 1%.",
      second: "Op2: queda bloqueada hasta 9:30 y solo si Op1 va favorable.",
      stop: "Validar ticket XTB visible: contrato real, spread y multiplicador.",
      close: "No enviar orden si no vas a vigilarla.",
      tone: "danger",
    };
  }
  if (total < op2Open) {
    return {
      title: "Op1 habilitada",
      now: "Op1 puede abrirse manualmente si esta OPERABLE y XTB valida contrato/spread.",
      first: "Op1: contrato cercano al capital, objetivo 0.75%, sin stop.",
      second: `Op2: esperar ${formatMinutesUntil(op2Open, total)}; solo si Op1 esta favorable.`,
      stop: "Op1 sin stop: cierre manual 10:30 si no toca meta.",
      close: `Cierre Op1 si no llega a meta: ${formatMinutesUntil(op1Close, total)}.`,
      tone: "ok",
    };
  }
  if (total < op3Open) {
    return {
      title: "Op2 condicionada",
      now: op1Started ? "Op2 puede abrirse si Op1 sigue abierta y favorable." : "Op2 bloqueada: marca Op1 iniciada y valida que vaya favorable.",
      first: "Op1: mantener hasta meta o cierre 10:30.",
      second: "Op2: contrato cercano al capital, objetivo 0.5%, stop 0.5%.",
      stop: "Para SHORT el stop va arriba de entrada; para LONG va abajo.",
      close: `Cierre Op2 si no llega a meta: ${formatMinutesUntil(op2Close, total)}.`,
      tone: "warning",
    };
  }
  if (total < op4Open) {
    return {
      title: "Op3 condicionada",
      now: op1 > 0 ? "Op3 puede abrirse: Op1 cerro exitosa." : "Op3 bloqueada hasta que Op1 cierre con ganancia.",
      first: "Op3: contrato cercano al capital, objetivo 0.25%, stop 1%.",
      second: op2Started ? "Op2: gestionar hasta meta o cierre 12:30." : "Op2: no abrir si no cumplio condicion.",
      stop: "Validar contrato real XTB antes de confirmar.",
      close: `Cierre Op3 si no llega a meta: ${formatMinutesUntil(op3Close, total)}.`,
      tone: "warning",
    };
  }
  if (total < op4Close) {
    return {
      title: "Op4 condicionada / gestion",
      now: op1 > 0 && op2 > 0 ? "Op4 puede abrirse: Op1 y Op2 cerraron exitosas." : "Op4 bloqueada si Op1 y Op2 no estan ganadoras.",
      first: "Op4: contrato cercano al capital, objetivo 0.25%, stop 1%.",
      second: "Gestionar cierres: Op2 12:30, Op3 13:30, Op4 14:30 si no tocaron meta.",
      stop: "No abrir si spread real supera la meta o contrato real supera capital * 1.2.",
      close: `Cierre final Op4: ${formatMinutesUntil(op4Close, total)}.`,
      tone: "warning",
    };
  }
  return {
    title: "Fin de itinerario",
    now: "No abrir nuevas. Cerrar manualmente cualquier operacion pendiente.",
    first: "Op1/Op2/Op3/Op4 deben quedar cerradas o justificadas manualmente.",
    second: "Registrar resultado USD de cada operacion.",
    stop: "Revisar aprendizaje del dia.",
    close: "Plan finalizado.",
    tone: "danger",
  };
}

function renderTradeSchedule() {
  const target = document.getElementById("trade-schedule");
  if (!target) return;
  const plan = tradeSchedulePlan();
  const toneClass = plan.tone === "ok"
    ? "border-bull/50 bg-bull/10 text-bull"
    : plan.tone === "danger"
      ? "border-bear/50 bg-bear/10 text-bear"
      : plan.tone === "warning"
        ? "border-gold/40 bg-gold/10 text-gold"
        : "border-white/10 bg-ink text-zinc-300";
  target.className = `rounded-xl border p-3 text-sm ${toneClass}`;
  target.innerHTML = `
    <p class="text-xs font-black uppercase tracking-wide opacity-80">Plan horario del dia</p>
    <p class="mt-2 font-black">${plan.title}</p>
    <div class="mt-2 grid gap-1 text-xs text-zinc-200">
      <p><strong>Ahora:</strong> ${plan.now}</p>
      <p><strong>1:</strong> ${plan.first}</p>
      <p><strong>2:</strong> ${plan.second}</p>
      <p><strong>No abrir:</strong> ${plan.stop}</p>
      <p><strong>Salida:</strong> ${plan.close}</p>
    </div>
  `;
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

function coTimeParts() {
  const now = new Date();
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
}

function coMarketMinutes() {
  const parts = coTimeParts();
  return {
    weekday: parts.weekday,
    total: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

function marketTimingProfile(asset = selectedAssetFromForm()) {
  const { weekday, total } = coMarketMinutes();
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  if (asset?.category === "crypto" && !isWeekday) {
    return {
      quality: "CRIPTO 24/7",
      score: -5,
      riskCap: buildDailyTradePlan().currentTradeRiskPct,
      message: "Fin de semana cripto: puede estar abierto, pero confirma spread y aplica cierre manual.",
    };
  }
  if (!isWeekday || total < 8 * 60 + 45 || total >= 15 * 60) {
    return {
      quality: "CERRADO",
      score: -10,
      riskCap: 0.5,
      message: "Mercado cerrado: solo preparar ordenes, no ejecutar.",
    };
  }
  if (total < 9 * 60) {
    return {
      quality: "NO OPERAR",
      score: -35,
      riskCap: 0.25,
      message: "Antes de 9:00 Colombia: preparar, no ejecutar.",
    };
  }
  if (total < 9 * 60 + 30) {
    return {
      quality: "OP1",
      score: 15,
      riskCap: buildDailyTradePlan().baseRiskPct,
      message: "9:00-9:30 Colombia: solo Op1 si esta OPERABLE y XTB valida contrato/spread.",
    };
  }
  if (total < 10 * 60) {
    return {
      quality: "OP2 CONDICIONADA",
      score: 5,
      riskCap: buildDailyTradePlan().currentTradeRiskPct,
      message: "9:30-10:00 Colombia: Op2 solo si Op1 esta abierta y favorable.",
    };
  }
  if (total < 10 * 60 + 30) {
    return {
      quality: "OP3 CONDICIONADA",
      score: 0,
      riskCap: buildDailyTradePlan().currentTradeRiskPct,
      message: "10:00-10:30 Colombia: Op3 solo si Op1 cerro exitosa.",
    };
  }
  return {
    quality: "GESTION / OP4",
    score: -10,
    riskCap: 0,
    message: "Desde 10:30: Op4 solo si Op1 y Op2 ganaron; gestionar cierres 12:30/13:30/14:30.",
  };
}

function formatMinutesUntil(targetTotal, currentTotal) {
  const minutes = Math.max(0, targetTotal - currentTotal);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest} min`;
  return `${hours}h ${rest}min`;
}

function tradeManagementProfile(result = lastResult) {
  const { weekday, total } = coMarketMinutes();
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const openProfit = Number(document.getElementById("open-profit")?.value || 0);
  const target = result?.expected_profit || buildDailyTradePlan().currentTradeRiskAmount;
  const profitProgress = target > 0 ? openProfit / target : 0;

  if (!isWeekday || total < 8 * 60 + 45 || total >= 15 * 60) {
    return {
      phase: "CERRADO",
      action: "Preparar lista",
      tone: "muted",
      deadline: "Proxima apertura",
      message: "Mercado cerrado: no abrir operaciones nuevas.",
      shouldNotify: false,
    };
  }
  if (total < 9 * 60) {
    return {
      phase: "ESPERAR VENTANA",
      action: "No operar",
      tone: "danger",
      deadline: "9:00 Colombia",
      message: `Faltan ${formatMinutesUntil(9 * 60, total)} para Op1.`,
      shouldNotify: false,
    };
  }
  if (total < 9 * 60 + 30) {
    return {
      phase: "OP1",
      action: "Preparar/Abrir Op1 si OPERABLE",
      tone: "ok",
      deadline: "10:30 Colombia",
      message: "Op1 sin stop: vigilar y cerrar a 10:30 si no llega a meta.",
      shouldNotify: false,
    };
  }
  if (total < 10 * 60) {
    return {
      phase: "OP2",
      action: openProfit > 0 ? "Op2 habilitable" : "Esperar favorable",
      tone: openProfit > 0 ? "ok" : "warning",
      deadline: "12:30 Colombia",
      message: "Op2 solo si Op1 esta abierta y favorable. Stop 0.5%, cierre 12:30 si no toca meta.",
      shouldNotify: false,
    };
  }
  if (total < 10 * 60 + 30) {
    return {
      phase: "OP3",
      action: "Abrir solo si Op1 gano",
      tone: "warning",
      deadline: "13:30 Colombia",
      message: "Op3 condicionada a Op1 exitosa. Stop 1%, cierre 13:30 si no toca meta.",
      shouldNotify: false,
    };
  }
  return {
    phase: "GESTION",
    action: openProfit > 0 && profitProgress < 1 ? "Cerrar si favorece en horario limite" : "Gestionar",
    tone: openProfit < 0 ? "danger" : "warning",
    deadline: "12:30 / 13:30 / 14:30",
    message: "Gestiona cierres por operacion: Op2 12:30, Op3 13:30, Op4 14:30.",
    shouldNotify: openProfit !== 0,
  };
}

function roundVolumeForXtb(volume, asset) {
  const step = volumeStepForXtb(asset);
  if (!Number.isFinite(volume) || volume <= 0) return 0;
  return Number((Math.floor(volume / step) * step).toFixed(volumeDecimalsForXtb(asset)));
}

function volumeStepForXtb(asset) {
  if (asset.volumeStep) return asset.volumeStep;
  if (asset.category === "stocks") return 1;
  return 0.01;
}

function volumeDecimalsForXtb(asset) {
  return volumeStepForXtb(asset) >= 1 ? 0 : 2;
}

function targetContractVolume(asset, entry, balance) {
  const contractTarget = balance || defaultAccountBalance;
  const rawVolume = contractTarget / (entry * asset.multiplier);
  return roundVolumeForXtb(rawVolume, asset);
}

function us100TargetVolume(targetUsd) {
  const target = Number(targetUsd || 0);
  if (target >= 200) return 0.35;
  if (target >= 150) return 0.3;
  if (target >= 100) return 0.25;
  return 0.2;
}

function botUs100SizingPolicy(confidence, marginVolume, asset) {
  const score = Number(confidence || 0);
  const tiers = [
    { min: 88, targetUsd: 200, stopUsd: 100, volume: 0.35, label: "Agresivo: lectura institucional muy fuerte." },
    { min: 78, targetUsd: 150, stopUsd: 75, volume: 0.3, label: "Fuerte: buena lectura, sin usar el maximo." },
    { min: 65, targetUsd: 100, stopUsd: 50, volume: 0.25, label: "Normal: operabilidad clara con relacion 1:2." },
    { min: 0, targetUsd: 50, stopUsd: 50, volume: 0.2, label: "Conservador/base: preparar niveles, no forzar." },
  ];
  const tier = tiers.find((item) => score >= item.min) || tiers.at(-1);
  const maxByMargin = Number(marginVolume || 0);
  const rawVolume = maxByMargin > 0 ? Math.min(tier.volume, maxByMargin) : tier.volume;
  const volume = roundVolumeForXtb(rawVolume, asset);
  const marginLimited = maxByMargin > 0 && volume < tier.volume;
  return {
    ...tier,
    volume,
    requestedVolume: tier.volume,
    marginLimited,
    note: marginLimited
      ? `${tier.label} El margen disponible baja el volumen de ${formatVolumeForXtb(tier.volume, asset)} a ${formatVolumeForXtb(volume, asset)}.`
      : `${tier.label} El bot decide meta ${money(tier.targetUsd)}, escudo ${money(tier.stopUsd)} y volumen ${formatVolumeForXtb(volume, asset)}.`,
  };
}

function preferredUs100Volume(confidence, marginVolume, targetUsd, asset) {
  const desired = us100TargetVolume(targetUsd);
  const confidenceCapped = confidence < 50 ? Math.min(desired, 0.2) : desired;
  const capped = Math.min(confidenceCapped, marginVolume || confidenceCapped);
  return roundVolumeForXtb(Math.max(0, capped), asset);
}

function formatVolumeForXtb(volume, asset) {
  return Number(volume || 0).toFixed(volumeDecimalsForXtb(asset));
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

function normalizeCandleTimestamp(value) {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  safeDate.setSeconds(0, 0);
  return safeDate.toISOString();
}

function mergeCandleRows(rows = []) {
  const byMinute = new Map();
  rows.forEach((row) => {
    const timestamp = normalizeCandleTimestamp(row.timestamp);
    const open = Number(row.open ?? row.o ?? row.close ?? row.c ?? row.price ?? 0);
    const high = Number(row.high ?? row.h ?? open);
    const low = Number(row.low ?? row.l ?? open);
    const close = Number(row.close ?? row.c ?? row.price ?? open);
    if (!open || !high || !low || !close) return;
    const existing = byMinute.get(timestamp);
    if (!existing) {
      byMinute.set(timestamp, {
        symbol: row.symbol,
        timestamp,
        open,
        high,
        low,
        close,
        source: row.source || "chart",
      });
      return;
    }
    existing.high = Math.max(existing.high, high);
    existing.low = Math.min(existing.low, low);
    existing.close = close;
    existing.source = row.source || existing.source;
  });
  return Array.from(byMinute.values()).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
}

function marketFrameKey(symbol, frameKey = chartFrameKey()) {
  return `${String(symbol || "").trim().toUpperCase()}:${frameKey}`;
}

function recordLiveQuoteCandle(quote) {
  const symbol = String(quote.symbol || "").trim().toUpperCase();
  const price = Number(quote.price || 0);
  if (!symbol || !price) return;
  const timestamp = normalizeCandleTimestamp(quote.updated_at);
  const previousRows = liveCandleBars[symbol] || [];
  const existingIndex = previousRows.findIndex((row) => row.timestamp === timestamp);
  let rows = previousRows;
  if (existingIndex >= 0) {
    rows = previousRows.map((row, index) => index === existingIndex ? {
      ...row,
      high: Math.max(Number(row.high || price), price),
      low: Math.min(Number(row.low || price), price),
      close: price,
      source: quote.source || row.source || "xtb_live",
    } : row);
  } else {
    const previousClose = previousRows[previousRows.length - 1]?.close || price;
    rows = [
      ...previousRows,
      {
        symbol,
        timestamp,
        open: previousClose,
        high: Math.max(previousClose, price),
        low: Math.min(previousClose, price),
        close: price,
        source: quote.source || "xtb_live",
      },
    ];
  }
  liveCandleBars[symbol] = mergeCandleRows(rows).slice(-240);
}

function mergedBarsForSymbol(symbol, frameKeyOverride = null) {
  const normalized = String(symbol || "").trim().toUpperCase();
  const key = marketFrameKey(normalized, frameKeyOverride || chartFrameKey());
  const frame = chartFrameOptions[frameKeyOverride || chartFrameKey()] || chartFrameConfig();
  const storedRows = marketBarsByFrame[key] || marketBars[normalized] || [];
  const liveRows = frame.interval === "1m" ? (liveCandleBars[normalized] || []) : [];
  return mergeCandleRows([...storedRows, ...liveRows]);
}

function applyLiveQuote(quote) {
  const price = Number(quote.price || 0);
  if (!price) return;
  liveQuotes[quote.symbol] = { ...(liveQuotes[quote.symbol] || {}), ...quote };
  recordLiveQuoteCandle({ ...quote, price });
  if (String(quote.source || "").startsWith("yfinance")) {
    liveQuotes[quote.symbol].provider_price = price;
  }
  Object.values(assetGroups).flat().forEach((asset) => {
    if (asset.symbol === quote.symbol) {
      asset.marketPrice = price;
      asset.liveChangePct = liveQuotes[quote.symbol].change_pct;
      asset.liveSource = liveQuotes[quote.symbol].source;
      asset.signal_source = liveQuotes[quote.symbol].signal_source;
      asset.liveMarketPhase = liveQuotes[quote.symbol].market_phase;
      asset.liveUpdatedAt = liveQuotes[quote.symbol].updated_at;
    }
  });
}

async function saveQuoteBars(items = [], source = "dashboard") {
  const payloadItems = items
    .map((item) => ({
      symbol: String(item.symbol || "").trim().toUpperCase(),
      price: Number(item.price || 0),
      source: item.source || source,
    }))
    .filter((item) => item.symbol && item.price > 0);
  if (!payloadItems.length) return;
  try {
    await fetch("/market/bars", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, items: payloadItems }),
      cache: "no-store",
    });
  } catch {
    // La grafica puede seguir funcionando con la visualizacion tactica si la DB falla.
  }
}

async function loadMarketBars(symbols = [], frameOverride = null) {
  const frame = frameOverride || chartFrameConfig();
  const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => String(symbol || "").trim().toUpperCase()).filter(Boolean)));
  await Promise.all(uniqueSymbols.slice(0, 6).map(async (symbol) => {
    try {
      const params = new URLSearchParams({
        limit: String(frame.limit),
        interval: frame.interval,
        period: frame.period,
        live: "true",
        ts: String(Date.now()),
      });
      const response = await fetch(`/market/bars/${encodeURIComponent(symbol)}?${params.toString()}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      const frameKey = marketFrameKey(symbol, frame.key);
      marketBars[symbol] = payload.items || [];
      marketBarsByFrame[frameKey] = payload.items || [];
      marketBarMeta[symbol] = {
        source: payload.source || "market_bars",
        isRealOhlc: Boolean(payload.is_real_ohlc),
        providerSymbol: payload.provider_symbol || "",
        interval: payload.interval || frame.interval,
        period: payload.period || frame.period,
        label: frame.label,
        description: frame.description,
        windowMinutes: Number(payload.window_minutes || frame.limit),
        startAt: payload.start_at || "",
        endAt: payload.end_at || "",
        storedWasPointQuotes: Boolean(payload.stored_was_point_quotes),
      };
      marketBarMetaByFrame[frameKey] = marketBarMeta[symbol];
    } catch {
      marketBars[symbol] = marketBars[symbol] || [];
      marketBarMeta[symbol] = marketBarMeta[symbol] || {};
    }
  }));
}

async function loadAnalysisTimeframes(symbols = [focusSymbol]) {
  const frames = [chartFrameOptions["1m"], chartFrameOptions["15m"], chartFrameOptions["4h"]];
  await Promise.all(frames.map((frame) => loadMarketBars(symbols, frame)));
}

function quoteAgeMinutes(asset) {
  const updatedAt = asset?.liveUpdatedAt ? new Date(asset.liveUpdatedAt).getTime() : 0;
  if (!updatedAt || Number.isNaN(updatedAt)) return Infinity;
  return Math.max(0, (Date.now() - updatedAt) / 60000);
}

function hasFreshMarketQuote(asset) {
  const maxAge = isMarketOpenNow() ? 7 : 15;
  return quoteAgeMinutes(asset) <= maxAge;
}

function providerPriceFor(symbol) {
  return Number(liveQuotes[symbol]?.provider_price || liveQuotes[symbol]?.price || findAsset(symbol).marketPrice || 0);
}

function providerXtbGapPct(asset) {
  const quote = liveQuotes[asset.symbol] || {};
  const providerPrice = Number(quote.provider_price || 0);
  const xtbPrice = Number(quote.source === "xtb" ? quote.price : 0);
  if (!providerPrice || !xtbPrice) return 0;
  return Math.abs(xtbPrice - providerPrice) / providerPrice * 100;
}

function estimatedSpreadCost(asset, volume) {
  const quote = liveQuotes[asset.symbol] || {};
  const bid = Number(quote.bid || 0);
  const ask = Number(quote.ask || 0);
  if (!bid || !ask || ask <= bid || !volume) return 0;
  return (ask - bid) * asset.multiplier * volume;
}

function applyXtbTicketValidation(ticket = {}) {
  const symbol = String(ticket.symbol || document.getElementById("symbol")?.value || "").trim().toUpperCase();
  const volume = Number(ticket.volume || 0);
  const contractValue = Number(ticket.contract_value || 0);
  const spreadUsd = Number(ticket.spread_usd || 0);
  const price = xtbPriceValue() || providerPriceFor(symbol);
  const multiplier = contractValue > 0 && price > 0 && volume > 0 ? contractValue / (price * volume) : null;
  xtbTicketValidation = {
    ...ticket,
    symbol,
    volume,
    contract_value: contractValue || null,
    spread_usd: spreadUsd || null,
    margin_usd: Number(ticket.margin_usd || 0) || null,
    inferred_multiplier: multiplier ? Number(multiplier.toFixed(4)) : null,
    updated_at: ticket.updated_at || new Date().toISOString(),
  };
  renderWarnings();
  if (lastResult) renderMath();
  renderSimpleDashboard();
}

function xtbExecutablePriceFromQuote(item, direction) {
  const bid = Number(item.bid || 0);
  const ask = Number(item.ask || 0);
  const mid = Number(item.price || 0);
  if (direction === "LONG" && ask > 0) return ask;
  if (direction === "SHORT" && bid > 0) return bid;
  return mid || bid || ask || 0;
}

function xtbPriceValue() {
  return Number(document.getElementById("xtb-price")?.value || 0);
}

function activeMarketPriceFor(asset) {
  return xtbPriceValue() || Number(document.getElementById("market-price")?.value || 0) || Number(asset.marketPrice || 0);
}

function latestXtbQuoteFor(symbol = focusSymbol) {
  const normalized = String(symbol || focusSymbol).toUpperCase();
  return liveQuotes[normalized] || null;
}

function formatDataAge(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "sin lectura";
  if (ms < 1000) return "ahora";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return `${hours}h`;
}

function xtbFreshnessState(symbol = focusSymbol) {
  const quote = latestXtbQuoteFor(symbol);
  const manualXtbPrice = xtbPriceValue();
  const source = String(quote?.signal_source || quote?.source || "");
  const sourceLower = source.toLowerCase();
  const updatedAtRaw = quote?.updated_at || quote?.timestamp || quote?.time;
  const updatedAt = updatedAtRaw ? Date.parse(updatedAtRaw) : NaN;
  const ageMs = Number.isFinite(updatedAt) ? Date.now() - updatedAt : Infinity;
  const hasXtbSource = sourceLower.includes("xtb") || sourceLower.includes("xstation");
  const hasExecutablePrice = Number(quote?.bid || 0) > 0 || Number(quote?.ask || 0) > 0 || Number(quote?.price || 0) > 0;
  const freshLimitMs = isMarketOpenNow() ? 20_000 : 3 * 60_000;
  const fresh = Boolean(hasXtbSource && hasExecutablePrice && ageMs >= 0 && ageMs <= freshLimitMs);
  const manualFallback = !fresh && manualXtbPrice > 0;
  const usable = fresh || manualFallback;
  const ageText = formatDataAge(ageMs);
  const sourceText = hasXtbSource ? "XTB" : source ? source : "sin fuente";
  return {
    fresh,
    manualFallback,
    usable,
    ageMs,
    ageText,
    source: sourceText,
    short: fresh ? `actual ${ageText}` : manualFallback ? "manual aceptable" : `viejo ${ageText}`,
    detail: fresh
      ? `Lectura XTB fresca (${ageText}). La receta puede usar precio real.`
      : manualFallback
        ? "Precio XTB manual/visible aceptado como respaldo. Mejor reiniciar monitor para lectura automatica."
        : `Lectura XTB no fresca (${ageText}). Reinicia monitor o no copies niveles.`,
  };
}

function renderPriceGapStatus() {
  const box = document.getElementById("price-gap-status");
  if (!box) return;
  const symbol = document.getElementById("symbol").value.trim().toUpperCase();
  const xtbPrice = xtbPriceValue();
  const providerPrice = providerPriceFor(symbol);
  if (!xtbPrice || !providerPrice) {
    box.textContent = "Brecha XTB: copia el precio real de xStation antes de operar.";
    box.className = "rounded-xl border border-white/10 bg-ink p-3 text-xs font-bold text-zinc-500";
    return;
  }
  const gapPct = Math.abs(xtbPrice - providerPrice) / xtbPrice * 100;
  const ok = gapPct <= 0.15;
  box.textContent = `Brecha XTB vs proveedor: ${numberText(gapPct)}%. ${ok ? "Aceptable" : "Alta: opera solo con precio XTB."}`;
  box.className = `rounded-xl border p-3 text-xs font-bold ${ok ? "border-bull/40 bg-bull/10 text-bull" : "border-gold/50 bg-gold/10 text-gold"}`;
}

async function refreshLivePrices({ resetSelected = false } = {}) {
  const symbols = focusSymbol;
  try {
    const snapshotApplied = await refreshXtbSnapshotFromServer();
    if (snapshotApplied) {
      return;
    }
    updateLiveStatus("Live prices: actualizando...");
    const response = await fetch(`/market/live?symbols=${encodeURIComponent(symbols)}&ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const liveItems = payload.items || [];
    liveItems.forEach(applyLiveQuote);
    await saveQuoteBars(liveItems, "yfinance_1m");
    await loadMarketBars([focusSymbol]);
    if (resetSelected) {
      const operable = pickBestCfdOpportunity();
      const watch = pickBestWatchlistOpportunity();
      const best = operable || watch;
      if (best) {
        applySelectedOpportunity(best, "live");
        updateLiveStatus(`US100 actualizado: ${best.directionLabel} con ${payload.count || 0} lectura(s).`, "ok");
        return;
      }
      if (liveQuotes[selectedAsset.symbol]) {
        selectedAsset = findAsset(selectedAsset.symbol);
        resetOrderFieldsForAssetDirection(selectedAsset, effectiveDirectionForSlot(selectedAsset));
      }
    }
    updateLiveStatus(`US100 actualizado desde yfinance.`, "ok");
    renderAssets();
    renderTopOpportunities();
    calculate();
  } catch (error) {
    updateLiveStatus("Live prices: no disponibles, usando ultimo valor manual/estatico.", "error");
    calculate();
  }
}

async function refreshXtbSnapshotFromServer() {
  try {
    const response = await fetch(`/xtb/snapshot/latest?symbol=${encodeURIComponent(focusSymbol)}&ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) return false;
    const payload = await response.json();
    const items = (payload.items || [])
      .map((item) => {
        const raw = item.payload || {};
        const price = Number(item.price || raw.price || 0);
        const symbol = String(item.symbol || raw.symbol || "").trim().toUpperCase();
        if (!symbol || price <= 0) return null;
        return {
          symbol,
          price,
          bid: Number(item.bid || raw.bid || 0) || null,
          ask: Number(item.ask || raw.ask || 0) || null,
          change_pct: Number(item.change_pct || raw.change_pct || 0) || 0,
          source: item.source || raw.source || "xtb_server_snapshot",
          updated_at: item.updated_at || raw.updated_at || new Date().toISOString(),
        };
      })
      .filter(Boolean);
    if (!items.length) return false;
    applyXtbQuoteBatch(items, { source: "xtb_server_snapshot" });
    return true;
  } catch (error) {
    return false;
  }
}

function applyXtbQuoteBatch(items = [], options = {}) {
  const source = options.source || "xtb";
  const validQuotes = items
    .filter((item) => String(item.symbol || "").trim().toUpperCase() === focusSymbol)
    .map((item) => {
      const symbol = String(item.symbol || "").trim().toUpperCase();
      const direction = effectiveDirectionForSlot(findAsset(symbol));
      const price = xtbExecutablePriceFromQuote(item, direction);
      if (!symbol || !price) return null;
      const previousProviderQuote = liveQuotes[symbol] || {};
      const previousSignalSource = previousProviderQuote.signal_source || previousProviderQuote.source || "";
      const shouldKeepProviderMove = !isMarketOpenNow() && String(previousSignalSource).startsWith("yfinance");
      const shouldIgnoreXtbMove = !isMarketOpenNow() && !shouldKeepProviderMove;
      const xtbChangePct = Number(item.change_pct || 0);
      return {
        symbol,
        price,
        bid: Number(item.bid || 0) || null,
        ask: Number(item.ask || 0) || null,
        executable_side: direction === "LONG" ? "ask" : "bid",
        provider_price: previousProviderQuote.provider_price || (String(previousSignalSource).startsWith("yfinance") ? previousProviderQuote.price : null),
        xtb_change_pct: xtbChangePct,
        change_pct: shouldKeepProviderMove ? previousProviderQuote.change_pct : shouldIgnoreXtbMove ? 0 : xtbChangePct,
        premarket_change_pct: previousProviderQuote.premarket_change_pct,
        regular_change_pct: previousProviderQuote.regular_change_pct,
        intraday_change_pct: previousProviderQuote.intraday_change_pct,
        market_phase: previousProviderQuote.market_phase || (shouldIgnoreXtbMove ? "awaiting_yahoo" : "xtb"),
        source,
        signal_source: shouldKeepProviderMove ? previousSignalSource : shouldIgnoreXtbMove ? "awaiting_yahoo_premarket" : source,
        updated_at: item.updated_at || new Date().toISOString(),
      };
    })
    .filter(Boolean);

  validQuotes.forEach(applyLiveQuote);
  saveQuoteBars(validQuotes, source);
  const best = pickBestCfdOpportunity(validQuotes.map((item) => item.symbol));
  if (best && !isManualOpportunityLocked()) {
    applySelectedOpportunity(best, source);
    updateLiveStatus(`XTB: mejor CFD visible ${best.asset.symbol} (${best.directionLabel}, score ${Math.round(best.score)}).`, "ok");
  } else if (best) {
    updateLiveStatus(`XTB: precios actualizados. Mantengo tu seleccion manual ${selectedAsset.symbol}.`, "ok");
  } else if (validQuotes.length) {
    updateLiveStatus("XTB: precios recibidos, pero ningun CFD visible cumple volumen/margen/stop.", "error");
  }
  calculate();
  renderAssets();
  renderSimpleDashboard();
}

function isManualOpportunityLocked() {
  return Date.now() < manualOpportunityLockUntil;
}

function lockManualOpportunitySelection() {
  manualOpportunityLockUntil = Date.now() + manualOpportunityLockMs;
}

function pickBestCfdOpportunity(symbols = []) {
  const allowed = new Set(symbols.map((symbol) => String(symbol).toUpperCase()));
  return uniqueAssets()
    .filter((asset) => !allowed.size || allowed.has(asset.symbol))
    .map((asset) => buildAssetOpportunity(asset, getEffectiveRiskPct()))
    .filter((item) => item.usable)
    .sort((a, b) => b.score - a.score)[0] || null;
}

function buildWatchlistOpportunity(asset) {
  const plan = buildDailyTradePlan();
  const accountBalance = Number(document.getElementById("account-balance").value || defaultAccountBalance);
  const availableCapital = Number(document.getElementById("available-capital").value || accountBalance);
  const price = Number(asset.marketPrice || providerPriceFor(asset.symbol) || 0);
  const changePct = Number(asset.liveChangePct ?? 0);
  const absMove = Math.abs(changePct);
  const direction = aiDirectionForAsset(asset);
  const directionLabel = labelFromDirection(direction);
  const source = movementLabelForAsset(asset);
  const freshQuote = hasFreshMarketQuote(asset);
  const step = priceStepPct(asset);
  const entry = price ? (direction === "SHORT" ? price * (1 - step) : price * (1 + step)) : 0;
  const volume = entry ? targetContractVolume(asset, entry, accountBalance) : 0;
  const zones = buildTradeZones(asset, direction, entry, volume, plan.currentTradeRiskAmount);
  const positionValue = entry * asset.multiplier * volume;
  const marginRequired = positionValue * cfdMarginPct(asset) / 100;
  const marginOk = !availableCapital || marginRequired <= availableCapital;
  const spreadCost = estimatedSpreadCost(asset, volume);
  const spreadOk = !spreadCost || spreadCost <= plan.currentTradeRiskAmount;
  const hasVolume = asset.category === "stocks" ? volume >= 1 : volume > 0;
  const gapPct = providerXtbGapPct(asset);
  const gapOk = !gapPct || gapPct <= 2;
  let score = 35 + Math.min(35, absMove * 8);
  if (freshQuote) score += 15;
  if (marginOk) score += 10;
  if (spreadOk) score += 5;
  if (!hasVolume) score -= 50;
  if (!gapOk) score -= 60;
  if (absMove < 0.35) score -= 20;
  const confidence = Math.max(0, Math.min(92, Math.round(score)));
  const status = !freshQuote || !hasVolume || !marginOk || !spreadOk || !gapOk
    ? "DESCARTAR"
    : confidence >= 65
      ? "VIGILAR"
      : "ESPERAR";
  const action = status === "VIGILAR"
    ? `${directionLabel} si rompe la primera vela ORB`
    : status === "ESPERAR"
      ? "Esperar mas fuerza antes de apertura"
      : "No usar con tus datos actuales";
  const reason = !freshQuote
    ? "cotizacion no reciente"
    : !hasVolume
      ? "volumen XTB queda por debajo del minimo"
      : !marginOk
        ? `margen estimado ${money(marginRequired)} supera disponible ${money(availableCapital)}`
        : !spreadOk
          ? `spread estimado ${money(spreadCost)} consume la meta`
          : !gapOk
            ? `brecha Yahoo/XTB ${numberText(gapPct)}%`
            : `${numberText(changePct)}% ${source}; ${action}. Vol ${formatVolumeForXtb(volume, asset)}, contrato ${money(positionValue)}.`;
  return {
    asset,
    direction,
    directionLabel,
    status,
    confidence,
    score,
    volume,
    price,
    marginRequired,
    entry,
    stopLoss: zones.stopLoss,
    takeProfit: zones.takeProfit,
    zones,
    reason,
  };
}

function buildOpeningWatchlist() {
  return [findAsset(focusSymbol)]
    .map(buildWatchlistOpportunity)
    .filter((item) => item.status !== "DESCARTAR")
    .sort((a, b) => b.confidence - a.confidence || Math.abs(Number(b.asset.liveChangePct || 0)) - Math.abs(Number(a.asset.liveChangePct || 0)))
    .slice(0, 5);
}

function pickBestWatchlistOpportunity() {
  return buildOpeningWatchlist().find((item) => item.confidence >= 65) || buildOpeningWatchlist()[0] || null;
}

function applySelectedOpportunity(opportunity, source = "auto") {
  if ((source === "live" || source === "xtb") && isManualOpportunityLocked()) return;
  if (source === "manual") lockManualOpportunitySelection();
  selectedAsset = findAsset(focusSymbol);
  const symbolInput = document.getElementById("symbol");
  const marketInput = document.getElementById("market-price");
  const xtbInput = document.getElementById("xtb-price");
  const quotePrice = Number(liveQuotes[selectedAsset.symbol]?.price || opportunity.asset.marketPrice || 0);
  if (symbolInput) symbolInput.value = focusSymbol;
  if (marketInput && quotePrice) marketInput.value = formatPriceForAsset(quotePrice, selectedAsset);
  if (xtbInput && quotePrice) xtbInput.value = quotePrice.toFixed(2);
  resetOrderFieldsForAssetDirection(selectedAsset, effectiveDirectionForSlot(selectedAsset));
  applyAiAggressiveTargets(selectedAsset);
  loadMarketBars([selectedAsset.symbol]).then(() => renderSimpleDashboard());
  renderAssets();
  renderTopOpportunities();
  if (source === "xtb") saveConfigLocal();
  calculate();
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
  if (asset.symbol === "AVAX") return 3;
  if (["XRP", "DOGE", "ADA", "DOT"].includes(asset.symbol)) return 4;
  if (["SOL", "LINK"].includes(asset.symbol)) return 3;
  if (asset.symbol === "OIL" || asset.symbol === "NATGAS") return 3;
  if (asset.category === "crypto" || asset.category === "indices") return 1;
  return 2;
}

function formatPriceForAsset(value, asset) {
  return Number(value).toFixed(priceDecimals(asset));
}

function priceStepPct(asset) {
  if (asset.category === "forex") return 0.0015;
  if (asset.category === "indices") return 0.0005;
  if (asset.category === "commodities") return 0.004;
  if (asset.symbol === "AVAX") return 0.0045;
  if (asset.category === "crypto") return 0.006;
  return 0.01;
}

function resetOrderFieldsForAsset(asset) {
  const profile = asset.symbol === focusSymbol ? us100StrategyProfile() : null;
  const direction = profile?.direction || document.getElementById("direction").value;
  const market = profile?.price || activeMarketPriceFor(asset) || Number(asset.marketPrice || 100);
  const step = priceStepPct(asset);
  const entry = profile?.entry || (direction === "LONG" ? market * (1 + step) : market * (1 - step));
  const balance = Number(document.getElementById("account-balance")?.value || defaultAccountBalance);
  const volume = profile?.volume || targetContractVolume(asset, entry, balance);
  const plan = buildDailyTradePlan();
  const targetAmount = profile?.targetUsd || plan.currentTradeRiskAmount;
  const targetDistance = volume > 0 ? targetAmount / (volume * asset.multiplier) : 0;
  const stopDistance = volume > 0 && plan.currentTradeStopAmount > 0 ? plan.currentTradeStopAmount / (volume * asset.multiplier) : 0;
  const takeProfit = profile?.takeProfit || (direction === "LONG" ? entry + targetDistance : entry - targetDistance);
  const stopLoss = profile?.stopLoss || (stopDistance > 0 ? (direction === "LONG" ? entry - stopDistance : entry + stopDistance) : 0);

  document.getElementById("market-price").value = formatPriceForAsset(market, asset);
  document.getElementById("direction").value = direction;
  document.getElementById("requested-volume").value = formatVolumeForXtb(volume, asset);
  document.getElementById("entry-price").value = formatPriceForAsset(entry, asset);
  document.getElementById("stop-price").value = stopLoss ? formatPriceForAsset(stopLoss, asset) : "0";
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

function applyXtbPriceOverride() {
  const asset = selectedAssetFromForm();
  const xtbPrice = xtbPriceValue();
  if (!xtbPrice) {
    renderPriceGapStatus();
    calculate();
    return;
  }
  document.getElementById("market-price").value = formatPriceForAsset(xtbPrice, asset);
  saveQuoteBars([{ symbol: asset.symbol, price: xtbPrice, source: "xtb_override" }], "xtb_override")
    .then(() => loadMarketBars([asset.symbol]))
    .then(() => renderSimpleDashboard());
  selectedAsset = { ...findAsset(asset.symbol), marketPrice: xtbPrice };
  resetOrderFieldsForAssetDirection(selectedAsset, effectiveDirectionForSlot(selectedAsset));
  renderPriceGapStatus();
  calculate();
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
  const plan = buildDailyTradePlan();
  const targetAmount = plan.currentTradeRiskAmount;
  const targetDistance = targetAmount / (volume * asset.multiplier);
  const stopDistance = plan.currentTradeStopAmount > 0 ? plan.currentTradeStopAmount / (volume * asset.multiplier) : 0;
  const takeProfit = direction === "LONG" ? entry + targetDistance : entry - targetDistance;
  const stopLoss = stopDistance > 0 ? (direction === "LONG" ? entry - stopDistance : entry + stopDistance) : 0;
  document.getElementById("stop-price").value = stopLoss ? formatPriceForAsset(stopLoss, asset) : "0";
  document.getElementById("take-profit-price").value = formatPriceForAsset(takeProfit, asset);
}

function resetOrderForCurrentMode(asset) {
  resetOrderFieldsForAsset(asset);
  applyAiAggressiveTargets(asset);
}

function applyAiAggressiveTargets(asset) {
  if (asset.symbol === focusSymbol) {
    const profile = us100StrategyProfile();
    document.getElementById("direction").value = profile.direction;
    document.getElementById("requested-volume").value = formatVolumeForXtb(profile.volume, asset);
    document.getElementById("market-price").value = formatPriceForAsset(profile.price, asset);
    document.getElementById("entry-price").value = formatPriceForAsset(profile.entry, asset);
    document.getElementById("stop-price").value = formatPriceForAsset(profile.stopLoss, asset);
    document.getElementById("take-profit-price").value = formatPriceForAsset(profile.takeProfit, asset);
    return;
  }
  const plan = buildDailyTradePlan();
  const opportunity = buildAssetOpportunity(asset, plan.currentTradeRiskPct);
  const entry = Number(document.getElementById("entry-price").value || opportunity.entry || 0);
  const volume = opportunity.volume;
  const direction = effectiveDirectionForSlot(asset);
  if (!entry || !volume) return;
  const targetDistance = plan.currentTradeRiskAmount / (volume * asset.multiplier);
  const stopDistance = plan.currentTradeStopAmount > 0 ? plan.currentTradeStopAmount / (volume * asset.multiplier) : 0;
  const takeProfit = direction === "LONG" ? entry + targetDistance : entry - targetDistance;
  const stopLoss = stopDistance > 0 ? (direction === "LONG" ? entry - stopDistance : entry + stopDistance) : 0;
  document.getElementById("requested-volume").value = formatVolumeForXtb(volume, asset);
  document.getElementById("stop-price").value = stopLoss ? formatPriceForAsset(stopLoss, asset) : "0";
  document.getElementById("take-profit-price").value = formatPriceForAsset(takeProfit, asset);
}

function selectedAssetFromForm() {
  const symbol = focusSymbol;
  if (document.getElementById("symbol")) document.getElementById("symbol").value = focusSymbol;
  const baseAsset = findAsset(symbol);
  const marketInput = Number(document.getElementById("market-price").value || 0);
  const xtbInput = xtbPriceValue();
  if (symbol !== lastResetSymbol) {
    return xtbInput > 0 ? { ...baseAsset, marketPrice: xtbInput } : baseAsset;
  }
  return {
    ...baseAsset,
    marketPrice: xtbInput > 0 ? xtbInput : marketInput > 0 ? marketInput : baseAsset.marketPrice,
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
  renderTradeSchedule();
}

function isMarketOpenNow() {
  const { weekday, total } = nyMarketMinutes();
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  return isWeekday && total >= 9 * 60 + 30 && total < 16 * 60;
}

function marketRefreshProfile() {
  const { weekday, total } = nyMarketMinutes();
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  if (isWeekday && total >= 9 * 60 + 30 && total < 16 * 60) {
    return { ms: 3 * 1000, label: "mercado abierto, XTB servidor cada 3 seg" };
  }
  if (isWeekday && total >= 4 * 60 && total < 20 * 60) {
    return { ms: 5 * 1000, label: "pre/post-market, XTB servidor cada 5 seg" };
  }
  return { ms: 30 * 1000, label: "mercado cerrado profundo, cada 30 seg" };
}

function scheduleAutoRefresh() {
  window.clearTimeout(autoRefreshTimer);
  const { ms: refreshMs, label } = marketRefreshProfile();
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
  const riskPct = getEffectiveRiskPct();
  const activeAssets = (assetGroups[activeCategory] || []).filter((asset) => buildAssetOpportunity(asset, riskPct).usable);
  document.getElementById("category-copy").textContent =
    `${categoryLabels[activeCategory]}: mostrando solo activos que caben con tu capital/riesgo.`;
  document.getElementById("asset-grid").innerHTML = activeAssets.length ? activeAssets.map((asset) => `
    <button type="button" class="asset-card ${asset.symbol === selectedAsset.symbol ? "selected" : ""}" data-symbol="${asset.symbol}">
      <span class="text-base font-black">${asset.symbol}</span>
      <span class="text-xs text-zinc-400">${asset.name}</span>
      <span class="mt-2 text-xs font-bold text-zinc-500">Multiplicador x${numberText(asset.multiplier)}</span>
      <span class="mt-1 text-xs font-bold ${asset.liveChangePct < 0 ? "text-bear" : "text-bull"}">${asset.marketPrice ? numberText(asset.marketPrice) : "-"} ${asset.liveChangePct !== undefined ? `(${numberText(asset.liveChangePct)}%)` : ""}</span>
    </button>
  `).join("") : `<div class="rounded-xl border border-white/10 bg-ink p-3 text-sm text-zinc-400">No hay activos operables en esta categoria con tu capital/riesgo actual.</div>`;
  document.querySelectorAll(".asset-card").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAsset = findAsset(button.dataset.symbol);
      document.getElementById("symbol").value = selectedAsset.symbol;
      document.getElementById("xtb-price").value = "";
      resetOrderForCurrentMode(selectedAsset);
      loadMarketBars([selectedAsset.symbol]).then(() => renderSimpleDashboard());
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
      <span class="text-xs text-zinc-400">IA local con precios Yahoo: usa movimiento reciente, horario, margen, gatillo y riesgo dinamico. Noticias externas aun no deciden la orden.</span>
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
  const marginRequired = positionValue * cfdMarginPct(asset) / 100;
  const availableCapital = Number(document.getElementById("available-capital").value || 0);
  const marketOpen = isMarketOpenNow();
  const timing = marketTimingProfile();
  const trigger = triggerReadiness(asset, lastResult.entry_price, lastResult.take_profit);
  const reasons = [];
  let score = 50;

  if (driftDirection === "WAIT") {
    score -= 10;
    reasons.push(`Movimiento ${movementLabelForAsset(asset)} sin ventaja clara: no persigas precio.`);
  } else if (driftDirection === selectedDirection) {
    score += 20;
    reasons.push(`Movimiento ${movementLabelForAsset(asset)} ${numberText(driftPct)}% coincide con ${labelFromDirection(selectedDirection)}.`);
  } else {
    score -= 25;
    reasons.push(`Movimiento ${movementLabelForAsset(asset)} ${numberText(driftPct)}% va contra la direccion seleccionada.`);
  }

  score -= 5;
  reasons.push(`Modo sin stop: la perdida no esta limitada por MyActions. Meta de la receta: ${money(lastResult.expected_profit)}.`);

  if (!trigger.ready) {
    score -= 30;
    reasons.push(trigger.message);
  } else {
    score += 8;
    reasons.push(trigger.message);
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
  const noOperateBlock = (availableCapital > 0 && marginRequired > availableCapital) || timing.quality === "NO OPERAR" || timing.quality === "GESTION" || timing.quality === "SOLO CIERRE";
  const status = noOperateBlock ? "NO OPERAR" : !trigger.ready || confidence < 70 || !marketOpen ? "ESPERAR" : "OPERABLE";
  const bias = driftDirection === "WAIT" ? selectedDirection : driftDirection;
  const toneClass = status === "NO OPERAR"
    ? "border-bear/60 bg-bear/15 text-bear"
    : status === "OPERABLE"
      ? "border-bull/60 bg-bull/15 text-bull"
      : "border-gold/50 bg-gold/10 text-gold";

  return {
    title: "Semaforo operativo IA",
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
        <strong>${ai.status} - ${ai.confidence}%</strong>
      </div>
      <p class="text-xs font-bold">${labelFromDirection(ai.bias)} sugerido solo si el semaforo sube a OPERABLE.</p>
      <ul class="grid gap-1 text-xs text-zinc-200">
        ${ai.reasons.map((reason) => `<li>- ${reason}</li>`).join("")}
      </ul>
      <span class="text-xs text-zinc-500">Modelo usado: scoring heuristico local. En modo sin stop, MyActions calcula volumen/meta y alerta; la perdida depende del cierre manual en XTB.</span>
    </div>
  `;
}

function directionFromMove(changePct) {
  if (changePct <= -0.35) return "SHORT";
  if (changePct >= 0.35) return "LONG";
  return "WAIT";
}

function movementLabelForAsset(asset) {
  if (asset.liveMarketPhase === "pre") return "pre-market Yahoo";
  if (asset.liveMarketPhase === "post") return "post-market Yahoo";
  if (asset.liveMarketPhase === "awaiting_yahoo") return "esperando Yahoo";
  if (asset.liveSource === "xtb" && String(asset.signal_source || "").startsWith("yfinance")) return "Yahoo validado con precio XTB";
  if (asset.liveSource === "xtb") return "XTB visible";
  return "intradia";
}

function labelFromDirection(direction) {
  if (direction === "SHORT") return "SHORT / SELL STOP";
  if (direction === "LONG") return "LONG / BUY STOP";
  return "ESPERAR";
}

function triggerReadiness(asset, entry, takeProfit, currentPrice = activeMarketPriceFor(asset)) {
  const price = Number(currentPrice || asset.marketPrice || 0);
  const trigger = Number(entry || 0);
  const target = Number(takeProfit || 0);
  if (!price || !trigger || !target) {
    return {
      ready: false,
      triggerDistancePct: 999,
      fullPathPct: 999,
      maxTriggerDistancePct: 0,
      message: "No hay precio suficiente para validar cercania al gatillo.",
    };
  }
  const triggerDistancePct = Math.abs(trigger - price) / price * 100;
  const fullPathPct = Math.abs(target - price) / price * 100;
  const targetFromEntryPct = Math.abs(target - trigger) / trigger * 100;
  const maxTriggerDistancePct = Math.max(0.25, targetFromEntryPct * 0.55);
  const ready = triggerDistancePct <= maxTriggerDistancePct;
  return {
    ready,
    triggerDistancePct,
    fullPathPct,
    maxTriggerDistancePct,
    message: ready
      ? `Precio cerca del gatillo: falta ${numberText(triggerDistancePct)}% para activar.`
      : `Esperar: falta ${numberText(triggerDistancePct)}% para activar y ${numberText(fullPathPct)}% hasta meta; no hay impulso suficiente ahora.`,
  };
}

function quoteRangeForAsset(asset) {
  const quote = liveQuotes[asset.symbol] || {};
  const price = Number(asset.marketPrice || quote.price || providerPriceFor(asset.symbol) || 0);
  const open = Number(quote.open || price || 0);
  const high = Number(quote.high || Math.max(price, open) || 0);
  const low = Number(quote.low || Math.min(price, open) || 0);
  return { price, open, high, low };
}

function buildTradeZones(asset, direction, entry, volume, targetAmount = buildDailyTradePlan().currentTradeRiskAmount) {
  const range = quoteRangeForAsset(asset);
  const price = Number(range.price || entry || 0);
  const safeEntry = Number(entry || price || 0);
  const safeVolume = Number(volume || 0);
  const pctDistance = volatilityStopPct(asset) / 100;
  const minStopDistance = safeEntry * pctDistance;
  const moneyStopDistance = safeVolume > 0 ? buildDailyTradePlan().currentTradeStopAmount / (safeVolume * asset.multiplier) : 0;
  const stopDistance = Math.max(minStopDistance, moneyStopDistance || 0);
  const takeDistance = safeVolume > 0 ? targetAmount / (safeVolume * asset.multiplier) : safeEntry * priceStepPct(asset) * 2;
  const stopLoss = direction === "LONG" ? safeEntry - stopDistance : safeEntry + stopDistance;
  const takeProfit = direction === "LONG" ? safeEntry + takeDistance : safeEntry - takeDistance;
  const reboundDistance = Math.max(minStopDistance * 0.45, safeEntry * priceStepPct(asset) * 0.5);
  const reboundLow = direction === "LONG" ? price - reboundDistance : price;
  const reboundHigh = direction === "LONG" ? price : price + reboundDistance;
  const securityLow = Math.min(stopLoss, safeEntry);
  const securityHigh = Math.max(stopLoss, safeEntry);
  const riskAmount = Math.abs(safeEntry - stopLoss) * asset.multiplier * safeVolume;
  const rewardAmount = Math.abs(takeProfit - safeEntry) * asset.multiplier * safeVolume;
  return {
    price,
    open: range.open,
    high: range.high,
    low: range.low,
    entry: safeEntry,
    stopLoss,
    takeProfit,
    reboundLow,
    reboundHigh,
    securityLow,
    securityHigh,
    riskAmount,
    rewardAmount,
    stopPct: safeEntry > 0 ? Math.abs(safeEntry - stopLoss) / safeEntry * 100 : 0,
    takePct: safeEntry > 0 ? Math.abs(takeProfit - safeEntry) / safeEntry * 100 : 0,
  };
}

function professionalZonesForItem(item, candles = []) {
  const zones = item.zones;
  const lows = candles.map((candle) => Number(candle.l)).filter((value) => Number.isFinite(value) && value > 0);
  const highs = candles.map((candle) => Number(candle.h)).filter((value) => Number.isFinite(value) && value > 0);
  const closes = candles.map((candle) => Number(candle.c)).filter((value) => Number.isFinite(value) && value > 0);
  const support = lows.length ? Math.min(...lows) : Math.min(zones.low, zones.reboundLow, zones.takeProfit);
  const resistance = highs.length ? Math.max(...highs) : Math.max(zones.high, zones.reboundHigh, zones.stopLoss);
  const lastClose = closes.length ? closes[closes.length - 1] : zones.price;
  const trigger = zones.entry;
  const invalidation = zones.stopLoss;
  const pullbackLow = Math.min(zones.reboundLow, zones.reboundHigh);
  const pullbackHigh = Math.max(zones.reboundLow, zones.reboundHigh);
  const breakoutZone = item.direction === "SHORT" ? "perder soporte/piso" : "romper resistencia/techo";
  const invalidationText = item.direction === "SHORT"
    ? "si recupera por encima del stop, la venta queda invalidada"
    : "si cae por debajo del stop, la compra queda invalidada";
  const actionText = item.confidence >= 70
    ? "Esperar ruptura confirmada con cierre de vela 1m fuera del gatillo."
    : "No perseguir precio: confianza baja, operar solo si mejora la confirmacion.";
  return {
    support,
    resistance,
    lastClose,
    trigger,
    invalidation,
    pullbackLow,
    pullbackHigh,
    breakoutZone,
    invalidationText,
    actionText,
  };
}

function technicalDecisionText(item, candles = []) {
  const zones = item.zones;
  const proZones = professionalZonesForItem(item, candles);
  const changePct = Number(item.asset.liveChangePct ?? 0);
  const directionText = item.direction === "SHORT" ? "sesgo bajista" : "sesgo alcista";
  const orderText = item.direction === "SHORT"
    ? "SELL STOP: se activa solo si el precio pierde la zona de entrada"
    : "BUY STOP: se activa solo si el precio rompe la zona de entrada";
  const stopText = item.direction === "SHORT"
    ? "stop por encima de la entrada para cortar una recuperacion en contra"
    : "stop por debajo de la entrada para cortar una ruptura falsa";
  const takeText = item.direction === "SHORT"
    ? "take por debajo buscando continuidad bajista"
    : "take por encima buscando continuidad alcista";
  const rr = zones.riskAmount > 0 ? zones.rewardAmount / zones.riskAmount : 0;
  return `
    <div class="strategy-notes">
      <strong>Estrategia usada: ORB 5m + breakout/pullback + control de margen.</strong>
      <span><b>Por que esta decision:</b> ${directionText}, movimiento observado ${numberText(changePct)}%, y orden tipo ${orderText}.</span>
      <span><b>Techo/resistencia:</b> ${numberText(proZones.resistance)}. <b>Piso/soporte:</b> ${numberText(proZones.support)}. La operacion solo tiene sentido si el precio confirma ${proZones.breakoutZone}.</span>
      <span><b>Zona rebote/pullback:</b> ${numberText(proZones.pullbackLow)} - ${numberText(proZones.pullbackHigh)}. Si el precio esta ahi, los profesionales esperan confirmacion y no persiguen.</span>
      <span><b>Zona de invalidacion:</b> ${numberText(proZones.invalidation)}; ${proZones.invalidationText}. El ${stopText}; el ${takeText}.</span>
      <span><b>Semaforo:</b> ${proZones.actionText}</span>
      <span>Meta deseada: ${money(zones.rewardAmount)} en ${numberText(zones.takeProfit)}.</span>
      <span>Relacion estimada deseada: 1:${numberText(rr || 0)}. Riesgo ${money(zones.riskAmount)} para objetivo ${money(zones.rewardAmount)}.</span>
    </div>
  `;
}

function buildChartCandles(zones, direction) {
  const base = Number(zones.open || zones.price || zones.entry || 0);
  const last = Number(zones.price || base);
  const high = Math.max(Number(zones.high || base), base, last, zones.entry);
  const low = Math.min(Number(zones.low || base), base, last, zones.entry);
  const drift = Math.max(Math.abs(high - low), Math.abs(zones.entry - base), base * 0.002, 0.01);
  const sign = direction === "SHORT" ? -1 : 1;
  const candles = Array.from({ length: 30 }, (_, index) => {
    const progress = index / 29;
    const wave = Math.sin(index * 0.85) * drift * 0.16;
    const pulse = Math.cos(index * 0.43) * drift * 0.08;
    const trend = base + (last - base) * progress + sign * drift * (progress - 0.5) * 0.35;
    const o = index === 0 ? base : trend - sign * drift * 0.04 + pulse;
    const c = index === 29 ? last : trend + wave;
    const h = Math.max(o, c) + drift * (0.08 + (index % 5 === 0 ? 0.18 : 0.04));
    const l = Math.min(o, c) - drift * (0.08 + (index % 7 === 0 ? 0.16 : 0.04));
    return { o, h: Math.max(h, high && index === 12 ? high : h), l: Math.min(l, low && index === 17 ? low : l), c };
  });
  return candles.map((candle) => ({
    o: Number.isFinite(candle.o) ? candle.o : base,
    h: Number.isFinite(candle.h) ? candle.h : base,
    l: Number.isFinite(candle.l) ? candle.l : base,
    c: Number.isFinite(candle.c) ? candle.c : base,
  }));
}

function realCandlesForItem(item, frameOverride = null) {
  const frame = frameOverride || chartFrameConfig();
  const rows = mergedBarsForSymbol(item.asset.symbol, frame.key);
  const visibleRows = frame.aggregateHours ? aggregateCandlesByHours(rows, frame.aggregateHours) : rows;
  const candles = visibleRows.slice(-frame.limit)
    .map((bar) => ({
      o: Number(bar.open || 0),
      h: Number(bar.high || 0),
      l: Number(bar.low || 0),
      c: Number(bar.close || 0),
      timestamp: bar.timestamp,
      source: bar.source || "market_bars",
      pointQuote: bar.is_ohlc === true ? false : Number(bar.open || 0) === Number(bar.high || 0)
        && Number(bar.high || 0) === Number(bar.low || 0)
        && Number(bar.low || 0) === Number(bar.close || 0),
    }))
    .filter((candle) => candle.o > 0 && candle.h > 0 && candle.l > 0 && candle.c > 0);
  return candles.map((candle, index) => {
    const previousClose = index > 0 ? candles[index - 1].c : candle.o;
    const isPointQuote = candle.pointQuote;
    if (!isPointQuote) return candle;
    const o = previousClose || candle.c;
    const c = candle.c;
    const bodyRange = Math.abs(c - o);
    const wick = Math.max(bodyRange * 0.35, c * 0.00012, priceStepPct(item.asset) * c * 0.3, 0.00001);
    return {
      ...candle,
      o,
      h: Math.max(o, c) + wick,
      l: Math.max(0.00001, Math.min(o, c) - wick),
      c,
    };
  });
}

function latestSwingFib(candles) {
  if (!Array.isArray(candles) || candles.length < 6) return null;
  const lookbackCount = Math.min(candles.length, 14);
  const offset = candles.length - lookbackCount;
  const window = candles.slice(offset);
  const endIndex = window.length - 1;
  const lastClose = Number(window[window.length - 1]?.c || 0);
  const recentClose = Number(window[Math.max(0, window.length - 4)]?.c || lastClose);
  const direction = lastClose >= recentClose ? "up" : "down";

  let start = direction === "up"
    ? { index: 0, price: Number.POSITIVE_INFINITY }
    : { index: 0, price: 0 };
  window.forEach((candle, index) => {
    if (index >= endIndex) return;
    if (direction === "up" && Number(candle.l) <= start.price) start = { index, price: Number(candle.l) };
    if (direction === "down" && Number(candle.h) >= start.price) start = { index, price: Number(candle.h) };
  });

  const end = {
    index: endIndex,
    price: direction === "up"
      ? Math.max(Number(window[endIndex].h || 0), lastClose)
      : Math.min(Number(window[endIndex].l || 0), lastClose),
  };

  const startPrice = start.price;
  const endPrice = end.price;
  const range = Math.abs(endPrice - startPrice);
  if (!Number.isFinite(range) || range <= Math.max(endPrice * 0.00005, 0.00001)) return null;

  const ratios = [0, 0.382, 0.5, 0.618, 0.8, 0.9, 0.95, 1];
  const levels = ratios.map((ratio) => ({
    ratio,
    label: `${ratio === 0 ? "0" : ratio === 1 ? "100" : (ratio * 100).toFixed(1)}%`,
    price: direction === "up" ? endPrice - range * ratio : endPrice + range * ratio,
    key: ratio === 0.8 || ratio === 0.9,
  }));

  return {
    direction,
    startIndex: offset + start.index,
    endIndex: offset + end.index,
    startPrice,
    endPrice,
    levels,
    goldenLow: Math.min(levels.find((level) => level.ratio === 0.5)?.price || endPrice, levels.find((level) => level.ratio === 0.618)?.price || endPrice),
    goldenHigh: Math.max(levels.find((level) => level.ratio === 0.5)?.price || endPrice, levels.find((level) => level.ratio === 0.618)?.price || endPrice),
    deepLow: Math.min(levels.find((level) => level.ratio === 0.8)?.price || endPrice, levels.find((level) => level.ratio === 0.9)?.price || endPrice),
    deepHigh: Math.max(levels.find((level) => level.ratio === 0.8)?.price || endPrice, levels.find((level) => level.ratio === 0.9)?.price || endPrice),
  };
}

function fibLevelPrice(fib, ratio) {
  return Number(fib?.levels?.find((level) => level.ratio === ratio)?.price || NaN);
}

function candleBody(candle) {
  return Math.abs(Number(candle.c || 0) - Number(candle.o || 0));
}

function candleRange(candle) {
  return Math.max(Number(candle.h || 0) - Number(candle.l || 0), 0.00001);
}

function candleUpperWick(candle) {
  return Number(candle.h || 0) - Math.max(Number(candle.o || 0), Number(candle.c || 0));
}

function candleLowerWick(candle) {
  return Math.min(Number(candle.o || 0), Number(candle.c || 0)) - Number(candle.l || 0);
}

function evaluateFibPullbackSetup(symbol, direction = "WAIT") {
  const candles = candlesForFrame(symbol, "15m");
  const fib = latestSwingFib(candles);
  if (!fib || candles.length < 8) {
    return {
      fib,
      ready: false,
      rejected: false,
      score: -4,
      status: "SIN FIB",
      detail: "Faltan velas 15M para medir el ultimo impulso con Fibonacci.",
    };
  }

  const last = candles[candles.length - 1];
  const lastClose = Number(last.c);
  const lastOpen = Number(last.o);
  const recent = candles.slice(-5);
  const level0 = fibLevelPrice(fib, 0);
  const level80 = fibLevelPrice(fib, 0.8);
  const level90 = fibLevelPrice(fib, 0.9);
  const level95 = fibLevelPrice(fib, 0.95);
  const directionFromFib = fib.direction === "up" ? "LONG" : "SHORT";
  const directionMatches = direction === "WAIT" || direction === directionFromFib;
  const deepLow = Number.isFinite(fib.deepLow) ? fib.deepLow : Math.min(level80, level90);
  const deepHigh = Number.isFinite(fib.deepHigh) ? fib.deepHigh : Math.max(level80, level90);
  const touchedZone = recent.some((candle) => Number(candle.l) <= deepHigh && Number(candle.h) >= deepLow);
  const bodyPct = candleBody(last) / candleRange(last);
  const wickRejectsUp = candleLowerWick(last) >= candleBody(last) * 0.75 && lastClose >= lastOpen;
  const wickRejectsDown = candleUpperWick(last) >= candleBody(last) * 0.75 && lastClose <= lastOpen;
  const recoveredUp = fib.direction === "up" && touchedZone && lastClose > deepHigh && (wickRejectsUp || bodyPct >= 0.45);
  const recoveredDown = fib.direction === "down" && touchedZone && lastClose < deepLow && (wickRejectsDown || bodyPct >= 0.45);
  const invalidatedUp = fib.direction === "up" && recent.some((candle) => Number(candle.l) <= level95);
  const invalidatedDown = fib.direction === "down" && recent.some((candle) => Number(candle.h) >= level95);
  const imbalance = detectGapFvgBag(candles.slice(-8));
  const imbalanceOk = imbalance.bias === "WAIT" || imbalance.bias === directionFromFib;
  const ready = directionMatches && imbalanceOk && (recoveredUp || recoveredDown);
  const rejected = !directionMatches || invalidatedUp || invalidatedDown || (touchedZone && !imbalanceOk);
  const status = ready
    ? "FIB CONFIRMADO"
    : rejected
      ? "FIB INVALIDADO"
      : touchedZone
        ? "FIB EN ZONA"
        : "ESPERAR FIB";
  const score = ready ? 18 : rejected ? -22 : touchedZone ? 4 : -2;
  const target = level0;
  const stop = fib.direction === "up" ? level95 : level95;
  const detail = ready
    ? `15M: precio respeto la zona profunda 80-90 y rechazo a favor. ${imbalance.type} no contradice.`
    : rejected
      ? `15M: zona Fibonacci invalidada o direccion contradictoria. Espera un nuevo impulso antes de operar.`
      : touchedZone
        ? "15M: el precio esta en la zona profunda 80-90, pero falta vela de rechazo clara."
        : "15M: esperar retroceso hacia 80-90 antes de buscar entrada.";

  return {
    fib,
    candles,
    direction: directionFromFib,
    ready,
    rejected,
    touchedZone,
    imbalance,
    target,
    stop,
    score,
    status,
    detail,
  };
}

function evaluateForecastProgress(item, candles, zones, fibSetup) {
  if (!Array.isArray(candles) || !candles.length || !zones) {
    return {
      state: "waiting",
      label: "ESPERAR",
      detail: "Aun no hay velas suficientes para seguir el escenario.",
      progressPct: 0,
      invalidated: false,
      confirmed: false,
    };
  }

  const directionSign = item.direction === "SHORT" ? -1 : 1;
  const entry = Number(zones.entry);
  const target = Number(zones.takeProfit);
  const stop = Number(zones.stopLoss);
  const last = candles[candles.length - 1];
  const lastClose = Number(last.c || zones.price);
  const recent = candles.slice(-8);
  const touchedEntry = item.direction === "SHORT"
    ? recent.some((candle) => Number(candle.l) <= entry)
    : recent.some((candle) => Number(candle.h) >= entry);
  const touchedTarget = item.direction === "SHORT"
    ? recent.some((candle) => Number(candle.l) <= target)
    : recent.some((candle) => Number(candle.h) >= target);
  const touchedStop = item.direction === "SHORT"
    ? recent.some((candle) => Number(candle.h) >= stop)
    : recent.some((candle) => Number(candle.l) <= stop);
  const invalidated = Boolean(touchedStop || fibSetup?.rejected);
  const distance = Math.max(Math.abs(target - entry), 0.00001);
  const progressPct = clamp(((lastClose - entry) * directionSign / distance) * 100, -100, 130);

  if (invalidated) {
    return {
      state: "reset",
      label: "REINICIAR",
      detail: "El precio contradijo el escenario o toco zona de invalidez. Ignora esta ruta y espera nuevo impulso.",
      progressPct,
      invalidated: true,
      confirmed: false,
    };
  }
  if (touchedTarget) {
    return {
      state: "target",
      label: "META TOCADA",
      detail: "El recorrido esperado llego a la zona objetivo. No perseguir extension sin nuevo patron.",
      progressPct: 100,
      invalidated: false,
      confirmed: true,
    };
  }
  if (touchedEntry && progressPct > 0) {
    return {
      state: "running",
      label: `EN CURSO ${Math.round(progressPct)}%`,
      detail: "El precio activo el gatillo y avanza a favor. Mantener lectura mientras no regrese al stop.",
      progressPct,
      invalidated: false,
      confirmed: true,
    };
  }
  if (touchedEntry) {
    return {
      state: "triggered",
      label: "GATILLO TOCADO",
      detail: "Toco entrada, pero aun no avanza con claridad. Espera confirmacion de la siguiente vela.",
      progressPct,
      invalidated: false,
      confirmed: false,
    };
  }

  return {
    state: "waiting",
    label: "ESPERAR GATILLO",
    detail: "El precio aun no activo la entrada. El escenario solo es una ruta posible.",
    progressPct,
    invalidated: false,
    confirmed: false,
  };
}

function renderTradeChart(item, variant = "mini") {
  const zones = item.zones;
  if (!zones) return "";
  const realCandles = realCandlesForItem(item);
  const usingRealCandles = realCandles.length >= 2;
  const candles = usingRealCandles ? realCandles : buildChartCandles(zones, item.direction);
  const proZones = professionalZonesForItem(item, candles);
  const pointQuoteCount = candles.filter((candle) => candle.pointQuote).length;
  const pointQuoteMode = usingRealCandles && pointQuoteCount >= Math.ceil(candles.length * 0.55);
  const barsMeta = marketBarMetaByFrame[marketFrameKey(item.asset.symbol, chartFrameKey())] || marketBarMeta[item.asset.symbol] || {};
  const usingOhlcBars = usingRealCandles && barsMeta.isRealOhlc && !pointQuoteMode;
  const candleValues = candles.flatMap((candle) => [candle.o, candle.h, candle.l, candle.c]);
  const candleMin = Math.min(...candleValues);
  const candleMax = Math.max(...candleValues);
  const candleSpan = Math.max(candleMax - candleMin, zones.price * 0.002, 0.0001);
  const nearLevel = (value) => Math.abs(Number(value) - zones.price) <= candleSpan * (usingOhlcBars ? 1.2 : 2.8);
  const mainZoomValues = [
    ...candleValues,
    zones.price,
    ...(nearLevel(zones.entry) ? [zones.entry] : []),
    ...(nearLevel(zones.stopLoss) ? [zones.stopLoss] : []),
    ...(nearLevel(zones.takeProfit) ? [zones.takeProfit] : []),
    ...(nearLevel(proZones.support) ? [proZones.support] : []),
    ...(nearLevel(proZones.resistance) ? [proZones.resistance] : []),
  ];
  const miniValues = [
    zones.price,
    ...candleValues,
    zones.entry,
    zones.stopLoss,
    zones.takeProfit,
    zones.reboundLow,
    zones.reboundHigh,
    proZones.support,
    proZones.resistance,
  ];
  const values = (variant === "main" ? mainZoomValues : miniValues)
    .filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return "";
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minChartSpan = Math.max(rawMax * 0.002, 0.0001);
  const rawSpan = Math.max(rawMax - rawMin, minChartSpan);
  const min = rawMin - rawSpan * 0.12;
  const max = rawMax + rawSpan * 0.12;
  const span = Math.max(max - min, minChartSpan);
  const visibleLevel = (value) => Number(value) >= min && Number(value) <= max;
  const chartWidth = variant === "main" ? 980 : 238;
  const chartHeight = variant === "main" ? 430 : 112;
  const plotLeft = variant === "main" ? 54 : 10;
  const plotRight = variant === "main" ? chartWidth - 96 : 230;
  const forecastSpace = variant === "main" ? 230 : 0;
  const dataRight = Math.max(plotLeft + 80, plotRight - forecastSpace);
  const plotTop = variant === "main" ? 34 : 8;
  const plotBottom = variant === "main" ? chartHeight - 72 : 96;
  const plotHeight = plotBottom - plotTop;
  const y = (value) => clamp(plotBottom - ((value - min) / span) * plotHeight, plotTop, plotBottom);
  const candleWidth = variant === "main" ? clamp((dataRight - plotLeft) / Math.max(candles.length, 1) * 0.54, 8, 18) : 3.8;
  const candleGap = candles.length > 1 ? (dataRight - plotLeft) / (candles.length - 1) : 8;
  const startX = plotLeft;
  const priceTicks = Array.from({ length: 5 }, (_, index) => max - (span * index) / 4);
  const activeFrame = chartFrameConfig();
  const chartInterval = activeFrame.aggregateHours
    ? `${activeFrame.aggregateHours}H`
    : String(barsMeta.interval || activeFrame.interval || "1m").toUpperCase();
  const chartPeriod = String(barsMeta.period || activeFrame.period || "1d").toUpperCase();
  const showDateOnAxis = chartPeriod !== "1D";
  const dateFormatter = new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/New_York",
  });
  const hourFormatter = new Intl.DateTimeFormat("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/New_York",
  });
  const chartRangeText = (() => {
    const startDate = candles[0]?.timestamp ? new Date(candles[0].timestamp) : barsMeta.startAt ? new Date(barsMeta.startAt) : null;
    const endDate = candles[candles.length - 1]?.timestamp ? new Date(candles[candles.length - 1].timestamp) : barsMeta.endAt ? new Date(barsMeta.endAt) : null;
    if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return "";
    const windowMinutes = Number(barsMeta.windowMinutes || 0);
    return `Fecha NY ${dateFormatter.format(endDate)} · ${hourFormatter.format(startDate)}-${hourFormatter.format(endDate)}${windowMinutes ? ` · ventana ${windowMinutes}m` : ""}`;
  })();
  const timeLabel = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    const options = showDateOnAxis
      ? { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" }
      : { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/New_York" };
    return new Intl.DateTimeFormat("es-CO", options).format(date);
  };
  const timeTicks = variant === "main" && candles.length
    ? [
      { index: 0, label: timeLabel(candles[0].timestamp) },
      { index: Math.floor((candles.length - 1) / 2), label: timeLabel(candles[Math.floor((candles.length - 1) / 2)]?.timestamp) },
      { index: candles.length - 1, label: timeLabel(candles[candles.length - 1].timestamp) },
    ].filter((tick) => tick.label)
    : [];
  const visibleTrace = traceFrame(item.asset.symbol, chartFrameKey());
  const firstClose = candles[0]?.c || 0;
  const lastClose = candles[candles.length - 1]?.c || 0;
  const trendSide = firstClose > 0 && lastClose > 0
    ? lastClose > firstClose ? "up" : lastClose < firstClose ? "down" : "flat"
    : "flat";
  const trendBiasLabel = visibleTrace.bias === "WAIT"
    ? "SIN DIRECCION"
    : visibleTrace.bias === "LONG"
      ? "TRAZA LONG"
      : "TRAZA SHORT";
  const trendStartX = candles.length ? startX : plotLeft;
  const trendEndX = candles.length > 1 ? startX + (candles.length - 1) * candleGap : plotRight;
  const trendMarkup = variant === "main" && firstClose > 0 && lastClose > 0 ? `
    <line x1="${trendStartX}" y1="${y(firstClose)}" x2="${trendEndX}" y2="${y(lastClose)}" class="chart-trend ${trendSide}" />
    <text x="${plotLeft + 8}" y="${plotTop + 18}" class="chart-trend-label ${trendSide}">${trendBiasLabel} ${numberText(visibleTrace.movePct)}%</text>
  ` : "";
  const fib = variant === "main" ? latestSwingFib(candles) : null;
  const fibSetup = variant === "main" ? item.fibSetup || evaluateFibPullbackSetup(item.asset.symbol, item.direction) : null;
  const forecastState = variant === "main" ? evaluateForecastProgress(item, candles, zones, fibSetup) : null;
  const fibGoldenMarkup = (() => {
    if (!fib || (!visibleLevel(fib.goldenLow) && !visibleLevel(fib.goldenHigh))) return "";
    if (variant === "main") return "";
    const rawTop = Math.min(y(fib.goldenLow), y(fib.goldenHigh));
    const rawBottom = Math.max(y(fib.goldenLow), y(fib.goldenHigh));
    const minFibHeight = 54;
    const center = (rawTop + rawBottom) / 2;
    const top = clamp(Math.min(rawTop, center - minFibHeight / 2), plotTop, plotBottom - minFibHeight);
    const bottom = clamp(Math.max(rawBottom, center + minFibHeight / 2), top + minFibHeight, plotBottom);
    const labelY = clamp(top + 20, plotTop + 16, plotBottom - 8);
    return `
      <rect x="${plotLeft}" y="${top}" width="${plotRight - plotLeft}" height="${bottom - top}" rx="9" class="chart-fib-golden ${fib.direction}" />
      <text x="${plotLeft + 10}" y="${labelY}" class="chart-fib-zone-label ${fib.direction}">ZONA FIB 80%-90%</text>
    `;
  })();
  const forecastMarkup = (() => {
    if (variant !== "main" || !candles.length || !Number.isFinite(zones.entry) || !Number.isFinite(zones.takeProfit)) return "";
    const lastX = startX + (candles.length - 1) * candleGap;
    const lastY = y(lastClose || zones.price);
    const bounceX = clamp(lastX + forecastSpace * 0.18, lastX + 16, plotRight - 164);
    const rejectX = clamp(lastX + forecastSpace * 0.34, bounceX + 18, plotRight - 128);
    const entryX = clamp(lastX + forecastSpace * 0.54, rejectX + 20, plotRight - 82);
    const pullbackX = clamp(lastX + forecastSpace * 0.7, entryX + 18, plotRight - 46);
    const targetX = clamp(lastX + forecastSpace * 0.9, pullbackX + 22, plotRight - 8);
    const entryY = y(zones.entry);
    const targetY = y(zones.takeProfit);
    const directionSign = item.direction === "SHORT" ? -1 : 1;
    const lastPrice = Number(lastClose || zones.price);
    const baseMove = Math.max(Math.abs(Number(zones.entry) - lastPrice), Math.abs(Number(zones.takeProfit) - Number(zones.entry)) * 0.28, Math.abs(Number(zones.stopLoss) - Number(zones.entry)) * 0.18);
    const bouncePrice = lastPrice - directionSign * baseMove * 0.75;
    const rejectPrice = lastPrice + directionSign * baseMove * 0.18;
    const pullbackPrice = Number(zones.entry) - directionSign * baseMove * 0.28;
    const bounceY = y(Number.isFinite(bouncePrice) && bouncePrice > 0 ? bouncePrice : lastPrice);
    const rejectY = y(Number.isFinite(rejectPrice) && rejectPrice > 0 ? rejectPrice : lastPrice);
    const pullbackY = y(Number.isFinite(pullbackPrice) && pullbackPrice > 0 ? pullbackPrice : zones.entry);
    const confirmed = item.status === "OPERABLE" && (!fibSetup || fibSetup.ready) && !forecastState?.invalidated;
    const label = forecastState?.label || (confirmed ? "PRONOSTICO" : "ESCENARIO");
    const labelX = clamp(lastX + 8, plotLeft + 8, plotRight - 84);
    const labelY = clamp(Math.min(lastY, entryY, targetY) - 10, plotTop + 14, plotBottom - 12);
    const forecastClass = forecastState?.state || "waiting";
    const divider = `<line x1="${lastX}" x2="${lastX}" y1="${plotTop}" y2="${plotBottom}" class="chart-forecast-divider" />`;
    const forecastPoints = (() => {
      if (forecastClass === "reset") {
        return `${lastX},${lastY} ${bounceX},${bounceY} ${rejectX},${rejectY} ${entryX},${entryY}`;
      }
      if (forecastClass === "running" || forecastClass === "target") {
        return `${lastX},${lastY} ${targetX},${targetY}`;
      }
      if (forecastClass === "triggered") {
        return `${lastX},${lastY} ${pullbackX},${pullbackY} ${targetX},${targetY}`;
      }
      return `${lastX},${lastY} ${bounceX},${bounceY} ${rejectX},${rejectY} ${entryX},${entryY} ${pullbackX},${pullbackY} ${targetX},${targetY}`;
    })();
    const stepMarkup = forecastClass === "running" || forecastClass === "target"
      ? ""
      : forecastClass === "reset"
        ? `
          <circle cx="${bounceX}" cy="${bounceY}" r="3" class="chart-forecast-step muted" />
          <line x1="${entryX - 9}" y1="${entryY - 9}" x2="${entryX + 9}" y2="${entryY + 9}" class="chart-forecast-reset-mark" />
          <line x1="${entryX + 9}" y1="${entryY - 9}" x2="${entryX - 9}" y2="${entryY + 9}" class="chart-forecast-reset-mark" />
        `
        : forecastClass === "triggered"
          ? `<circle cx="${pullbackX}" cy="${pullbackY}" r="3" class="chart-forecast-step muted" />`
          : `
          <circle cx="${bounceX}" cy="${bounceY}" r="3" class="chart-forecast-step muted" />
          <circle cx="${rejectX}" cy="${rejectY}" r="3" class="chart-forecast-step muted" />
          <circle cx="${entryX}" cy="${entryY}" r="4" class="chart-forecast-step" />
          <circle cx="${pullbackX}" cy="${pullbackY}" r="3" class="chart-forecast-step muted" />
        `;
    return `
      ${divider}
      <polyline points="${forecastPoints}" class="chart-forecast ${item.direction === "SHORT" ? "short" : "long"} ${confirmed ? "confirmed" : "pending"} ${forecastClass}" />
      ${stepMarkup}
      ${forecastClass === "reset" ? "" : `<circle cx="${targetX}" cy="${targetY}" r="5" class="chart-forecast-dot ${confirmed ? "confirmed" : "pending"}" />`}
      <text x="${labelX}" y="${labelY}" class="chart-forecast-label ${forecastClass === "reset" ? "reset" : ""}">${forecastClass === "reset" ? "REINICIAR LECTURA" : label}</text>
      ${forecastClass === "waiting" ? `<text x="${bounceX}" y="${plotBottom + 22}" class="chart-forecast-time">rebote</text>` : ""}
      ${forecastClass === "waiting" || forecastClass === "triggered" ? `<text x="${entryX}" y="${plotBottom + 22}" class="chart-forecast-time">gatillo</text>` : ""}
      ${forecastClass === "reset" ? `<text x="${entryX}" y="${plotBottom + 22}" class="chart-forecast-time">nuevo impulso</text>` : `<text x="${targetX}" y="${plotBottom + 22}" class="chart-forecast-time">meta</text>`}
    `;
  })();
  const levelTag = (label, value, className) => variant === "main" ? `
    <g class="chart-price-tag ${className}">
      <rect x="${plotRight + 8}" y="${clamp(y(value) - 11, plotTop, plotBottom - 18)}" width="58" height="20" rx="4" />
      <text x="${plotRight + 37}" y="${clamp(y(value) + 3, plotTop + 14, plotBottom - 4)}">${label}</text>
    </g>
  ` : "";
  const candleMarkup = candles.map((candle, index) => {
    const x = startX + index * candleGap;
    const bodyTop = Math.min(y(candle.o), y(candle.c));
    const bodyHeight = Math.max(variant === "main" ? 9 : 3, Math.abs(y(candle.o) - y(candle.c)));
    const up = candle.c >= candle.o;
    return `
      <g class="chart-candle ${up ? "up" : "down"}">
        <line x1="${x}" x2="${x}" y1="${y(candle.h)}" y2="${y(candle.l)}" />
        <rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" rx="2" />
      </g>
    `;
  }).join("");
  const zoneVisible = visibleLevel(zones.reboundLow) || visibleLevel(zones.reboundHigh);
  const safetyVisible = visibleLevel(zones.securityLow) || visibleLevel(zones.securityHigh);
  const zoneHeight = Math.max(6, Math.abs(y(zones.reboundLow) - y(zones.reboundHigh)));
  const title = `${item.asset.symbol} ${item.directionLabel}`;
  const chartTitle = usingOhlcBars ? `Grafica ${chartInterval} OHLC` : "Mapa XTB de orden";
  const liveCandleCount = (liveCandleBars[item.asset.symbol] || []).length;
  const latestCandleTime = candles[candles.length - 1]?.timestamp ? hourFormatter.format(new Date(candles[candles.length - 1].timestamp)) : "";
  const chartSourceText = usingOhlcBars
    ? liveCandleCount
      ? `OHLC con lectura XTB en vivo (${liveCandleCount} vela(s) locales). Ultima vela NY ${latestCandleTime || "--:--"}`
      : `OHLC real ${barsMeta.providerSymbol || item.asset.symbol} via Yahoo ${chartInterval}/${chartPeriod}; XTB sigue siendo referencia final de precio/spread`
    : pointQuoteMode
      ? "lecturas puntuales XTB/Yahoo; no es vela OHLC real"
      : "visual tactico; faltan OHLC completas";
  const axisMarkup = variant === "main" ? priceTicks.map((tick) => `
    <g class="chart-grid-line">
      <line x1="${plotLeft}" x2="${plotRight}" y1="${y(tick)}" y2="${y(tick)}" />
      <text x="${plotRight + 8}" y="${y(tick) + 4}">${numberText(tick)}</text>
    </g>
  `).join("") : "";
  const timeAxisMarkup = timeTicks.map((tick) => {
    const x = startX + tick.index * candleGap;
    return `
      <g class="chart-time-tick">
        <line x1="${x}" x2="${x}" y1="${plotTop}" y2="${plotBottom}" />
        <text x="${x}" y="${plotBottom + 34}">${tick.label}</text>
      </g>
    `;
  }).join("");
  const chartLegendMarkup = `
    <div class="chart-legend">
      <span class="take">Deseada ${numberText(zones.takeProfit)}</span>
      <span class="entry">Entrada ${numberText(zones.entry)}</span>
      <span class="stop">Stop ${numberText(zones.stopLoss)}</span>
    </div>
  `;
  const mainExplanationMarkup = variant === "main" ? `
    <div class="trade-zones">
      ${forecastState ? `<span><b>Pronostico vivo:</b> ${forecastState.detail}</span>` : ""}
      <span>Zona rebote: ${numberText(zones.reboundLow)} - ${numberText(zones.reboundHigh)}</span>
      <span>Zona seguridad: ${numberText(zones.securityLow)} - ${numberText(zones.securityHigh)}</span>
      <span>Zonas profesionales: soporte ${numberText(proZones.support)}, resistencia ${numberText(proZones.resistance)}, gatillo ${numberText(proZones.trigger)}.</span>
      <span>Valor deseado: ${money(zones.rewardAmount)} | Riesgo aprox: ${money(zones.riskAmount)}</span>
      ${chartRangeText ? `<span>Rango visible: ${chartRangeText}. Si ves pocas velas, Yahoo no entrego todas las velas de esa ventana.</span>` : ""}
      <span>Fuente grafica: ${chartSourceText}. La escala prioriza precio reciente, entrada y stop para no aplastar las velas.</span>
      <span>Traza visible: ${chartFrameConfig().label} muestra ${visibleTrace.bias === "WAIT" ? "sin direccion operable" : visibleTrace.bias}, patron ${visibleTrace.pattern.name}, tendencia ${visibleTrace.trend.direction}. La decision final exige mapa 4H, confirmacion 15M y gatillo 1M.</span>
      ${fib ? `<span>Fibonacci ultimo impulso ${fib.direction === "up" ? "alcista" : "bajista"}: inicio ${numberText(fib.startPrice)}, fin ${numberText(fib.endPrice)}. Zona 80%-90% ${fib.direction === "up" ? "retroceso profundo comprador" : "rebote profundo vendedor"}. Si atraviesa 95%-100%, se reinicia la lectura.</span>` : ""}
      ${fibSetup ? `<span>Pronostico lineal: ${fibSetup.ready ? "activo solo si el rechazo Fib 15M se mantiene" : "solo escenario; no copiar receta hasta confirmacion"}. Si falla stop/Fib, se reinicia automaticamente con el nuevo impulso.</span>` : ""}
    </div>
    ${technicalDecisionText(item, candles)}
  ` : "";
  return `
    <div class="trade-chart trade-chart-${variant}" aria-label="Mapa rapido de ${title}">
      ${variant === "main" ? `
        <div class="trade-chart-head">
          <div>
            <span>${chartTitle}</span>
            <strong>${title}</strong>
          </div>
          <div>
            <span>Precio base</span>
            <strong>${numberText(zones.price)}</strong>
          </div>
        </div>
      ` : ""}
      ${variant === "main" ? chartLegendMarkup + mainExplanationMarkup : ""}
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img">
        <rect x="${plotLeft}" y="${plotTop}" width="${plotRight - plotLeft}" height="${plotHeight}" rx="8" class="chart-plot-bg" />
        ${axisMarkup}
        ${timeAxisMarkup}
        ${zoneVisible ? `<rect x="${plotLeft}" y="${Math.min(y(zones.reboundLow), y(zones.reboundHigh))}" width="${plotRight - plotLeft}" height="${zoneHeight}" rx="6" class="chart-zone rebound" />` : ""}
        ${safetyVisible ? `<rect x="${plotLeft}" y="${Math.min(y(zones.securityLow), y(zones.securityHigh))}" width="${plotRight - plotLeft}" height="${Math.max(5, Math.abs(y(zones.securityLow) - y(zones.securityHigh)))}" rx="6" class="chart-zone safety" />` : ""}
        ${visibleLevel(proZones.resistance) ? `<line x1="${plotLeft}" x2="${plotRight}" y1="${y(proZones.resistance)}" y2="${y(proZones.resistance)}" class="chart-line resistance" />` : ""}
        ${visibleLevel(proZones.support) ? `<line x1="${plotLeft}" x2="${plotRight}" y1="${y(proZones.support)}" y2="${y(proZones.support)}" class="chart-line support" />` : ""}
        ${fibGoldenMarkup}
        ${visibleLevel(zones.takeProfit) ? `<line x1="${plotLeft}" x2="${plotRight}" y1="${y(zones.takeProfit)}" y2="${y(zones.takeProfit)}" class="chart-line take" />` : ""}
        ${visibleLevel(zones.entry) ? `<line x1="${plotLeft}" x2="${plotRight}" y1="${y(zones.entry)}" y2="${y(zones.entry)}" class="chart-line entry" />` : ""}
        ${visibleLevel(zones.stopLoss) ? `<line x1="${plotLeft}" x2="${plotRight}" y1="${y(zones.stopLoss)}" y2="${y(zones.stopLoss)}" class="chart-line stop" />` : ""}
        ${trendMarkup}
        ${forecastMarkup}
        ${candleMarkup}
        ${visibleLevel(zones.takeProfit) ? levelTag("TP", zones.takeProfit, "take") : ""}
        ${visibleLevel(zones.entry) ? levelTag("Entrada", zones.entry, "entry") : ""}
        ${visibleLevel(zones.stopLoss) ? levelTag("SL", zones.stopLoss, "stop") : ""}
        ${variant === "main" ? `
          <text x="${plotLeft}" y="${plotTop - 10}" class="chart-label resistance">RESISTENCIA ${numberText(proZones.resistance)}</text>
          <text x="${plotLeft}" y="${plotBottom + 28}" class="chart-label support">SOPORTE ${numberText(proZones.support)}</text>
          <text x="${plotLeft}" y="${chartHeight - 8}" class="chart-time-label">${usingOhlcBars ? `${candles.length} velas OHLC reales ${chartInterval}` : usingRealCandles ? `${candles.length} lecturas` : "Visual tactico"}${chartRangeText ? ` · ${chartRangeText}` : ""}</text>
        ` : ""}
      </svg>
      ${variant !== "main" ? chartLegendMarkup : ""}
    </div>
  `;
}

function renderMiniTradeChart(item) {
  return renderTradeChart(item, "mini");
}

function renderFibOnlyCard(item) {
  const fibFrame = chartFrameOptions["15m"];
  const candles = realCandlesForItem(item, fibFrame);
  const fib = latestSwingFib(candles);
  if (!fib) {
    return `
      <article class="simple-operation fib-only-card">
        <div class="simple-head">
          <h2>Filtro Fibonacci 15M</h2>
          <span class="simple-badge">15M fijo</span>
        </div>
        <div class="fib-empty">Aun no hay suficientes velas 15M para dibujar la ultima reaccion.</div>
      </article>
    `;
  }
  const width = 520;
  const height = 230;
  const left = 34;
  const right = width - 34;
  const top = 28;
  const bottom = height - 54;
  const deepLow = Number.isFinite(fib.deepLow) ? fib.deepLow : fib.goldenLow;
  const deepHigh = Number.isFinite(fib.deepHigh) ? fib.deepHigh : fib.goldenHigh;
  const values = [fib.startPrice, fib.endPrice, deepLow, deepHigh].filter((value) => Number.isFinite(value));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const span = Math.max(rawMax - rawMin, rawMax * 0.0006, 0.0001);
  const min = rawMin - span * 0.3;
  const max = rawMax + span * 0.3;
  const y = (value) => clamp(bottom - ((value - min) / (max - min)) * (bottom - top), top, bottom);
  const zoneTop = Math.min(y(deepLow), y(deepHigh));
  const zoneBottom = Math.max(y(deepLow), y(deepHigh));
  const swingLabel = fib.direction === "up" ? "Impulso alcista" : "Impulso bajista";
  const zoneLabel = fib.direction === "up" ? "Zona 80-90: esperar retroceso profundo y rechazo comprador" : "Zona 80-90: esperar rebote profundo y rechazo vendedor";
  const recent = candles.slice(-5);
  const last = candles[candles.length - 1];
  const lastClose = Number(last.c);
  const lastOpen = Number(last.o);
  const touchedZone = recent.some((candle) => Number(candle.l) <= deepHigh && Number(candle.h) >= deepLow);
  const confirmsUp = fib.direction === "up" && touchedZone && lastClose > deepHigh && lastClose >= lastOpen;
  const confirmsDown = fib.direction === "down" && touchedZone && lastClose < deepLow && lastClose <= lastOpen;
  const rejectedUp = fib.direction === "up" && touchedZone && lastClose < deepLow && lastClose < lastOpen;
  const rejectedDown = fib.direction === "down" && touchedZone && lastClose > deepHigh && lastClose > lastOpen;
  const directionMatches = (fib.direction === "up" && item.direction === "LONG") || (fib.direction === "down" && item.direction === "SHORT");
  const fibRejected = rejectedUp || rejectedDown || (touchedZone && item.status === "OPERABLE" && !directionMatches);
  const fibReady = directionMatches && (confirmsUp || confirmsDown) && item.status === "OPERABLE";
  const statusLabel = fibReady ? "OK PARA RECETA" : fibRejected ? "ZONA FIB RECHAZADA" : "ESPERAR";
  const badgeClass = fibReady ? "ok" : fibRejected ? "danger" : "";
  const actionLabel = fibReady
    ? "La zona fue tocada y hay rechazo a favor. Puedes revisar la receta XTB."
    : fibRejected
      ? "La zona Fibonacci fallo contra la lectura esperada. No uses esta receta; espera un nuevo impulso claro antes de volver a operar."
      : touchedZone
      ? "Zona tocada, pero falta vela clara de rechazo a favor."
      : "Esperar que el precio visite la zona Fibonacci y confirme rechazo.";
  const resetNote = fibRejected
    ? `<div class="fib-rejection-note">REINICIANDO MOVIMIENTO: ignora este Fibonacci y espera 3-5 velas nuevas para trazar otra reaccion.</div>`
    : "";
  const recipeRows = fibReady ? `
    <div class="fib-recipe-grid">
      <div><span>Orden</span><strong>${item.directionLabel}</strong></div>
      <div><span>Volumen</span><strong>${formatVolumeForXtb(item.volume, item.asset)}</strong></div>
      <div><span>Entrada</span><strong>${priceText(item.entry)}</strong></div>
      <div><span>Stop</span><strong>${priceText(item.stopLoss)}</strong></div>
      <div><span>Take</span><strong>${priceText(item.takeProfit)}</strong></div>
      <div><span>Margen</span><strong>${money(item.marginRequired)}</strong></div>
    </div>
  ` : "";
  return `
    <article class="simple-operation fib-only-card">
      <div class="simple-head">
        <h2>Filtro Fibonacci 15M</h2>
        <span class="simple-badge ${badgeClass}">${statusLabel}</span>
      </div>
      <div class="fib-focus-copy">
        <strong>${swingLabel}</strong>
        <span>15M fijo: ${fibRejected ? "zona rechazada, borrar la lectura anterior y esperar nuevo movimiento" : zoneLabel}</span>
      </div>
      <svg class="fib-focus-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="Zona Fibonacci 80 a 90">
        <rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="14" class="fib-focus-bg" />
        <rect x="${left}" y="${zoneTop}" width="${right - left}" height="${Math.max(42, zoneBottom - zoneTop)}" rx="13" class="fib-focus-zone ${fib.direction}" />
        <line x1="${left + 28}" y1="${y(fib.startPrice)}" x2="${right - 28}" y2="${y(fib.endPrice)}" class="fib-focus-swing ${fib.direction}" />
        <circle cx="${left + 28}" cy="${y(fib.startPrice)}" r="5" class="fib-focus-dot ${fib.direction}" />
        <circle cx="${right - 28}" cy="${y(fib.endPrice)}" r="5" class="fib-focus-dot ${fib.direction}" />
        <text x="${left + 12}" y="${clamp(zoneTop + 24, top + 22, bottom - 8)}" class="fib-focus-title">ZONA FIB 80%-90%</text>
        <text x="${left + 12}" y="${y(fib.startPrice) - 8}" class="fib-focus-label">Inicio ${numberText(fib.startPrice)}</text>
        <text x="${right - 12}" y="${y(fib.endPrice) - 8}" class="fib-focus-label end">Final ${numberText(fib.endPrice)}</text>
      </svg>
      <div class="fib-focus-levels">
        <div><span>80%</span><strong>${numberText(fib.levels.find((level) => level.ratio === 0.8)?.price)}</strong></div>
        <div><span>90%</span><strong>${numberText(fib.levels.find((level) => level.ratio === 0.9)?.price)}</strong></div>
      </div>
      ${resetNote}
      ${recipeRows}
      <p class="simple-warning">${actionLabel}</p>
      <p class="simple-tiny">Utilidad: ayuda a ver si el retroceso 15M mejora la entrada. No decide sola; la decision final la manda el semaforo.</p>
    </article>
  `;
}

function inverseDirection(direction) {
  return direction === "LONG" ? "SHORT" : "LONG";
}

function effectiveDirectionForSlot(asset, slot = document.getElementById("trade-slot")?.value || "1") {
  const baseDirection = aiDirectionForAsset(asset);
  return String(slot) === "4" ? inverseDirection(baseDirection) : baseDirection;
}

function resetOrderFieldsForAssetDirection(asset, direction) {
  const directionInput = document.getElementById("direction");
  directionInput.value = direction === "SHORT" ? "SHORT" : "LONG";
  resetOrderFieldsForAsset(asset);
  applyAiAggressiveTargets(asset);
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

function buildAssetOpportunity(asset, riskPct = getEffectiveRiskPct()) {
  if (asset.symbol === focusSymbol) {
    const profile = us100StrategyProfile();
    const zones = buildTradeZones(asset, profile.direction, profile.entry, profile.volume, profile.targetUsd);
    zones.stopLoss = profile.stopLoss;
    zones.takeProfit = profile.takeProfit;
    zones.riskAmount = profile.stopUsd;
    zones.rewardAmount = profile.targetUsd;
    zones.securityLow = Math.min(profile.entry, profile.stopLoss);
    zones.securityHigh = Math.max(profile.entry, profile.stopLoss);
    return {
      asset,
      volume: profile.volume,
      score: profile.confidence,
      direction: profile.direction,
      directionLabel: profile.directionLabel,
      usable: profile.status !== "NO OPERAR",
      status: profile.status,
      confidence: profile.confidence,
      entry: profile.entry,
      stopLoss: profile.stopLoss,
      takeProfit: profile.takeProfit,
      zones,
      stopDistance: Math.abs(profile.entry - profile.stopLoss),
      marginRequired: profile.marginRequired,
      spreadCost: estimatedSpreadCost(asset, profile.volume),
      targetMovePct: profile.entry ? Math.abs(profile.takeProfit - profile.entry) / profile.entry * 100 : 0,
      triggerDistancePct: 0,
      fullPathPct: 0,
      targetAmount: profile.targetUsd,
      stopPct: profile.entry ? Math.abs(profile.entry - profile.stopLoss) / profile.entry * 100 : 0,
      minimumStopPct: minimumStopPointsForAsset(asset) / Math.max(profile.entry, 1) * 100,
      reason: `${profile.pattern.name}. ${profile.explanation} Vol ${formatVolumeForXtb(profile.volume, asset)}, valor/punto ${money(profile.pointValue)}, margen aprox ${money(profile.marginRequired)}.`,
    };
  }
  const accountBalance = Number(document.getElementById("account-balance").value || defaultAccountBalance);
  const availableCapital = Number(document.getElementById("available-capital").value || 0);
  const marginPool = availableCapital || accountBalance;
  const marginBudget = marginPool / maxPlannedTrades;
  const changePct = Number(asset.liveChangePct ?? 0);
  const direction = aiDirectionForAsset(asset);
  const driftDirection = directionFromMove(changePct);
  const step = priceStepPct(asset);
  const entry = direction === "SHORT" ? asset.marketPrice * (1 - step) : asset.marketPrice * (1 + step);
  const targetAmount = buildDailyTradePlan().currentTradeRiskAmount;
  const nominalBudget = marginBudget / (cfdMarginPct(asset) / 100);
  const contractVolume = targetContractVolume(asset, entry, accountBalance);
  const marginVolume = roundVolumeForXtb(nominalBudget / (entry * asset.multiplier), asset);
  const volume = roundVolumeForXtb(Math.min(contractVolume, marginVolume), asset);
  const targetDistance = volume > 0 ? targetAmount / (volume * asset.multiplier) : 0;
  const positionValue = entry * asset.multiplier * volume;
  const marginRequired = positionValue * cfdMarginPct(asset) / 100;
  const targetMovePct = positionValue > 0 ? targetAmount / positionValue * 100 : 0;
  const takeProfit = direction === "SHORT" ? entry - targetDistance : entry + targetDistance;
  const zones = buildTradeZones(asset, direction, entry, volume, targetAmount);
  const trigger = triggerReadiness(asset, entry, takeProfit, asset.marketPrice);
  const spreadCost = estimatedSpreadCost(asset, volume);
  const hasVolume = asset.category === "stocks" ? volume >= 1 : volume > 0;
  const hasMargin = !availableCapital || marginRequired <= availableCapital;
  const spreadOk = !spreadCost || spreadCost <= targetAmount;
  const impulseOk = trigger.ready;
  const freshQuote = hasFreshMarketQuote(asset);
  const gapPct = providerXtbGapPct(asset);
  const gapOk = !gapPct || gapPct <= 2;
  const usable = freshQuote && gapOk && hasVolume && hasMargin && spreadOk && impulseOk;
  const movementScore = Math.abs(changePct) * 20;
  const directionPenalty = driftDirection === "WAIT" ? -30 : 0;
  const marginPenalty = hasMargin ? 0 : -80;
  const volumePenalty = hasVolume ? 0 : -80;
  const spreadPenalty = spreadOk ? 0 : -120;
  const impulsePenalty = impulseOk ? 0 : -100;
  const freshnessPenalty = freshQuote ? 0 : -150;
  const gapPenalty = gapOk ? 0 : -200;
  const marginUsePct = marginBudget > 0 ? Math.min(100, marginRequired / marginBudget * 100) : 0;
  const marginUseScore = usable ? marginUsePct / 5 : 0;
  const limitReason = !freshQuote
    ? "cotizacion Yahoo no reciente; actualiza antes de confiar en la senal"
    : !gapOk
    ? `brecha Yahoo/XTB ${numberText(gapPct)}%; valida simbolo del contrato antes de operar`
    : !spreadOk
    ? `spread ${money(spreadCost)} supera meta ${money(targetAmount)}`
    : !impulseOk ? trigger.message
    : volume < contractVolume ? "limitado por margen" : "contrato cerca del capital operativo";
  const score = (usable ? 50 : -50) + movementScore + marginUseScore + directionPenalty + marginPenalty + volumePenalty + spreadPenalty + impulsePenalty + freshnessPenalty + gapPenalty;
  return {
    asset,
    volume,
    score,
    direction,
    directionLabel: labelFromDirection(direction),
    usable,
    entry,
    stopLoss: zones.stopLoss,
    takeProfit,
    zones,
    stopDistance: 0,
    marginRequired,
    spreadCost,
    targetMovePct,
    triggerDistancePct: trigger.triggerDistancePct,
    fullPathPct: trigger.fullPathPct,
    targetAmount,
    stopPct: 0,
    minimumStopPct: 0,
    reason: usable
      ? `${numberText(changePct)}% ${movementLabelForAsset(asset)}. ${driftDirection === "WAIT" ? "Esperar confirmacion." : `Preparar ${labelFromDirection(direction)}.`} Vol ${formatVolumeForXtb(volume, asset)}, contrato ${money(positionValue)}, meta ${money(targetAmount)} con ${numberText(targetMovePct)}%. ${trigger.message}. ${limitReason}.`
      : `Oculto: ${limitReason}.`,
  };
}

function buildTopOpportunities() {
  const riskPct = getEffectiveRiskPct();
  return [findAsset(focusSymbol)]
    .map((asset) => buildAssetOpportunity(asset, riskPct))
    .filter((item) => item.usable)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function renderTopOpportunities() {
  const target = document.getElementById("top-opportunities");
  if (!target) return;
  const opportunities = buildTopOpportunities();
  const watchlist = buildOpeningWatchlist();
  const rows = opportunities.length ? opportunities : watchlist.slice(0, 3);
  const title = opportunities.length ? "Top 3 operables IA" : "Radar Yahoo para apertura";
  const subtitle = opportunities.length
    ? "Activos cerca del gatillo, con volumen/riesgo y margen validado."
    : "Camino previo: activos con movimiento reciente. No ejecutar hasta que cierre la primera vela y suba a OPERABLE.";
  target.innerHTML = `
    <div class="rounded-xl border border-white/10 bg-ink p-3">
      <p class="text-xs font-black uppercase text-zinc-500">${title}</p>
      <p class="mt-1 text-xs text-zinc-400">${marketPhaseLabel()}</p>
      <p class="mt-1 text-xs ${opportunities.length ? "text-bear" : "text-gold"}">${subtitle}</p>
      ${rows[0]?.zones ? renderTradeChart(rows[0], "main") : ""}
      <div class="mt-3 grid gap-2">
        ${rows.length ? rows.map((item, index) => `
          <button type="button" class="asset-card text-left" data-top-symbol="${item.asset.symbol}">
            <span class="text-xs text-gold">#${index + 1}</span>
            <span class="block text-base font-black">${item.asset.symbol}</span>
            <span class="block text-xs ${item.direction === "SHORT" ? "text-bear" : "text-bull"}">${item.directionLabel}</span>
            <span class="mt-1 block text-xs text-zinc-500">Entrada ${numberText(item.zones.entry)} | Stop ${numberText(item.zones.stopLoss)} | Take ${numberText(item.zones.takeProfit)}</span>
            <span class="mt-1 block text-xs text-zinc-500">${item.status ? `${item.status} ${item.confidence}% - ` : ""}${item.reason}</span>
          </button>
        `).join("") : `<div class="rounded-xl border border-white/10 bg-panel2 p-3 text-xs text-zinc-400">No hay activos claros. Espera el proximo refresh.</div>`}
      </div>
    </div>
  `;
  document.querySelectorAll("[data-top-symbol]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAsset = findAsset(button.dataset.topSymbol);
      document.getElementById("symbol").value = selectedAsset.symbol;
      document.getElementById("xtb-price").value = "";
      loadMarketBars([selectedAsset.symbol]).then(() => renderSimpleDashboard());
      const picked = [...buildTopOpportunities(), ...buildOpeningWatchlist()].find((item) => item.asset.symbol === selectedAsset.symbol);
      resetOrderFieldsForAssetDirection(selectedAsset, effectiveDirectionForSlot(selectedAsset));
      applyAiAggressiveTargets(selectedAsset);
      renderAssets();
      calculate();
    });
  });
}

async function calculate() {
  const symbol = focusSymbol;
  document.getElementById("symbol").value = focusSymbol;
  selectedAsset = findAsset(focusSymbol);
  document.getElementById("available-capital").value = document.getElementById("account-balance").value || defaultAccountBalance;
  document.getElementById("risk-pct").value = "dynamic";
  document.getElementById("direction").value = effectiveDirectionForSlot(selectedAsset);
  applyAiAggressiveTargets(selectedAsset);
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
  renderDailyResultCard();
  renderPriceGapStatus();
  lastResult = localCalculate(payload);
  renderWarnings();
  renderTicket();
  renderMath();
  renderBestDecisionNote();
  renderTradeSchedule();
  renderTopOpportunities();
  notifyIfNeeded();
  renderSimpleDashboard();
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function resetDailyResultInputs() {
  [1, 2, 3, 4].forEach((slot) => {
    const input = document.getElementById(operationResultId(slot));
    if (input) input.value = 0;
  });
  removeLocalValue("decision_engine_started_operations");
  setLocalValue("decision_engine_active_trade_date", todayKey());
  renderDailyResultCard();
}

function resetDailyResultsIfNewDay() {
  const today = todayKey();
  const activeDate = getLocalValue("decision_engine_active_trade_date");
  if (!activeDate) {
    setLocalValue("decision_engine_active_trade_date", today);
    return;
  }
  if (activeDate !== today) {
    resetDailyResultInputs();
    updatePostbackStatus("Nuevo dia detectado: resultados Op1/Op2 reiniciados.", "ok");
  }
}

function currentConfigPayload() {
  const accountBalance = decimalValueById("account-balance", defaultAccountBalance);
  const riskPct = getEffectiveRiskPct();
  const availableCapital = accountBalance;
  const openProfit = decimalValueById("open-profit", 0);
  const marginLevelPct = decimalValueById("margin-level-pct", 0);
  const operation1Result = decimalValueById("operation1-result", 0);
  const operation2Result = decimalValueById("operation2-result", 0);
  const operation3Result = decimalValueById("operation3-result", 0);
  const operation4Result = decimalValueById("operation4-result", 0);
  const xtbEstimatedCostPerOperation = xtbCostPerOperation();
  const realized = operation1Result + operation2Result + operation3Result + operation4Result;
  const plan = buildDailyTradePlan();
  const dailyStatus = realized >= plan.dailyNetTargetAmount
    ? "target_hit"
    : realized < 0
      ? "risk_hit"
      : realized === 0
        ? "pending"
        : "partial";
  return {
    trade_date: todayKey(),
    balance: accountBalance,
    symbol: document.getElementById("symbol").value.trim().toUpperCase(),
    xtb_price: xtbPriceValue(),
    market_price: decimalValueById("market-price", 0),
    target_profit_usd: targetProfitUsd(),
    stop_risk_usd: stopRiskUsd(),
    entry_price: decimalValueById("entry-price", 0),
    stop_price: decimalValueById("stop-price", 0),
    take_profit_price: decimalValueById("take-profit-price", 0),
    requested_volume: decimalValueById("requested-volume", 0) || null,
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
    operation1_result: operation1Result,
    operation2_result: operation2Result,
    operation3_result: operation3Result,
    operation4_result: operation4Result,
    xtb_estimated_cost_per_operation: xtbEstimatedCostPerOperation,
    xtb_change_pct: decimalValueById("xtb-change-pct", 0),
    xtb_day_low: decimalValueById("xtb-day-low", 0),
    xtb_day_high: decimalValueById("xtb-day-high", 0),
    xtb_media_buyers: decimalValueById("xtb-media-buyers", 0),
    daily_result_status: dailyStatus,
    risk_pct: riskPct,
    notes: "Auto postback Decision Engine XTB",
  };
}

function saveConfigLocal() {
  setLocalValue("decision_engine_config", JSON.stringify(currentConfigPayload()));
  setLocalValue("decision_engine_active_trade_date", todayKey());
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
    operation1_result: config.operation1_result,
    operation2_result: config.operation2_result,
    operation3_result: config.operation3_result,
    operation4_result: config.operation4_result,
    xtb_estimated_cost_per_operation: config.xtb_estimated_cost_per_operation,
    daily_result_status: config.daily_result_status,
    risk_pct: config.risk_pct,
    notes: "Intradia XTB: capital, receta IA, resultados reales op1-op4 y estado diario.",
  };
}

function loadConfigLocal() {
  try {
    ensureDefaultFavorites();
    const config = JSON.parse(getLocalValue("decision_engine_config") || "null");
    const alreadyMigrated = getLocalValue("decision_engine_defaults_version") === defaultsVersion;
    if (!config) {
      document.getElementById("account-balance").value = defaultAccountBalance;
      document.getElementById("risk-pct").value = "dynamic";
      setLocalValue("decision_engine_defaults_version", defaultsVersion);
      setLocalValue("decision_engine_active_trade_date", todayKey());
      return;
    }
    if (config.balance) document.getElementById("account-balance").value = config.balance;
    document.getElementById("risk-pct").value = "dynamic";
    if (config.available_capital !== undefined) document.getElementById("available-capital").value = config.available_capital;
    if (config.margin_level_pct !== undefined) document.getElementById("margin-level-pct").value = config.margin_level_pct;
    if (config.open_profit !== undefined) document.getElementById("open-profit").value = config.open_profit;
    if (config.operation1_result !== undefined) document.getElementById("operation1-result").value = config.operation1_result;
    if (config.operation2_result !== undefined) document.getElementById("operation2-result").value = config.operation2_result;
    if (config.operation3_result !== undefined) document.getElementById("operation3-result").value = config.operation3_result;
    if (config.operation4_result !== undefined) document.getElementById("operation4-result").value = config.operation4_result;
    if (config.xtb_estimated_cost_per_operation !== undefined) document.getElementById("xtb-cost-per-operation").value = config.xtb_estimated_cost_per_operation;
    if (config.symbol) document.getElementById("symbol").value = config.symbol;
    if (config.xtb_price) document.getElementById("xtb-price").value = config.xtb_price;
    if (config.target_profit_usd) document.getElementById("target-profit-usd").value = config.target_profit_usd;
    if (config.stop_risk_usd) document.getElementById("stop-risk-usd").value = config.stop_risk_usd;
    document.getElementById("direction").value = effectiveDirectionForSlot(selectedAsset);
    if (config.market_price) document.getElementById("market-price").value = config.market_price;
    if (config.entry_price) document.getElementById("entry-price").value = config.entry_price;
    if (config.stop_price) document.getElementById("stop-price").value = config.stop_price;
    if (config.take_profit_price) document.getElementById("take-profit-price").value = config.take_profit_price;
    document.getElementById("requested-volume").value = "";
    if (config.xtb_change_pct !== undefined) document.getElementById("xtb-change-pct").value = config.xtb_change_pct || "";
    if (config.xtb_day_low !== undefined) document.getElementById("xtb-day-low").value = config.xtb_day_low || "";
    if (config.xtb_day_high !== undefined) document.getElementById("xtb-day-high").value = config.xtb_day_high || "";
    if (config.xtb_media_buyers !== undefined) document.getElementById("xtb-media-buyers").value = config.xtb_media_buyers || "";
    if (config.expiry_mode) document.getElementById("expiry-mode").value = config.expiry_mode;
    if (!alreadyMigrated) {
      document.getElementById("risk-pct").value = "dynamic";
      setLocalValue("decision_engine_defaults_version", defaultsVersion);
    }
    resetDailyResultsIfNewDay();
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
  const plan = buildDailyTradePlan();
  const riskPct = plan.currentTradeRiskPct;
  const targetUsd = plan.currentTradeRiskAmount;
  const nominalByBalance = balance * leverage;
  const nominalByAvailable = (available || balance) * leverage;
  const box = document.getElementById("leverage-capacity");
  if (!box) return;
  box.innerHTML = `
    <p class="text-xs font-bold uppercase text-gold">Capacidad CFD 1:${numberText(leverage)}</p>
    <div class="mt-2 grid gap-2">
      <div class="summary-row"><span>Capital real</span><strong>${money(balance)}</strong></div>
      <div class="summary-row"><span>Garantia estimada</span><strong>${cfdMarginPct(lastResult?.asset || selectedAsset)}%</strong></div>
      <div class="summary-row"><span>Nominal por capital</span><strong>${money(nominalByBalance)}</strong></div>
      <div class="summary-row"><span>Nominal por disponible</span><strong>${money(nominalByAvailable)}</strong></div>
      <div class="summary-row"><span>Meta receta</span><strong>${riskPct}% = bruto ${money(targetUsd)} / neto ${money(plan.currentTradeNetTargetAmount)}</strong></div>
    </div>
    <p class="mt-2 text-xs text-zinc-500">El nominal ayuda a saber si cabe por margen. La meta bruta incluye ${money(plan.estimatedXtbCost)} de costo XTB estimado.</p>
  `;
}

function renderDailyResultCard() {
  const target = document.getElementById("daily-result-card");
  if (!target) return;
  const plan = buildDailyTradePlan();
  const total = totalOperationResult();
  const status = total >= plan.dailyNetTargetAmount
    ? "Meta diaria cumplida: cerrar el dia."
    : total < 0
      ? "Perdida diaria tocada: cerrar el dia."
      : total === 0
        ? "Sin resultado cerrado aun."
        : "Resultado parcial: no forzar otra entrada.";
  target.className = `mt-2 rounded-xl border p-3 text-xs font-bold ${total >= 0 ? "border-bull/30 text-bull" : "border-bear/40 text-bear"}`;
  target.textContent = `Resultado cerrado: ${money(total)}. Meta neta ${money(plan.dailyNetTargetAmount)}. ${status}`;
  renderSimpleDashboard();
}

function setControlValue(id, value, options = {}) {
  const element = document.getElementById(id);
  if (!element) return;
  const decimalTargets = new Set([
    "account-balance",
    "available-capital",
    "open-profit",
    "margin-level-pct",
    "target-profit-usd",
    "market-price",
    "xtb-price",
    "entry-price",
    "stop-price",
    "take-profit-price",
    "requested-volume",
    "capital-movement",
    "lesson-result",
    "operation1-result",
    "operation2-result",
    "operation3-result",
    "operation4-result",
    "xtb-change-pct",
    "xtb-day-low",
    "xtb-day-high",
    "xtb-media-buyers",
  ]);
  element.value = decimalTargets.has(id) ? normalizeDecimalInput(value) : value;
  if (options.silent) return;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function operationResultId(slot) {
  return `operation${slot}-result`;
}

function operationResultValue(slot) {
  return decimalValueById(operationResultId(slot), 0);
}

function setOperationResult(slot, value) {
  const input = document.getElementById(operationResultId(slot));
  if (input) input.value = normalizeDecimalInput(value);
}

function cfdMovementFromQuote(symbol, asset) {
  const quote = liveQuotes[symbol] || {};
  const manualRaw = document.getElementById("xtb-change-pct")?.value;
  const manual = manualRaw !== "" && manualRaw !== undefined ? decimalNumber(manualRaw, NaN) : NaN;
  const raw = Number.isFinite(manual) ? manual : quote.xtb_change_pct ?? quote.change_pct ?? asset.liveChangePct ?? 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function cfdMovementScore(changePct, direction) {
  const moveDirection = directionFromMove(changePct);
  if (moveDirection === "WAIT" || direction === "WAIT") {
    return {
      score: 0,
      direction: moveDirection,
      label: `CFD ${numberText(changePct)}% sin fuerza clara`,
      detail: "El movimiento no alcanza ventaja suficiente para sumar o restar.",
    };
  }
  const score = Math.min(8, Math.max(2, Math.round(Math.abs(changePct) * 5)));
  const signedScore = moveDirection === direction ? score : -score;
  return {
    score: signedScore,
    direction: moveDirection,
    label: `CFD ${numberText(changePct)}% favorece ${labelFromDirection(moveDirection)}`,
    detail: signedScore > 0
      ? "El porcentaje visible en XTB coincide con la direccion propuesta."
      : "El porcentaje visible en XTB va contra la direccion propuesta.",
  };
}

function learningAdjustmentForProfile(symbol) {
  const summary = lessonMemorySummary || {};
  const closed = Number(summary.closed || 0);
  if (closed < 3) {
    return {
      score: 0,
      label: "Aprendizaje neutro",
      detail: "Necesita al menos 3 operaciones cerradas para pesar en la decision.",
    };
  }
  const winRate = Number(summary.win_rate || 0);
  const totalResult = Number(summary.total_result || 0);
  const symbolStats = (summary.best_symbols || []).find((item) => item.symbol === symbol) || null;
  let score = 0;
  if (winRate >= 65) score += 4;
  else if (winRate <= 40) score -= 4;
  if (totalResult > 0) score += 2;
  else if (totalResult < 0) score -= 2;
  if (symbolStats) {
    const count = Number(symbolStats.count || 0);
    const wins = Number(symbolStats.wins || 0);
    const result = Number(symbolStats.result || 0);
    const symbolWinRate = count > 0 ? wins / count * 100 : 0;
    if (count >= 2 && symbolWinRate >= 60) score += 2;
    if (count >= 2 && result < 0) score -= 2;
  }
  score = clamp(Math.round(score), -8, 8);
  return {
    score,
    label: score > 0 ? `Aprendizaje +${score}` : score < 0 ? `Aprendizaje ${score}` : "Aprendizaje neutro",
    detail: `${closed} cierres, acierto ${numberText(winRate)}%, resultado ${money(totalResult)}.`,
  };
}

function xtbContextAdjustment(asset, direction, price) {
  const quote = liveQuotes[asset.symbol] || {};
  const lowRaw = document.getElementById("xtb-day-low")?.value;
  const highRaw = document.getElementById("xtb-day-high")?.value;
  const buyersRaw = document.getElementById("xtb-media-buyers")?.value;
  const low = lowRaw ? decimalNumber(lowRaw, 0) : Number(quote.low || 0);
  const high = highRaw ? decimalNumber(highRaw, 0) : Number(quote.high || 0);
  const buyers = buyersRaw ? decimalNumber(buyersRaw, NaN) : NaN;
  const hasRange = Number.isFinite(low) && Number.isFinite(high) && low > 0 && high > low && price > 0;
  const hasSentiment = Number.isFinite(buyers) && buyers >= 0 && buyers <= 100;
  let score = 0;
  const notes = [];
  if (hasRange) {
    const position = clamp((price - low) / (high - low), 0, 1);
    if (direction === "LONG" && position <= 0.28) {
      score += 4;
      notes.push(`precio cerca de soporte diario (${Math.round(position * 100)}% del rango)`);
    } else if (direction === "LONG" && position >= 0.82) {
      score -= 4;
      notes.push(`precio cerca del maximo diario (${Math.round(position * 100)}% del rango)`);
    } else if (direction === "SHORT" && position >= 0.72) {
      score += 4;
      notes.push(`precio cerca de resistencia diaria (${Math.round(position * 100)}% del rango)`);
    } else if (direction === "SHORT" && position <= 0.18) {
      score -= 4;
      notes.push(`precio cerca del minimo diario (${Math.round(position * 100)}% del rango)`);
    } else {
      notes.push(`precio en zona media del rango diario (${Math.round(position * 100)}%)`);
    }
  }
  if (hasSentiment) {
    const sellers = 100 - buyers;
    if (buyers >= 60 && direction === "LONG") score += 4;
    else if (sellers >= 60 && direction === "SHORT") score += 4;
    else if (buyers >= 60 && direction === "SHORT") score -= 4;
    else if (sellers >= 60 && direction === "LONG") score -= 4;
    notes.push(`sentimiento ${numberText(buyers)}% compradores / ${numberText(sellers)}% vendedores`);
  }
  score = clamp(Math.round(score), -8, 8);
  return {
    score,
    low: hasRange ? low : null,
    high: hasRange ? high : null,
    buyers: hasSentiment ? buyers : null,
    label: score > 0 ? `Contexto XTB +${score}` : score < 0 ? `Contexto XTB ${score}` : "Contexto XTB neutro",
    detail: notes.length ? notes.join(". ") + "." : "Sin rango diario o sentimiento cargado; no afecta la decision.",
  };
}

function us100StrategyProfile() {
  const asset = findAsset(focusSymbol);
  const quote = liveQuotes[focusSymbol] || {};
  const price = decimalValueById("xtb-price", 0) || decimalValueById("market-price", 0) || Number(quote.price || asset.marketPrice || 0);
  const dataFreshness = xtbFreshnessState(focusSymbol);
  const triggerFrame = chartFrameOptions["1m"];
  const bars = realCandlesForItem({ asset, zones: { price } }, triggerFrame).slice(-30);
  const pattern = detectCandlePattern(bars);
  const imbalance = detectGapFvgBag(bars);
  const trend = detectTrendProfile(bars, asset);
  const directDirection = decideUs100Direction(pattern, trend, asset);
  const frameSummary = technicalTraceSummary(focusSymbol);
  const dayThesis = buildUs100DayThesis(focusSymbol);
  const direction = dayThesis.invalidated
    ? "WAIT"
    : dayThesis.direction !== "WAIT"
      ? dayThesis.direction
      : frameSummary.direction !== "WAIT"
        ? frameSummary.direction
        : directDirection !== "WAIT"
          ? directDirection
          : "WAIT";
  const waitsForTrigger = direction !== "WAIT" && !frameSummary.triggerReady;
  const levelDirection = direction === "WAIT" ? (trend.direction !== "WAIT" ? trend.direction : pattern.bias !== "WAIT" ? pattern.bias : "LONG") : direction;
  const level = us100OrderLevels(asset, levelDirection, bars, price);
  const stopPoints = Math.max(level.stopPoints, minimumStopPointsForAsset(asset));
  const marginVolume = maxVolumeByMargin(asset, level.entry);
  const baseConfidence = clamp(Math.round(pattern.score + trend.score + imbalance.score + 10), 0, 95);
  const cfdMovePct = cfdMovementFromQuote(focusSymbol, asset);
  const cfdMove = cfdMovementScore(cfdMovePct, direction);
  const learning = learningAdjustmentForProfile(focusSymbol);
  const xtbContext = xtbContextAdjustment(asset, direction, price);
  const fibSetup = evaluateFibPullbackSetup(focusSymbol, levelDirection);
  const antiChase = antiChaseCheck(bars, levelDirection, price);
  const movementBudget = movementBudgetCheck(bars, levelDirection, price);
  const thesisScore = dayThesis.invalidated ? -28 : dayThesis.stable ? 20 : dayThesis.direction !== "WAIT" ? 8 : -8;
  const dataFreshnessScore = dataFreshness.fresh ? 10 : dataFreshness.manualFallback ? -8 : -45;
  const preliminaryConfidence = clamp(Math.round(pattern.score + trend.score + imbalance.score + cfdMove.score + learning.score + xtbContext.score + fibSetup.score + antiChase.score + movementBudget.score + thesisScore + dataFreshnessScore + 10), 0, 95);
  const sizingPolicy = botUs100SizingPolicy(preliminaryConfidence, marginVolume, asset);
  const requestedTargetUsd = sizingPolicy.targetUsd;
  const targetPolicy = {
    allowedTargets: allowedTargetsForConfidence(preliminaryConfidence),
    cap: sizingPolicy.targetUsd,
    target: sizingPolicy.targetUsd,
    requested: sizingPolicy.targetUsd,
    capped: false,
    text: sizingPolicy.note,
  };
  const targetUsd = sizingPolicy.targetUsd;
  const stopUsd = sizingPolicy.stopUsd;
  const volume = sizingPolicy.volume;
  const pointValue = volume * asset.multiplier;
  const takePoints = pointValue > 0 ? targetUsd / pointValue : 0;
  const finalStopPoints = pointValue > 0 ? stopUsd / pointValue : stopPoints;
  const stopLoss = levelDirection === "LONG" ? level.entry - finalStopPoints : level.entry + finalStopPoints;
  const takeProfit = levelDirection === "LONG" ? level.entry + takePoints : level.entry - takePoints;
  const positionValue = level.entry * asset.multiplier * volume;
  const marginRequired = positionValue * cfdMarginPct(asset) / 100;
  const volumeScore = volume > 0 ? 10 : -30;
  const confidence = clamp(Math.round(pattern.score + trend.score + imbalance.score + volumeScore + cfdMove.score + learning.score + xtbContext.score + fibSetup.score + antiChase.score + movementBudget.score + thesisScore + dataFreshnessScore), 0, 95);
  const playbook = us100FixedPlaybook({ pattern, trend, imbalance, cfdMove, fibSetup, antiChase, movementBudget, direction, confidence, price, entry: level.entry, stopLoss, takeProfit, volume });
  const fibContextOk = !fibSetup.rejected && (fibSetup.ready || fibSetup.touchedZone || fibSetup.status === "ESPERAR FIB");
  const status = !dataFreshness.usable || dayThesis.invalidated || fibSetup.rejected
    ? "NO OPERAR"
    : playbook.allowed && fibContextOk && antiChase.ok && movementBudget.ok && dayThesis.stable
      ? "OPERABLE"
    : confidence >= 50
      ? "ESPERAR"
      : "NO OPERAR";
  const confidenceBreakdown = {
    pattern: Math.round(pattern.score),
    trend: Math.round(trend.score),
    gap: Math.round(imbalance.score),
    fib: Math.round(fibSetup.score),
    thesis: Math.round(thesisScore),
    volume: volumeScore,
    cfd: cfdMove.score,
    antiChase: antiChase.score,
    movementBudget: movementBudget.score,
    dataFreshness: dataFreshnessScore,
    learning: learning.score,
    xtbContext: xtbContext.score,
    total: confidence,
    text: `Lectura XTB ${dataFreshnessScore} + tesis diaria ${Math.round(thesisScore)} + patron ${Math.round(pattern.score)} + tendencia ${Math.round(trend.score)} + GAP/FVG/BAG ${Math.round(imbalance.score)} + Fib 15M ${Math.round(fibSetup.score)} + no perseguir ${antiChase.score} + recorrido ${movementBudget.score} + CFD ${cfdMove.score} + contexto ${xtbContext.score} + aprendizaje ${learning.score} + volumen ${volumeScore} = ${confidence}%`,
  };
  const volumePolicy = {
    preferred_min: 0.2,
    preferred_max: 0.35,
    margin_max: marginVolume,
    chosen: volume,
    note: volume < 0.2
      ? "Bajo 0.20 solo si el margen disponible no deja abrir ese tamano."
      : sizingPolicy.note,
  };
  const agent = agentControlPlan({
    status,
    confidence,
    direction,
    pattern,
    trend,
    imbalance,
    volume,
    price,
    entry: level.entry,
    stopLoss,
    takeProfit,
  });
  return {
    asset,
    price,
    bars,
    pattern,
    imbalance,
    trend,
    direction,
    directionLabel: labelFromDirection(direction),
    directDirection,
    frameSummary,
    waitsForTrigger,
    entry: level.entry,
    stopLoss,
    takeProfit,
    volume,
    pointValue,
    stopPoints: finalStopPoints,
    takePoints,
    targetUsd,
    requestedTargetUsd,
    stopUsd,
    positionValue,
    marginRequired,
    confidence,
    confidenceBreakdown,
    cfdMovePct,
    cfdMove,
    dayThesis,
    fibSetup,
    antiChase,
    movementBudget,
    learning,
    xtbContext,
    volumePolicy,
    sizingPolicy,
    targetPolicy,
    playbook,
    dataFreshness,
    status,
    agent,
    explanation: buildUs100Explanation(pattern, trend, imbalance, fibSetup, direction, status),
  };
}

function agentControlPlan(profile) {
  const marketOpen = isMarketOpenNow();
  const hardOk = profile.status === "OPERABLE"
    && profile.confidence >= 78
    && profile.volume > 0
    && profile.pattern.bias !== "WAIT"
    && (profile.pattern.bias === profile.direction || profile.trend.direction === profile.direction);
  const nearTrigger = profile.direction === "LONG"
    ? profile.price >= profile.entry * 0.999 && profile.price <= profile.entry * 1.002
    : profile.price <= profile.entry * 1.001 && profile.price >= profile.entry * 0.998;
  const action = !marketOpen
    ? "PREPARAR ANALISIS"
    : hardOk && nearTrigger
      ? "SENAL FUERTE"
      : profile.status === "OPERABLE"
        ? "VIGILAR GATILLO"
        : "ESPERAR";
  return {
    action,
    mode: "lectura-analisis",
    canAutoOpen: false,
    canPrepareOrder: false,
    tradeAuthorized: false,
    rule: hardOk && nearTrigger && marketOpen
      ? "Senal fuerte: registra el objetivo, valida spread/margen en XTB y decide manualmente."
      : "Solo lectura, aprendizaje y alerta. No prepara orden en XTB.",
  };
}

function detectGapFvgBag(candles) {
  if (candles.length < 3) {
    return { type: "Sin lectura", bias: "WAIT", score: 0, detail: "Faltan velas para leer GAP/FVG/BAG." };
  }
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const thirdBack = candles[candles.length - 3];
  const lastRange = Math.max(last.h - last.l, 0.00001);
  const gap = last.o - prev.c;
  const gapPct = prev.c > 0 ? gap / prev.c * 100 : 0;
  const bullishFvg = thirdBack.h < last.l;
  const bearishFvg = thirdBack.l > last.h;
  const breaksUp = last.c > Math.max(prev.h, thirdBack.h);
  const breaksDown = last.c < Math.min(prev.l, thirdBack.l);
  const strongBody = Math.abs(last.c - last.o) / lastRange > 0.58;

  if (Math.abs(gapPct) >= 0.08 && strongBody && (breaksUp || breaksDown)) {
    const bias = gapPct > 0 || breaksUp ? "LONG" : "SHORT";
    return {
      type: "BAG",
      bias,
      score: 22,
      detail: `Breakaway/Acceleration Gap: salto con ruptura. Sesgo ${bias}.`,
    };
  }
  if (bullishFvg || bearishFvg) {
    const bias = bullishFvg ? "LONG" : "SHORT";
    return {
      type: "FVG",
      bias,
      score: 18,
      detail: `Fair Value Gap: hueco de desequilibrio ${bias === "LONG" ? "alcista" : "bajista"} que puede atraer pullback.`,
    };
  }
  if (Math.abs(gapPct) >= 0.05) {
    const bias = gapPct > 0 ? "LONG" : "SHORT";
    return {
      type: "GAP",
      bias,
      score: 12,
      detail: `Gap simple: apertura separada ${numberText(gapPct)}% del cierre previo.`,
    };
  }
  return { type: "Sin GAP", bias: "WAIT", score: 0, detail: "No hay hueco relevante; manda mas la vela y tendencia." };
}

function detectTrendProfile(candles, asset) {
  const closes = candles.map((candle) => Number(candle.c)).filter(Boolean);
  const changePct = Number(asset.liveChangePct ?? 0);
  if (closes.length < 6) {
    const direction = changePct < -0.25 ? "SHORT" : changePct > 0.25 ? "LONG" : "WAIT";
    return { direction, score: direction === "WAIT" ? 5 : 22, label: `Movimiento Yahoo/XTB ${numberText(changePct)}%` };
  }
  const first = closes.slice(0, Math.max(3, Math.floor(closes.length / 3))).reduce((a, b) => a + b, 0) / Math.max(1, Math.floor(closes.length / 3));
  const lastSlice = closes.slice(-Math.max(3, Math.floor(closes.length / 3)));
  const last = lastSlice.reduce((a, b) => a + b, 0) / lastSlice.length;
  const slopePct = first > 0 ? (last - first) / first * 100 : changePct;
  const direction = slopePct < -0.08 ? "SHORT" : slopePct > 0.08 ? "LONG" : "WAIT";
  return {
    direction,
    score: direction === "WAIT" ? 8 : Math.min(35, Math.abs(slopePct) * 120),
    label: `Tendencia 30m ${numberText(slopePct)}%`,
  };
}

function detectCandlePattern(candles) {
  if (candles.length < 3) return { bias: "WAIT", name: "Sin velas suficientes", score: 5, detail: "Faltan velas reales para leer patron." };
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  const third = candles[candles.length - 3];
  const body = (c) => Math.abs(c.c - c.o);
  const range = (c) => Math.max(c.h - c.l, 0.00001);
  const upperWick = (c) => c.h - Math.max(c.o, c.c);
  const lowerWick = (c) => Math.min(c.o, c.c) - c.l;
  const bullish = last.c > last.o;
  const bearish = last.c < last.o;
  if (bullish && prev.c < prev.o && last.c > prev.o && last.o < prev.c) {
    return { bias: "LONG", name: "Envolvente alcista", score: 38, detail: "Compradores absorbieron la vela roja anterior." };
  }
  if (bearish && prev.c > prev.o && last.c < prev.o && last.o > prev.c) {
    return { bias: "SHORT", name: "Envolvente bajista", score: 38, detail: "Vendedores absorbieron la vela verde anterior." };
  }
  if (lowerWick(last) > body(last) * 2.2 && upperWick(last) < body(last) * 1.2) {
    return { bias: "LONG", name: "Martillo / rechazo de bajos", score: 30, detail: "El precio rechazo zona baja y cerro recuperando." };
  }
  if (upperWick(last) > body(last) * 2.2 && lowerWick(last) < body(last) * 1.2) {
    return { bias: "SHORT", name: "Estrella fugaz / rechazo de altos", score: 30, detail: "El precio rechazo zona alta y cerro perdiendo fuerza." };
  }
  if (body(last) / range(last) > 0.72) {
    return bullish
      ? { bias: "LONG", name: "Marubozu alcista", score: 32, detail: "Vela de control comprador casi sin rechazo." }
      : { bias: "SHORT", name: "Marubozu bajista", score: 32, detail: "Vela de control vendedor casi sin rechazo." };
  }
  if (third.c < third.o && body(prev) < range(prev) * 0.35 && bullish && last.c > (third.o + third.c) / 2) {
    return { bias: "LONG", name: "Estrella de la manana", score: 36, detail: "Indecision seguida de recuperacion alcista." };
  }
  if (third.c > third.o && body(prev) < range(prev) * 0.35 && bearish && last.c < (third.o + third.c) / 2) {
    return { bias: "SHORT", name: "Estrella de la tarde", score: 36, detail: "Indecision seguida de giro bajista." };
  }
  return { bias: "WAIT", name: "Sin patron dominante", score: 10, detail: "No hay vela de confirmacion clara; esperar ruptura o pullback." };
}

function candlesForFrameAll(symbol, frameKey) {
  const rows = marketBarsByFrame[marketFrameKey(symbol, frameKey)] || [];
  const frame = chartFrameOptions[frameKey] || chartFrameOptions["1m"];
  const mergedRows = mergeCandleRows(rows);
  const normalizedRows = frame.aggregateHours ? aggregateCandlesByHours(mergedRows, frame.aggregateHours) : mergedRows;
  return normalizedRows
    .map((bar) => ({
      o: Number(bar.open || 0),
      h: Number(bar.high || 0),
      l: Number(bar.low || 0),
      c: Number(bar.close || 0),
      timestamp: bar.timestamp,
    }))
    .filter((candle) => candle.o > 0 && candle.h > 0 && candle.l > 0 && candle.c > 0);
}

function candlesForFrame(symbol, frameKey) {
  return candlesForFrameAll(symbol, frameKey).slice(-(chartFrameOptions[frameKey]?.limit || 30));
}

function candlesSinceNyMinute(symbol, frameKey, startMinute = us100SessionStartMinute) {
  const today = nyDateParts();
  return candlesForFrameAll(symbol, frameKey).filter((candle) => {
    const parts = nyDateParts(candle.timestamp || new Date());
    return parts.dateKey === today.dateKey && parts.minuteOfDay >= startMinute;
  });
}

function buildUs100DayThesis(symbol = focusSymbol) {
  const config = thesisConfig();
  const now = nyDateParts();
  const allToday = candlesSinceNyMinute(symbol, "1m", config.mode === "fixed" ? config.startMinute : 0);
  const currentMinute = Math.max(now.minuteOfDay, config.startMinute);
  const blockIndex = Math.max(0, Math.floor((currentMinute - config.startMinute) / config.blockMinutes));
  const fixedBlockStart = config.startMinute + blockIndex * config.blockMinutes;
  const blockStart = config.mode === "rolling"
    ? Math.max(0, now.minuteOfDay - config.blockMinutes)
    : fixedBlockStart;
  const blockEnd = config.mode === "rolling" ? now.minuteOfDay : blockStart + config.blockMinutes;
  const currentBlock = allToday.filter((candle) => {
    const parts = nyDateParts(candle.timestamp || new Date());
    return parts.minuteOfDay >= blockStart && parts.minuteOfDay < blockEnd;
  });
  const history = currentBlock.length >= 8 ? currentBlock : allToday;
  const first = history[0];
  const last = history[history.length - 1];
  const open = Number(first?.o || first?.c || 0);
  const close = Number(last?.c || 0);
  const high = history.length ? Math.max(...history.map((candle) => Number(candle.h || 0))) : 0;
  const validLows = history.map((candle) => Number(candle.l || 0)).filter((value) => Number.isFinite(value) && value > 0);
  const low = validLows.length ? Math.min(...validLows) : 0;
  const movePct = open > 0 ? (close - open) / open * 100 : 0;
  const rangePct = open > 0 && high > low ? (high - low) / open * 100 : 0;
  const mapTrace = traceFrame(symbol, "4h");
  const confirmTrace = traceFrame(symbol, "15m");
  const rawDirection = movePct >= 0.22 ? "LONG" : movePct <= -0.22 ? "SHORT" : "WAIT";
  const mappedDirection = mapTrace.bias !== "WAIT" ? mapTrace.bias : rawDirection;
  const confirmationOk = confirmTrace.bias === "WAIT" || mappedDirection === "WAIT" || confirmTrace.bias === mappedDirection;
  const volatilityOk = rangePct <= 1.15 || Math.abs(movePct) >= 0.35;
  const direction = confirmationOk && volatilityOk ? mappedDirection : "WAIT";
  const stable = direction !== "WAIT" && history.length >= 24 && Math.abs(movePct) >= 0.22;
  const invalidated = direction !== "WAIT" && confirmTrace.bias !== "WAIT" && confirmTrace.bias !== direction;
  const blockLabel = config.mode === "rolling"
    ? `ultimas ${config.blockHours}h hasta ${formatMinuteOfDay(now.minuteOfDay)} NY`
    : `${formatMinuteOfDay(blockStart)}-${formatMinuteOfDay(Math.min(blockEnd, 20 * 60))} NY`;
  const reason = history.length < 8
    ? `Faltan lecturas para fijar tesis en ${blockLabel}.`
    : invalidated
      ? "La confirmacion 15M contradice la tesis del bloque; reiniciar lectura."
      : !volatilityOk
        ? "Rango demasiado volatil para perseguir una direccion fija."
        : direction === "WAIT"
          ? "El bloque no tiene ventaja clara; mantener espera."
          : `${direction} por movimiento acumulado del bloque ${numberText(movePct)}% con mapa ${mapTrace.bias}.`;
  return {
    dateKey: now.dateKey,
    blockIndex,
    blockLabel,
    mode: config.mode,
    startTime: config.startTime,
    blockHours: config.blockHours,
    direction,
    rawDirection,
    stable,
    invalidated,
    historyCount: history.length,
    open,
    close,
    high,
    low,
    movePct,
    rangePct,
    mapBias: mapTrace.bias,
    confirmBias: confirmTrace.bias,
    reason,
  };
}

function aggregateCandlesByHours(rows, hours = 4) {
  const bucketMs = hours * 60 * 60 * 1000;
  const buckets = new Map();
  rows
    .map((row) => ({
      timestamp: row.timestamp,
      time: new Date(row.timestamp).getTime(),
      open: Number(row.open || 0),
      high: Number(row.high || 0),
      low: Number(row.low || 0),
      close: Number(row.close || 0),
    }))
    .filter((row) => row.time && row.open > 0 && row.high > 0 && row.low > 0 && row.close > 0)
    .sort((a, b) => a.time - b.time)
    .forEach((row) => {
      const bucketTime = Math.floor(row.time / bucketMs) * bucketMs;
      const current = buckets.get(bucketTime);
      if (!current) {
        buckets.set(bucketTime, {
          timestamp: new Date(bucketTime).toISOString(),
          open: row.open,
          high: row.high,
          low: row.low,
          close: row.close,
        });
        return;
      }
      current.high = Math.max(current.high, row.high);
      current.low = Math.min(current.low, row.low);
      current.close = row.close;
    });
  return Array.from(buckets.values());
}

function directionStability(candles, bias, frameKey) {
  if (bias === "WAIT") {
    return { confirmed: false, note: "sin sesgo para estabilizar" };
  }
  const requiredCandles = frameKey === "4h" ? 2 : 3;
  if (candles.length < requiredCandles + 1) {
    return { confirmed: false, note: `faltan ${requiredCandles + 1} velas para confirmar estabilidad` };
  }
  const recent = candles.slice(-(requiredCandles + 1));
  const deltas = recent.slice(1).map((candle, index) => candle.c - recent[index].c);
  const directionHits = deltas.filter((delta) => bias === "LONG" ? delta > 0 : delta < 0).length;
  const lastDelta = deltas[deltas.length - 1] || 0;
  const lastOk = bias === "LONG" ? lastDelta > 0 : lastDelta < 0;
  const minimumHits = frameKey === "4h" ? 1 : 2;
  const confirmed = directionHits >= minimumHits && lastOk;
  return {
    confirmed,
    note: confirmed
      ? `estable: ${directionHits}/${requiredCandles} velas recientes a favor`
      : `inestable: requiere ${minimumHits}/${requiredCandles} velas y la ultima a favor`,
  };
}

function traceFrame(symbol, frameKey) {
  const frame = chartFrameOptions[frameKey];
  const candles = candlesForFrame(symbol, frameKey);
  const asset = findAsset(symbol);
  const pattern = detectCandlePattern(candles);
  const trend = detectTrendProfile(candles, asset);
  const imbalance = detectGapFvgBag(candles);
  const closes = candles.map((candle) => candle.c);
  const first = closes[0] || 0;
  const last = closes[closes.length - 1] || 0;
  const movePct = first > 0 ? (last - first) / first * 100 : 0;
  const biasVotes = [pattern.bias, trend.direction, imbalance.bias].filter((bias) => bias !== "WAIT");
  const longVotes = biasVotes.filter((bias) => bias === "LONG").length;
  const shortVotes = biasVotes.filter((bias) => bias === "SHORT").length;
  const rawBias = longVotes > shortVotes ? "LONG" : shortVotes > longVotes ? "SHORT" : "WAIT";
  const stability = directionStability(candles, rawBias, frameKey);
  const bias = rawBias === "WAIT" || stability.confirmed ? rawBias : "WAIT";
  return {
    key: frameKey,
    label: frame.label,
    role: frameKey === "4h" ? "Mapa grande" : frameKey === "15m" ? "Confirmacion" : "Gatillo fino",
    candles: candles.length,
    bias,
    rawBias,
    stability,
    movePct,
    pattern,
    trend,
    imbalance,
  };
}

function traceDirectionNote(trace) {
  const biasText = trace.bias === "WAIT"
    ? trace.rawBias && trace.rawBias !== "WAIT" ? `Sesgo ${trace.rawBias} sin estabilidad` : "No hay gatillo confiable"
    : trace.bias === "LONG"
      ? "Presion compradora"
      : "Presion vendedora";
  const move = numberText(trace.movePct);
  if (trace.candles < 3) return `${trace.role}: faltan velas reales para leer este marco.`;
  return `${trace.role}: ${biasText}. ${trace.stability?.note || ""}. Patron ${trace.pattern.name}. Tendencia ${trace.trend.direction}. Movimiento ${move}%.`;
}

function technicalTraceSummary(symbol = focusSymbol) {
  const traces = ["4h", "15m", "1m"].map((key) => traceFrame(symbol, key));
  const useful = traces.filter((trace) => trace.candles >= 3);
  const mapTrace = traces.find((trace) => trace.key === "4h");
  const confirmTrace = traces.find((trace) => trace.key === "15m");
  const triggerTrace = traces.find((trace) => trace.key === "1m");
  const mapDirection = mapTrace?.bias || "WAIT";
  const confirmDirection = confirmTrace?.bias || "WAIT";
  const triggerDirection = triggerTrace?.bias || "WAIT";
  const direction = mapDirection !== "WAIT" && confirmDirection === mapDirection
    ? mapDirection
    : "WAIT";
  const activeDirections = new Set(useful.map((trace) => trace.bias).filter((bias) => bias !== "WAIT"));
  const conflict = activeDirections.size > 1;
  const triggerReady = direction !== "WAIT" && triggerDirection === direction;
  const clarity = useful.length < 2
    ? "SIN DATOS"
    : conflict
      ? "NO CLARO"
      : direction === "WAIT"
        ? "NO CLARO"
        : triggerReady
          ? "CLARO"
          : "PREPARAR";
  const text = conflict
    ? "Temporalidades en conflicto: una parte del mercado apunta a compra y otra a venta. Mejor esperar confirmacion limpia."
    : clarity === "CLARO"
    ? `${direction}: 4H marca el mapa, 15M confirma y 1M da gatillo. Se puede vigilar setup, no perseguir precio.`
    : clarity === "PREPARAR"
      ? `${direction}: 4H y 15M estan alineados. Falta gatillo estable en 1M antes de preparar entrada.`
    : useful.length < 2
      ? "Faltan velas para leer contexto. Mantener solo observacion."
      : "No hay alineacion suficiente entre 4H, 15M y 1M. No perseguir precio.";
  return { traces, direction, clarity, text, conflict, triggerReady };
}

function decideUs100Direction(pattern, trend, asset) {
  if (pattern.bias !== "WAIT" && pattern.bias === trend.direction) return pattern.bias;
  return "WAIT";
}

function us100FixedPlaybook({ pattern, trend, imbalance, cfdMove, fibSetup, antiChase, movementBudget, direction, confidence, price, entry, stopLoss, takeProfit, volume }) {
  const rules = [];
  const blockers = [];
  const alignedPatternTrend = direction !== "WAIT" && pattern.bias === direction && trend.direction === direction;
  const imbalanceOk = imbalance.bias === "WAIT" || imbalance.bias === direction;
  const cfdOk = cfdMove.direction === "WAIT" || cfdMove.direction === direction;
  const validOrder = Number(price) > 0 && Number(entry) > 0 && Number(stopLoss) > 0 && Number(takeProfit) > 0 && Number(volume) > 0;
  const entryDistancePct = price && entry ? Math.abs(entry - price) / price * 100 : 999;
  const nearTrigger = entryDistancePct <= 0.18;
  const strongEnough = confidence >= 72;

  if (alignedPatternTrend) rules.push("Patron y tendencia 30m apuntan a la misma direccion.");
  else blockers.push("Patron y tendencia 30m no estan alineados.");
  if (imbalanceOk) rules.push("GAP/FVG/BAG no contradice la direccion.");
  else blockers.push("GAP/FVG/BAG contradice la operacion.");
  if (cfdOk) rules.push("Movimiento CFD no va en contra.");
  else blockers.push("Movimiento CFD va contra la operacion.");
  if (fibSetup?.rejected) blockers.push(fibSetup?.detail || "Fibonacci 15M invalido la lectura.");
  else if (fibSetup?.ready) rules.push("Fibonacci 15M confirma retroceso profundo 80-90 con rechazo.");
  else if (fibSetup?.touchedZone) rules.push("Fibonacci 15M esta en zona: sirve como contexto, falta gatillo 1M.");
  else rules.push("Fibonacci 15M queda pendiente como filtro de entrada, no bloquea la preparacion.");
  if (antiChase?.ok) rules.push("No estas persiguiendo una vela extendida.");
  else blockers.push(antiChase?.detail || "Riesgo de entrada tardia.");
  if (movementBudget?.ok) rules.push("Aun queda recorrido razonable en la ventana.");
  else blockers.push(movementBudget?.detail || "El movimiento ya consumio demasiado rango.");
  if (nearTrigger) rules.push(`Precio cerca del gatillo (${numberText(entryDistancePct)}%).`);
  else blockers.push(`Precio lejos del gatillo (${numberText(entryDistancePct)}%).`);
  if (strongEnough) rules.push(`Operabilidad suficiente (${confidence}%).`);
  else blockers.push(`Operabilidad baja (${confidence}%).`);
  if (!validOrder) blockers.push("Faltan precio, volumen o niveles validos.");

  const allowed = blockers.length === 0;
  return {
    allowed,
    setup: allowed ? "Setup A: ruptura con pullback confirmado" : "Sin setup fijo",
    rule: allowed ? "Programar orden stop/limitada y esperar activacion." : "No perseguir precio; esperar nueva vela 1M clara.",
    checklist: rules,
    blockers,
    detail: allowed ? rules.join(" ") : blockers.join(" "),
    entryDistancePct,
  };
}

function maxVolumeByMargin(asset, entry) {
  const accountBalance = Number(document.getElementById("account-balance")?.value || defaultAccountBalance);
  const available = accountBalance;
  const marginPct = cfdMarginPct(asset) / 100;
  if (!entry || !marginPct) return 0;
  const raw = (available * 0.9) / (entry * asset.multiplier * marginPct);
  return roundVolumeForXtb(raw, asset);
}

function us100OrderLevels(asset, direction, candles, fallbackPrice) {
  const highs = candles.map((candle) => Number(candle.h)).filter(Boolean);
  const lows = candles.map((candle) => Number(candle.l)).filter(Boolean);
  const recentHigh = highs.length ? Math.max(...highs.slice(-12)) : fallbackPrice;
  const recentLow = lows.length ? Math.min(...lows.slice(-12)) : fallbackPrice;
  const buffer = Math.max(Number(fallbackPrice || 0) * 0.00008, 2);
  const entry = direction === "LONG" ? recentHigh + buffer : recentLow - buffer;
  const opposite = direction === "LONG" ? recentLow : recentHigh;
  const stopPoints = Math.abs(entry - opposite);
  return { entry, stopPoints };
}

function antiChaseCheck(candles, direction, price) {
  const bars = Array.isArray(candles) ? candles.filter((candle) => Number(candle.h) && Number(candle.l) && Number(candle.c)) : [];
  const current = Number(price || bars.at(-1)?.c || 0);
  if (bars.length < 8 || !current) {
    return {
      ok: false,
      score: -10,
      label: "Faltan velas",
      detail: "Faltan velas para validar que no estas entrando tarde.",
    };
  }
  const recent = bars.slice(-20);
  const last = bars.at(-1);
  const previous = bars.at(-2);
  const high = Math.max(...recent.map((candle) => Number(candle.h)));
  const low = Math.min(...recent.map((candle) => Number(candle.l)));
  const range = Math.max(high - low, current * 0.0001);
  const positionPct = (current - low) / range;
  const lastBodyPct = Math.abs(Number(last.c) - Number(last.o)) / current * 100;
  const twoCandleMovePct = Math.abs(Number(last.c) - Number(bars.at(-3)?.c || last.c)) / current * 100;
  const longTooHigh = direction === "LONG" && positionPct > 0.82;
  const shortTooLow = direction === "SHORT" && positionPct < 0.18;
  const rejectionAgainst = direction === "LONG"
    ? Number(last.c) < Number(last.o) && Number(previous?.c || 0) < Number(previous?.o || 0)
    : Number(last.c) > Number(last.o) && Number(previous?.c || 0) > Number(previous?.o || 0);
  const impulseTooFast = lastBodyPct > 0.12 || twoCandleMovePct > 0.18;
  const blockers = [];
  if (longTooHigh) blockers.push("LONG esta muy cerca del techo reciente");
  if (shortTooLow) blockers.push("SHORT esta muy cerca del piso reciente");
  if (rejectionAgainst) blockers.push("las ultimas velas rechazan esa direccion");
  if (impulseTooFast) blockers.push("el precio corrio demasiado rapido");
  const ok = blockers.length === 0;
  return {
    ok,
    score: ok ? 12 : -28,
    label: ok ? "No perseguir OK" : "Entrada tardia",
    detail: ok
      ? "No parece entrada perseguida; aun exige gatillo y stop activo."
      : `${blockers.join("; ")}. Espera pullback/rebote y nueva confirmacion.`,
  };
}

function movementBudgetCheck(candles, direction, price) {
  const bars = Array.isArray(candles) ? candles.filter((candle) => Number(candle.h) && Number(candle.l) && Number(candle.c)) : [];
  const current = Number(price || bars.at(-1)?.c || 0);
  if (direction === "WAIT") {
    return {
      ok: false,
      score: -8,
      usedPct: 0,
      remainingPct: 0,
      rangePct: 0,
      detail: "Sin direccion no se puede medir recorrido util.",
    };
  }
  if (bars.length < 10 || !current) {
    return {
      ok: false,
      score: -10,
      usedPct: 100,
      remainingPct: 0,
      rangePct: 0,
      detail: "Faltan velas para calcular recorrido normal.",
    };
  }
  const recent = bars.slice(-30);
  const high = Math.max(...recent.map((candle) => Number(candle.h)));
  const low = Math.min(...recent.map((candle) => Number(candle.l)));
  const range = Math.max(high - low, current * 0.0001);
  const rangePct = range / current * 100;
  const traveled = direction === "LONG" ? current - low : high - current;
  const remaining = direction === "LONG" ? high - current : current - low;
  const usedPct = clamp(traveled / range * 100, 0, 100);
  const remainingPct = clamp(remaining / range * 100, 0, 100);
  const exhausted = usedPct >= 68;
  const tooFlat = rangePct < 0.08;
  const ok = !exhausted && !tooFlat;
  return {
    ok,
    score: ok ? 10 : -22,
    usedPct,
    remainingPct,
    rangePct,
    detail: tooFlat
      ? `Rango muy pequeno (${numberText(rangePct)}%): no hay recorrido limpio.`
      : exhausted
        ? `Recorrido consumido ${numberText(usedPct)}%; queda ${numberText(remainingPct)}%. Entrada tarde, espera pullback.`
        : `Recorrido sano: usado ${numberText(usedPct)}%, queda ${numberText(remainingPct)}% del rango reciente.`,
  };
}

function buildUs100Explanation(pattern, trend, imbalance, fibSetup, direction, status) {
  if (direction === "WAIT") return `Esperar: estrategia fija exige patron y tendencia alineados. ${trend.label}.`;
  const side = direction === "LONG" ? "compra por ruptura alcista" : "venta en corto por ruptura bajista";
  const model = `${pattern.name} + ${imbalance.type}`;
  const fibText = fibSetup?.detail ? ` ${fibSetup.detail}` : "";
  if (status === "NO OPERAR") return `No operar: ${model}. ${trend.label}. Falta confirmacion o volumen valido.${fibText}`;
  if (status === "ESPERAR") return `Esperar: ${model}. ${trend.label}. La idea seria ${side}, pero falta confirmacion Fib 15M o vela gatillo clara.${fibText}`;
  return `Operable con confirmacion: ${model}. ${trend.label}. Estrategia: ${side}, entrada por stop, escudo inmediato y objetivo fijo.${fibText}`;
}

function buildOperateDecision(profile) {
  const checks = [
    {
      label: "Lectura XTB",
      ok: Boolean(profile.dataFreshness?.usable),
      detail: profile.dataFreshness?.detail || "Sin lectura XTB reciente.",
    },
    {
      label: "Tesis del dia",
      ok: Boolean(profile.dayThesis?.stable && !profile.dayThesis?.invalidated),
      detail: profile.dayThesis?.stable
        ? `Bloque estable: ${profile.dayThesis.direction}.`
        : profile.dayThesis?.reason || "Aun no hay direccion diaria confiable.",
    },
    {
      label: "Fibonacci 15M",
      ok: !profile.fibSetup?.rejected,
      detail: profile.fibSetup?.ready
        ? "Zona 80-90 tocada y rechazo confirmado."
        : profile.fibSetup?.touchedZone
        ? "Zona tocada: usar como contexto y esperar gatillo 1M."
        : profile.fibSetup?.detail || "Filtro pendiente; no bloquea por si solo.",
    },
    {
      label: "No perseguir",
      ok: Boolean(profile.antiChase?.ok),
      detail: profile.antiChase?.detail || "Evita abrir despues de una vela extendida o rechazo contrario.",
    },
    {
      label: "Recorrido",
      ok: Boolean(profile.movementBudget?.ok),
      detail: profile.movementBudget?.detail || "Mide si aun queda espacio o si la entrada ya esta tarde.",
    },
    {
      label: "Gatillo 1M",
      ok: Boolean(profile.playbook?.entryDistancePct <= 0.18),
      detail: profile.playbook?.entryDistancePct <= 0.18
        ? `Precio cerca de entrada (${numberText(profile.playbook.entryDistancePct)}%).`
        : `Precio lejos de entrada (${numberText(profile.playbook?.entryDistancePct || 0)}%).`,
    },
    {
      label: "Operabilidad",
      ok: profile.confidence >= 72,
      detail: profile.confidence >= 72
        ? `${profile.confidence}% suficiente para preparar.`
        : `${profile.confidence}% bajo; esperar mas confirmacion.`,
    },
    {
      label: "Receta XTB",
      ok: Number(profile.volume) > 0 && Number(profile.entry) > 0 && Number(profile.stopLoss) > 0 && Number(profile.takeProfit) > 0,
      detail: Number(profile.volume) > 0
        ? `Volumen ${formatVolumeForXtb(profile.volume, profile.asset)} con niveles validos.`
        : "Sin volumen valido para operar.",
    },
  ];
  const firstBlocker = checks.find((check) => !check.ok);
  const finalStatus = profile.status === "OPERABLE" && !firstBlocker ? "OPERAR" : "NO OPERAR";
  return {
    status: finalStatus,
    tone: finalStatus === "OPERAR" ? "ok" : profile.direction === "WAIT" ? "danger" : "warn",
    title: finalStatus === "OPERAR"
      ? `Operar solo ${profile.directionLabel}`
      : firstBlocker
        ? `Esperar: falta ${firstBlocker.label}`
        : "Esperar confirmacion",
    detail: finalStatus === "OPERAR"
      ? "Puedes preparar la orden stop/limitada en XTB. Ultima validacion manual: spread, margen y simbolo US100 CFD."
      : firstBlocker?.detail || "No hay setup suficiente.",
    checks,
  };
}

function professionalDecisionPlan(profile, operateDecision) {
  const mapTrace = profile.frameSummary?.traces?.find((trace) => trace.key === "4h");
  const confirmTrace = profile.frameSummary?.traces?.find((trace) => trace.key === "15m");
  const triggerTrace = profile.frameSummary?.traces?.find((trace) => trace.key === "1m");
  const direction = profile.direction;
  const checks = [
    {
      key: "data",
      label: "Lectura XTB",
      ok: Boolean(profile.dataFreshness?.usable),
      short: profile.dataFreshness?.short || "sin lectura",
      detail: profile.dataFreshness?.detail || "Sin dato fresco no hay receta accionable.",
    },
    {
      key: "context",
      label: "Mapa 4H",
      ok: direction !== "WAIT" && mapTrace?.bias === direction,
      short: mapTrace?.bias === "WAIT" ? "sin direccion" : mapTrace?.bias || "sin datos",
      detail: "Marca el lado grande del dia. Si no coincide, no se fuerza entrada.",
    },
    {
      key: "confirmation",
      label: "Confirmacion 15M",
      ok: direction !== "WAIT" && confirmTrace?.bias === direction && !profile.fibSetup?.rejected,
      short: profile.fibSetup?.rejected ? "Fib invalida" : confirmTrace?.bias === direction ? "15M alineado" : "esperar",
      detail: "El 15M confirma la direccion. Fibonacci ayuda a mejorar precio, pero no decide solo.",
    },
    {
      key: "trigger",
      label: "Gatillo 1M",
      ok: direction !== "WAIT" && triggerTrace?.bias === direction && profile.frameSummary?.triggerReady,
      short: triggerTrace?.bias === "WAIT" ? "sin gatillo" : triggerTrace?.bias || "sin datos",
      detail: "Debe cerrar una vela 1M a favor de la tesis. Si falta, no hay receta copiable aunque 4H y 15M esten bien.",
    },
    {
      key: "price",
      label: "No perseguir",
      ok: Boolean(profile.antiChase?.ok && profile.movementBudget?.ok),
      short: profile.antiChase?.ok ? "entrada sana" : "tarde",
      detail: profile.movementBudget?.detail || profile.antiChase?.detail || "Evita abrir despues del movimiento fuerte.",
    },
    {
      key: "risk",
      label: "Receta y margen",
      ok: Number(profile.volume) > 0 && profile.marginRequired <= Number(document.getElementById("account-balance")?.value || defaultAccountBalance),
      short: `${formatVolumeForXtb(profile.volume, profile.asset)} vol`,
      detail: "El margen solo dice si cabe; el stop define cuanto puedes perder.",
    },
  ];
  const blocker = checks.find((check) => !check.ok);
  const canOperate = !blocker && operateDecision.status === "OPERAR" && profile.status === "OPERABLE";
  const title = canOperate
    ? `OPERAR ${profile.directionLabel}`
    : blocker
      ? `ESPERAR: falta ${blocker.label}`
      : "ESPERAR";
  const action = canOperate
    ? "Preparar orden stop/limitada en XTB y no modificar el plan durante la vela."
    : blocker?.detail || "No hay ventaja limpia; mantener lectura.";
  const plainRule = canOperate
    ? "Si el precio toca entrada, debe avanzar. Si no avanza en 30 minutos, revisa salida. Si no llega a meta/stop en 60 minutos, cierra o reinicia."
    : "No abrir. La pagina debe protegerte de entradas tarde, no darte una orden cada vez que se mueve el precio.";
  return {
    status: canOperate ? "OPERAR" : "ESPERAR",
    title,
    action,
    plainRule,
    blocker,
    checks,
  };
}

function buildDirectionalRecipe(profile, direction) {
  const asset = profile.asset;
  const bars = profile.bars || [];
  const level = us100OrderLevels(asset, direction, bars, profile.price);
  const marginVolume = maxVolumeByMargin(asset, level.entry);
  const targetUsd = profile.targetUsd || defaultTargetProfitUsd;
  const stopUsd = profile.stopUsd || defaultStopRiskUsd;
  const volume = preferredUs100Volume(profile.confidence, marginVolume, targetUsd, asset);
  const pointValue = volume * asset.multiplier;
  const takePoints = pointValue > 0 ? targetUsd / pointValue : 0;
  const stopPoints = pointValue > 0 ? stopUsd / pointValue : Math.max(level.stopPoints, minimumStopPointsForAsset(asset));
  const entry = level.entry;
  const stopLoss = direction === "LONG" ? entry - stopPoints : entry + stopPoints;
  const takeProfit = direction === "LONG" ? entry + takePoints : entry - takePoints;
  const marginRequired = entry * asset.multiplier * volume * cfdMarginPct(asset) / 100;
  const isPrimary = profile.direction === direction && profile.status !== "NO OPERAR";
  const trigger = triggerReadiness(asset, entry, takeProfit, profile.price);
  const aligned = profile.direction === direction;
  const allowed = profile.status === "OPERABLE" && aligned && trigger.ready;
  return {
    asset,
    direction,
    label: labelFromDirection(direction),
    entry,
    stopLoss,
    takeProfit,
    volume,
    pointValue,
    takePoints,
    stopPoints,
    marginRequired,
    targetUsd,
    stopUsd,
    isPrimary,
    aligned,
    trigger,
    allowed,
    status: allowed ? "LISTA" : isPrimary ? "ESPERAR GATILLO" : "PLAN B",
    note: allowed
      ? "Se cumplen direccion, operabilidad y precio cerca del gatillo."
      : isPrimary
        ? trigger.message
        : "Usala solo si el mercado invalida el lado principal y confirma ruptura contraria.",
  };
}

function buildDualRecipes(profile) {
  return [buildDirectionalRecipe(profile, "LONG"), buildDirectionalRecipe(profile, "SHORT")];
}

function activeRecipeState() {
  try {
    return JSON.parse(getLocalValue("us100_active_recipe") || "null");
  } catch {
    return null;
  }
}

function activeRecipeLessonNote(recipe) {
  if (!recipe) return "";
  const startedAt = recipe.startedAt ? new Date(recipe.startedAt).toLocaleString("es-CO") : "sin hora";
  const closedAt = recipe.closedAt ? new Date(recipe.closedAt).toLocaleString("es-CO") : "";
  return [
    `RECETA_ABIERTA=${recipe.label || recipe.direction}`,
    `inicio=${startedAt}`,
    closedAt ? `cierre_marcado=${closedAt}` : "",
    `entrada=${numberText(recipe.entry)}`,
    `stop=${numberText(recipe.stopLoss)}`,
    `take=${numberText(recipe.takeProfit)}`,
    `volumen=${numberText(recipe.volume)}`,
    `confianza=${numberText(recipe.confidence || 0)}%`,
    `estado=${recipe.status || "sin estado"}`,
  ].filter(Boolean).join(" | ");
}

function setActiveRecipe(recipe) {
  setLocalValue("us100_active_recipe", JSON.stringify({
    symbol: recipe.symbol || recipe.asset?.symbol || focusSymbol,
    direction: recipe.direction,
    label: recipe.label,
    entry: Number(recipe.entry || 0),
    stopLoss: Number(recipe.stopLoss || 0),
    takeProfit: Number(recipe.takeProfit || 0),
    volume: Number(recipe.volume || 0),
    pointValue: Number(recipe.pointValue || 0),
    marginRequired: Number(recipe.marginRequired || 0),
    targetUsd: Number(recipe.targetUsd || 0),
    stopUsd: Number(recipe.stopUsd || 0),
    confidence: Number(recipe.confidence || 0),
    status: recipe.status || "",
    note: recipe.note || "",
    startedAt: new Date().toISOString(),
    maxMinutes: 60,
  }));
}

function clearActiveRecipe() {
  removeLocalValue("us100_active_recipe");
}

function markActiveRecipeClosed() {
  const recipe = activeRecipeState();
  if (!recipe) return;
  recipe.closedAt = new Date().toISOString();
  recipe.manuallyClosed = true;
  setLocalValue("us100_active_recipe", JSON.stringify(recipe));
}

function activeRecipeProgress(recipe) {
  if (!recipe?.startedAt) return null;
  const started = new Date(recipe.startedAt);
  const closedAt = recipe.closedAt ? new Date(recipe.closedAt) : null;
  const nowMs = closedAt ? closedAt.getTime() : Date.now();
  const elapsedMinutes = Math.max(0, Math.floor((nowMs - started.getTime()) / 60000));
  const remaining = Math.max(0, Number(recipe.maxMinutes || 60) - elapsedMinutes);
  const current = Number(document.getElementById("xtb-price")?.value || document.getElementById("market-price")?.value || 0);
  const direction = recipe.direction;
  const hitTake = current > 0 && (direction === "LONG" ? current >= recipe.takeProfit : current <= recipe.takeProfit);
  const hitStop = current > 0 && (direction === "LONG" ? current <= recipe.stopLoss : current >= recipe.stopLoss);
  const inFavor = current > 0 && (direction === "LONG" ? current > recipe.entry : current < recipe.entry);
  const timeWarning = elapsedMinutes >= 30 && !inFavor && !hitTake && !hitStop;
  const expired = elapsedMinutes >= Number(recipe.maxMinutes || 60) && !hitTake && !hitStop;
  let action = "Vigilar";
  if (closedAt) action = "Cerrada registrada; guarda resultado";
  else if (hitTake) action = "Cerrar: meta tocada";
  else if (hitStop) action = "Cerrar: escudo tocado";
  else if (expired) action = "Cerrar manual o reiniciar lectura";
  else if (timeWarning) action = "Revisar: no avanza a favor";
  return { elapsedMinutes, remaining, current, hitTake, hitStop, inFavor, timeWarning, expired, action };
}

function renderRecipeOption(recipe, activeRecipe) {
  const isActive = activeRecipe?.direction === recipe.direction;
  const canStart = recipe.allowed && recipe.status === "LISTA";
  return `
    <article class="recipe-option ${recipe.direction.toLowerCase()} ${recipe.isPrimary ? "primary" : ""} ${isActive ? "running" : ""}">
      <div class="recipe-option-head">
        <div>
          <span class="simple-label">${recipe.direction === "LONG" ? "Opcion LONG" : "Opcion SHORT"}</span>
          <strong>${recipe.label}</strong>
        </div>
        <span class="simple-badge">${isActive ? "INICIADA" : recipe.status}</span>
      </div>
      <div class="recipe-option-grid">
        <div><span>Entrada</span><strong>${priceText(recipe.entry)}</strong></div>
        <div><span>Stop</span><strong>${priceText(recipe.stopLoss)}</strong></div>
        <div><span>Take</span><strong>${priceText(recipe.takeProfit)}</strong></div>
        <div><span>Volumen</span><strong>${formatVolumeForXtb(recipe.volume, recipe.asset || findAsset(focusSymbol))}</strong></div>
      </div>
      <p>${recipe.note}</p>
      <button type="button" data-simple-action="start-recipe-${recipe.direction}" ${isActive || !canStart ? "disabled" : ""}>${canStart ? "Inicio: abri esta receta" : "Esperar confirmacion"}</button>
    </article>
  `;
}

function renderActiveRecipeCard(activeRecipe) {
  if (!activeRecipe) {
    return `
      <div class="active-recipe-card idle">
        <span class="simple-label">Operacion activa</span>
        <strong>Ninguna</strong>
        <small>Cuando abras una receta en XTB, pulsa "Inicio" en LONG o SHORT para que empiece el reloj.</small>
      </div>
    `;
  }
  const progress = activeRecipeProgress(activeRecipe);
  return `
    <div class="active-recipe-card running">
      <div>
        <span class="simple-label">Operacion activa</span>
        <strong>${activeRecipe.label}</strong>
        <small id="active-recipe-status">${progress.action}. Tiempo ${progress.elapsedMinutes}m / ${activeRecipe.maxMinutes}m.</small>
      </div>
      <div class="active-recipe-actions">
        <button type="button" class="secondary" data-simple-action="finish-active-recipe">Marcar cerrada</button>
        <button type="button" class="danger" data-simple-action="clear-active-recipe">Cancelar reloj</button>
      </div>
    </div>
  `;
}

function renderActiveRecipeLearningCard(profile, activeRecipe) {
  const current = activeRecipe || activeRecipeState();
  const autoStatus = current
    ? activeRecipeProgress(current)
    : null;
  if (!current) {
    return `
      <div class="active-recipe-card idle simple-wide auto-read">
        <span class="simple-label">Seguimiento XTB</span>
        <strong>Lectura automatica</strong>
        <small>Si abres una posicion, el monitor debe leerla desde XTB y asociarla al contexto tecnico. Ya no necesitas marcarla manualmente.</small>
      </div>
    `;
  }
  return `
    <div class="active-recipe-card running simple-wide auto-read">
      <div>
        <span class="simple-label">Operacion detectada para aprendizaje</span>
        <strong>${current.symbol || focusSymbol} ${current.label}</strong>
        <small id="active-recipe-status">${autoStatus.action}. Tiempo ${autoStatus.elapsedMinutes}m / ${current.maxMinutes}m. El bot actualiza estado con XTB.</small>
      </div>
    </div>
  `;
}

function totalOperationResult() {
  return [1, 2, 3, 4].reduce((total, slot) => total + operationResultValue(slot), 0);
}

function latestXtbPositionsSnapshot() {
  try {
    return JSON.parse(getLocalValue("decision_engine_xtb_positions_last") || "{}") || {};
  } catch {
    return {};
  }
}

function latestMarketSession() {
  try {
    const positionsSnapshot = latestXtbPositionsSnapshot();
    if (positionsSnapshot?.market_session?.session) return positionsSnapshot.market_session;
    const accountSnapshot = JSON.parse(getLocalValue("decision_engine_xtb_account_last") || "{}") || {};
    if (accountSnapshot?.market_session?.session) return accountSnapshot.market_session;
  } catch {
    return null;
  }
  return null;
}

function sumPositionResults(positions = [], status = "") {
  return positions
    .filter((position) => !status || position.status === status)
    .reduce((total, position) => {
      const value = Number(position.actual_result ?? position.open_profit ?? position.profit ?? 0);
      return Number.isFinite(value) ? total + value : total;
    }, 0);
}

function latestXtbOpenResult() {
  const snapshot = latestXtbPositionsSnapshot();
  const positions = Array.isArray(snapshot.positions) ? snapshot.positions : [];
  return Number(sumPositionResults(positions, "open").toFixed(2));
}

function hasRecentXtbPositionsSnapshot() {
  const snapshot = latestXtbPositionsSnapshot();
  if (!snapshot.updated_at) return false;
  const updatedMs = new Date(snapshot.updated_at).getTime();
  return Number.isFinite(updatedMs) && Date.now() - updatedMs < 5 * 60 * 1000;
}

function rememberClosedXtbPositionLocal(position) {
  if (!position || position.status !== "closed") return;
  const result = Number(position.actual_result);
  if (!Number.isFinite(result)) return;
  const key = xtbPositionStorageKey(position);
  let stored = [];
  try {
    stored = JSON.parse(getLocalValue("decision_engine_xtb_closed_positions_today") || "[]") || [];
  } catch {
    stored = [];
  }
  if (stored.some((item) => item.key === key)) return;
  stored.push({
    key,
    trade_date: todayKey(),
    symbol: position.symbol || focusSymbol,
    result,
    detected_at: position.detected_at || new Date().toISOString(),
  });
  setLocalValue("decision_engine_xtb_closed_positions_today", JSON.stringify(stored.slice(-40)));
}

function latestXtbClosedResult() {
  try {
    const snapshot = latestXtbPositionsSnapshot();
    const dayResult = Number(snapshot?.day_result?.closed_result);
    if (Number.isFinite(dayResult) && Math.abs(dayResult) > 0.004) return Number(dayResult.toFixed(2));

    const stored = JSON.parse(getLocalValue("decision_engine_xtb_closed_positions_today") || "[]") || [];
    return Number(stored
      .filter((item) => item.trade_date === todayKey())
      .reduce((total, item) => {
        const value = Number(item.result);
        return Number.isFinite(value) ? total + value : total;
      }, 0)
      .toFixed(2));
  } catch {
    return 0;
  }
}

function hasRecentXtbHistorySnapshot() {
  const snapshot = latestXtbPositionsSnapshot();
  const source = String(snapshot?.day_result?.source || "");
  return Boolean(source) || latestXtbClosedResult() !== 0;
}

function liveDayResult() {
  const manualClosed = Number(totalOperationResult().toFixed(2));
  const xtbClosed = latestXtbClosedResult();
  const closed = Math.abs(xtbClosed) > 0.004 ? xtbClosed : manualClosed;
  const syncedOpen = decimalValueById("open-profit", 0);
  const positionsOpen = latestXtbOpenResult();
  const open = Math.abs(positionsOpen) > 0.004 ? positionsOpen : syncedOpen;
  const total = Number((closed + open).toFixed(2));
  const hasRecentSnapshot = hasRecentXtbPositionsSnapshot();
  const hasHistory = hasRecentXtbHistorySnapshot();
  const source = Math.abs(open) > 0.004 && Math.abs(closed) > 0.004
    ? "cerradas + abierto XTB"
    : Math.abs(open) > 0.004
      ? "posicion abierta XTB"
      : Math.abs(closed) > 0.004
        ? "operaciones cerradas"
        : hasRecentSnapshot
          ? hasHistory
            ? "sin resultado detectado por XTB"
            : "historial XTB no visible"
          : "XTB no muestra cartera al bot";
  return { closed, open, total, source, detected: Math.abs(open) > 0.004 || Math.abs(closed) > 0.004, hasHistory };
}

function startedOperations() {
  try {
    return JSON.parse(getLocalValue("decision_engine_started_operations") || "{}") || {};
  } catch {
    return {};
  }
}

function operationGate(slot) {
  const { total, weekday } = coMarketMinutes();
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const current = Number(slot);
  const opens = { 1: 9 * 60, 2: 9 * 60 + 30, 3: 10 * 60, 4: 10 * 60 + 30 };
  const started = startedOperations();
  const op1Result = operationResultValue(1);
  const op2Result = operationResultValue(2);
  const openProfit = Number(document.getElementById("open-profit")?.value || 0);
  if (!isWeekday) return { allowed: false, reason: "Fuera de dia habil." };
  if (total < opens[current]) return { allowed: false, reason: `Esperar ${operationStrategy(current).entryTime}.` };
  if (current === 1) return { allowed: true, reason: "Op1 habilitada por horario." };
  if (current === 2) {
    const favorable = openProfit > 0 || op1Result > 0;
    return started["1"] && favorable
      ? { allowed: true, reason: "Op2 habilitada: Op1 favorable." }
      : { allowed: false, reason: "Op2 requiere Op1 iniciada y favorable." };
  }
  if (current === 3) {
    return op1Result > 0
      ? { allowed: true, reason: "Op3 habilitada: Op1 gano." }
      : { allowed: false, reason: "Op3 requiere Op1 ganadora." };
  }
  if (current === 4) {
    return op1Result > 0 && op2Result > 0
      ? { allowed: true, reason: "Op4 habilitada: Op1 y Op2 ganaron." }
      : { allowed: false, reason: "Op4 requiere Op1 y Op2 ganadoras." };
  }
  return { allowed: false, reason: "Operacion no valida." };
}

function startOperation(slot) {
  const gate = operationGate(slot);
  const started = startedOperations();
  started[String(slot)] = {
    at: new Date().toISOString(),
    symbol: document.getElementById("symbol")?.value || "",
    gate_allowed: gate.allowed,
    gate_reason: gate.reason,
  };
  setLocalValue("decision_engine_started_operations", JSON.stringify(started));
  updatePostbackStatus(`Op ${slot} marcada como iniciada. Condicion: ${gate.reason}`, gate.allowed ? "ok" : "neutral");
  setControlValue("trade-slot", String(slot));
  calculate();
}

function cancelStartedOperation(slot) {
  const started = startedOperations();
  delete started[String(slot)];
  setLocalValue("decision_engine_started_operations", JSON.stringify(started));
  setOperationResult(slot, 0);
  syncOutcomeFromResults();
  saveConfigLocal();
  schedulePostback();
  calculate();
}

function syncOutcomeFromResults() {
  const total = Number(totalOperationResult().toFixed(2));
  const outcome = total > 0 ? "win" : total < 0 ? "loss" : "pending";
  const lessonResult = document.getElementById("lesson-result");
  const lessonOutcome = document.getElementById("lesson-outcome");
  if (lessonResult) lessonResult.value = total.toFixed(2);
  if (lessonOutcome) lessonOutcome.value = outcome;
}

function renderSimpleDashboard() {
  const target = document.getElementById("simple-dashboard");
  if (!target) return;
  {
  const profile = us100StrategyProfile();
  const hiddenTarget = document.getElementById("target-profit-usd");
  const hiddenStop = document.getElementById("stop-risk-usd");
  if (hiddenTarget) hiddenTarget.value = String(profile.targetUsd);
  if (hiddenStop) hiddenStop.value = String(profile.stopUsd);
  const selectedChartFrame = chartFrameConfig();
  const primaryDisplay = buildAssetOpportunity(profile.asset);
  const traceSummary = technicalTraceSummary(focusSymbol);
  const capital = document.getElementById("account-balance")?.value || defaultAccountBalance;
  const dayResult = liveDayResult();
  const dayTotal = dayResult.total;
  const xtbPrice = document.getElementById("xtb-price")?.value || document.getElementById("market-price")?.value || numberText(profile.price);
  const quoteSource = String(liveQuotes[focusSymbol]?.source || "");
  const sourceLabel = quoteSource.startsWith("xtb")
    ? quoteSource === "xtb_server_snapshot"
      ? "XTB servidor"
      : "Lectura directa XTB"
    : "Yahoo / ultimo precio";
  const marketSession = latestMarketSession();
  const marketSessionLabel = marketSession?.session || currentMarketPhaseLabel();
  const analysis = technicalAnalysisState();
  const analysisCanGraph = analysis.completed;
  const analysisGraphEnabled = analysis.graphEnabled;
  const analysisStatus = !analysis.startedAt
    ? "Sin iniciar"
    : analysis.completed
      ? "Lectura completa"
      : "Analizando";
  const cfdPctTone = profile.cfdMovePct < 0 ? "bear" : profile.cfdMovePct > 0 ? "bull" : "neutral";
  const quoteSideLabel = liveQuotes[focusSymbol]?.executable_side === "ask" ? "COMPRA/ask" : liveQuotes[focusSymbol]?.executable_side === "bid" ? "VENTA/bid" : "ultimo";
  const thesis = profile.dayThesis;
  const operateDecision = buildOperateDecision(profile);
  const professionalPlan = professionalDecisionPlan(profile, operateDecision);
  const actionableOrder = professionalPlan.status === "OPERAR";
  const trafficState = professionalPlan.status === "OPERAR"
    ? "green"
    : profile.status === "NO OPERAR" || profile.confidence < 45
      ? "red"
      : "yellow";
  const trafficLabel = trafficState === "green" ? "OPERAR" : trafficState === "yellow" ? "ESPERAR" : "NO OPERAR";
  const trafficHint = trafficState === "green"
    ? "Mapa 4H, confirmacion 15M, gatillo 1M, no perseguir y margen estan alineados."
    : trafficState === "yellow"
      ? "Hay lectura parcial, pero falta al menos una confirmacion. No copies niveles todavia."
      : "La lectura no tiene ventaja suficiente o esta invalidada. Proteger capital.";
  const objectiveOrderLabel = trafficState === "green"
    ? profile.directionLabel
    : trafficState === "yellow" && profile.direction !== "WAIT"
      ? professionalPlan.blocker
        ? `ESPERAR: falta ${professionalPlan.blocker.label}`
        : `ESPERAR confirmacion ${profile.directionLabel}`
      : "NO OPERAR";
  const objectiveCaption = trafficState === "green" ? "Orden" : trafficState === "yellow" ? "Plan si confirma" : "Decision";
  const objectiveWarning = trafficState === "red"
    ? trafficHint
    : trafficState === "yellow"
      ? `${trafficHint} No copies entrada, stop, take ni volumen mientras el semaforo no este en verde.`
      : professionalPlan.plainRule;
  const recipeUnlocked = trafficState === "green";
  const recipePreview = recipeUnlocked;
  const blockedRecipeText = "NO COPIAR";
  const recipeVolumeText = recipePreview ? formatVolumeForXtb(profile.volume, profile.asset) : "--";
  const recipeEntryText = recipePreview ? priceText(profile.entry) : blockedRecipeText;
  const recipeStopText = recipePreview ? priceText(profile.stopLoss) : blockedRecipeText;
  const recipeTakeProfitText = recipePreview ? priceText(profile.takeProfit) : blockedRecipeText;
  const recipeMarginText = recipePreview ? money(profile.marginRequired) : "--";
  const recipeOperabilityText = recipePreview ? `${profile.confidence}%` : "BLOQUEADA";
  const recipeRiskText = recipePreview
    ? `${recipeUnlocked ? "Receta habilitada" : "Preparacion, aun no ejecutar"}: puntos a meta ${numberText(profile.takePoints)}, puntos al escudo ${numberText(profile.stopPoints)}. Con volumen ${formatVolumeForXtb(profile.volume, profile.asset)}, cada punto vale aprox. ${money(profile.pointValue)}.`
    : `Niveles bloqueados: falta ${professionalPlan.blocker?.label || "confirmacion final"}. La app puede tener sesgo, pero solo entrega receta cuando Mapa 4H, Confirmacion 15M, Gatillo 1M, no perseguir y margen estan OK.`;

  target.innerHTML = `
    <div class="simple-shell us100-desk">
      <div class="simple-hero">
        <section class="simple-panel">
          <h1>US100 Decision Desk</h1>
          <p class="simple-subtitle">Un solo CFD. Mapa 4H, confirmacion 15M y gatillo 1M. Si una pieza falta, la respuesta profesional es esperar.</p>
          <div class="simple-status">
            <span class="simple-chip">Usuario ${currentDashboardUser}</span>
            <span class="simple-chip">${focusSymbol}</span>
            <span class="simple-chip">${sourceLabel}</span>
            <span class="simple-chip">Sesion ${marketSessionLabel}</span>
            <span class="simple-chip">Bot: ${money(profile.targetUsd)} / escudo ${money(profile.stopUsd)}</span>
            <span class="simple-chip">Valor/punto ${money(profile.pointValue)}</span>
            <span class="simple-chip warn">Confirma CFD, spread y margen en XTB</span>
          </div>
        </section>
        <section class="simple-metrics">
          <div class="simple-metric"><span class="simple-label">Activo</span><span class="simple-value">${focusSymbol}</span></div>
          <div class="simple-metric"><span class="simple-label">Precio XTB</span><span class="simple-value">${xtbPrice}</span><small class="simple-metric-note">${quoteSideLabel} · CFD <b class="${cfdPctTone}">${numberText(profile.cfdMovePct)}%</b></small></div>
          <div class="simple-metric"><span class="simple-label">Decision</span><span class="simple-value">${profile.direction}</span></div>
          <div class="simple-metric"><span class="simple-label">Capital</span><span class="simple-value">${capital}</span></div>
        </section>
      </div>

      <section class="simple-panel simple-decision ${profile.status === "NO OPERAR" ? "danger" : profile.status === "OPERABLE" ? "ok" : "warn"}">
        <div class="simple-head">
          <div>
            <span class="simple-label">Decision profesional</span>
            <h2>${focusSymbol} ${profile.directionLabel}</h2>
            <p class="simple-subtitle">${profile.explanation}</p>
          </div>
          <div class="simple-score">
            <span>${profile.status}</span>
            <strong>${profile.confidence}%</strong>
          </div>
        </div>
        <div class="day-thesis-card ${profile.dayThesis.invalidated ? "danger" : profile.dayThesis.stable ? "ok" : "warn"}">
          <div>
            <span class="simple-label">Tesis fija del dia</span>
            <strong>${profile.dayThesis.direction === "WAIT" ? "ESPERAR" : profile.dayThesis.direction}</strong>
            <small>${profile.dayThesis.reason}</small>
          </div>
          <div>
            <span class="simple-label">Bloque actual</span>
            <strong>${profile.dayThesis.blockLabel}</strong>
            <small>${profile.dayThesis.historyCount} velas leidas ${profile.dayThesis.mode === "fixed" ? `desde ${profile.dayThesis.startTime} NY` : `en rango vivo de ${profile.dayThesis.blockHours}h`}. Movimiento ${numberText(profile.dayThesis.movePct)}%, rango ${numberText(profile.dayThesis.rangePct)}%.</small>
          </div>
          <div>
            <span class="simple-label">Regla anti-ruido</span>
            <strong>${profile.dayThesis.stable ? "Mantener tesis" : "No forzar entrada"}</strong>
            <small>La vela 1M solo confirma gatillo. No cambia la estrategia diaria por si sola.</small>
          </div>
          <div class="day-thesis-auto">
            <span class="simple-label">Lectura del bot</span>
            <strong>Automatica</strong>
            <small>El monitor mantiene la tesis con el rango activo: ${thesis.mode === "fixed" ? `desde ${thesis.startTime} NY` : `ultimas ${thesis.blockHours}h en vivo`}. La receta no cambia por tocar la grafica.</small>
          </div>
        </div>
        <div class="analysis-control-card">
          <div>
            <span class="simple-label">Analisis automatico</span>
            <strong id="analysis-timer">${analysis.startedAt ? "ACTIVO" : "SIN INICIAR"}</strong>
            <small id="analysis-status">${analysisStatus}. El monitor lee XTB, guarda velas/capital y alimenta la decision. No requiere graficar ni limpiar manualmente.</small>
          </div>
          <div class="simple-agent-actions">
            <button type="button" class="permit" data-simple-action="analysis-start">${analysis.startedAt ? "Reiniciar lectura" : "Iniciar lectura"}</button>
          </div>
        </div>
        <div class="technical-trace-card ${traceSummary.clarity === "CLARO" ? "ok" : traceSummary.clarity === "NO CLARO" || traceSummary.clarity === "PREPARAR" ? "warn" : "danger"}">
          <div>
            <span class="simple-label">Lectura multi-temporal</span>
            <strong>${traceSummary.clarity} · ${traceSummary.direction === "WAIT" ? "ESPERAR" : traceSummary.direction}</strong>
            <small>${traceSummary.text}</small>
            <small>La app analiza 4H, 15M y 1M. La grafica visible abajo solo muestra la temporalidad seleccionada: ${selectedChartFrame.label}.</small>
          </div>
          <div class="technical-trace-grid">
            ${traceSummary.traces.map((trace) => `
              <div>
                <span>${trace.label}</span>
                <strong>${trace.bias === "WAIT" ? "Sin direccion" : trace.bias}</strong>
                <small>${traceDirectionNote(trace)} Velas ${trace.candles}.</small>
              </div>
            `).join("")}
          </div>
        </div>
        ${analysisGraphEnabled && primaryDisplay?.zones ? renderTradeChart(primaryDisplay, "main") : `
          <div class="analysis-wait-card">
            <strong>Inicia el analisis para ver trazas</strong>
            <span>El bot revisa hacia atras 4H, 15M y 1M. Si mapa, confirmacion y gatillo no se alinean, debe decir ESPERAR.</span>
          </div>
        `}
        <div class="chart-frame-controls" aria-label="Temporalidad de grafica">
          <div>
            <span class="simple-label">Temporalidad grafica</span>
            <strong>${selectedChartFrame.description}</strong>
            <small>Solo cambia la grafica visible. La receta siempre usa Mapa 4H + Confirmacion 15M + Gatillo 1M.</small>
          </div>
          <div class="chart-frame-buttons">
            ${Object.values(chartFrameOptions).map((frame) => `
              <button type="button" class="${frame.key === selectedChartFrame.key ? "active" : ""}" data-chart-frame="${frame.key}">${frame.label}</button>
            `).join("")}
          </div>
        </div>
      </section>

      <section class="simple-ops recipe-decision-grid">
        <div class="strategy-decision-strip">
          <div class="strategy-summary-card compact ${professionalPlan.status === "OPERAR" ? "ok" : "warn"}">
            <div>
              <span class="simple-label">Mesa profesional</span>
              <strong>${professionalPlan.title}</strong>
              <small>${professionalPlan.action}</small>
            </div>
            <p>${professionalPlan.plainRule}</p>
          </div>
          <div class="operation-traffic-light ${trafficState}">
            <div class="traffic-bulbs" aria-label="Semaforo de operacion">
              <span class="${trafficState === "red" ? "active" : ""}"></span>
              <span class="${trafficState === "yellow" ? "active" : ""}"></span>
              <span class="${trafficState === "green" ? "active" : ""}"></span>
            </div>
            <div>
              <span class="simple-label">Semaforo para operar</span>
              <strong>${trafficLabel}</strong>
              <small>${trafficHint}</small>
            </div>
          </div>
          <div class="strategy-core-grid compact">
            ${professionalPlan.checks.map((check) => `
              <div class="${check.ok ? "ok" : "blocked"}">
                <span>${check.ok ? "OK" : "FALTA"}</span>
                <strong>${check.label}</strong>
                <em>${check.short}</em>
                <small>${check.detail}</small>
              </div>
            `).join("")}
          </div>
        </div>
        <article class="simple-operation active">
          <div class="simple-head">
            <h2>Receta del bot</h2>
            <span class="simple-badge">${trafficLabel}</span>
          </div>
          <div class="simple-numbers">
            <div class="simple-number"><span class="simple-label">${objectiveCaption}</span><strong>${objectiveOrderLabel}</strong></div>
            <div class="simple-number"><span class="simple-label">Volumen</span><strong>${recipeVolumeText}</strong></div>
            <div class="simple-number"><span class="simple-label">Entrada</span><strong>${recipeEntryText}</strong></div>
            <div class="simple-number"><span class="simple-label">Stop</span><strong>${recipeStopText}</strong></div>
            <div class="simple-number"><span class="simple-label">Take profit</span><strong>${recipeTakeProfitText}</strong></div>
            <div class="simple-number"><span class="simple-label">Margen aprox</span><strong>${recipeMarginText}</strong></div>
            <div class="simple-number"><span class="simple-label">CFD hoy</span><strong class="${cfdPctTone}">${numberText(profile.cfdMovePct)}%</strong></div>
            <div class="simple-number"><span class="simple-label">Operabilidad</span><strong>${recipeOperabilityText}</strong></div>
          </div>
          <p class="simple-warning">${objectiveWarning}</p>
          <p class="simple-tiny">${profile.sizingPolicy.note}</p>
          <p class="simple-tiny">${profile.cfdMove.detail} ${profile.xtbContext.detail}</p>
          <p class="simple-tiny">${recipeRiskText}</p>
          ${renderActiveRecipeLearningCard(profile, activeRecipeState())}
        </article>
        ${renderFibOnlyCard(primaryDisplay)}
      </section>

      <section class="simple-panel auto-memory-panel">
        <div class="simple-head">
          <div>
            <h2>Memoria automatica</h2>
            <p class="simple-subtitle">El bot lee XTB, actualiza capital/precio y guarda contexto. Solo conserva acciones utiles.</p>
          </div>
          <span class="simple-badge">automatico</span>
        </div>
        <div class="auto-memory-grid">
          <div><span class="simple-label">Capital XTB</span><strong>${capital}</strong><small>Se actualiza desde la lectura del monitor.</small></div>
          <div><span class="simple-label">Resultado del dia</span><strong class="${dayTotal < 0 ? "bear" : dayTotal > 0 ? "bull" : ""}">${dayResult.detected || dayResult.hasHistory ? money(dayTotal) : "Pendiente"}</strong><small>${dayResult.source}. Cerrado ${money(dayResult.closed)} / abierto ${money(dayResult.open)}.</small></div>
          <div><span class="simple-label">Sesion</span><strong>${marketSessionLabel}</strong><small>${marketSession?.ny_time ? `Hora NY ${marketSession.ny_time}` : "Se guarda con cada lectura del monitor."}</small></div>
          <div><span class="simple-label">Patron actual</span><strong>${profile.pattern.name}</strong><small>Usado como contexto, no como orden por si solo.</small></div>
          <div><span class="simple-label">Estado</span><strong>${analysis.startedAt ? "Bot leyendo" : "Bot pausado"}</strong><small>${analysis.startedAt ? "Mantiene memoria tecnica en segundo plano." : "Inicia la automatizacion para datos frescos."}</small></div>
        </div>
        <div class="simple-actions compact"><button type="button" class="secondary" data-simple-action="export-excel">Exportar Excel</button><button type="button" class="secondary" data-simple-action="enable-alerts">Activar alertas automaticas</button></div>
      </section>

    </div>
  `;
  scheduleAnalysisTimer();
  scheduleActiveRecipeTimer();
  return;
}
}

function refreshAnalysisTimerDom() {
  const state = technicalAnalysisState();
  const timer = document.getElementById("analysis-timer");
  const status = document.getElementById("analysis-status");
  const chartButton = document.getElementById("analysis-chart-btn");
  if (timer) timer.textContent = state.startedAt ? "ACTIVO" : "SIN INICIAR";
  if (status) {
    status.textContent = !state.startedAt
      ? "Sin iniciar. Pulsa Iniciar analisis."
      : "Analisis activo. El bot revisa 4H, 15M y 1M hacia atras.";
  }
  if (chartButton) chartButton.disabled = false;
}

function refreshActiveRecipeDom() {
  const activeRecipe = activeRecipeState();
  const target = document.getElementById("active-recipe-status");
  if (!activeRecipe || !target) return;
  const progress = activeRecipeProgress(activeRecipe);
  if (!progress) return;
  target.textContent = `${progress.action}. Tiempo ${progress.elapsedMinutes}m / ${activeRecipe.maxMinutes}m. Restan ${progress.remaining}m.`;
}

function scheduleActiveRecipeTimer() {
  window.clearInterval(activeRecipeTimer);
  activeRecipeTimer = null;
  refreshActiveRecipeDom();
  if (!activeRecipeState()) return;
  activeRecipeTimer = window.setInterval(refreshActiveRecipeDom, 5000);
}

function scheduleAnalysisTimer() {
  window.clearInterval(analysisCountdownTimer);
  analysisCountdownTimer = null;
  refreshAnalysisTimerDom();
  const state = technicalAnalysisState();
  if (!state.startedAt || state.completed) return;
  analysisCountdownTimer = window.setInterval(() => {
    refreshAnalysisTimerDom();
    if (technicalAnalysisState().completed) {
      window.clearInterval(analysisCountdownTimer);
      analysisCountdownTimer = null;
      renderSimpleDashboard();
    }
  }, 1000);
}

function bindSimpleDashboard() {
  const target = document.getElementById("simple-dashboard");
  if (!target) return;
  target.addEventListener("input", (event) => {
    const opResult = event.target?.dataset?.opResult;
    if (opResult) {
      setOperationResult(opResult, event.target.value);
      syncOutcomeFromResults();
      return;
    }
    const syncTarget = event.target?.dataset?.syncTarget;
    if (syncTarget) {
      setControlValue(syncTarget, event.target.value, { silent: true });
      if (syncTarget.startsWith("operation") && syncTarget.endsWith("-result")) syncOutcomeFromResults();
    }
  });
  target.addEventListener("change", (event) => {
    const thesisControl = event.target?.dataset?.thesisControl;
    if (thesisControl) {
      if (thesisControl === "mode") setLocalValue("us100_thesis_mode", event.target.value);
      if (thesisControl === "start") setLocalValue("us100_thesis_start", event.target.value || "06:00");
      if (thesisControl === "hours") setLocalValue("us100_thesis_hours", event.target.value || "4");
      renderSimpleDashboard();
      return;
    }
    const opResult = event.target?.dataset?.opResult;
    if (opResult) {
      setOperationResult(opResult, event.target.value);
      syncOutcomeFromResults();
      renderDailyResultCard();
      schedulePostback();
      return;
    }
    const syncTarget = event.target?.dataset?.syncTarget;
    if (syncTarget) {
      setControlValue(syncTarget, event.target.value);
      if (syncTarget.startsWith("operation") && syncTarget.endsWith("-result")) syncOutcomeFromResults();
    }
  });
  target.addEventListener("click", (event) => {
    const focusTarget = event.target?.dataset?.simpleFocus;
    if (focusTarget) {
      document.getElementById(focusTarget)?.focus();
      return;
    }
    const topButton = event.target?.closest?.("[data-simple-top-symbol]");
    if (topButton) {
      const picked = [...buildTopOpportunities(), ...buildOpeningWatchlist()]
        .find((item) => item.asset.symbol === topButton.dataset.simpleTopSymbol);
      if (picked) applySelectedOpportunity(picked, "manual");
      return;
    }
    const chartFrameButton = event.target?.closest?.("[data-chart-frame]");
    if (chartFrameButton) {
      setChartFrame(chartFrameButton.dataset.chartFrame);
      const symbols = [
        selectedAsset.symbol,
        ...buildTopOpportunities().map((item) => item.asset.symbol),
        ...buildOpeningWatchlist().slice(0, 3).map((item) => item.asset.symbol),
      ];
      loadMarketBars(symbols).then(() => renderSimpleDashboard());
      return;
    }
    const action = event.target?.dataset?.simpleAction;
    if (!action) return;
    if (action === "slot-1") setControlValue("trade-slot", "1");
    if (action === "slot-2") setControlValue("trade-slot", "2");
    if (action === "slot-3") setControlValue("trade-slot", "3");
    if (action === "slot-4") setControlValue("trade-slot", "4");
    if (action.startsWith("start-op-")) {
      startOperation(action.replace("start-op-", ""));
      return;
    }
    if (action.startsWith("cancel-op-")) {
      cancelStartedOperation(action.replace("cancel-op-", ""));
      return;
    }
    if (action.startsWith("submit-op-")) {
      const slot = action.replace("submit-op-", "");
      const input = target.querySelector(`[data-op-result="${slot}"]`);
      setOperationResult(slot, input?.value || 0);
      syncOutcomeFromResults();
      saveConfigLocal();
      schedulePostback();
      renderDailyResultCard();
      return;
    }
    if (action.startsWith("start-recipe-")) {
      const direction = action.replace("start-recipe-", "");
      const profile = us100StrategyProfile();
      const recipe = buildDirectionalRecipe(profile, direction);
      recipe.confidence = profile.confidence;
      recipe.status = profile.status;
      setActiveRecipe(recipe);
      updatePostbackStatus(`Receta ${recipe.label} marcada como iniciada. Vigilar maximo 60 minutos.`, "ok");
      renderSimpleDashboard();
      return;
    }
    if (action === "start-current-recipe") {
      const profile = us100StrategyProfile();
      if (profile.direction !== "LONG" && profile.direction !== "SHORT") {
        updatePostbackStatus("No hay direccion clara para registrar una receta.", "error");
        return;
      }
      const recipe = buildDirectionalRecipe(profile, profile.direction);
      recipe.confidence = profile.confidence;
      recipe.status = profile.status;
      setActiveRecipe(recipe);
      updatePostbackStatus(`Receta ${recipe.label} registrada como operada. El cierre del dia alimentara el aprendizaje.`, "ok");
      renderSimpleDashboard();
      return;
    }
    if (action === "finish-active-recipe") {
      markActiveRecipeClosed();
      updatePostbackStatus("Operacion marcada como cerrada. Ahora registra el resultado real para alimentar el aprendizaje.", "neutral");
      renderSimpleDashboard();
      return;
    }
    if (action === "clear-active-recipe") {
      clearActiveRecipe();
      updatePostbackStatus("Reloj de receta cancelado.", "neutral");
      renderSimpleDashboard();
      return;
    }
    if (action === "save-close") saveDayClose();
    if (action === "apply-capital") applyCapitalMovement();
    if (action === "save-lesson") saveTradeLesson();
    if (action === "analysis-start") {
      startTechnicalAnalysis();
      return;
    }
    if (action === "analysis-chart") {
      enableTechnicalChart();
      return;
    }
    if (action === "analysis-reset") {
      resetTechnicalAnalysis();
      return;
    }
    if (action === "export-excel") exportMonthlyReport();
    if (action === "enable-alerts") enableNotifications();
    if (["slot-1", "slot-2", "slot-3", "slot-4"].includes(action)) calculate();
  });
}

function updateLessonStatus(message, tone = "neutral") {
  const target = document.getElementById("lesson-status");
  if (!target) return;
  const tones = {
    ok: "border-bull/30 text-bull",
    error: "border-bear/40 text-bear",
    neutral: "border-white/10 text-zinc-500",
  };
  target.className = `mt-2 rounded-xl border bg-ink p-3 text-xs font-bold ${tones[tone] || tones.neutral}`;
  target.textContent = message;
}

function queueXtbPendingOrder() {
  removeLocalValue("decision_engine_xtb_order_request");
  updateLessonStatus("Modo analisis: la app ya no prepara ordenes en XTB. Solo lee, aprende y grafica objetivo.", "neutral");
}

function applyXtbOrderRequestStatus(payload) {
  if (!payload) return;
  const tone = payload.status === "prepared" ? "ok" : payload.status === "error" ? "error" : "neutral";
  updateLessonStatus(`XTB orden asistida: ${payload.status}. ${payload.message || ""}`, tone);
}

function xtbPositionStorageKey(position) {
  return [
    "xtb_position",
    position?.status || "",
    position?.symbol || focusSymbol,
    position?.direction || "",
    numberText(position?.volume || 0),
    numberText(position?.entry_price || 0),
    numberText(position?.close_price || 0),
    numberText(position?.actual_result || 0),
    position?.id || "",
  ].join(":");
}

function positionDirectionLabel(direction) {
  return direction === "SHORT" ? "SHORT / SELL STOP" : "LONG / BUY STOP";
}

function rememberOpenXtbPosition(position) {
  if (!position || position.status !== "open") return;
  const key = xtbPositionStorageKey(position);
  const previousKey = getLocalValue("decision_engine_xtb_open_position_key");
  setLocalValue("decision_engine_xtb_open_position_key", key);
  setLocalValue("decision_engine_xtb_open_position", JSON.stringify(position));
  if (previousKey === key) return;
  updateLessonStatus(
    `XTB detecto operacion abierta: ${position.symbol || focusSymbol} ${positionDirectionLabel(position.direction)} vol ${numberText(position.volume)} @ ${priceText(position.entry_price)}. Se enlaza para aprendizaje.`,
    "ok"
  );
  const stopLoss = Number(position.stop_loss || 0);
  const takeProfit = Number(position.take_profit || 0);
  if (stopLoss > 0 && takeProfit > 0) {
    setActiveRecipe({
      symbol: position.symbol || focusSymbol,
      direction: position.direction,
      label: positionDirectionLabel(position.direction),
      entry: Number(position.entry_price || 0),
      stopLoss,
      takeProfit,
      volume: Number(position.volume || 0),
      pointValue: us100PointValue(position.volume || 0),
      marginRequired: xtbTicketValidation?.margin_usd || 0,
      targetUsd: Math.abs((takeProfit - position.entry_price) * us100PointValue(position.volume || 0)),
      stopUsd: Math.abs((position.entry_price - stopLoss) * us100PointValue(position.volume || 0)),
      confidence: us100StrategyProfile().confidence || 0,
      status: "XTB DETECTADA",
      note: "Operacion abierta detectada automaticamente desde XTB.",
    });
  }
}

async function saveClosedXtbPosition(position) {
  if (!position || position.status !== "closed") return;
  const result = Number(position.actual_result);
  if (!Number.isFinite(result)) return;
  rememberClosedXtbPositionLocal(position);
  const key = `decision_engine_saved_${xtbPositionStorageKey(position)}`;
  if (getLocalValue(key)) return;
  const pointValue = us100PointValue(position.volume || 0);
  const payload = {
    trade_date: todayKey(),
    symbol: position.symbol || focusSymbol,
    direction: position.direction,
    planned_volume: Number(position.volume || 0),
    entry_price: Number(position.entry_price || 0),
    stop_price: Number(position.stop_loss || 0),
    take_profit_price: Number(position.take_profit || 0),
    expected_loss: Math.abs((Number(position.entry_price || 0) - Number(position.stop_loss || 0)) * pointValue),
    expected_profit: Math.abs((Number(position.take_profit || 0) - Number(position.entry_price || 0)) * pointValue),
    actual_result: result,
    outcome: result > 0 ? "win" : result < 0 ? "loss" : "manual",
    confidence: us100StrategyProfile().confidence || 0,
    market_phase: currentTradingSessionLabel(),
    notes: [
      "AUTO_XTB_CERRADA",
      `fuente=${position.source || "xtb"}`,
      `precio_cierre=${numberText(position.close_price || 0)}`,
      `id=${position.id || ""}`,
      `detectada=${position.detected_at || ""}`,
    ].join(" | "),
  };
  try {
    const response = await fetch("/lessons/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    setLocalValue(key, new Date().toISOString());
    removeLocalValue("decision_engine_xtb_open_position_key");
    removeLocalValue("decision_engine_xtb_open_position");
    clearActiveRecipe();
    updateLessonStatus(`XTB guardo cierre automatico: ${payload.symbol} ${payload.direction} ${money(payload.actual_result)}.`, payload.actual_result >= 0 ? "ok" : "error");
    await loadLessonSummary();
    renderSimpleDashboard();
  } catch {
    updateLessonStatus("XTB detecto cierre, pero no pudo guardar aprendizaje. Revisa DB.", "error");
  }
}

function applyXtbPositions(payload) {
  const positions = Array.isArray(payload?.positions) ? payload.positions : [];
  setLocalValue("decision_engine_xtb_positions_last", JSON.stringify({
    positions,
    day_result: payload?.day_result || null,
    market_session: payload?.market_session || null,
    updated_at: payload?.updated_at || new Date().toISOString(),
  }));
  positions.filter((position) => position.status === "open").forEach(rememberOpenXtbPosition);
  positions.filter((position) => position.status === "closed").forEach((position) => {
    saveClosedXtbPosition(position);
  });
  calculate();
}

function setSyncedNumericInput(id, value, decimals = 2) {
  const input = document.getElementById(id);
  const parsed = Number(value);
  if (!input || !Number.isFinite(parsed)) return false;
  const current = decimalNumber(input.value, NaN);
  if (Number.isFinite(current) && Math.abs(current - parsed) < 0.005) return false;
  input.value = parsed.toFixed(decimals);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

function optionalSyncNumber(value) {
  if (value === null || value === undefined || value === "") return NaN;
  return Number(value);
}

function applyXtbAccount(payload = {}) {
  const account = {
    total_equity: optionalSyncNumber(payload.total_equity),
    available_capital: optionalSyncNumber(payload.available_capital),
    open_profit: optionalSyncNumber(payload.open_profit),
    margin_level_pct: optionalSyncNumber(payload.margin_level_pct),
    updated_at: payload.updated_at || payload.detected_at || new Date().toISOString(),
  };
  const syncKey = JSON.stringify({
    total_equity: Number.isFinite(account.total_equity) ? account.total_equity.toFixed(2) : null,
    available_capital: Number.isFinite(account.available_capital) ? account.available_capital.toFixed(2) : null,
    open_profit: Number.isFinite(account.open_profit) ? account.open_profit.toFixed(2) : null,
    margin_level_pct: Number.isFinite(account.margin_level_pct) ? account.margin_level_pct.toFixed(2) : null,
  });
  if (syncKey === lastXtbAccountSyncKey) return;
  lastXtbAccountSyncKey = syncKey;

  const changed = [
    setSyncedNumericInput("account-balance", account.total_equity),
    setSyncedNumericInput("available-capital", account.available_capital),
    setSyncedNumericInput("open-profit", account.open_profit),
    setSyncedNumericInput("margin-level-pct", account.margin_level_pct),
  ].some(Boolean);
  if (!changed) return;

  setLocalValue("decision_engine_xtb_account_last", JSON.stringify(payload));
  saveConfigLocal();
  schedulePostback();
  calculate();
  const balanceText = Number.isFinite(account.total_equity) ? money(account.total_equity) : "--";
  const availableText = Number.isFinite(account.available_capital) ? money(account.available_capital) : "--";
  updatePostbackStatus(`XTB cuenta sincronizada: capital ${balanceText}, disponible ${availableText}.`, "ok");
}

function currentMarketPhaseLabel() {
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
  if (total < 9 * 60 + 30) return "pre-market";
  if (total < 9 * 60 + 35) return "orb-forming";
  if (total < 9 * 60 + 45) return "golden-window";
  if (total < 11 * 60 + 30) return "morning";
  if (total < 15 * 60 + 45) return "midday";
  if (total < 16 * 60) return "close-window";
  return "closed";
}

function currentTradingSessionLabel() {
  return latestMarketSession()?.session || currentMarketPhaseLabel();
}

async function saveTradeLesson() {
  const activeRecipe = activeRecipeState();
  const profile = us100StrategyProfile();
  const lessonSource = activeRecipe || (lastResult?.symbol ? {
    symbol: lastResult.symbol,
    direction: lastResult.direction,
    volume: lastResult.volume,
    entry: lastResult.entry_price,
    stopLoss: lastResult.stop_loss,
    takeProfit: lastResult.take_profit,
    stopUsd: lastResult.expected_loss,
    targetUsd: lastResult.expected_profit,
    confidence: buildAiConfirmation().confidence || 0,
  } : null);
  if (!lessonSource) {
    updateLessonStatus("Aprendizaje: marca una receta como iniciada o calcula una receta antes de guardar.", "error");
    return;
  }
  const manualNotes = document.getElementById("lesson-notes")?.value || "";
  const activeNote = activeRecipeLessonNote(activeRecipe);
  const payload = {
    trade_date: todayKey(),
    symbol: lessonSource.symbol || focusSymbol,
    direction: lessonSource.direction,
    planned_volume: Number(lessonSource.volume || 0),
    entry_price: Number(lessonSource.entry || 0),
    stop_price: Number(lessonSource.stopLoss || 0),
    take_profit_price: Number(lessonSource.takeProfit || 0),
    expected_loss: Number(lessonSource.stopUsd || 0),
    expected_profit: Number(lessonSource.targetUsd || 0),
    actual_result: decimalValueById("lesson-result", 0),
    outcome: document.getElementById("lesson-outcome")?.value || "pending",
    confidence: Number(lessonSource.confidence || profile.confidence || 0),
    market_phase: currentTradingSessionLabel(),
    notes: [activeNote, manualNotes].filter(Boolean).join(" || "),
  };
  updateLessonStatus("Aprendizaje: guardando...");
  try {
    const response = await fetch("/lessons/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    updateLessonStatus(`Aprendizaje guardado: ${payload.symbol} ${payload.direction} ${money(payload.actual_result)}.`, "ok");
    document.getElementById("lesson-notes").value = "";
    if (activeRecipe && payload.outcome !== "pending") clearActiveRecipe();
    await loadLessonSummary();
  } catch (error) {
    updateLessonStatus("Aprendizaje: no se pudo guardar. Revisa base de datos.", "error");
  }
}

function autoLessonPayload(profile) {
  const directionLabel = profile.directionLabel || labelFromDirection(profile.direction);
  return {
    trade_date: todayKey(),
    symbol: focusSymbol,
    direction: profile.direction,
    planned_volume: Number(profile.volume || 0),
    entry_price: Number(profile.entry || 0),
    stop_price: Number(profile.stopLoss || 0),
    take_profit_price: Number(profile.takeProfit || 0),
    expected_loss: Number(profile.stopUsd || 0),
    expected_profit: Number(profile.targetUsd || 0),
    actual_result: 0,
    outcome: "pending",
    confidence: Number(profile.confidence || 0),
    market_phase: currentTradingSessionLabel(),
    notes: [
      "AUTO",
      `estado=${profile.status}`,
      `orden=${directionLabel}`,
      `patron=${profile.pattern?.name || "sin patron"}`,
      `gap_fvg_bag=${profile.imbalance?.type || "sin lectura"}`,
      `tendencia=${profile.trend?.direction || "WAIT"}`,
      `precio=${numberText(profile.price)}`,
      `agente=${profile.agent?.action || "ESPERAR"}`,
      `permiso_operacion=${isAgentTradeAuthorized() ? "si" : "no"}`,
    ].join(" | "),
  };
}

async function saveAutoLearningSnapshot(force = false) {
  if (!isAgentArmed()) return;
  const profile = us100StrategyProfile();
  const minuteKey = new Date().toISOString().slice(0, 16);
  const key = `${minuteKey}:${profile.status}:${profile.direction}:${profile.pattern.name}:${profile.imbalance.type}:${numberText(profile.price)}`;
  if (!force && key === lastAutoLessonKey) return;
  lastAutoLessonKey = key;
  try {
    const response = await fetch("/lessons/trades", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(autoLessonPayload(profile)),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    updateLessonStatus(`Bot armado: aprendizaje automatico guardado (${profile.status}, ${profile.confidence}%).`, "ok");
    await loadLessonSummary();
  } catch {
    updateLessonStatus("Bot armado: no pudo guardar aprendizaje automatico. Revisa DB.", "error");
  }
}

function updateAgentLoop() {
  window.clearInterval(autoLearningTimer);
  autoLearningTimer = null;
  if (!isAgentArmed()) {
    updateLessonStatus("Bot pausado: no guarda lecturas automaticas.", "neutral");
    return;
  }
  updateLessonStatus("Bot armado: guardando patrones automaticamente cada minuto.", "ok");
  saveAutoLearningSnapshot(true);
  autoLearningTimer = window.setInterval(() => saveAutoLearningSnapshot(false), 60 * 1000);
}

async function loadLessonSummary() {
  const target = document.getElementById("lesson-summary");
  if (!target) return;
  try {
    const response = await fetch("/lessons/trades?limit=20");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const summary = payload.summary || {};
    const previousMemory = JSON.stringify(lessonMemorySummary || {});
    lessonMemorySummary = summary;
    const best = (summary.best_symbols || []).slice(0, 3).map((item) => `${item.symbol}: ${money(item.result)} (${item.wins}/${item.count})`).join(" | ");
    target.innerHTML = `
      <div class="grid gap-1">
        <div><strong>Registros:</strong> ${summary.closed || 0} cerrados</div>
        <div><strong>Acierto:</strong> ${numberText(summary.win_rate || 0)}%</div>
        <div><strong>Resultado aprendido:</strong> ${money(summary.total_result || 0)}</div>
        <div><strong>Mejores:</strong> ${best || "sin historial suficiente"}</div>
      </div>
    `;
    if (JSON.stringify(summary) !== previousMemory) renderSimpleDashboard();
  } catch (error) {
    lessonMemorySummary = null;
    target.textContent = "Memoria: sin conexion a base de datos.";
  }
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function exportMonthlyReport() {
  const button = document.getElementById("export-monthly-report");
  if (button) button.textContent = "Generando Excel...";
  try {
    const response = await fetch("/capital/daily?limit=120");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const currentMonth = todayKey().slice(0, 7);
    const rows = (payload.history || []).filter((item) => String(item.trade_date || "").startsWith(currentMonth));
    const sortedRows = [...rows].sort((a, b) => String(a.trade_date || "").localeCompare(String(b.trade_date || "")));
    const firstBalance = Number(sortedRows[0]?.balance || 0);
    const lastBalance = Number(sortedRows[sortedRows.length - 1]?.balance || 0);
    const monthlyResult = sortedRows.reduce((sum, item) => sum + Number(item.daily_realized_result || 0), 0);
    const monthlyTarget = sortedRows.reduce((sum, item) => sum + Number(item.target_profit || 0), 0);
    const monthlyMaxLoss = sortedRows.reduce((sum, item) => sum + Number(item.max_loss || 0), 0);
    const detailRows = sortedRows.map((item) => `
      <tr>
        <td>${htmlEscape(item.trade_date)}</td>
        <td>${Number(item.balance || 0).toFixed(2)}</td>
        <td>${Number(item.daily_realized_result || 0).toFixed(2)}</td>
        <td>${htmlEscape(item.daily_result_status)}</td>
        <td>${htmlEscape(item.market_phase || "")}</td>
        <td>${Number(item.target_profit || 0).toFixed(2)}</td>
        <td>${Number(item.max_loss || 0).toFixed(2)}</td>
        <td>${Number(item.risk_pct || 0).toFixed(2)}%</td>
        <td>${Number(item.available_capital || 0).toFixed(2)}</td>
        <td>${Number(item.open_profit || 0).toFixed(2)}</td>
        <td>${htmlEscape(item.notes)}</td>
      </tr>
    `).join("");
    const workbook = `<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #111827; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 18px; }
            th { background: #111827; color: #ffffff; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            .profit { color: #047857; font-weight: 700; }
            .loss { color: #b91c1c; font-weight: 700; }
          </style>
        </head>
        <body>
          <h1>Reporte mensual MyActions - ${htmlEscape(currentMonth)}</h1>
          <table>
            <tr><th>Resumen</th><th>Valor USD</th></tr>
            <tr><td>Dias registrados</td><td>${sortedRows.length}</td></tr>
            <tr><td>Capital inicial registrado</td><td>${firstBalance.toFixed(2)}</td></tr>
            <tr><td>Capital final registrado</td><td>${lastBalance.toFixed(2)}</td></tr>
            <tr><td>Resultado mensual cerrado</td><td class="${monthlyResult >= 0 ? "profit" : "loss"}">${monthlyResult.toFixed(2)}</td></tr>
            <tr><td>Meta mensual acumulada</td><td>${monthlyTarget.toFixed(2)}</td></tr>
            <tr><td>Perdida maxima mensual acumulada</td><td>${monthlyMaxLoss.toFixed(2)}</td></tr>
          </table>
          <table>
            <tr>
              <th>Fecha</th>
              <th>Capital</th>
              <th>Resultado dia</th>
              <th>Estado</th>
              <th>Sesion/fase</th>
              <th>Meta dia</th>
              <th>Perdida maxima</th>
              <th>Riesgo %</th>
              <th>Disponible</th>
              <th>Resultado abierto</th>
              <th>Notas</th>
            </tr>
            ${detailRows || '<tr><td colspan="11">Sin registros para este mes.</td></tr>'}
          </table>
        </body>
      </html>`;
    const blob = new Blob([workbook], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `myactions-reporte-${currentMonth}.xls`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    updatePostbackStatus(`Reporte Excel exportado: ${rows.length} registros.`, "ok");
  } catch (error) {
    updatePostbackStatus("No se pudo exportar: revisa conexion con base de datos.", "error");
  } finally {
    if (button) button.textContent = "Exportar reporte mensual Excel";
  }
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
      if (payload.latest.operation1_result !== undefined) document.getElementById("operation1-result").value = payload.latest.operation1_result;
      if (payload.latest.operation2_result !== undefined) document.getElementById("operation2-result").value = payload.latest.operation2_result;
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

async function saveDayClose() {
  const resultInputs = [1, 2, 3, 4].map((slot) => document.getElementById(operationResultId(slot)));
  const balanceInput = document.getElementById("account-balance");
  const lessonResultInput = document.getElementById("lesson-result");
  const lessonOutcomeInput = document.getElementById("lesson-outcome");
  const total = Number(totalOperationResult().toFixed(2));

  if (!total) {
    updatePostbackStatus("Cierre sin resultado: registra al menos una operacion antes de guardar.", "error");
    return;
  }

  const currentBalance = decimalNumber(balanceInput?.value, defaultAccountBalance);
  const nextBalance = Math.max(0, Number((currentBalance + total).toFixed(2)));

  if (lessonResultInput) lessonResultInput.value = total.toFixed(2);
  if (lessonOutcomeInput) {
    lessonOutcomeInput.value = total > 0 ? "win" : "loss";
  }

  if (balanceInput) balanceInput.value = nextBalance.toFixed(2);
  await postbackConfig();
  await saveTradeLesson();
  resultInputs.forEach((input) => {
    if (input) input.value = 0;
  });
  removeLocalValue("decision_engine_started_operations");
  saveConfigLocal();
  await postbackConfig();
  updatePostbackStatus(`Cierre guardado: ${money(total)} aplicado al capital. Capital nuevo: ${money(nextBalance)}.`, "ok");
  calculate();
}

function clearDayResults() {
  resetDailyResultInputs();
  saveConfigLocal();
  schedulePostback();
  calculate();
}

function applyCapitalMovement() {
  const movementInput = document.getElementById("capital-movement");
  const movement = decimalNumber(movementInput.value, 0);
  if (!movement) {
    updatePostbackStatus("Movimiento de capital vacio. Usa negativo para retiro o positivo para deposito.", "error");
    return;
  }
  const balanceInput = document.getElementById("account-balance");
  const current = decimalNumber(balanceInput.value, defaultAccountBalance);
  const next = Math.max(0, current + movement);
  balanceInput.value = next.toFixed(2);
  movementInput.value = "";
  updatePostbackStatus(`${movement < 0 ? "Retiro" : "Deposito"} aplicado: ${money(movement)}. Capital nuevo: ${money(next)}.`, "ok");
  saveConfigLocal();
  schedulePostback();
  calculate();
}

function localCalculate(payload) {
  const asset = findAsset(payload.symbol);
  const plan = buildDailyTradePlan();
  const normalizedRiskPct = Number(payload.risk_pct || buildDailyTradePlan().currentTradeRiskPct);
  const riskAmount = payload.account_balance * normalizedRiskPct / 100;
  const rawVolume = targetContractVolume(asset, payload.entry_price, payload.account_balance);
  const capitalVolume = payload.account_balance / (payload.entry_price * asset.multiplier);
  const autoVolume = rawVolume;
  const volume = payload.requested_volume ? roundVolumeForXtb(payload.requested_volume, asset) : autoVolume;
  const volumeBasis = payload.requested_volume ? "manual" : "contrato";
  const orderType = payload.direction === "LONG" ? "BUY STOP" : "SELL STOP";
  const targetDistance = volume > 0 ? riskAmount / (volume * asset.multiplier) : 0;
  const stopDistance = volume > 0 && plan.currentTradeStopAmount > 0 ? plan.currentTradeStopAmount / (volume * asset.multiplier) : 0;
  const takeProfit = payload.take_profit_price ||
    (payload.direction === "LONG" ? payload.entry_price + targetDistance : payload.entry_price - targetDistance);
  const stopLoss = payload.stop_price || (stopDistance > 0
    ? (payload.direction === "LONG" ? payload.entry_price - stopDistance : payload.entry_price + stopDistance)
    : 0);
  const positionValue = Number((payload.entry_price * asset.multiplier * volume).toFixed(2));
  const spreadCost = Number(estimatedSpreadCost(asset, volume).toFixed(2));
  const expectedLoss = stopLoss > 0 ? Math.abs(payload.entry_price - stopLoss) * asset.multiplier * volume : 0;
  const riskExcess = Math.max(0, expectedLoss - plan.currentTradeStopAmount);
  const capitalUsagePct = payload.account_balance > 0 ? Number((positionValue / payload.account_balance * 100).toFixed(2)) : 0;
  return {
    asset,
    direction: payload.direction,
    order_type: orderType,
    simple_order_explanation: payload.direction === "LONG" ? "Compra si rompe hacia arriba." : "Vende si rompe hacia abajo.",
    entry_price: payload.entry_price,
    stop_loss: stopLoss,
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
    spread_cost: spreadCost,
    capital_usage_pct: capitalUsagePct,
    expected_loss: Number(expectedLoss.toFixed(2)),
    expected_profit: Number((Math.abs(takeProfit - payload.entry_price) * asset.multiplier * volume).toFixed(2)),
    risk_ok: !plan.currentTradeStopAmount || expectedLoss <= plan.currentTradeStopAmount * 1.02,
    risk_excess: Number(riskExcess.toFixed(2)),
    risk_reward: plan.currentTradeStopAmount ? `stop ${money(plan.currentTradeStopAmount)} / objetivo por operacion` : "sin stop / objetivo por operacion",
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
  if (asset.symbol === "AVAX") {
    warnings.push({ level: "info", message: "AVAX/AVALANCHE es cripto CFD: puede abrir fin de semana, pero no usa la misma regla ORB de acciones. Primera version: observar spread y operar solo con riesgo reducido." });
  }
  return warnings;
}

function renderWarnings() {
  const box = document.getElementById("warnings");
  const warnings = [...(lastResult?.warnings || [])];
  const positionValue = lastResult?.position_value ?? 0;
  const availableCapital = Number(document.getElementById("available-capital").value || 0);
  const marginRequired = positionValue * cfdMarginPct(lastResult?.asset || selectedAsset) / 100;
  const timing = marketTimingProfile(lastResult?.asset);
  if (timing.quality === "NO OPERAR") {
    warnings.push({ level: "danger", message: `HORARIO NO CONFIABLE: ${timing.message}` });
  } else if (["ALTA VOLATILIDAD", "BAJA CALIDAD", "CIERRE VOLATIL"].includes(timing.quality)) {
    warnings.push({ level: "info", message: `FILTRO HORARIO: ${timing.message}` });
  }
  const management = tradeManagementProfile(lastResult);
  if (management.tone === "danger") {
    warnings.push({ level: "danger", message: `GESTION IA: ${management.action}. ${management.message}` });
  } else if (management.tone === "warning") {
    warnings.push({ level: "info", message: `GESTION IA: ${management.action}. ${management.message}` });
  }
  if (availableCapital > 0 && marginRequired > availableCapital) {
    warnings.push({ level: "danger", message: `NO OPERAR: margen estimado ${money(marginRequired)} supera tu capital disponible ${money(availableCapital)}. El apalancamiento no evita este bloqueo.` });
  }
  if (lastResult?.spread_cost && lastResult.spread_cost > lastResult.expected_profit) {
    warnings.push({ level: "danger", message: `NO OPERAR: el spread estimado ${money(lastResult.spread_cost)} supera la meta ${money(lastResult.expected_profit)}. El costo de entrada se come la operacion.` });
  }
  if (lastResult && xtbTicketValidation?.symbol === lastResult.asset.symbol) {
    const contractValue = Number(xtbTicketValidation.contract_value || 0);
    const spreadUsd = Number(xtbTicketValidation.spread_usd || 0);
    const maxContract = lastResult.account_balance * 1.2;
    if (contractValue > maxContract) {
      warnings.push({ level: "danger", message: `NO OPERAR: XTB muestra contrato real ${money(contractValue)}, mayor al limite ${money(maxContract)} (capital * 1.2). Baja volumen o cambia activo.` });
    }
    if (spreadUsd > lastResult.expected_profit) {
      warnings.push({ level: "danger", message: `NO OPERAR: XTB muestra spread real ${money(spreadUsd)}, mayor que la meta ${money(lastResult.expected_profit)}.` });
    }
    if (xtbTicketValidation.inferred_multiplier) {
      const diffPct = Math.abs(xtbTicketValidation.inferred_multiplier - lastResult.asset.multiplier) / lastResult.asset.multiplier * 100;
      if (diffPct > 10) {
        warnings.push({ level: "danger", message: `NO OPERAR: multiplicador XTB detectado ${numberText(xtbTicketValidation.inferred_multiplier)} no coincide con MyActions ${numberText(lastResult.asset.multiplier)}.` });
      }
    }
  }
  if (lastResult?.requested_volume && !lastResult.risk_ok) {
    warnings.push({ level: "danger", message: `NO OPERAR ASI: con volumen ${formatVolumeForXtb(lastResult.volume, lastResult.asset)} pierdes aprox. ${money(lastResult.expected_loss)}, que supera tu riesgo permitido de ${money(lastResult.risk_amount)} por ${money(lastResult.risk_excess)}.` });
  }
  if (lastResult?.requested_volume && lastResult.entry_price) {
    const stopDistance = Math.abs(lastResult.entry_price - lastResult.stop_loss);
    const stopPct = stopDistance / lastResult.entry_price * 100;
    const minimum = volatilityStopPct(lastResult.asset);
    if (stopPct < minimum) {
      warnings.push({ level: "danger", message: `STOP MUY CERCANO: con volumen ${formatVolumeForXtb(lastResult.volume, lastResult.asset)} el stop queda a ${numberText(stopPct)}% del precio. Minimo con filtro de volatilidad: ${numberText(minimum)}%. La app debe bajar volumen o esperar mejor entrada.` });
    }
  }
  if (lastResult?.asset?.category === "stocks" && lastResult.volume < 1) {
    warnings.push({ level: "danger", message: "NO OPERAR: XTB exige volumen entero en este CFD y el volumen seguro queda por debajo de 1. Con 1 unidad podrias superar tu riesgo permitido." });
  } else if (lastResult && lastResult.volume <= 0) {
    warnings.push({ level: "danger", message: `NO OPERAR: el volumen seguro queda por debajo del minimo de XTB (${volumeStepForXtb(lastResult.asset)}). Sube distancia/espera otra entrada o elige otro activo.` });
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

function notificationSupportMessage() {
  if (!("Notification" in window)) {
    return "Alertas IA: este navegador no soporta notificaciones web.";
  }
  if (!window.isSecureContext) {
    return "Alertas IA: requieren HTTPS. Abre api.manantiallodge.com, no una URL local.";
  }
  if (Notification.permission === "denied") {
    return "Alertas IA: bloqueadas por el navegador. En Chrome/Brave: candado > Permisos > Notificaciones > Permitir.";
  }
  if (Notification.permission === "granted") {
    return "Alertas IA: activas. En movil manten Chrome/Brave abierto y sin ahorro de bateria para esta pagina.";
  }
  return "Alertas IA: pendientes. Toca Activar alertas IA y acepta el permiso del navegador.";
}

function refreshNotificationStatus() {
  notificationsEnabled = "Notification" in window && Notification.permission === "granted";
  updateNotificationStatus(notificationSupportMessage());
}

function sendBrowserNotification(title, body) {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    refreshNotificationStatus();
    return false;
  }
  new Notification(title, { body });
  return true;
}

async function enableNotifications() {
  if (!("Notification" in window)) {
    refreshNotificationStatus();
    return;
  }
  const permission = await Notification.requestPermission();
  notificationsEnabled = permission === "granted";
  refreshNotificationStatus();
  if (notificationsEnabled) {
    sendBrowserNotification("MyActions IA: alertas activas", "Prueba OK. Recibiras avisos de entrada, proteger ganancia o cerrar intradia.");
  }
}

function testNotifications() {
  if (!notificationsEnabled) {
    updateNotificationStatus("Alertas IA: primero toca Activar alertas IA y acepta el permiso.");
    return;
  }
  const sent = sendBrowserNotification(
    "MyActions IA: prueba de alerta",
    "Si ves este mensaje, Chrome/Brave permite las alertas web de MyActions."
  );
  updateNotificationStatus(sent ? notificationSupportMessage() : "Alertas IA: no se pudo enviar la prueba.");
}

function notifyIfNeeded() {
  if (!notificationsEnabled || !lastResult || !("Notification" in window)) return;
  const profile = us100StrategyProfile();
  const decision = buildOperateDecision(profile);
  const plan = professionalDecisionPlan(profile, decision);
  const trafficState = plan.status === "OPERAR"
    ? "green"
    : profile.status === "NO OPERAR" || profile.confidence < 45
      ? "red"
      : "yellow";
  const ai = buildAiConfirmation();
  const timing = marketTimingProfile();
  const management = tradeManagementProfile(lastResult);
  if (management.shouldNotify) {
    const body = `${lastResult.asset.symbol}: ${management.action}. ${management.message} Beneficio abierto: ${money(Number(document.getElementById("open-profit")?.value || 0))}.`;
    const key = `ai-manage:${lastResult.asset.symbol}:${management.phase}:${management.action}:${Math.round(Number(document.getElementById("open-profit")?.value || 0) * 100)}`;
    if (sessionStorage.getItem("lastDecisionNotification") !== key) {
      sessionStorage.setItem("lastDecisionNotification", key);
      sendBrowserNotification("MyActions IA: gestionar operacion", body);
    }
    return;
  }
  if (trafficState === "yellow" && profile.direction !== "WAIT") {
    const key = `ai-prepare:${focusSymbol}:${profile.direction}:${profile.confidence}:${Math.round(profile.entry || 0)}:${Math.round(profile.stopLoss || 0)}:${Math.round(profile.takeProfit || 0)}`;
    if (sessionStorage.getItem("lastDecisionNotification") !== key) {
      sessionStorage.setItem("lastDecisionNotification", key);
      sendBrowserNotification(
        "MyActions IA: preparate, aun no copies",
        `${focusSymbol} ${profile.directionLabel}. Falta confirmacion final. Entrada ${priceText(profile.entry)}, stop ${priceText(profile.stopLoss)}, TP ${priceText(profile.takeProfit)}.`
      );
    }
    return;
  }
  if (ai.status !== "OPERABLE") return;
  const stopText = lastResult.stop_loss ? `stop ${priceText(lastResult.stop_loss)}` : "SIN STOP";
  const body = `${lastResult.asset.symbol} ${lastResult.order_type}: entrada ${priceText(lastResult.entry_price)}, ${stopText}, meta ${priceText(lastResult.take_profit)}, volumen ${formatVolumeForXtb(lastResult.volume, lastResult.asset)}. Op ${buildDailyTradePlan().currentSlot}. ${timing.quality}.`;
  const key = `ai-operable:${lastResult.asset.symbol}:${lastResult.order_type}:${lastResult.entry_price}:${lastResult.stop_loss}:${lastResult.take_profit}:${lastResult.volume}:${lastResult.risk_pct}`;
  if (sessionStorage.getItem("lastDecisionNotification") === key) return;
  sessionStorage.setItem("lastDecisionNotification", key);
  sendBrowserNotification("MyActions IA: momento operable", body);
}

function renderTicket() {
  if (!lastResult) return;
  const positionValue = lastResult.position_value ?? Number((lastResult.entry_price * lastResult.multiplier * lastResult.volume).toFixed(2));
  const estimatedMarginPct = cfdMarginPct(lastResult?.asset || selectedAsset);
  const estimatedMargin = positionValue * estimatedMarginPct / 100;
  const volumeLabel = lastResult.asset.category === "stocks" ? "Volumen XTB (entero)" : "Volumen XTB (paso 0.01)";
  const marketPrice = Number(document.getElementById("market-price").value || 0);
  const expiryMode = document.getElementById("expiry-mode").value;
  const expiryLabel = expiryMode === "DAY" ? "Hoy / fin del dia" : "Sin vencimiento manual";
  const rows = [
    ["Activo", lastResult.asset.symbol, true],
    ["Operacion", `Operacion ${buildDailyTradePlan().currentSlot}`, false],
    ["Tipo de Orden", `${lastResult.order_type} - ${lastResult.simple_order_explanation}`, true],
    ["Precio de Entrada", priceText(lastResult.entry_price), true],
    ["Stop Loss", lastResult.stop_loss ? priceText(lastResult.stop_loss) : "SIN STOP - cierre manual", Boolean(lastResult.stop_loss)],
    ["Take Profit (Meta)", priceText(lastResult.take_profit), true],
    ["Vencimiento", expiryLabel, true],
    [volumeLabel, formatVolumeForXtb(lastResult.volume, lastResult.asset), true],
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
  const plan = buildDailyTradePlan();
  const positionValue = lastResult.position_value ?? Number((lastResult.entry_price * lastResult.multiplier * lastResult.volume).toFixed(2));
  const estimatedMarginPct = cfdMarginPct(lastResult?.asset || selectedAsset);
  const estimatedMargin = positionValue * estimatedMarginPct / 100;
  const ticketMatches = xtbTicketValidation?.symbol === lastResult.asset.symbol;
  document.getElementById("math-summary").innerHTML = `
    <div class="summary-row"><span>Capital operativo</span><strong>${money(lastResult.account_balance)}</strong></div>
    <div class="summary-row"><span>Meta del dia</span><strong>Neta ${money(plan.dailyNetTargetAmount)} / bruta ${money(plan.dailyTargetAmount)}</strong></div>
    <div class="summary-row"><span>Perfil de esta receta</span><strong>Op ${plan.currentSlot}: neto ${money(plan.currentTradeNetTargetAmount)} / bruto ${money(plan.currentTradeRiskAmount)}</strong></div>
    <div class="summary-row"><span>Stop/meta esta receta</span><strong>${lastResult.stop_loss ? `${money(lastResult.expected_loss)} / ` : "Sin stop / "}${money(lastResult.expected_profit)}</strong></div>
    <div class="summary-row"><span>Costo XTB estimado</span><strong>${money(plan.estimatedXtbCost)} por operacion</strong></div>
    <div class="summary-row"><span>Costo spread estimado</span><strong>${money(lastResult.spread_cost || 0)}</strong></div>
    <div class="summary-row"><span>Margen aprox. que bloquea XTB</span><strong>${money(estimatedMargin)} (${estimatedMarginPct}%)</strong></div>
    <div class="summary-row"><span>Exposicion nominal</span><strong>${money(positionValue)}</strong></div>
    <div class="summary-row"><span>Contrato real XTB visible</span><strong>${ticketMatches && xtbTicketValidation.contract_value ? money(xtbTicketValidation.contract_value) : "No visible"}</strong></div>
    <div class="summary-row"><span>Spread real XTB visible</span><strong>${ticketMatches && xtbTicketValidation.spread_usd ? money(xtbTicketValidation.spread_usd) : "No visible"}</strong></div>
    <div class="summary-row"><span>Multiplicador detectado</span><strong>${ticketMatches && xtbTicketValidation.inferred_multiplier ? numberText(xtbTicketValidation.inferred_multiplier) : "No visible"}</strong></div>
    <div class="summary-row"><span>Perdida maxima</span><strong class="text-bear">No definida sin cierre manual</strong></div>
    <div class="summary-row"><span>Resultado si toca meta</span><strong class="text-bull">${money(lastResult.expected_profit)}</strong></div>
    <div class="summary-row"><span>Estado del plan</span><strong class="text-gold">Stops por itinerario y cierre manual obligatorio</strong></div>
  `;
}

function bindInputs() {
  ["stop-price", "take-profit-price", "expiry-mode", "operation1-result", "operation2-result", "operation3-result", "operation4-result", "xtb-cost-per-operation"].forEach((id) => {
    document.getElementById(id).addEventListener("input", calculate);
    document.getElementById(id).addEventListener("change", calculate);
  });
  ["account-balance", "entry-price", "trade-slot", "target-profit-usd", "stop-risk-usd", "xtb-change-pct", "xtb-day-low", "xtb-day-high", "xtb-media-buyers"].forEach((id) => {
    document.getElementById(id).addEventListener("input", () => {
      applyAiAggressiveTargets(selectedAssetFromForm());
      calculate();
    });
    document.getElementById(id).addEventListener("change", () => {
      applyAiAggressiveTargets(selectedAssetFromForm());
      calculate();
    });
  });
  document.getElementById("symbol").addEventListener("change", () => {
    selectedAsset = findAsset(document.getElementById("symbol").value.trim().toUpperCase());
    document.getElementById("xtb-price").value = "";
    resetOrderForCurrentMode(selectedAsset);
    loadMarketBars([selectedAsset.symbol]).then(() => renderSimpleDashboard());
    renderAssets();
    calculate();
  });
  document.getElementById("symbol").addEventListener("input", () => {
    const typedSymbol = document.getElementById("symbol").value.trim().toUpperCase();
    const typedAsset = uniqueAssets().find((asset) => asset.symbol === typedSymbol);
    if (typedAsset) {
      selectedAsset = typedAsset;
      document.getElementById("xtb-price").value = "";
      resetOrderForCurrentMode(selectedAsset);
      loadMarketBars([selectedAsset.symbol]).then(() => renderSimpleDashboard());
      renderAssets();
      calculate();
    }
  });
  document.getElementById("market-price").addEventListener("change", () => {
    resetOrderFieldsFromMarketInput();
    calculate();
  });
  document.getElementById("xtb-price").addEventListener("input", applyXtbPriceOverride);
  document.getElementById("xtb-price").addEventListener("change", applyXtbPriceOverride);
  ["account-balance", "available-capital", "open-profit", "margin-level-pct", "operation1-result", "operation2-result", "operation3-result", "operation4-result", "xtb-cost-per-operation"].forEach((id) => {
    document.getElementById(id).addEventListener("input", schedulePostback);
    document.getElementById(id).addEventListener("change", schedulePostback);
  });
  document.getElementById("calculate-btn").addEventListener("click", calculate);
  document.getElementById("toggle-favorite-btn").addEventListener("click", toggleFavorite);
  document.getElementById("enable-notifications")?.addEventListener("click", enableNotifications);
  document.getElementById("test-notifications")?.addEventListener("click", testNotifications);
  document.getElementById("export-monthly-report")?.addEventListener("click", exportMonthlyReport);
  document.getElementById("save-day-close").addEventListener("click", saveDayClose);
  document.getElementById("clear-day-results").addEventListener("click", clearDayResults);
  document.getElementById("apply-capital-movement").addEventListener("click", applyCapitalMovement);
  document.getElementById("save-trade-lesson").addEventListener("click", saveTradeLesson);
  window.addEventListener("xtb-quotes", (event) => applyXtbQuoteBatch(event.detail?.items || []));
  window.addEventListener("xtb-ticket", (event) => applyXtbTicketValidation(event.detail || {}));
  window.addEventListener("xtb-order-request-status", (event) => applyXtbOrderRequestStatus(event.detail || {}));
  window.addEventListener("xtb-positions", (event) => applyXtbPositions(event.detail || {}));
  window.addEventListener("xtb-account", (event) => applyXtbAccount(event.detail || {}));
}

async function initDashboard() {
  await loadCurrentDashboardUser();
  selectedAsset = findAsset(focusSymbol);
  loadConfigLocal();
  selectedAsset = findAsset(focusSymbol);
  document.getElementById("symbol").value = focusSymbol;
  renderTabs();
  renderAssets();
  bindInputs();
  bindSimpleDashboard();
  verifyDatabaseAndLoadLatest();
  loadLessonSummary();
  updateGoldenWindow();
  setInterval(updateGoldenWindow, 1000);
  selectedAsset = findAsset(focusSymbol);
  resetOrderForCurrentMode(selectedAsset);
  refreshNotificationStatus();
  await loadAnalysisTimeframes([focusSymbol]);
  calculate();
  renderSimpleDashboard();
  updateAgentLoop();
  refreshLivePrices({ resetSelected: true });
  scheduleAutoRefresh();
}

initDashboard();
