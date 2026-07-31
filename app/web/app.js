const assetGroups = {
  favorites: [
    { symbol: "TSM.US", name: "Taiwan Semiconductor CFD", category: "stocks", multiplier: 1, marketPrice: 420.5 },
    { symbol: "NVDA.US", name: "NVIDIA CFD", category: "stocks", multiplier: 1, marketPrice: 172.2 },
    { symbol: "US100", name: "Nasdaq 100 CFD", category: "indices", multiplier: 1, marketPrice: 23000 },
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
    { symbol: "US100", name: "Nasdaq 100 CFD", category: "indices", multiplier: 1, marketPrice: 23000 },
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
const minAiRiskPct = 0.25;
const maxAiRiskPct = 1;
const maxPlannedTrades = 4;
const operationTargetPct = { 1: 0.75, 2: 0.5, 3: 0.25, 4: 0.25 };
const extensionProfitFactor = 0.4;
const baseProfitShareOfDay = 0.6;
const noStopMode = false;
const defaultsVersion = "capital-itinerary-4ops-1pct-stops-v5";

let activeCategory = "favorites";
let selectedAsset = getFavoriteAssets()[0] || assetGroups.stocks[0];
let lastResult = null;
let notificationsEnabled = false;
let postbackTimer = null;
let autoRefreshTimer = null;
let lastResetSymbol = selectedAsset.symbol;
let liveQuotes = {};
let marketBars = {};
let marketBarMeta = {};
let xtbTicketValidation = null;
let manualOpportunityLockUntil = 0;
const manualOpportunityLockMs = 3 * 60 * 1000;
let currentDashboardUser = "default";

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
  try {
    return JSON.parse(getLocalValue("decision_engine_favorites") || "null") || ["TSM.US", "NVDA.US", "US100", "GOLD", "BTCUSD", "AVAX"];
  } catch {
    return ["TSM.US", "NVDA.US", "US100", "GOLD", "BTCUSD", "AVAX"];
  }
}

function setFavoriteSymbols(symbols) {
  setLocalValue("decision_engine_favorites", JSON.stringify(Array.from(new Set(symbols))));
}

function getFavoriteAssets() {
  return favoriteSymbols().map(findAsset);
}

function ensureDefaultFavorites() {
  const symbols = favoriteSymbols();
  const required = ["AVAX"];
  const merged = [...symbols, ...required.filter((symbol) => !symbols.includes(symbol))];
  if (merged.length !== symbols.length) setFavoriteSymbols(merged);
}

function money(value) {
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function numberText(value) {
  return Number(value).toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cfdMarginPct() {
  return 20;
}

function cfdLeverageRatio() {
  return 100 / cfdMarginPct();
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
  const strategies = {
    1: {
      label: "Operacion 1",
      entryTime: "9:00",
      closeTime: "10:30",
      targetPct: operationTargetPct[1],
      stopPct: 0,
      condition: "Abrir a las 9:00 si hay semaforo OPERABLE. Objetivo 0.75%. Sin stop; cierre manual 10:30 si no llega a meta.",
    },
    2: {
      label: "Operacion 2",
      entryTime: "9:30",
      closeTime: "12:30",
      targetPct: operationTargetPct[2],
      stopPct: 0.5,
      condition: "Abrir a las 9:30 solo si Op1 sigue abierta y va favorable. Objetivo 0.5%.",
    },
    3: {
      label: "Operacion 3",
      entryTime: "10:00",
      closeTime: "13:30",
      targetPct: operationTargetPct[3],
      stopPct: 1,
      condition: "Abrir a las 10:00 solo si Op1 cerro exitosamente. Objetivo 0.25%.",
    },
    4: {
      label: "Operacion 4",
      entryTime: "10:30",
      closeTime: "14:30",
      targetPct: operationTargetPct[4],
      stopPct: 1,
      condition: "Abrir a las 10:30 solo si Op1 y Op2 cerraron exitosamente. Objetivo 0.25%. Receta inversa: usa la direccion contraria a la senal base; si la base es LONG, Op4 sera SHORT, y si la base es SHORT, Op4 sera LONG.",
    },
  };
  return strategies[Number(slot)] || strategies[1];
}

function buildDailyTradePlan() {
  const accountBalance = Number(document.getElementById("account-balance")?.value || defaultAccountBalance);
  const estimatedXtbCost = xtbCostPerOperation();
  const extensionEnabled = extensionTradesAllowed();
  const plannedTrades = maxPlannedTrades;
  const currentSlot = String(document.getElementById("trade-slot")?.value || "1");
  const contractTargetValue = accountBalance;
  const currentStrategy = operationStrategy(currentSlot);
  const tradeTargets = Object.fromEntries(
    [1, 2, 3, 4].map((slot) => {
      const strategy = operationStrategy(slot);
      return [slot, accountBalance * strategy.targetPct / 100];
    })
  );
  const baseTargetAmount = Object.values(tradeTargets).reduce((total, amount) => total + amount, 0);
  const fullDayTargetAmount = baseTargetAmount;
  const extensionTargetAmount = tradeTargets[3] + tradeTargets[4];
  const stopTargets = {
    1: 0,
    2: accountBalance * operationStrategy(2).stopPct / 100,
    3: accountBalance * operationStrategy(3).stopPct / 100,
    4: accountBalance * operationStrategy(4).stopPct / 100,
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
    currentTradeStopPct: currentStrategy.stopPct,
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

function applyLiveQuote(quote) {
  const price = Number(quote.price || 0);
  if (!price) return;
  liveQuotes[quote.symbol] = { ...(liveQuotes[quote.symbol] || {}), ...quote };
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

async function loadMarketBars(symbols = []) {
  const uniqueSymbols = Array.from(new Set(symbols.map((symbol) => String(symbol || "").trim().toUpperCase()).filter(Boolean)));
  await Promise.all(uniqueSymbols.slice(0, 6).map(async (symbol) => {
    try {
      const response = await fetch(`/market/bars/${encodeURIComponent(symbol)}?limit=60&interval=1h&period=5d&ts=${Date.now()}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      marketBars[symbol] = payload.items || [];
      marketBarMeta[symbol] = {
        source: payload.source || "market_bars",
        isRealOhlc: Boolean(payload.is_real_ohlc),
        providerSymbol: payload.provider_symbol || "",
        interval: payload.interval || "1h",
        period: payload.period || "5d",
        storedWasPointQuotes: Boolean(payload.stored_was_point_quotes),
      };
    } catch {
      marketBars[symbol] = marketBars[symbol] || [];
      marketBarMeta[symbol] = marketBarMeta[symbol] || {};
    }
  }));
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

function xtbPriceValue() {
  return Number(document.getElementById("xtb-price")?.value || 0);
}

function activeMarketPriceFor(asset) {
  return xtbPriceValue() || Number(document.getElementById("market-price")?.value || 0) || Number(asset.marketPrice || 0);
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
  const symbols = uniqueAssets().map((asset) => asset.symbol).join(",");
  try {
    updateLiveStatus("Live prices: actualizando...");
    const response = await fetch(`/market/live?symbols=${encodeURIComponent(symbols)}&ts=${Date.now()}`, {
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const liveItems = payload.items || [];
    liveItems.forEach(applyLiveQuote);
    await saveQuoteBars(liveItems, "yfinance_1m");
    await loadMarketBars([
      selectedAsset.symbol,
      ...liveItems.slice(0, 6).map((item) => item.symbol),
    ]);
    if (resetSelected) {
      const operable = pickBestCfdOpportunity();
      const watch = pickBestWatchlistOpportunity();
      const best = operable || watch;
      if (best) {
        applySelectedOpportunity(best, "live");
        updateLiveStatus(`${operable ? "Live prices: CFD operable" : "Radar Yahoo: camino probable"} ${best.asset.symbol} ${best.directionLabel} desde ${payload.count || 0} activos.`, "ok");
        return;
      }
      if (liveQuotes[selectedAsset.symbol]) {
        selectedAsset = findAsset(selectedAsset.symbol);
        resetOrderFieldsForAssetDirection(selectedAsset, effectiveDirectionForSlot(selectedAsset));
      }
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

function applyXtbQuoteBatch(items = []) {
  const validQuotes = items
    .map((item) => {
      const symbol = String(item.symbol || "").trim().toUpperCase();
      const price = Number(item.price || 0);
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
        provider_price: previousProviderQuote.provider_price || (String(previousSignalSource).startsWith("yfinance") ? previousProviderQuote.price : null),
        xtb_change_pct: xtbChangePct,
        change_pct: shouldKeepProviderMove ? previousProviderQuote.change_pct : shouldIgnoreXtbMove ? 0 : xtbChangePct,
        premarket_change_pct: previousProviderQuote.premarket_change_pct,
        regular_change_pct: previousProviderQuote.regular_change_pct,
        intraday_change_pct: previousProviderQuote.intraday_change_pct,
        market_phase: previousProviderQuote.market_phase || (shouldIgnoreXtbMove ? "awaiting_yahoo" : "xtb"),
        source: "xtb",
        signal_source: shouldKeepProviderMove ? previousSignalSource : shouldIgnoreXtbMove ? "awaiting_yahoo_premarket" : "xtb_visible_text",
        updated_at: new Date().toISOString(),
      };
    })
    .filter(Boolean);

  validQuotes.forEach(applyLiveQuote);
  saveQuoteBars(validQuotes, "xtb_visible_text").then(() => {
    loadMarketBars(validQuotes.map((item) => item.symbol)).then(() => {
      renderSimpleDashboard();
    });
  });
  const best = pickBestCfdOpportunity(validQuotes.map((item) => item.symbol));
  if (best && !isManualOpportunityLocked()) {
    applySelectedOpportunity(best, "xtb");
    updateLiveStatus(`XTB: mejor CFD visible ${best.asset.symbol} (${best.directionLabel}, score ${Math.round(best.score)}).`, "ok");
  } else if (best) {
    updateLiveStatus(`XTB: precios actualizados. Mantengo tu seleccion manual ${selectedAsset.symbol}.`, "ok");
  } else if (validQuotes.length) {
    updateLiveStatus("XTB: precios recibidos, pero ningun CFD visible cumple volumen/margen/stop.", "error");
  }
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
  const marginRequired = positionValue * cfdMarginPct() / 100;
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
  return uniqueAssets()
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
  selectedAsset = findAsset(opportunity.asset.symbol);
  const symbolInput = document.getElementById("symbol");
  const marketInput = document.getElementById("market-price");
  const xtbInput = document.getElementById("xtb-price");
  const quotePrice = Number(liveQuotes[selectedAsset.symbol]?.price || opportunity.asset.marketPrice || 0);
  if (symbolInput) symbolInput.value = selectedAsset.symbol;
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
  if (asset.category === "indices") return 0.003;
  if (asset.category === "commodities") return 0.004;
  if (asset.symbol === "AVAX") return 0.0045;
  if (asset.category === "crypto") return 0.006;
  return 0.01;
}

function resetOrderFieldsForAsset(asset) {
  const direction = document.getElementById("direction").value;
  const market = activeMarketPriceFor(asset) || Number(asset.marketPrice || 100);
  const step = priceStepPct(asset);
  const entry = direction === "LONG" ? market * (1 + step) : market * (1 - step);
  const balance = Number(document.getElementById("account-balance")?.value || defaultAccountBalance);
  const volume = targetContractVolume(asset, entry, balance);
  const plan = buildDailyTradePlan();
  const targetAmount = plan.currentTradeRiskAmount;
  const targetDistance = volume > 0 ? targetAmount / (volume * asset.multiplier) : 0;
  const stopDistance = volume > 0 && plan.currentTradeStopAmount > 0 ? plan.currentTradeStopAmount / (volume * asset.multiplier) : 0;
  const takeProfit = direction === "LONG" ? entry + targetDistance : entry - targetDistance;
  const stopLoss = stopDistance > 0 ? (direction === "LONG" ? entry - stopDistance : entry + stopDistance) : 0;

  document.getElementById("market-price").value = formatPriceForAsset(market, asset);
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
  const symbol = document.getElementById("symbol").value.trim().toUpperCase();
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
    return { ms: 30 * 1000, label: "mercado abierto, cada 30 seg" };
  }
  if (isWeekday && total >= 4 * 60 && total < 20 * 60) {
    return { ms: 30 * 1000, label: "pre/post-market Yahoo, cada 30 seg" };
  }
  return { ms: 5 * 60 * 1000, label: "mercado cerrado profundo, cada 5 min" };
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
  const marginRequired = positionValue * cfdMarginPct() / 100;
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
  const strategyTarget = strategyTargetForItem(item);
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
      <span>Meta deseada: ${money(zones.rewardAmount)} en ${numberText(zones.takeProfit)}. Meta IA: ${money(strategyTarget.amount)} en ${numberText(strategyTarget.price)}.</span>
      <span>Relacion estimada deseada: 1:${numberText(rr || 0)}. Riesgo ${money(zones.riskAmount)} para objetivo ${money(zones.rewardAmount)}.</span>
    </div>
  `;
}

function strategyTargetForItem(item) {
  const zones = item.zones;
  const confidence = Number(item.confidence || 60);
  const changePct = Math.abs(Number(item.asset.liveChangePct ?? 0));
  const confidenceFactor = clamp(confidence / 78, 0.45, 1.15);
  const momentumFactor = clamp(0.75 + changePct / 3, 0.65, 1.2);
  const factor = clamp(confidenceFactor * momentumFactor, 0.45, 1.15);
  const amount = zones.rewardAmount * factor;
  const distance = zones.rewardAmount > 0 ? Math.abs(zones.takeProfit - zones.entry) * factor : 0;
  const price = item.direction === "SHORT" ? zones.entry - distance : zones.entry + distance;
  return { amount, price, factor };
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

function realCandlesForItem(item) {
  const rows = marketBars[item.asset.symbol] || [];
  const candles = rows.slice(-30)
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

function renderTradeChart(item, variant = "mini") {
  const zones = item.zones;
  if (!zones) return "";
  const realCandles = realCandlesForItem(item);
  const usingRealCandles = realCandles.length >= 2;
  const candles = usingRealCandles ? realCandles : buildChartCandles(zones, item.direction);
  const strategyTarget = strategyTargetForItem(item);
  const proZones = professionalZonesForItem(item, candles);
  const pointQuoteCount = candles.filter((candle) => candle.pointQuote).length;
  const pointQuoteMode = usingRealCandles && pointQuoteCount >= Math.ceil(candles.length * 0.55);
  const barsMeta = marketBarMeta[item.asset.symbol] || {};
  const usingOhlcBars = usingRealCandles && barsMeta.isRealOhlc && !pointQuoteMode;
  const candleValues = candles.flatMap((candle) => [candle.o, candle.h, candle.l, candle.c]);
  const candleMin = Math.min(...candleValues);
  const candleMax = Math.max(...candleValues);
  const candleSpan = Math.max(candleMax - candleMin, zones.price * 0.002, 0.0001);
  const nearLevel = (value) => Math.abs(Number(value) - zones.price) <= candleSpan * (usingOhlcBars ? 1.2 : 2.8);
  const values = [
    zones.price,
    ...candleValues,
    ...(nearLevel(zones.entry) ? [zones.entry] : []),
    ...(nearLevel(zones.stopLoss) ? [zones.stopLoss] : []),
    ...(nearLevel(zones.reboundLow) ? [zones.reboundLow] : []),
    ...(nearLevel(zones.reboundHigh) ? [zones.reboundHigh] : []),
    ...(nearLevel(proZones.support) ? [proZones.support] : []),
    ...(nearLevel(proZones.resistance) ? [proZones.resistance] : []),
    ...(nearLevel(zones.takeProfit) ? [zones.takeProfit] : []),
    ...(nearLevel(strategyTarget.price) ? [strategyTarget.price] : []),
  ].filter((value) => Number.isFinite(value) && value > 0);
  if (!values.length) return "";
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const minChartSpan = Math.max(rawMax * 0.002, 0.0001);
  const rawSpan = Math.max(rawMax - rawMin, minChartSpan);
  const min = rawMin - rawSpan * 0.12;
  const max = rawMax + rawSpan * 0.12;
  const span = Math.max(max - min, minChartSpan);
  const visibleLevel = (value) => Number(value) >= min && Number(value) <= max;
  const chartWidth = variant === "main" ? 760 : 238;
  const chartHeight = variant === "main" ? 300 : 112;
  const plotLeft = variant === "main" ? 46 : 10;
  const plotRight = variant === "main" ? chartWidth - 76 : 230;
  const plotTop = variant === "main" ? 26 : 8;
  const plotBottom = variant === "main" ? chartHeight - 46 : 96;
  const plotHeight = plotBottom - plotTop;
  const y = (value) => clamp(plotBottom - ((value - min) / span) * plotHeight, plotTop, plotBottom);
  const candleWidth = variant === "main" ? 12 : 3.8;
  const candleGap = candles.length > 1 ? (plotRight - plotLeft) / (candles.length - 1) : 8;
  const startX = plotLeft;
  const priceTicks = Array.from({ length: 5 }, (_, index) => max - (span * index) / 4);
  const timeLabel = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "America/New_York",
    }).format(date);
  };
  const timeTicks = variant === "main" && candles.length
    ? [
      { index: 0, label: timeLabel(candles[0].timestamp) },
      { index: Math.floor((candles.length - 1) / 2), label: timeLabel(candles[Math.floor((candles.length - 1) / 2)]?.timestamp) },
      { index: candles.length - 1, label: timeLabel(candles[candles.length - 1].timestamp) },
    ].filter((tick) => tick.label)
    : [];
  const levelTag = (label, value, className) => variant === "main" ? `
    <g class="chart-price-tag ${className}">
      <rect x="${plotRight + 8}" y="${clamp(y(value) - 11, plotTop, plotBottom - 18)}" width="58" height="20" rx="4" />
      <text x="${plotRight + 37}" y="${clamp(y(value) + 3, plotTop + 14, plotBottom - 4)}">${label}</text>
    </g>
  ` : "";
  const candleMarkup = candles.map((candle, index) => {
    const x = startX + index * candleGap;
    const bodyTop = Math.min(y(candle.o), y(candle.c));
    const bodyHeight = Math.max(variant === "main" ? 5 : 3, Math.abs(y(candle.o) - y(candle.c)));
    const up = candle.c >= candle.o;
    return `
      <g class="chart-candle ${up ? "up" : "down"}">
        <line x1="${x}" x2="${x}" y1="${y(candle.h)}" y2="${y(candle.l)}" />
        <rect x="${x - candleWidth / 2}" y="${bodyTop}" width="${candleWidth}" height="${bodyHeight}" rx="2" />
      </g>
    `;
  }).join("");
  const zoneHeight = Math.max(6, Math.abs(y(zones.reboundLow) - y(zones.reboundHigh)));
  const title = `${item.asset.symbol} ${item.directionLabel}`;
  const chartInterval = String(barsMeta.interval || "1h").toUpperCase();
  const chartPeriod = String(barsMeta.period || "5d").toUpperCase();
  const chartTitle = usingOhlcBars ? `Grafica ${chartInterval} OHLC` : "Mapa XTB de orden";
  const chartSourceText = usingOhlcBars
    ? `OHLC real ${barsMeta.providerSymbol || item.asset.symbol} via Yahoo ${chartInterval}/${chartPeriod}`
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
      <svg viewBox="0 0 ${chartWidth} ${chartHeight}" role="img">
        <rect x="${plotLeft}" y="${plotTop}" width="${plotRight - plotLeft}" height="${plotHeight}" rx="8" class="chart-plot-bg" />
        ${axisMarkup}
        ${timeAxisMarkup}
        <rect x="${plotLeft}" y="${Math.min(y(zones.reboundLow), y(zones.reboundHigh))}" width="${plotRight - plotLeft}" height="${zoneHeight}" rx="6" class="chart-zone rebound" />
        <rect x="${plotLeft}" y="${Math.min(y(zones.securityLow), y(zones.securityHigh))}" width="${plotRight - plotLeft}" height="${Math.max(5, Math.abs(y(zones.securityLow) - y(zones.securityHigh)))}" rx="6" class="chart-zone safety" />
        <line x1="${plotLeft}" x2="${plotRight}" y1="${y(proZones.resistance)}" y2="${y(proZones.resistance)}" class="chart-line resistance" />
        <line x1="${plotLeft}" x2="${plotRight}" y1="${y(proZones.support)}" y2="${y(proZones.support)}" class="chart-line support" />
        ${visibleLevel(zones.takeProfit) ? `<line x1="${plotLeft}" x2="${plotRight}" y1="${y(zones.takeProfit)}" y2="${y(zones.takeProfit)}" class="chart-line take" />` : ""}
        ${visibleLevel(strategyTarget.price) ? `<line x1="${plotLeft}" x2="${plotRight}" y1="${y(strategyTarget.price)}" y2="${y(strategyTarget.price)}" class="chart-line ai-take" />` : ""}
        <line x1="${plotLeft}" x2="${plotRight}" y1="${y(zones.entry)}" y2="${y(zones.entry)}" class="chart-line entry" />
        <line x1="${plotLeft}" x2="${plotRight}" y1="${y(zones.stopLoss)}" y2="${y(zones.stopLoss)}" class="chart-line stop" />
        ${candleMarkup}
        ${visibleLevel(zones.takeProfit) ? levelTag("TP", zones.takeProfit, "take") : ""}
        ${visibleLevel(strategyTarget.price) ? levelTag("IA", strategyTarget.price, "ai-take") : ""}
        ${levelTag("Entrada", zones.entry, "entry")}
        ${levelTag("SL", zones.stopLoss, "stop")}
        ${variant === "main" ? `
          <text x="${plotLeft}" y="${plotTop - 8}" class="chart-label resistance">RESISTENCIA ${numberText(proZones.resistance)}</text>
          <text x="${plotLeft}" y="${plotBottom + 22}" class="chart-label support">SOPORTE ${numberText(proZones.support)}</text>
          <text x="${plotLeft}" y="${chartHeight - 8}" class="chart-time-label">${usingOhlcBars ? `${candles.length} velas OHLC reales ${chartInterval}` : usingRealCandles ? `${candles.length} lecturas de 1 minuto` : "Visual tactico hasta reunir lecturas"} / estilo XTB</text>
        ` : ""}
      </svg>
      <div class="chart-legend">
        <span class="take">Deseada ${numberText(zones.takeProfit)}</span>
        <span class="ai-take">IA ${numberText(strategyTarget.price)}</span>
        <span class="entry">Entrada ${numberText(zones.entry)}</span>
        <span class="stop">Stop ${numberText(zones.stopLoss)}</span>
      </div>
      ${variant === "main" ? `
        <div class="trade-zones">
          <span>Zona rebote: ${numberText(zones.reboundLow)} - ${numberText(zones.reboundHigh)}</span>
          <span>Zona seguridad: ${numberText(zones.securityLow)} - ${numberText(zones.securityHigh)}</span>
          <span>Zonas profesionales: soporte ${numberText(proZones.support)}, resistencia ${numberText(proZones.resistance)}, gatillo ${numberText(proZones.trigger)}.</span>
          <span>Valor deseado: ${money(zones.rewardAmount)} | Valor IA: ${money(strategyTarget.amount)} | Riesgo aprox: ${money(zones.riskAmount)}</span>
          <span>Fuente grafica: ${chartSourceText}. La escala prioriza precio reciente, entrada y stop para no aplastar las velas.</span>
        </div>
        ${technicalDecisionText(item, candles)}
      ` : ""}
    </div>
  `;
}

function renderMiniTradeChart(item) {
  return renderTradeChart(item, "mini");
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
  const nominalBudget = marginBudget / (cfdMarginPct() / 100);
  const contractVolume = targetContractVolume(asset, entry, accountBalance);
  const marginVolume = roundVolumeForXtb(nominalBudget / (entry * asset.multiplier), asset);
  const volume = roundVolumeForXtb(Math.min(contractVolume, marginVolume), asset);
  const targetDistance = volume > 0 ? targetAmount / (volume * asset.multiplier) : 0;
  const positionValue = entry * asset.multiplier * volume;
  const marginRequired = positionValue * cfdMarginPct() / 100;
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
  return uniqueAssets()
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
  const symbol = document.getElementById("symbol").value.trim().toUpperCase();
  selectedAsset = selectedAssetFromForm();
  document.getElementById("available-capital").value = document.getElementById("account-balance").value || defaultAccountBalance;
  document.getElementById("risk-pct").value = "dynamic";
  document.getElementById("direction").value = effectiveDirectionForSlot(selectedAsset);
  document.getElementById("requested-volume").value = "";
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
  const accountBalance = Number(document.getElementById("account-balance").value || defaultAccountBalance);
  const riskPct = getEffectiveRiskPct();
  const availableCapital = accountBalance;
  const openProfit = Number(document.getElementById("open-profit").value || 0);
  const marginLevelPct = Number(document.getElementById("margin-level-pct").value || 0);
  const operation1Result = Number(document.getElementById("operation1-result")?.value || 0);
  const operation2Result = Number(document.getElementById("operation2-result")?.value || 0);
  const operation3Result = Number(document.getElementById("operation3-result")?.value || 0);
  const operation4Result = Number(document.getElementById("operation4-result")?.value || 0);
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
    operation1_result: operation1Result,
    operation2_result: operation2Result,
    operation3_result: operation3Result,
    operation4_result: operation4Result,
    xtb_estimated_cost_per_operation: xtbEstimatedCostPerOperation,
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
    document.getElementById("direction").value = effectiveDirectionForSlot(selectedAsset);
    if (config.market_price) document.getElementById("market-price").value = config.market_price;
    if (config.entry_price) document.getElementById("entry-price").value = config.entry_price;
    if (config.stop_price) document.getElementById("stop-price").value = config.stop_price;
    if (config.take_profit_price) document.getElementById("take-profit-price").value = config.take_profit_price;
    document.getElementById("requested-volume").value = "";
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
      <div class="summary-row"><span>Garantia estimada</span><strong>${cfdMarginPct()}%</strong></div>
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

function setControlValue(id, value) {
  const element = document.getElementById(id);
  if (!element) return;
  element.value = value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function operationResultId(slot) {
  return `operation${slot}-result`;
}

function operationResultValue(slot) {
  return Number(document.getElementById(operationResultId(slot))?.value || 0);
}

function setOperationResult(slot, value) {
  const input = document.getElementById(operationResultId(slot));
  if (input) input.value = value;
}

function totalOperationResult() {
  return [1, 2, 3, 4].reduce((total, slot) => total + operationResultValue(slot), 0);
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

  const symbol = document.getElementById("symbol")?.value || "--";
  const xtbPrice = document.getElementById("xtb-price")?.value || document.getElementById("market-price")?.value || "--";
  const entry = document.getElementById("entry-price")?.value || "--";
  const takeProfit = document.getElementById("take-profit-price")?.value || "--";
  const volume = document.getElementById("requested-volume")?.value || "--";
  const capital = document.getElementById("account-balance")?.value || "--";
  const op1 = document.getElementById("operation1-result")?.value || "0";
  const op2 = document.getElementById("operation2-result")?.value || "0";
  const op3 = document.getElementById("operation3-result")?.value || "0";
  const op4 = document.getElementById("operation4-result")?.value || "0";
  const movement = document.getElementById("capital-movement")?.value || "";
  const lessonOutcome = document.getElementById("lesson-outcome")?.value || "pending";
  const lessonNotes = document.getElementById("lesson-notes")?.value || "";
  const tradeSlot = document.getElementById("trade-slot")?.value || "1";
  const direction = document.getElementById("direction")?.value || "--";
  const plan = buildDailyTradePlan();
  const opResults = { 1: op1, 2: op2, 3: op3, 4: op4 };
  const opTargets = {
    1: plan.firstRiskAmount,
    2: plan.secondRiskAmount,
    3: plan.thirdRiskAmount,
    4: plan.fourthRiskAmount,
  };
  const opNetTargets = {
    1: plan.firstNetTargetAmount,
    2: plan.secondNetTargetAmount,
    3: plan.thirdNetTargetAmount,
    4: plan.fourthNetTargetAmount,
  };
  const activeResultTarget = operationResultId(tradeSlot);
  const activeResult = opResults[tradeSlot] || "0";
  const dailyText = document.getElementById("daily-result-card")?.textContent || "Resultado cerrado: $0";
  const resultText = dailyText.match(/Resultado cerrado:[^\.]+/)?.[0]?.replace("Resultado cerrado:", "").trim() || "$0";
  const dayTotal = Number(totalOperationResult().toFixed(2));
  const inferredOutcome = dayTotal > 0 ? "Gano / toco meta" : dayTotal < 0 ? "Perdio / toco stop" : "Pendiente";
  const started = startedOperations();
  const ai = buildAiConfirmation();
  const topOpportunities = buildTopOpportunities();
  const openingWatchlist = buildOpeningWatchlist();
  const displayedOpportunities = topOpportunities.length ? topOpportunities : openingWatchlist.slice(0, 3);
  const watchMode = !topOpportunities.length;
  const primaryDisplay = displayedOpportunities.find((item) => item.asset.symbol === symbol) || displayedOpportunities[0] || null;
  const selectedQuote = liveQuotes[String(symbol).toUpperCase()];
  const sourceLabel = selectedQuote?.source === "xtb" ? "Lectura directa XTB" : "Proveedor/ultimo precio";
  const primaryWarning = ai.status === "NO OPERAR"
    ? ai.reasons[0] || "Hay bloqueo operativo: revisa margen, stop, volumen u horario."
    : ai.status === "ESPERAR"
      ? ai.reasons[0] || "Espera confirmacion antes de operar."
      : "CFD operable solo si coincide con XTB, spread y pestana CFD.";
  const opCard = (slot) => {
    const isActive = tradeSlot === String(slot);
    const isStarted = Boolean(started[String(slot)]);
    const strategy = operationStrategy(slot);
    const gate = operationGate(slot);
    const targetAmount = opTargets[slot] || 0;
    const netTargetAmount = opNetTargets[slot] || targetAmount;
    const result = opResults[slot] || "0";
    const badge = `${strategy.targetPct}% capital / Neto ${money(netTargetAmount)}`;
    const stopLabel = strategy.stopPct ? `${strategy.stopPct}% (${isActive && lastResult?.stop_loss ? numberText(lastResult.stop_loss) : "calcular"})` : "Sin stop";
    return `
      <article class="simple-operation ${isActive ? "active" : ""} ${isStarted ? "started" : ""}">
        <div class="simple-head">
          <h2>Operacion ${slot}</h2>
          <span class="simple-badge">${isStarted ? "Iniciada" : badge}</span>
        </div>
        <p class="simple-tiny">${strategy.entryTime} a ${strategy.closeTime}. ${strategy.condition}</p>
        <p class="simple-tiny">Meta neta ${money(netTargetAmount)}${plan.estimatedXtbCost ? ` + costo XTB ${money(plan.estimatedXtbCost)} = bruto ${money(targetAmount)}` : ""}. Stop: ${stopLabel}. ${gate.reason}</p>
        <div class="simple-numbers">
          <div class="simple-number"><span class="simple-label">Direccion</span><strong>${isActive ? direction : "--"}</strong></div>
          <div class="simple-number"><span class="simple-label">Volumen</span><strong>${isActive ? volume : "--"}</strong></div>
          <div class="simple-number"><span class="simple-label">Entrada</span><strong>${isActive ? entry : "--"}</strong></div>
          <div class="simple-number"><span class="simple-label">Meta</span><strong>${isActive ? takeProfit : "--"}</strong></div>
        </div>
        <label class="simple-result-entry">
          <span class="simple-label">Resultado USD</span>
          <input type="number" step="0.01" value="${result}" data-op-result="${slot}" placeholder="0.00" />
        </label>
        <div class="simple-actions">
          <button type="button" data-simple-action="start-op-${slot}">${isStarted ? "Operacion iniciada" : `Iniciar Op ${slot}`}</button>
          <button type="button" class="secondary" data-simple-action="slot-${slot}">Ver receta</button>
          <button type="button" class="secondary" data-simple-action="submit-op-${slot}">Enviar resultado</button>
          ${isStarted ? `<button type="button" class="danger" data-simple-action="cancel-op-${slot}">Cancelar inicio</button>` : ""}
        </div>
      </article>
    `;
  };

  target.innerHTML = `
    <div class="simple-shell">
      <div class="simple-hero">
        <section class="simple-panel">
          <h1>Plan diario XTB</h1>
          <p class="simple-subtitle">Itinerario: Op1 busca 0.75%, Op2 0.5%, Op3 0.25% y Op4 0.25% del capital operativo. Stops y cierres siguen el horario definido.</p>
          <div class="simple-status">
            <span class="simple-chip">Usuario ${currentDashboardUser}</span>
            <span class="simple-chip">XTB sincronizado</span>
            <span class="simple-chip">Produccion permanente</span>
            <span class="simple-chip">${sourceLabel}</span>
            <span class="simple-chip">Costo XTB/op ${money(plan.estimatedXtbCost)}</span>
            <span class="simple-chip warn">Stops por itinerario: confirmar manual</span>
          </div>
        </section>
        <section class="simple-metrics">
          <div class="simple-metric"><span class="simple-label">Activo</span><span class="simple-value">${symbol}</span></div>
          <div class="simple-metric"><span class="simple-label">Precio XTB</span><span class="simple-value">${xtbPrice}</span></div>
          <div class="simple-metric"><span class="simple-label">Operacion activa</span><span class="simple-value">Operacion ${tradeSlot}</span></div>
          <div class="simple-metric"><span class="simple-label">Capital</span><span class="simple-value">${capital}</span></div>
        </section>
      </div>
      <section class="simple-panel simple-decision ${ai.status === "NO OPERAR" ? "danger" : ai.status === "OPERABLE" ? "ok" : "warn"}">
        <div class="simple-head">
          <div>
            <span class="simple-label">${watchMode ? "Radar Yahoo para apertura" : "Mejor alternativa CFD operable"}</span>
            <h2>${symbol} ${direction}</h2>
            <p class="simple-subtitle">${watchMode ? "Preseleccion: usa Yahoo para darte camino antes de apertura. No ejecutes hasta cierre ORB y semaforo OPERABLE." : primaryWarning}</p>
          </div>
          <div class="simple-score">
            <span>${watchMode ? primaryDisplay?.status || "VIGILAR" : ai.status}</span>
            <strong>${watchMode && primaryDisplay ? primaryDisplay.confidence : ai.confidence}%</strong>
          </div>
        </div>
        ${primaryDisplay?.zones ? renderTradeChart(primaryDisplay, "main") : ""}
        <div class="simple-top-list">
          ${displayedOpportunities.length ? displayedOpportunities.map((item, index) => `
            <button type="button" class="simple-top-item ${item.asset.symbol === symbol ? "active" : ""}" data-simple-top-symbol="${item.asset.symbol}">
              <span>#${index + 1} ${item.asset.symbol}</span>
              <strong>${item.directionLabel}</strong>
              <small>Entrada ${numberText(item.zones.entry)} | Stop ${numberText(item.zones.stopLoss)} | Take ${numberText(item.zones.takeProfit)}</small>
              <small>${item.status ? `${item.status} ${item.confidence}% - ` : ""}${item.reason}</small>
            </button>
          `).join("") : `<div class="simple-top-empty">No hay camino claro desde Yahoo. Espera nueva lectura.</div>`}
        </div>
      </section>
      <section class="simple-ops">
        ${[1, 2, 3, 4].map(opCard).join("")}
      </section>
      <section class="simple-panel">
        <div class="simple-head">
          <div>
            <h2>Cierre de operacion</h2>
            <p class="simple-subtitle">Escribe el resultado de la operacion activa. Guardar cierre actualiza capital, guarda el dia y limpia el campo.</p>
          </div>
          <span class="simple-badge">${resultText}</span>
        </div>
        <div class="simple-form-grid">
          <label class="simple-field">
            <span class="simple-label">Resultado Operacion ${tradeSlot} USD</span>
            <input id="simple-active-result" type="number" step="0.01" value="${activeResult}" data-sync-target="${activeResultTarget}" placeholder="-15.70 o 23.90" />
          </label>
          <div class="simple-field">
            <span class="simple-label">Que paso</span>
            <span class="simple-value">${inferredOutcome}</span>
            <span class="simple-tiny">Se deduce automaticamente por el resultado guardado.</span>
          </div>
          <div class="simple-field">
            <span class="simple-label">Accion</span>
            <button type="button" data-simple-action="save-close">Guardar cierre</button>
          </div>
        </div>
        <p class="simple-tiny">Base guardada: Op1 ${money(Number(op1 || 0))}, Op2 ${money(Number(op2 || 0))}, Op3 ${money(Number(op3 || 0))}, Op4 ${money(Number(op4 || 0))}. Las condiciones se validan por horario y resultados previos.</p>
      </section>
      <section class="simple-panel">
        <div class="simple-head"><div><h2>Ajustes y aprendizaje</h2><p class="simple-subtitle">Capital, memoria IA, notas, alertas y exportacion sin volver a la pantalla anterior.</p></div><span class="simple-badge">completo</span></div>
        <div class="simple-form-grid">
          <label class="simple-field"><span class="simple-label">Movimiento de capital</span><input type="number" step="0.01" value="${movement}" placeholder="-100 retiro / 100 deposito" data-sync-target="capital-movement" /></label>
          <label class="simple-field"><span class="simple-label">Costo XTB estimado/op USD</span><input type="number" step="0.01" value="${plan.estimatedXtbCost}" placeholder="0.00" data-sync-target="xtb-cost-per-operation" /><span class="simple-tiny">Usa el costo real que veas en XTB. Se suma a la meta bruta, no cambia el neto buscado.</span></label>
          <div class="simple-field"><span class="simple-label">Capital actual</span><span class="simple-value">${capital}</span></div>
          <div class="simple-field"><span class="simple-label">Acciones capital</span><button type="button" data-simple-action="apply-capital">Aplicar movimiento</button></div>
          <div class="simple-field"><span class="simple-label">Resultado para aprendizaje</span><span class="simple-value">${money(dayTotal)}</span><span class="simple-tiny">Se toma automaticamente de las operaciones enviadas.</span></div>
          <div class="simple-field"><span class="simple-label">Que paso</span><span class="simple-value">${lessonOutcome === "win" ? "Gano" : lessonOutcome === "loss" ? "Perdio" : lessonOutcome === "manual" ? "Cierre manual" : lessonOutcome === "missed" ? "No entre" : inferredOutcome}</span><span class="simple-tiny">Se actualiza solo al guardar cierre.</span></div>
          <div class="simple-field"><span class="simple-label">Aprendizaje</span><button type="button" class="secondary" data-simple-action="save-lesson">Guardar aprendizaje</button></div>
          <label class="simple-field simple-wide"><span class="simple-label">Nota breve</span><textarea data-sync-target="lesson-notes" placeholder="Ej: spread alto, entre tarde, stop muy pegado, buena direccion...">${lessonNotes}</textarea></label>
        </div>
        <div class="simple-actions"><button type="button" class="secondary" data-simple-action="export-excel">Exportar Excel</button><button type="button" class="secondary" data-simple-action="enable-alerts">Activar alertas</button><button type="button" class="secondary" data-simple-action="test-alert">Probar alerta</button></div>
      </section>
      <section class="simple-panel"><div class="simple-guide"><div><strong>1. Inicio</strong>Abre XTB, deja visible el activo y confirma que el precio XTB cambie.</div><div><strong>2. Contrato</strong>Cada operacion usa contrato cercano al capital operativo y busca neto ${money(plan.firstNetTargetAmount)}.</div><div><strong>3. Validacion XTB</strong>No operar si contrato real supera capital * 1.2 o spread real supera meta.</div><div><strong>4. Cierre</strong>Respeta cierres: Op1 10:30, Op2 12:30, Op3 13:30, Op4 14:30.</div></div><p class="simple-tiny">Esta vista escribe sobre los mismos controles reales y conserva sincronizacion, aprendizaje, capital, cierre del dia y exportacion.</p></section>
    </div>
  `;
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
      setControlValue(syncTarget, event.target.value);
      if (syncTarget.startsWith("operation") && syncTarget.endsWith("-result")) syncOutcomeFromResults();
    }
  });
  target.addEventListener("change", (event) => {
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
    if (action === "save-close") saveDayClose();
    if (action === "apply-capital") applyCapitalMovement();
    if (action === "save-lesson") saveTradeLesson();
    if (action === "export-excel") exportMonthlyReport();
    if (action === "enable-alerts") enableNotifications();
    if (action === "test-alert") testNotifications();
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

async function saveTradeLesson() {
  if (!lastResult || !lastResult.symbol) {
    updateLessonStatus("Aprendizaje: calcula una receta antes de guardar.", "error");
    return;
  }
  const payload = {
    trade_date: todayKey(),
    symbol: lastResult.symbol,
    direction: lastResult.direction,
    planned_volume: Number(lastResult.volume || 0),
    entry_price: Number(lastResult.entry_price || 0),
    stop_price: Number(lastResult.stop_price || 0),
    take_profit_price: Number(lastResult.take_profit_price || 0),
    expected_loss: Number(lastResult.expected_loss || 0),
    expected_profit: Number(lastResult.expected_profit || 0),
    actual_result: Number(document.getElementById("lesson-result")?.value || 0),
    outcome: document.getElementById("lesson-outcome")?.value || "pending",
    confidence: Number((buildAiConfirmation().confidence || 0)),
    market_phase: currentMarketPhaseLabel(),
    notes: document.getElementById("lesson-notes")?.value || "",
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
    await loadLessonSummary();
  } catch (error) {
    updateLessonStatus("Aprendizaje: no se pudo guardar. Revisa base de datos.", "error");
  }
}

async function loadLessonSummary() {
  const target = document.getElementById("lesson-summary");
  if (!target) return;
  try {
    const response = await fetch("/lessons/trades?limit=20");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const summary = payload.summary || {};
    const best = (summary.best_symbols || []).slice(0, 3).map((item) => `${item.symbol}: ${money(item.result)} (${item.wins}/${item.count})`).join(" | ");
    target.innerHTML = `
      <div class="grid gap-1">
        <div><strong>Registros:</strong> ${summary.closed || 0} cerrados</div>
        <div><strong>Acierto:</strong> ${numberText(summary.win_rate || 0)}%</div>
        <div><strong>Resultado aprendido:</strong> ${money(summary.total_result || 0)}</div>
        <div><strong>Mejores:</strong> ${best || "sin historial suficiente"}</div>
      </div>
    `;
  } catch (error) {
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
        <td>${Number(item.operation1_result || 0).toFixed(2)}</td>
        <td>${Number(item.operation2_result || 0).toFixed(2)}</td>
        <td>${Number(item.daily_realized_result || 0).toFixed(2)}</td>
        <td>${htmlEscape(item.daily_result_status)}</td>
        <td>${Number(item.target_profit || 0).toFixed(2)}</td>
        <td>${Number(item.max_loss || 0).toFixed(2)}</td>
        <td>${Number(item.risk_pct || 0).toFixed(2)}%</td>
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
              <th>Operacion 1</th>
              <th>Operacion 2</th>
              <th>Resultado dia</th>
              <th>Estado</th>
              <th>Meta dia</th>
              <th>Perdida maxima</th>
              <th>Riesgo %</th>
              <th>Notas</th>
            </tr>
            ${detailRows || '<tr><td colspan="10">Sin registros para este mes.</td></tr>'}
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

  const currentBalance = Number(balanceInput?.value || defaultAccountBalance);
  const nextBalance = Math.max(0, Number((currentBalance + total).toFixed(2)));

  if (lessonResultInput) lessonResultInput.value = total.toFixed(2);
  if (lessonOutcomeInput) {
    lessonOutcomeInput.value = total > 0 ? "win" : "loss";
  }

  if (balanceInput) balanceInput.value = nextBalance.toFixed(2);
  await postbackConfig();
  if (lastResult?.symbol) {
    await saveTradeLesson();
  }
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
  const movement = Number(movementInput.value || 0);
  if (!movement) {
    updatePostbackStatus("Movimiento de capital vacio. Usa negativo para retiro o positivo para deposito.", "error");
    return;
  }
  const balanceInput = document.getElementById("account-balance");
  const current = Number(balanceInput.value || defaultAccountBalance);
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
  const marginRequired = positionValue * cfdMarginPct() / 100;
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
  if (ai.status !== "OPERABLE") return;
  const stopText = lastResult.stop_loss ? `stop ${numberText(lastResult.stop_loss)}` : "SIN STOP";
  const body = `${lastResult.asset.symbol} ${lastResult.order_type}: entrada ${numberText(lastResult.entry_price)}, ${stopText}, meta ${numberText(lastResult.take_profit)}, volumen ${formatVolumeForXtb(lastResult.volume, lastResult.asset)}. Op ${buildDailyTradePlan().currentSlot}. ${timing.quality}.`;
  const key = `ai-operable:${lastResult.asset.symbol}:${lastResult.order_type}:${lastResult.entry_price}:${lastResult.stop_loss}:${lastResult.take_profit}:${lastResult.volume}:${lastResult.risk_pct}`;
  if (sessionStorage.getItem("lastDecisionNotification") === key) return;
  sessionStorage.setItem("lastDecisionNotification", key);
  sendBrowserNotification("MyActions IA: momento operable", body);
}

function renderTicket() {
  if (!lastResult) return;
  const positionValue = lastResult.position_value ?? Number((lastResult.entry_price * lastResult.multiplier * lastResult.volume).toFixed(2));
  const estimatedMarginPct = cfdMarginPct();
  const estimatedMargin = positionValue * estimatedMarginPct / 100;
  const volumeLabel = lastResult.asset.category === "stocks" ? "Volumen XTB (entero)" : "Volumen XTB (paso 0.01)";
  const marketPrice = Number(document.getElementById("market-price").value || 0);
  const expiryMode = document.getElementById("expiry-mode").value;
  const expiryLabel = expiryMode === "DAY" ? "Hoy / fin del dia" : "Sin vencimiento manual";
  const rows = [
    ["Activo", lastResult.asset.symbol, true],
    ["Operacion", `Operacion ${buildDailyTradePlan().currentSlot}`, false],
    ["Tipo de Orden", `${lastResult.order_type} - ${lastResult.simple_order_explanation}`, true],
    ["Precio de Entrada", numberText(lastResult.entry_price), true],
    ["Stop Loss", lastResult.stop_loss ? numberText(lastResult.stop_loss) : "SIN STOP - cierre manual", Boolean(lastResult.stop_loss)],
    ["Take Profit (Meta)", numberText(lastResult.take_profit), true],
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
  const estimatedMarginPct = cfdMarginPct();
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
  ["account-balance", "entry-price", "trade-slot"].forEach((id) => {
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
  document.getElementById("enable-notifications").addEventListener("click", enableNotifications);
  document.getElementById("test-notifications").addEventListener("click", testNotifications);
  document.getElementById("export-monthly-report").addEventListener("click", exportMonthlyReport);
  document.getElementById("save-day-close").addEventListener("click", saveDayClose);
  document.getElementById("clear-day-results").addEventListener("click", clearDayResults);
  document.getElementById("apply-capital-movement").addEventListener("click", applyCapitalMovement);
  document.getElementById("save-trade-lesson").addEventListener("click", saveTradeLesson);
  window.addEventListener("xtb-quotes", (event) => applyXtbQuoteBatch(event.detail?.items || []));
  window.addEventListener("xtb-ticket", (event) => applyXtbTicketValidation(event.detail || {}));
}

async function initDashboard() {
  await loadCurrentDashboardUser();
  selectedAsset = getFavoriteAssets()[0] || assetGroups.stocks[0];
  loadConfigLocal();
  renderTabs();
  renderAssets();
  bindInputs();
  bindSimpleDashboard();
  verifyDatabaseAndLoadLatest();
  loadLessonSummary();
  updateGoldenWindow();
  setInterval(updateGoldenWindow, 1000);
  selectedAsset = selectedAssetFromForm();
  resetOrderForCurrentMode(selectedAsset);
  refreshNotificationStatus();
  await loadMarketBars([selectedAsset.symbol]);
  calculate();
  renderSimpleDashboard();
  refreshLivePrices({ resetSelected: true });
  scheduleAutoRefresh();
}

initDashboard();
