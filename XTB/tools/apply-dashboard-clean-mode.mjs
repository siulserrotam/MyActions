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
      const valueOf = (selector) => document.querySelector(selector)?.value || '--';
      const textOf = (selector) => document.querySelector(selector)?.innerText || '';
      const upsertStyle = () => {
        let style = document.querySelector('#codex-clean-mode-style');
        if (!style) {
          style = document.createElement('style');
          style.id = 'codex-clean-mode-style';
          document.head.appendChild(style);
        }

        style.textContent = `
          #codex-clean-mode {
            position: sticky;
            top: 0;
            z-index: 999999;
            margin: 0 0 18px 0;
            padding: 16px;
            border: 1px solid rgba(51, 214, 159, 0.45);
            border-radius: 18px;
            background: linear-gradient(135deg, rgba(12, 18, 22, 0.98), rgba(20, 29, 35, 0.96));
            box-shadow: 0 18px 40px rgba(0, 0, 0, 0.34);
            color: #f4fbf8;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          #codex-clean-mode h2 {
            margin: 0 0 4px 0;
            font-size: 20px;
            letter-spacing: 0.01em;
          }
          #codex-clean-mode p {
            margin: 0;
            color: #aac1bc;
            font-size: 13px;
          }
          #codex-clean-mode .grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 10px;
            margin-top: 14px;
          }
          #codex-clean-mode .ops {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 14px;
          }
          #codex-clean-mode .op {
            padding: 14px;
            border-radius: 16px;
            background: rgba(255, 255, 255, 0.055);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          #codex-clean-mode .op.active {
            border-color: rgba(51, 214, 159, 0.55);
            box-shadow: inset 0 0 0 1px rgba(51, 214, 159, 0.18);
          }
          #codex-clean-mode .op h3 {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            margin: 0 0 12px 0;
            font-size: 16px;
          }
          #codex-clean-mode .pill {
            padding: 4px 8px;
            border-radius: 999px;
            background: rgba(51, 214, 159, 0.14);
            color: #caffef;
            font-size: 11px;
            white-space: nowrap;
          }
          #codex-clean-mode .rows {
            display: grid;
            gap: 7px;
          }
          #codex-clean-mode .row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            color: #c7d8d3;
            font-size: 13px;
          }
          #codex-clean-mode .row strong {
            color: #ffffff;
            font-size: 14px;
          }
          #codex-clean-mode .card {
            padding: 12px;
            border-radius: 14px;
            background: rgba(255, 255, 255, 0.055);
            border: 1px solid rgba(255, 255, 255, 0.08);
          }
          #codex-clean-mode .label {
            display: block;
            color: #8aa099;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          #codex-clean-mode .value {
            display: block;
            margin-top: 6px;
            font-size: 18px;
            font-weight: 800;
          }
          #codex-clean-mode .checklist {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 8px;
            margin-top: 12px;
          }
          #codex-clean-mode .step {
            padding: 10px 12px;
            border-radius: 999px;
            background: rgba(51, 214, 159, 0.12);
            color: #d9fff1;
            font-size: 12px;
            border: 1px solid rgba(51, 214, 159, 0.22);
            text-align: center;
          }
          #codex-clean-mode .danger {
            background: rgba(255, 80, 95, 0.14);
            border-color: rgba(255, 80, 95, 0.28);
            color: #ffd9dc;
          }
          @media (max-width: 900px) {
            #codex-clean-mode .grid {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
            #codex-clean-mode .ops {
              grid-template-columns: 1fr;
            }
            #codex-clean-mode .checklist {
              grid-template-columns: 1fr;
            }
          }
        `;
      };

      const render = () => {
        upsertStyle();
        let panel = document.querySelector('#codex-clean-mode');
        if (!panel) {
          panel = document.createElement('section');
          panel.id = 'codex-clean-mode';
          document.body.prepend(panel);
        }

        const symbol = valueOf('#symbol');
        const xtbPrice = valueOf('#xtb-price');
        const marketPrice = valueOf('#market-price');
        const entry = valueOf('#entry-price');
        const stop = valueOf('#stop-price');
        const target = valueOf('#take-profit-price');
        const volume = valueOf('#requested-volume');
        const capital = valueOf('#account-balance');
        const op1 = valueOf('#operation1-result');
        const op2 = valueOf('#operation2-result');
        const tradeSlot = valueOf('#trade-slot');
        const activeOp = tradeSlot === '2' ? 'Operacion 2' : 'Operacion 1';
        const resultText = textOf('body').includes('Resultado cerrado:')
          ? textOf('body').match(/Resultado cerrado:[^\.]+/)?.[0] || 'Resultado cerrado: --'
          : 'Resultado cerrado: --';

        panel.innerHTML = `
          <h2>Plan del Dia XTB</h2>
          <p>Sin favoritos ni categorias: solo dos oportunidades maximas. Si la Operacion 1 pierde, no abrir Operacion 2.</p>
          <div class="grid">
            <div class="card"><span class="label">Activo</span><span class="value">${symbol}</span></div>
            <div class="card"><span class="label">Precio XTB</span><span class="value">${xtbPrice || marketPrice}</span></div>
            <div class="card"><span class="label">Operacion activa</span><span class="value">${activeOp}</span></div>
            <div class="card"><span class="label">Capital</span><span class="value">${capital}</span></div>
          </div>
          <div class="ops">
            <div class="op ${tradeSlot === '1' ? 'active' : ''}">
              <h3>Operacion 1 <span class="pill">60% riesgo/meta</span></h3>
              <div class="rows">
                <div class="row"><span>Entrada</span><strong>${tradeSlot === '1' ? entry : 'Selecciona Op 1'}</strong></div>
                <div class="row"><span>Stop</span><strong>${tradeSlot === '1' ? stop : '--'}</strong></div>
                <div class="row"><span>Meta</span><strong>${tradeSlot === '1' ? target : '--'}</strong></div>
                <div class="row"><span>Volumen</span><strong>${tradeSlot === '1' ? (volume || '--') : '--'}</strong></div>
                <div class="row"><span>Resultado guardado</span><strong>${op1}</strong></div>
              </div>
            </div>
            <div class="op ${tradeSlot === '2' ? 'active' : ''}">
              <h3>Operacion 2 <span class="pill">solo si Op 1 no perdio</span></h3>
              <div class="rows">
                <div class="row"><span>Entrada</span><strong>${tradeSlot === '2' ? entry : 'Selecciona Op 2'}</strong></div>
                <div class="row"><span>Stop</span><strong>${tradeSlot === '2' ? stop : '--'}</strong></div>
                <div class="row"><span>Meta</span><strong>${tradeSlot === '2' ? target : '--'}</strong></div>
                <div class="row"><span>Volumen</span><strong>${tradeSlot === '2' ? (volume || '--') : '--'}</strong></div>
                <div class="row"><span>Resultado guardado</span><strong>${op2}</strong></div>
              </div>
            </div>
          </div>
          <div class="checklist">
            <div class="step">1. Confirmar CFD en XTB</div>
            <div class="step">2. Precio XTB sincronizado</div>
            <div class="step danger">3. Registrar resultado al cerrar</div>
          </div>
          <div class="grid">
            <div class="card"><span class="label">Op 1 USD</span><span class="value">${op1}</span></div>
            <div class="card"><span class="label">Op 2 USD</span><span class="value">${op2}</span></div>
            <div class="card"><span class="label">Cierre dia</span><span class="value">${resultText.replace('Resultado cerrado:', '').trim()}</span></div>
          </div>
        `;
      };

      render();
      if (!window.__codexCleanModeTimer) {
        window.__codexCleanModeTimer = window.setInterval(render, 3000);
      }
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
