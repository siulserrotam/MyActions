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
const maxPlannedTrades = 2;
const aggressiveDailyRiskUsd = 20;
const tradeRiskWeights = { 1: 0.6, 2: 0.4 };
const defaultsVersion = "capital-2016-split-risk-v1";

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

function buildDailyTradePlan() {
  const accountBalance = Number(document.getElementById("account-balance")?.value || defaultAccountBalance);
  const fixedRiskPct = accountBalance > 0 ? aggressiveDailyRiskUsd / accountBalance * 100 : defaultRiskPct;
  const baseRiskPct = Number(Math.min(maxAiRiskPct, Math.max(minAiRiskPct, fixedRiskPct)).toFixed(4));
  const viableCount = uniqueAssets()
    .map((asset) => buildAssetOpportunity(asset, baseRiskPct))
    .filter((item) => item.usable).length;
  const plannedTrades = Math.min(maxPlannedTrades, Math.max(1, viableCount));
  const dailyRiskAmount = accountBalance * baseRiskPct / 100;
  const currentSlot = String(document.getElementById("trade-slot")?.value || "1");
  const useSplitPlan = plannedTrades > 1;
  const currentWeight = useSplitPlan ? tradeRiskWeights[currentSlot] || tradeRiskWeights[1] : 1;
  const firstRiskAmount = useSplitPlan ? dailyRiskAmount * tradeRiskWeights[1] : dailyRiskAmount;
  const secondRiskAmount = useSplitPlan ? dailyRiskAmount * tradeRiskWeights[2] : 0;
  const currentTradeRiskAmount = dailyRiskAmount * currentWeight;
  return {
    baseRiskPct,
    dailyRiskAmount,
    plannedTrades,
    currentSlot,
    firstRiskAmount,
    secondRiskAmount,
    currentTradeRiskAmount,
    currentTradeRiskPct: Number((baseRiskPct * currentWeight).toFixed(4)),
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
  const direction = aiDirectionForAsset(asset);
  const driftDirection = directionFromMove(Number(asset.liveChangePct ?? 0));
  const action = driftDirection === "WAIT" ? "ESPERAR CONFIRMACION" : labelFromDirection(direction);
  const volumeText = lastResult ? formatVolumeForXtb(lastResult.volume, lastResult.asset) : "Calculando";
  const lossText = lastResult ? money(lastResult.expected_loss) : "Calculando";
  const profitText = lastResult ? money(lastResult.expected_profit) : "Calculando";
  const management = tradeManagementProfile(lastResult);
  target.innerHTML = `
    <p class="text-xs font-black uppercase text-sky-300">Decision automatica IA</p>
    <div class="mt-2 grid gap-2">
      <div class="summary-row"><span>Direccion sugerida</span><strong>${action}</strong></div>
      <div class="summary-row"><span>Riesgo/meta diario</span><strong>${money(plan.dailyRiskAmount)} / ${money(plan.dailyRiskAmount * 2)}</strong></div>
      <div class="summary-row"><span>Plan del dia</span><strong>${plan.plannedTrades} operacion${plan.plannedTrades > 1 ? "es" : ""}</strong></div>
      <div class="summary-row"><span>Operacion 1</span><strong>${money(plan.firstRiskAmount)} / ${money(plan.firstRiskAmount * 2)}</strong></div>
      <div class="summary-row"><span>Operacion 2</span><strong>${plan.secondRiskAmount ? `${money(plan.secondRiskAmount)} / ${money(plan.secondRiskAmount * 2)}` : "Solo si aplica"}</strong></div>
      <div class="summary-row"><span>Receta actual</span><strong>Op ${plan.currentSlot}: ${money(plan.currentTradeRiskAmount)} / ${money(plan.currentTradeRiskAmount * 2)}</strong></div>
      <div class="summary-row"><span>Volumen IA</span><strong>${volumeText}</strong></div>
      <div class="summary-row"><span>Perdida / objetivo</span><strong>${lossText} / ${profitText}</strong></div>
      <div class="summary-row"><span>Horario</span><strong>${marketTimingProfile().quality}</strong></div>
      <div class="summary-row"><span>Gestion ahora</span><strong>${management.action}</strong></div>
      <div class="summary-row"><span>Fecha limite</span><strong>${management.deadline}</strong></div>
    </div>
    <p class="mt-2 text-xs text-zinc-300">${management.message}</p>
    <p class="mt-2 text-xs text-zinc-400">Regla 60/40: primera operacion con escudo mas amplio; segunda mas estricta. Si la primera pierde, no se abre segunda.</p>
  `;
}

function tradeSchedulePlan() {
  const { weekday, total } = nyMarketMinutes();
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const firstStart = 9 * 60 + 35;
  const firstIdeal = 9 * 60 + 45;
  const firstEnd = 10 * 60 + 30;
  const secondStart = 10 * 60 + 30;
  const secondEnd = 11 * 60 + 30;
  const noNewAfter = 11 * 60 + 30;
  const manageOnlyAfter = 14 * 60;
  const hardClose = 15 * 60 + 45;

  if (!isWeekday || total < 9 * 60 + 30 || total >= 16 * 60) {
    return {
      title: "Mercado cerrado",
      now: "Prepara lista, no abras operaciones.",
      first: "Operacion 1: 9:35-10:30 NY. Mejor desde 9:45 si hay direccion clara.",
      second: "Operacion 2: solo 10:30-11:30 NY si la primera cerro en ganancia o esta protegida sin riesgo.",
      stop: "No abrir nuevas despues de 11:30 NY.",
      close: "Cierre maximo intradia: 15:45 NY si no toco stop ni meta.",
      tone: "muted",
    };
  }
  if (total < firstStart) {
    return {
      title: "Esperar primera vela",
      now: `No abrir. Faltan ${formatMinutesUntil(firstStart, total)} para evaluar ORB.`,
      first: "Operacion 1: programa solo despues de 9:35 NY.",
      second: "Operacion 2: todavia no aplica.",
      stop: "Nada antes de cierre de vela 9:30-9:35 NY.",
      close: "Si entras hoy, cierre maximo 15:45 NY.",
      tone: "danger",
    };
  }
  if (total < firstEnd) {
    return {
      title: "Ventana de Operacion 1",
      now: total < firstIdeal ? "Puedes preparar, pero 9:35-9:45 aun tiene ruido. Opera solo con semaforo OPERABLE." : "Mejor ventana para la primera entrada si el semaforo esta OPERABLE.",
      first: `Operacion 1: ahora hasta 10:30 NY. Quedan ${formatMinutesUntil(firstEnd, total)}.`,
      second: "Operacion 2: no abrir mientras la primera siga viva con riesgo.",
      stop: "Si no activa antes de 10:30 NY, cancela esa idea.",
      close: "Cierre maximo si queda abierta: 15:45 NY.",
      tone: total < firstIdeal ? "warning" : "ok",
    };
  }
  if (total < secondEnd) {
    return {
      title: "Ventana de Operacion 2",
      now: "Solo segunda oportunidad. No repitas por ansiedad: exige nueva senal clara.",
      first: "Operacion 1: ya paso la ventana ideal.",
      second: `Operacion 2: ahora hasta 11:30 NY. Quedan ${formatMinutesUntil(secondEnd, total)}. Solo si la primera cerro en ganancia o esta protegida sin riesgo.`,
      stop: "Si la primera fue perdida o sigue abierta con riesgo, no abrir segunda.",
      close: "Cierre maximo si queda abierta: 15:45 NY.",
      tone: "warning",
    };
  }
  if (total < manageOnlyAfter) {
    return {
      title: "No abrir nuevas",
      now: "Gestiona lo abierto. No busques entradas nuevas en mediodia lento.",
      first: "Operacion 1: cerrada o protegida.",
      second: "Operacion 2: ventana cerrada.",
      stop: "Desde 11:30 NY no abrir nuevas salvo caso excepcional muy fuerte.",
      close: "Si no toco stop/meta, empieza a reducir antes de 14:00 NY.",
      tone: "warning",
    };
  }
  if (total < hardClose) {
    return {
      title: "Gestion de cierre",
      now: "No abrir. Solo proteger, cerrar parcial o cerrar total.",
      first: "Entradas nuevas bloqueadas.",
      second: "Entradas nuevas bloqueadas.",
      stop: "Evita quedarte esperando una recuperacion tarde.",
      close: `Cierre maximo: 15:45 NY. Quedan ${formatMinutesUntil(hardClose, total)}.`,
      tone: "danger",
    };
  }
  return {
    title: "Cerrar intradia",
    now: "Cierra lo abierto. No dejes la operacion viva por esperanza.",
    first: "Operacion 1: finalizada.",
    second: "Operacion 2: finalizada.",
    stop: "No abrir nuevas.",
    close: "Regla: fuera antes de cierre del mercado.",
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

function formatMinutesUntil(targetTotal, currentTotal) {
  const minutes = Math.max(0, targetTotal - currentTotal);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours <= 0) return `${rest} min`;
  return `${hours}h ${rest}min`;
}

function tradeManagementProfile(result = lastResult) {
  const { weekday, total } = nyMarketMinutes();
  const isWeekday = !["Sat", "Sun"].includes(weekday);
  const openProfit = Number(document.getElementById("open-profit")?.value || 0);
  const target = result?.risk_amount ? result.risk_amount * 2 : 0;
  const risk = result?.risk_amount || 0;
  const profitProgress = target > 0 ? openProfit / target : 0;
  const lossProgress = risk > 0 ? Math.abs(Math.min(openProfit, 0)) / risk : 0;

  if (!isWeekday || total < 9 * 60 + 30 || total >= 16 * 60) {
    return {
      phase: "CERRADO",
      action: "Preparar lista",
      tone: "muted",
      deadline: "Proxima apertura",
      message: "Mercado cerrado: no abrir operaciones nuevas.",
      shouldNotify: false,
    };
  }
  if (total < 9 * 60 + 35) {
    return {
      phase: "ESPERAR ORB",
      action: "No operar",
      tone: "danger",
      deadline: "9:35 NY",
      message: `Faltan ${formatMinutesUntil(9 * 60 + 35, total)} para cerrar la primera vela. No abras antes.`,
      shouldNotify: false,
    };
  }
  if (total < 10 * 60 + 30) {
    return {
      phase: "ENTRADA PRINCIPAL",
      action: "Abrir solo si IA dice OPERABLE",
      tone: "ok",
      deadline: "10:30 NY",
      message: `Ventana principal. Si no activa antes de 10:30 NY, cancela la idea.`,
      shouldNotify: false,
    };
  }
  if (total < 11 * 60 + 30) {
    const protect = profitProgress >= 0.5;
    const defend = lossProgress >= 0.5;
    return {
      phase: "GESTION TEMPRANA",
      action: protect ? "Proteger ganancia" : defend ? "Reducir o salir" : "No abrir tarde",
      tone: protect ? "ok" : defend ? "danger" : "warning",
      deadline: "11:30 NY",
      message: protect
        ? "Ya hay avance relevante: acerca stop o toma parcial, no dejes que vuelva a perdida."
        : defend
          ? "La operacion ya consumio media perdida diaria: considera salir y cerrar el dia."
          : "Si no entro en ritmo, no persigas. Espera nueva senal fuerte o cancela.",
      shouldNotify: protect || defend,
    };
  }
  if (total < 14 * 60) {
    return {
      phase: "MEDIODIA LENTO",
      action: openProfit > 0 ? "Proteger o tomar parcial" : "Evitar nuevas entradas",
      tone: openProfit > 0 ? "ok" : "warning",
      deadline: "14:00 NY",
      message: "Horario de menor calidad. Gestiona lo abierto; evita abrir una operacion nueva por ansiedad.",
      shouldNotify: openProfit !== 0,
    };
  }
  if (total < 15 * 60 + 15) {
    return {
      phase: "CIERRE VOLATIL",
      action: openProfit > 0 ? "Asegurar beneficio" : "Cerrar si no mejora",
      tone: openProfit > 0 ? "ok" : "danger",
      deadline: "15:15 NY",
      message: "La tarde puede revertir fuerte. Si no estas cerca de meta, reduce exposicion.",
      shouldNotify: true,
    };
  }
  return {
    phase: "CIERRE DEL DIA",
    action: "Cerrar intradia",
    tone: "danger",
    deadline: "15:45 NY",
    message: "No dejes una operacion intradia abierta por esperanza. Cierra o protege estrictamente.",
    shouldNotify: true,
  };
}

function roundVolumeForXtb(volume, asset) {
  const step = volumeStepForXtb(asset);
  if (!Number.isFinite(volume) || volume <= 0) return 0;
  return Number((Math.floor(volume / step) * step).toFixed(volumeDecimalsForXtb(asset)));
}

function volumeStepForXtb(asset) {
  if (asset.category === "stocks") return 1;
  return 0.01;
}

function volumeDecimalsForXtb(asset) {
  return volumeStepForXtb(asset) >= 1 ? 0 : 2;
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

function providerPriceFor(symbol) {
  return Number(liveQuotes[symbol]?.price || findAsset(symbol).marketPrice || 0);
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
    const response = await fetch(`/market/live?symbols=${encodeURIComponent(symbols)}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    (payload.items || []).forEach(applyLiveQuote);
    if (liveQuotes[selectedAsset.symbol] && resetSelected) {
      selectedAsset = findAsset(selectedAsset.symbol);
      resetOrderFieldsForAssetDirection(selectedAsset, aiDirectionForAsset(selectedAsset));
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
  const market = activeMarketPriceFor(asset) || Number(asset.marketPrice || 100);
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

function applyXtbPriceOverride() {
  const asset = selectedAssetFromForm();
  const xtbPrice = xtbPriceValue();
  if (!xtbPrice) {
    renderPriceGapStatus();
    calculate();
    return;
  }
  document.getElementById("market-price").value = formatPriceForAsset(xtbPrice, asset);
  selectedAsset = { ...findAsset(asset.symbol), marketPrice: xtbPrice };
  resetOrderFieldsForAssetDirection(selectedAsset, aiDirectionForAsset(selectedAsset));
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
  applyAiAggressiveTargets(asset);
}

function applyAiAggressiveTargets(asset) {
  const plan = buildDailyTradePlan();
  const opportunity = buildAssetOpportunity(asset, plan.currentTradeRiskPct);
  const entry = Number(document.getElementById("entry-price").value || opportunity.entry || 0);
  const volume = opportunity.volume;
  const direction = aiDirectionForAsset(asset);
  if (!entry || !volume) return;
  const stopDistance = plan.currentTradeRiskAmount / (volume * asset.multiplier);
  const targetDistance = stopDistance * 2;
  const stop = direction === "LONG" ? entry - stopDistance : entry + stopDistance;
  const takeProfit = direction === "LONG" ? entry + targetDistance : entry - targetDistance;
  document.getElementById("requested-volume").value = formatVolumeForXtb(volume, asset);
  document.getElementById("stop-price").value = formatPriceForAsset(stop, asset);
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
  const minimumStopPct = volatilityStopPct(asset);
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
  const riskAmount = accountBalance * riskPct / 100;
  const nominalBudget = marginBudget / (cfdMarginPct() / 100);
  const marginVolume = nominalBudget / (entry * asset.multiplier);
  const minimumStopDistance = entry * volatilityStopPct(asset) / 100;
  const stopSafeVolume = riskAmount / (minimumStopDistance * asset.multiplier);
  const volume = roundVolumeForXtb(Math.min(marginVolume, stopSafeVolume), asset);
  const distance = volume > 0 ? riskAmount / (volume * asset.multiplier) : 0;
  const positionValue = entry * asset.multiplier * volume;
  const marginRequired = positionValue * cfdMarginPct() / 100;
  const targetAmount = riskAmount * 2;
  const targetMovePct = positionValue > 0 ? targetAmount / positionValue * 100 : 0;
  const stopPct = entry > 0 ? distance / entry * 100 : 0;
  const hasVolume = asset.category === "stocks" ? volume >= 1 : volume > 0;
  const hasMargin = !availableCapital || marginRequired <= availableCapital;
  const hasSafeStop = stopPct >= volatilityStopPct(asset);
  const usable = hasVolume && hasMargin && hasSafeStop;
  const movementScore = Math.abs(changePct) * 20;
  const directionPenalty = driftDirection === "WAIT" ? -30 : 0;
  const marginPenalty = hasMargin ? 0 : -80;
  const volumePenalty = hasVolume ? 0 : -80;
  const marginUsePct = marginBudget > 0 ? Math.min(100, marginRequired / marginBudget * 100) : 0;
  const marginUseScore = usable ? marginUsePct / 5 : 0;
  const limitReason = marginVolume < stopSafeVolume ? "limitado por margen" : "limitado por stop/riesgo";
  const score = (usable ? 50 : -50) + movementScore + marginUseScore + directionPenalty + marginPenalty + volumePenalty;
  return {
    asset,
    volume,
    score,
    direction,
    directionLabel: labelFromDirection(direction),
    usable,
    entry,
    stopDistance: distance,
    marginRequired,
    targetMovePct,
    targetAmount,
    stopPct,
    minimumStopPct: volatilityStopPct(asset),
    reason: usable
      ? `${numberText(changePct)}% intradia. ${driftDirection === "WAIT" ? "Esperar confirmacion." : `Preparar ${labelFromDirection(direction)}.`} Vol ${formatVolumeForXtb(volume, asset)}, meta ${money(targetAmount)} con ${numberText(targetMovePct)}%. ${limitReason}.`
      : "Oculto: no cabe por margen, volumen o stop seguro.",
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
  target.innerHTML = `
    <div class="rounded-xl border border-white/10 bg-ink p-3">
      <p class="text-xs font-black uppercase text-zinc-500">Top 3 sugerencias IA</p>
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
        `).join("") : `<div class="rounded-xl border border-white/10 bg-panel2 p-3 text-xs text-zinc-400">No hay activos claros. Espera el proximo refresh.</div>`}
      </div>
    </div>
  `;
  document.querySelectorAll("[data-top-symbol]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedAsset = findAsset(button.dataset.topSymbol);
      document.getElementById("symbol").value = selectedAsset.symbol;
      document.getElementById("xtb-price").value = "";
      const picked = buildTopOpportunities().find((item) => item.asset.symbol === selectedAsset.symbol);
      resetOrderFieldsForAssetDirection(selectedAsset, picked?.direction || aiDirectionForAsset(selectedAsset));
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
  document.getElementById("direction").value = aiDirectionForAsset(selectedAsset);
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
  renderTradeSchedule();
  renderTopOpportunities();
  notifyIfNeeded();
}

function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Bogota" }).format(new Date());
}

function currentConfigPayload() {
  const accountBalance = Number(document.getElementById("account-balance").value || defaultAccountBalance);
  const riskPct = getEffectiveRiskPct();
  const availableCapital = accountBalance;
  const openProfit = Number(document.getElementById("open-profit").value || 0);
  const marginLevelPct = Number(document.getElementById("margin-level-pct").value || 0);
  const operation1Result = Number(document.getElementById("operation1-result")?.value || 0);
  const operation2Result = Number(document.getElementById("operation2-result")?.value || 0);
  const realized = operation1Result + operation2Result;
  const dailyStatus = realized >= aggressiveDailyRiskUsd * 2
    ? "target_hit"
    : realized <= -aggressiveDailyRiskUsd
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
    daily_result_status: dailyStatus,
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
    operation1_result: config.operation1_result,
    operation2_result: config.operation2_result,
    daily_result_status: config.daily_result_status,
    risk_pct: config.risk_pct,
    notes: "Intradia XTB: capital, receta IA, resultados reales op1/op2 y estado diario.",
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
    document.getElementById("risk-pct").value = "dynamic";
    if (config.available_capital !== undefined) document.getElementById("available-capital").value = config.available_capital;
    if (config.margin_level_pct !== undefined) document.getElementById("margin-level-pct").value = config.margin_level_pct;
    if (config.open_profit !== undefined) document.getElementById("open-profit").value = config.open_profit;
    if (config.operation1_result !== undefined) document.getElementById("operation1-result").value = config.operation1_result;
    if (config.operation2_result !== undefined) document.getElementById("operation2-result").value = config.operation2_result;
    if (config.symbol) document.getElementById("symbol").value = config.symbol;
    if (config.xtb_price) document.getElementById("xtb-price").value = config.xtb_price;
    document.getElementById("direction").value = aiDirectionForAsset(selectedAsset);
    if (config.market_price) document.getElementById("market-price").value = config.market_price;
    if (config.entry_price) document.getElementById("entry-price").value = config.entry_price;
    if (config.stop_price) document.getElementById("stop-price").value = config.stop_price;
    if (config.take_profit_price) document.getElementById("take-profit-price").value = config.take_profit_price;
    document.getElementById("requested-volume").value = "";
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

function renderDailyResultCard() {
  const target = document.getElementById("daily-result-card");
  if (!target) return;
  const op1 = Number(document.getElementById("operation1-result")?.value || 0);
  const op2 = Number(document.getElementById("operation2-result")?.value || 0);
  const total = op1 + op2;
  const status = total >= aggressiveDailyRiskUsd * 2
    ? "Meta diaria cumplida: cerrar el dia."
    : total <= -aggressiveDailyRiskUsd
      ? "Perdida diaria tocada: cerrar el dia."
      : total === 0
        ? "Sin resultado cerrado aun."
        : "Resultado parcial: no forzar otra entrada.";
  target.className = `mt-2 rounded-xl border p-3 text-xs font-bold ${total >= 0 ? "border-bull/30 text-bull" : "border-bear/40 text-bear"}`;
  target.textContent = `Resultado cerrado: ${money(total)}. ${status}`;
}

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

async function exportMonthlyReport() {
  const button = document.getElementById("export-monthly-report");
  if (button) button.textContent = "Generando CSV...";
  try {
    const response = await fetch("/capital/daily?limit=120");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const currentMonth = todayKey().slice(0, 7);
    const rows = (payload.history || []).filter((item) => String(item.trade_date || "").startsWith(currentMonth));
    const headers = [
      "fecha",
      "capital",
      "resultado_op1",
      "resultado_op2",
      "resultado_dia",
      "estado",
      "meta_dia",
      "perdida_maxima",
      "riesgo_pct",
      "notas",
    ];
    const csvRows = [
      headers.join(","),
      ...rows.map((item) => [
        item.trade_date,
        item.balance,
        item.operation1_result,
        item.operation2_result,
        item.daily_realized_result,
        item.daily_result_status,
        item.target_profit,
        item.max_loss,
        item.risk_pct,
        item.notes,
      ].map(csvEscape).join(",")),
    ];
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `myactions-reporte-${currentMonth}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    updatePostbackStatus(`Reporte mensual exportado: ${rows.length} registros.`, "ok");
  } catch (error) {
    updatePostbackStatus("No se pudo exportar: revisa conexion con base de datos.", "error");
  } finally {
    if (button) button.textContent = "Exportar reporte mensual CSV";
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
  const management = tradeManagementProfile(lastResult);
  if (management.tone === "danger") {
    warnings.push({ level: "danger", message: `GESTION IA: ${management.action}. ${management.message}` });
  } else if (management.tone === "warning") {
    warnings.push({ level: "info", message: `GESTION IA: ${management.action}. ${management.message}` });
  }
  if (availableCapital > 0 && marginRequired > availableCapital) {
    warnings.push({ level: "danger", message: `NO OPERAR: margen estimado ${money(marginRequired)} supera tu capital disponible ${money(availableCapital)}. El apalancamiento no evita este bloqueo.` });
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
  const body = `${lastResult.asset.symbol} ${lastResult.order_type}: entrada ${numberText(lastResult.entry_price)}, stop ${numberText(lastResult.stop_loss)}, meta ${numberText(lastResult.take_profit)}, volumen ${formatVolumeForXtb(lastResult.volume, lastResult.asset)}. Riesgo ${lastResult.risk_pct}%. ${timing.quality}.`;
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
    ["Stop Loss (Escudo)", numberText(lastResult.stop_loss), true],
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
  document.getElementById("math-summary").innerHTML = `
    <div class="summary-row"><span>Capital operativo</span><strong>${money(lastResult.account_balance)}</strong></div>
    <div class="summary-row"><span>Riesgo/meta del dia</span><strong>${money(plan.dailyRiskAmount)} / ${money(plan.dailyRiskAmount * 2)}</strong></div>
    <div class="summary-row"><span>Perfil de esta receta</span><strong>Op ${plan.currentSlot}: ${money(plan.currentTradeRiskAmount)} / ${money(plan.currentTradeRiskAmount * 2)}</strong></div>
    <div class="summary-row"><span>Riesgo/meta esta receta</span><strong>${money(lastResult.expected_loss)} / ${money(lastResult.expected_profit)}</strong></div>
    <div class="summary-row"><span>Margen aprox. que bloquea XTB</span><strong>${money(estimatedMargin)} (${estimatedMarginPct}%)</strong></div>
    <div class="summary-row"><span>Exposicion nominal</span><strong>${money(positionValue)}</strong></div>
    <div class="summary-row"><span>Resultado si toca stop</span><strong class="text-bear">${money(lastResult.expected_loss)}</strong></div>
    <div class="summary-row"><span>Resultado si toca meta</span><strong class="text-bull">${money(lastResult.expected_profit)}</strong></div>
    <div class="summary-row"><span>Estado del riesgo</span><strong class="${lastResult.risk_ok ? "text-bull" : "text-bear"}">${lastResult.risk_ok ? `Cumple ${lastResult.risk_pct}%` : `Se pasa por ${money(lastResult.risk_excess || 0)}`}</strong></div>
  `;
}

function bindInputs() {
  ["stop-price", "take-profit-price", "expiry-mode", "operation1-result", "operation2-result"].forEach((id) => {
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
  ["account-balance", "available-capital", "open-profit", "margin-level-pct", "operation1-result", "operation2-result"].forEach((id) => {
    document.getElementById(id).addEventListener("input", schedulePostback);
    document.getElementById(id).addEventListener("change", schedulePostback);
  });
  document.getElementById("calculate-btn").addEventListener("click", calculate);
  document.getElementById("toggle-favorite-btn").addEventListener("click", toggleFavorite);
  document.getElementById("enable-notifications").addEventListener("click", enableNotifications);
  document.getElementById("test-notifications").addEventListener("click", testNotifications);
  document.getElementById("export-monthly-report").addEventListener("click", exportMonthlyReport);
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
refreshNotificationStatus();
calculate();
refreshLivePrices({ resetSelected: true });
scheduleAutoRefresh();
