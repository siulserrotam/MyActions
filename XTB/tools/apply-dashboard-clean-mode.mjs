import { connectChrome, pickBrowserContext, classifyPage } from './chrome-debug.mjs';

const WATCH = process.argv.includes('--watch');
const INTERVAL_MS = Number.parseInt(process.env.DASHBOARD_CLEAN_INTERVAL_MS || '10000', 10);

async function applyCleanMode() {
  const browser = await connectChrome();
  try {
    const context = pickBrowserContext(browser);
    const page = context.pages().find((candidate) => classifyPage(candidate) === 'dashboard');

    if (!page) {
      throw new Error('No se encontro la pagina del dashboard.');
    }

    await page.evaluate(() => {
      if (window.__codexCleanModeTimer) {
        window.clearInterval(window.__codexCleanModeTimer);
        window.__codexCleanModeTimer = null;
      }

      const valueOf = (selector) => document.querySelector(selector)?.value || '';
      const textOf = (selector) => document.querySelector(selector)?.innerText || '';
      const setValue = (selector, value) => {
        const element = document.querySelector(selector);
        if (!element) return;
        element.value = value;
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
      };
      const focusOriginal = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return;
        document.body.classList.remove('codex-focus-mode');
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.focus();
      };

      window.__codexSetTradeSlot = (slot) => setValue('#trade-slot', slot);
      window.__codexFocusOriginal = focusOriginal;

      const upsertStyle = () => {
        let style = document.querySelector('#codex-clean-mode-style');
        if (!style) {
          style = document.createElement('style');
          style.id = 'codex-clean-mode-style';
          document.head.appendChild(style);
        }

        style.textContent = `
          html, body {
            min-height: 100% !important;
            background: #08100f !important;
          }
          body.codex-focus-mode > *:not(#codex-clean-mode):not(#codex-clean-mode-style) {
            display: none !important;
          }
          body.codex-focus-mode {
            margin: 0 !important;
            overflow-y: auto !important;
          }
          #codex-clean-mode {
            min-height: 100vh;
            box-sizing: border-box;
            padding: 22px;
            background:
              radial-gradient(circle at 14% 8%, rgba(36, 184, 124, 0.18), transparent 28%),
              radial-gradient(circle at 84% 4%, rgba(89, 147, 255, 0.14), transparent 28%),
              linear-gradient(145deg, #07100e, #101615 48%, #0a1110);
            color: #eefcf6;
            font-family: "Segoe UI", Candara, Calibri, sans-serif;
          }
          #codex-clean-mode .shell {
            max-width: 1180px;
            margin: 0 auto;
            display: grid;
            gap: 16px;
          }
          #codex-clean-mode .hero {
            display: grid;
            grid-template-columns: 1.4fr 0.9fr;
            gap: 14px;
            align-items: stretch;
          }
          #codex-clean-mode .panel,
          #codex-clean-mode .metric,
          #codex-clean-mode .operation,
          #codex-clean-mode .close-card {
            border: 1px solid rgba(190, 255, 229, 0.12);
            background: rgba(13, 24, 22, 0.86);
            border-radius: 22px;
            box-shadow: 0 18px 70px rgba(0, 0, 0, 0.28);
          }
          #codex-clean-mode .panel {
            padding: 20px;
          }
          #codex-clean-mode h1 {
            margin: 0;
            font-size: clamp(28px, 4vw, 54px);
            line-height: 0.95;
            letter-spacing: -0.045em;
          }
          #codex-clean-mode .subtitle {
            margin: 10px 0 0;
            max-width: 780px;
            color: #9cb8af;
            font-size: 15px;
          }
          #codex-clean-mode .status {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 18px;
          }
          #codex-clean-mode .chip {
            padding: 8px 11px;
            border-radius: 999px;
            background: rgba(60, 225, 154, 0.12);
            border: 1px solid rgba(60, 225, 154, 0.22);
            color: #d9ffee;
            font-size: 12px;
            font-weight: 700;
          }
          #codex-clean-mode .chip.warn {
            background: rgba(255, 188, 72, 0.13);
            border-color: rgba(255, 188, 72, 0.28);
            color: #ffe6b8;
          }
          #codex-clean-mode .metrics {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }
          #codex-clean-mode .metric {
            padding: 16px;
          }
          #codex-clean-mode .label {
            display: block;
            color: #84a098;
            font-size: 11px;
            letter-spacing: 0.12em;
            text-transform: uppercase;
          }
          #codex-clean-mode .value {
            display: block;
            margin-top: 8px;
            font-size: clamp(22px, 3vw, 34px);
            font-weight: 900;
            letter-spacing: -0.035em;
          }
          #codex-clean-mode .ops {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
          #codex-clean-mode .operation {
            padding: 18px;
            min-height: 280px;
            display: grid;
            gap: 14px;
          }
          #codex-clean-mode .operation.active {
            border-color: rgba(55, 235, 157, 0.62);
            box-shadow: 0 0 0 1px rgba(55, 235, 157, 0.18), 0 22px 70px rgba(0, 0, 0, 0.30);
          }
          #codex-clean-mode .operation.blocked {
            opacity: 0.72;
          }
          #codex-clean-mode .op-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
          }
          #codex-clean-mode h2 {
            margin: 0;
            font-size: 24px;
            letter-spacing: -0.03em;
          }
          #codex-clean-mode .badge {
            padding: 7px 9px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.08);
            color: #dbe9e5;
            font-size: 12px;
            font-weight: 800;
            white-space: nowrap;
          }
          #codex-clean-mode .numbers {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }
          #codex-clean-mode .number {
            padding: 13px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.055);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          #codex-clean-mode .number strong {
            display: block;
            margin-top: 6px;
            color: #ffffff;
            font-size: 22px;
            letter-spacing: -0.03em;
          }
          #codex-clean-mode .full {
            grid-column: 1 / -1;
          }
          #codex-clean-mode .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            align-items: center;
          }
          #codex-clean-mode button {
            border: 0;
            border-radius: 14px;
            padding: 11px 14px;
            background: #38e39c;
            color: #03110c;
            font-weight: 900;
            cursor: pointer;
          }
          #codex-clean-mode button.secondary {
            background: rgba(255, 255, 255, 0.08);
            color: #eefcf6;
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          #codex-clean-mode button.danger {
            background: #ff5d6c;
            color: #23080b;
          }
          #codex-clean-mode .close-grid {
            display: grid;
            grid-template-columns: 1fr 1fr 1.2fr;
            gap: 14px;
          }
          #codex-clean-mode .close-card {
            padding: 16px;
          }
          #codex-clean-mode .guide {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
          }
          #codex-clean-mode .guide div {
            padding: 12px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.055);
            color: #b7cec7;
            font-size: 13px;
          }
          #codex-clean-mode .guide strong {
            display: block;
            color: #fff;
            margin-bottom: 4px;
          }
          #codex-clean-mode .tiny {
            color: #76918a;
            font-size: 12px;
          }
          @media (max-width: 900px) {
            #codex-clean-mode {
              padding: 12px;
            }
            #codex-clean-mode .hero,
            #codex-clean-mode .ops,
            #codex-clean-mode .close-grid,
            #codex-clean-mode .guide {
              grid-template-columns: 1fr;
            }
            #codex-clean-mode .metrics,
            #codex-clean-mode .numbers {
              grid-template-columns: 1fr;
            }
          }
        `;
      };

      const render = () => {
        upsertStyle();
        document.body.classList.add('codex-focus-mode');

        let panel = document.querySelector('#codex-clean-mode');
        if (!panel) {
          panel = document.createElement('section');
          panel.id = 'codex-clean-mode';
          document.body.prepend(panel);
        }

        const symbol = valueOf('#symbol') || '--';
        const xtbPrice = valueOf('#xtb-price') || valueOf('#market-price') || '--';
        const entry = valueOf('#entry-price') || '--';
        const stop = valueOf('#stop-price') || '--';
        const target = valueOf('#take-profit-price') || '--';
        const volume = valueOf('#requested-volume') || '--';
        const capital = valueOf('#account-balance') || '--';
        const op1 = valueOf('#operation1-result') || '0';
        const op2 = valueOf('#operation2-result') || '0';
        const tradeSlot = valueOf('#trade-slot') || '1';
        const direction = valueOf('#direction') || '--';
        const activeOp = tradeSlot === '2' ? 'Operacion 2' : 'Operacion 1';
        const resultText = textOf('body').match(/Resultado cerrado:[^\.]+/)?.[0]?.replace('Resultado cerrado:', '').trim() || '$0';
        const op1Lost = Number(op1) < 0;

        panel.innerHTML = `
          <div class="shell">
            <div class="hero">
              <section class="panel">
                <h1>Plan diario XTB</h1>
                <p class="subtitle">Dos operaciones maximo. Todo lo demas queda oculto para que operes con calma: precio XTB sincronizado, receta, resultado y cierre del dia.</p>
                <div class="status">
                  <span class="chip">XTB sincronizado</span>
                  <span class="chip">Dashboard produccion</span>
                  <span class="chip warn">Si Op 1 pierde, no abrir Op 2</span>
                </div>
              </section>
              <section class="metrics">
                <div class="metric"><span class="label">Activo</span><span class="value">${symbol}</span></div>
                <div class="metric"><span class="label">Precio XTB</span><span class="value">${xtbPrice}</span></div>
                <div class="metric"><span class="label">Operacion activa</span><span class="value">${activeOp}</span></div>
                <div class="metric"><span class="label">Capital</span><span class="value">${capital}</span></div>
              </section>
            </div>

            <section class="ops">
              <article class="operation ${tradeSlot === '1' ? 'active' : ''}">
                <div class="op-head">
                  <h2>Operacion 1</h2>
                  <span class="badge">60% riesgo/meta</span>
                </div>
                <div class="numbers">
                  <div class="number"><span class="label">Direccion</span><strong>${direction}</strong></div>
                  <div class="number"><span class="label">Volumen</span><strong>${tradeSlot === '1' ? volume : '--'}</strong></div>
                  <div class="number"><span class="label">Entrada</span><strong>${tradeSlot === '1' ? entry : '--'}</strong></div>
                  <div class="number"><span class="label">Stop</span><strong>${tradeSlot === '1' ? stop : '--'}</strong></div>
                  <div class="number"><span class="label">Meta</span><strong>${tradeSlot === '1' ? target : '--'}</strong></div>
                  <div class="number"><span class="label">Resultado</span><strong>${op1}</strong></div>
                </div>
                <div class="actions">
                  <button onclick="window.__codexSetTradeSlot('1')">Ver receta Op 1</button>
                  <button class="secondary" onclick="window.__codexFocusOriginal('#operation1-result')">Registrar Op 1</button>
                </div>
              </article>

              <article class="operation ${tradeSlot === '2' ? 'active' : ''} ${op1Lost ? 'blocked' : ''}">
                <div class="op-head">
                  <h2>Operacion 2</h2>
                  <span class="badge">${op1Lost ? 'bloqueada por perdida Op 1' : '40% si Op 1 no perdio'}</span>
                </div>
                <div class="numbers">
                  <div class="number"><span class="label">Direccion</span><strong>${tradeSlot === '2' ? direction : '--'}</strong></div>
                  <div class="number"><span class="label">Volumen</span><strong>${tradeSlot === '2' ? volume : '--'}</strong></div>
                  <div class="number"><span class="label">Entrada</span><strong>${tradeSlot === '2' ? entry : '--'}</strong></div>
                  <div class="number"><span class="label">Stop</span><strong>${tradeSlot === '2' ? stop : '--'}</strong></div>
                  <div class="number"><span class="label">Meta</span><strong>${tradeSlot === '2' ? target : '--'}</strong></div>
                  <div class="number"><span class="label">Resultado</span><strong>${op2}</strong></div>
                </div>
                <div class="actions">
                  <button ${op1Lost ? 'class="danger"' : ''} onclick="window.__codexSetTradeSlot('2')">${op1Lost ? 'No abrir Op 2' : 'Ver receta Op 2'}</button>
                  <button class="secondary" onclick="window.__codexFocusOriginal('#operation2-result')">Registrar Op 2</button>
                </div>
              </article>
            </section>

            <section class="close-grid">
              <div class="close-card"><span class="label">Op 1 USD</span><span class="value">${op1}</span></div>
              <div class="close-card"><span class="label">Op 2 USD</span><span class="value">${op2}</span></div>
              <div class="close-card"><span class="label">Cierre del dia</span><span class="value">${resultText}</span></div>
            </section>

            <section class="panel">
              <div class="guide">
                <div><strong>1. Inicio</strong>Abre XTB, deja visible el activo y confirma que el precio XTB cambie.</div>
                <div><strong>2. Copia</strong>Usa entrada, stop, meta y volumen de la operacion activa.</div>
                <div><strong>3. Cierre</strong>Al cerrar, registra ganancia/perdida en Op 1 u Op 2 y guarda cierre del dia.</div>
                <div><strong>4. Regla</strong>Si Op 1 pierde, se termina el dia. No recuperacion, no revancha.</div>
              </div>
              <p class="tiny">El dashboard original sigue debajo y funcionando; solo esta oculto para evitar ruido. Usa “Registrar” si necesitas volver al campo exacto.</p>
            </section>
          </div>
        `;
      };

      render();
      window.__codexCleanModeTimer = window.setInterval(render, 3000);
    });

    console.log('Modo Simple aplicado en el dashboard de produccion.');
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main() {
  do {
    try {
      await applyCleanMode();
    } catch (error) {
      console.error(`[clean-mode] ${error.message}`);
    }
    if (WATCH) {
      await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
    }
  } while (WATCH);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
