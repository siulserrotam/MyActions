import fs from 'fs/promises';
import path from 'path';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import dotenv from 'dotenv';
import { chromium } from 'playwright';
import { PDFParse } from 'pdf-parse';

dotenv.config();

const SOURCES = [
  { name: 'Computrabajo', host: 'computrabajo.com', url: process.env.COMPUTRABAJO_URL || 'https://co.computrabajo.com/trabajo-de-desarrollador' },
  { name: 'Elempleo', host: 'elempleo.com', url: process.env.ELEMPLEO_URL || 'https://www.elempleo.com/co/ofertas-empleo' },
  { name: 'LinkedIn', host: 'linkedin.com', url: process.env.LINKEDIN_URL || 'https://www.linkedin.com/jobs/' }
];

const PROFILE_TERMS = [
  'c#', '.net', '.net core', 'asp.net', 'angular', 'sql', 'pl/sql', 'oracle', 'sql server',
  'python', 'power bi', 'azure devops', 'etl', 'backend', 'full stack', 'analista', 'desarrollador'
];

const AVOID_TERMS = ['junior', 'trainee', 'practicante', 'intern', 'pasante'];

const DEBOUNCE_BLACKLIST = /^(buscar empleos|login|crear hdv|inicia sesi[oó]n|iniciar sesi[oó]n|inicio|membres[ií]as|asesor[ií]a hv|empresas|calculadora salarial|noticias|formaci[oó]n|registrar hoja de vida|ofertas de empleo|ordenar por|relevantes|recientes|salario|ubicaci[oó]n|modalidad laboral|tipo de contrato|hoy|hace|anterior|siguiente|empezar|buscar ofertas)$/i;

function clean(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isRelevant(text) {
  const lower = text.toLowerCase();
  return PROFILE_TERMS.some((term) => lower.includes(term)) && !AVOID_TERMS.some((term) => lower.includes(term));
}

function rank(job) {
  const t = `${job.title} ${job.company} ${job.city} ${job.salary} ${job.text}`.toLowerCase();
  let score = 0;
  for (const term of PROFILE_TERMS) if (t.includes(term)) score += 2;
  if (/semi senior|semi-senior|senior|sr\b/.test(t)) score += 2;
  if (/remoto|hibrido|híbrido/.test(t)) score += 1;
  if (AVOID_TERMS.some((term) => t.includes(term))) score -= 6;
  if (/frontend|ventas|comercial|cnc|bodega|producción|mantenimiento/i.test(t)) score -= 4;
  return score;
}

function priorityFromScore(score) {
  if (score >= 8) return 'alta';
  if (score >= 4) return 'media';
  return 'baja';
}

async function findOperaPath() {
  const candidates = [
    process.env.OPERA_PATH,
    'C:/Users/Admin/AppData/Local/Programs/Opera GX/opera.exe',
    'C:/Users/Admin/AppData/Local/Programs/Opera/opera.exe',
    'C:/Program Files/Opera/opera.exe',
    'C:/Program Files (x86)/Opera/opera.exe'
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) return candidate;
    } catch {}
  }
  return '';
}

async function readCvText(cvPath) {
  const data = await fs.readFile(cvPath);
  const pdf = new PDFParse({ verbosity: 0, data });
  const parsed = await pdf.getText();
  await pdf.destroy().catch(() => {});
  return parsed.text || '';
}

function buildApplicationPrep(job, cvText) {
  const lower = `${job.title} ${job.text}`.toLowerCase();
  const suggestions = [];
  if (/backend|api|rest|services|micro/.test(lower)) suggestions.push('Resaltar backend con C#/.NET, APIs y servicios.');
  if (/angular|frontend|web/.test(lower)) suggestions.push('Mencionar Angular y experiencia web empresarial.');
  if (/power bi|bi|data|anal/.test(lower)) suggestions.push('Incluir analítica de datos, Power BI y ETL.');
  if (/oracle|sql server|sql|pl\/sql/.test(lower)) suggestions.push('Subrayar Oracle, SQL Server y consultas/PLSQL.');
  if (/azure|devops|ci\/cd|deploy/.test(lower)) suggestions.push('Mencionar Azure DevOps y despliegues.');
  if (/automatiz|python/.test(lower)) suggestions.push('Agregar automatización con Python.');
  if (!suggestions.length) suggestions.push('Usar el resumen general del CV y ajustar al puesto.');

  const keywords = ['C#', '.NET', '.NET Core', 'Angular', 'SQL Server', 'Oracle', 'Python', 'Power BI', 'Azure DevOps'];
  const matched = keywords.filter((k) => cvText.toLowerCase().includes(k.toLowerCase()));
  return { suggestions, matched };
}

function parseVisibleJobs(bodyText, sourceName, pageUrl) {
  const blocks = bodyText.split(/\n{2,}/).map((b) => b.replace(/\n+/g, '\n').trim()).filter(Boolean);
  const jobs = [];

  for (const block of blocks) {
    const lines = block.split('\n').map(clean).filter(Boolean).filter((line) => !DEBOUNCE_BLACKLIST.test(line));
    if (lines.length < 2) continue;

    const title = lines.find((line) => /desarroll|developer|analista|engineer|backend|full stack|programador|software/i.test(line));
    if (!title || !isRelevant(title)) continue;

    const titleIndex = lines.indexOf(title);
    const company = lines.slice(titleIndex + 1, titleIndex + 4).find((line) => line && !/[$€£]|\d{1,2}|hoy|hace|remoto|h[ií]brido|bogot|medell|cali/i.test(line)) || '';
    const city = lines.find((line) => /remoto|hibrido|híbrido|bogot|medell|cali|barranquilla|colombia/i.test(line)) || '';
    const salary = lines.find((line) => /\$|salario/i.test(line)) || '';

    jobs.push({
      source: sourceName,
      title: clean(title),
      company: clean(company),
      city: clean(city),
      salary: clean(salary),
      url: pageUrl,
      text: block
    });
  }

  return jobs;
}

async function getPageBodyText(page) {
  return clean(await page.locator('body').innerText({ timeout: 10000 }).catch(() => ''));
}

async function extractSiteJobs(page, source) {
  const title = await page.title().catch(() => '');
  const body = await getPageBodyText(page);

  if (source.name === 'LinkedIn' && /iniciar sesi[oó]n|unirse ahora|email o teléfono|contraseña/i.test(body)) {
    return [];
  }

  if (source.name === 'Computrabajo') {
    const articles = await page.evaluate(() => Array.from(document.querySelectorAll('article.box_offer')).slice(0, 25).map((el) => ({
      title: (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim(),
      href: (el.querySelector('a[href]') || {}).href || ''
    }))).catch(() => []);

    const mapped = articles
      .map((item) => {
        const text = item.title;
        const salary = (text.match(/\$[^H]+/i) || [''])[0];
        const company = (text.match(/\b[A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚÑ&.\- ]{2,}\b/) || [''])[0];
        return {
          source: source.name,
          title: text,
          company,
          city: (text.match(/(Bogotá|Medellín|Cali|Barranquilla|Cartagena|Pereira|Remoto|Híbrido|hibrido|Colombia)/i) || [''])[0],
          salary,
          url: item.href || page.url(),
          text
        };
      })
      .filter((job) => isRelevant(job.title));

    return mapped.length ? mapped : parseVisibleJobs(body, source.name, page.url());
  }

  if (source.name === 'Elempleo') {
    return parseVisibleJobs(body, source.name, page.url());
  }

  return parseVisibleJobs(body, source.name, page.url());
}

async function ensureSourcePages(context) {
  const pages = context.pages();
  const result = [];

  for (const source of SOURCES) {
    let page = pages.find((p) => hostOf(p.url()).includes(source.host));
    if (!page) {
      page = await context.newPage();
      await page.goto(source.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(async () => {
        await page.goto(source.url, { waitUntil: 'load', timeout: 60000 });
      });
    }
    result.push({ page, source });
  }

  return result;
}

async function openHighPriorityJobs(context, jobs) {
  const highJobs = jobs.filter((job) => priorityFromScore(job.score) === 'alta').slice(0, 3);
  if (!highJobs.length) return;

  const page = context.pages()[0] || await context.newPage();
  for (const job of highJobs) {
    await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.bringToFront().catch(() => {});
    await page.waitForTimeout(1500).catch(() => {});
  }
}

async function writeApplicationQueue(jobs) {
  const highJobs = jobs.filter((job) => priorityFromScore(job.score) === 'alta').slice(0, 5);
  const lines = highJobs.length
    ? highJobs.map((job, index) => [
        `${index + 1}. ${job.title}`,
        `   Empresa: ${job.company || 'N/D'}`,
        `   Ciudad/Remoto: ${job.city || 'N/D'}`,
        `   Salario: ${job.salary || 'N/D'}`,
        `   Enlace: ${job.url}`
      ].join('\n'))
    : ['No hay vacantes de prioridad alta en esta corrida.'];

  await fs.writeFile(path.join('output', 'application_queue.txt'), lines.join('\n\n'), 'utf8');
}

async function main() {
  const rl = readline.createInterface({ input, output });
  const browserMode = (process.env.BROWSER_MODE || 'connect').toLowerCase();
  const cdpEndpoint = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222';
  const cvPath = process.env.CV_PATH || 'C:/Users/Admin/Downloads/CV_Luis_Torres.pdf.pdf';

  let browser;
  if (browserMode === 'connect') {
    browser = await chromium.connectOverCDP(cdpEndpoint);
  } else {
    const operaPath = await findOperaPath();
    if (operaPath) {
      browser = await chromium.launchPersistentContext(process.env.USER_DATA_DIR || 'C:/Users/Admin/AppData/Roaming/Opera Software/Opera GX Stable', {
        headless: false,
        executablePath: operaPath,
        args: ['--start-maximized']
      });
    } else {
      browser = await chromium.launch({ headless: false });
    }
  }

  const context = typeof browser.pages === 'function' ? browser : browser.contexts()[0];
  const opened = await ensureSourcePages(context);
  const allJobs = [];

  for (const { page, source } of opened) {
    try {
      const jobs = await extractSiteJobs(page, source);
      allJobs.push(...jobs);
    } catch (err) {
      console.warn(`No pude leer ${source.name}:`, err.message);
    }
  }

  const unique = Array.from(new Map(allJobs.map((job) => [job.url || `${job.title}-${job.company}`, job])).values())
    .map((job) => ({ ...job, score: rank(job) }))
    .sort((a, b) => b.score - a.score)
    .filter((job) => job.score >= 2);

  const cvText = await readCvText(cvPath).catch(() => '');

  await fs.mkdir('output', { recursive: true });
  await fs.writeFile(path.join('output', 'jobs.json'), JSON.stringify(unique, null, 2), 'utf8');
  await fs.writeFile(
    path.join('output', 'jobs.csv'),
    ['source,title,company,city,salary,score,priority,url']
      .concat(unique.map((job) => [job.source, job.title, job.company, job.city, job.salary, job.score, priorityFromScore(job.score), job.url]
        .map((v) => `"${String(v || '').replaceAll('"', '""')}"`).join(',')))
      .join('\n'),
    'utf8'
  );
  await fs.writeFile(path.join('output', 'cv-source.txt'), cvText, 'utf8');
  await writeApplicationQueue(unique);

  for (const job of unique.filter((item) => priorityFromScore(item.score) === 'alta').slice(0, 5)) {
    const prep = buildApplicationPrep(job, cvText);
    const safe = job.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 80) || 'vacante';
    const lines = [
      `Vacante: ${job.title}`,
      `Empresa: ${job.company || 'N/D'}`,
      `Ciudad/Remoto: ${job.city || 'N/D'}`,
      `Prioridad: ${priorityFromScore(job.score)}`,
      `Enlace: ${job.url}`,
      '',
      'Sugerencias de ajuste para el CV:',
      ...prep.suggestions.map((line) => `- ${line}`),
      '',
      'Keywords detectadas en tu CV:',
      ...prep.matched.map((line) => `- ${line}`),
      '',
      'Estado:',
      'Listo para abrir la vacante y revisar el formulario final antes de enviar.'
    ];
    await fs.writeFile(path.join('output', `apply_${safe}.txt`), lines.join('\n'), 'utf8');
  }

  console.log(`Found ${unique.length} relevant jobs.`);
  for (const job of unique.slice(0, 20)) {
    console.log(`- [${priorityFromScore(job.score)}] ${job.title} | ${job.company} | ${job.city} | ${job.salary || 'no salary'} | ${job.url}`);
  }

  await openHighPriorityJobs(context, unique).catch((err) => {
    console.warn('No pude abrir las vacantes de prioridad alta:', err.message);
  });

  const answer = await rl.question('Prepare the application flow for high priority jobs? (yes/no) ');
  if (!/^y/i.test(answer)) {
    console.log('Stopped before sending anything.');
    await rl.close();
    if (typeof browser.close === 'function') await browser.close();
    return;
  }

  console.log('Application prepared. Sending still requires your final confirmation before each sensitive action.');
  await rl.close();
  if (typeof browser.close === 'function') await browser.close();
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
