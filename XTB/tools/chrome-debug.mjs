import { chromium } from 'playwright';

export const DEFAULT_CDP_ENDPOINT = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222';
export const XTB_URL_HINT = 'xstation5.xtb.com';
export const DASHBOARD_URL_HINT = 'api.manantiallodge.com';

export function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function parseMoney(value) {
  const raw = normalize(value).replace(/\s+/g, '');
  const match = raw.match(/-?[\d.,]+/);
  if (!match) return null;
  let text = match[0];
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  const decimalIndex = Math.max(lastComma, lastDot);
  if (lastComma >= 0 && lastDot >= 0) {
    const integer = text.slice(0, decimalIndex).replace(/[.,]/g, '');
    const decimal = text.slice(decimalIndex + 1).replace(/[.,]/g, '');
    text = `${integer}.${decimal}`;
  } else if (lastComma >= 0) {
    const decimalDigits = text.length - lastComma - 1;
    text = decimalDigits === 3 && text.length > 5
      ? text.replace(/,/g, '')
      : text.replace(',', '.');
  } else if ((text.match(/\./g) || []).length > 1) {
    const integer = text.slice(0, lastDot).replace(/\./g, '');
    const decimal = text.slice(lastDot + 1).replace(/\./g, '');
    text = `${integer}.${decimal}`;
  }
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function connectChrome() {
  return chromium.connectOverCDP(DEFAULT_CDP_ENDPOINT);
}

export function pickBrowserContext(browser) {
  if (typeof browser.contexts === 'function') {
    const contexts = browser.contexts();
    return contexts[0];
  }
  return browser;
}

export function classifyPage(page) {
  const url = page.url();
  if (url.includes(XTB_URL_HINT)) return 'xtb';
  if (url.includes(DASHBOARD_URL_HINT)) return 'dashboard';
  return 'other';
}

export async function gatherPageSnapshot(page) {
  const title = await page.title().catch(() => '');
  const body = await page.locator('body').innerText({ timeout: 8000 }).catch(() => '');
  const text = normalize(body);
  return { url: page.url(), title: normalize(title), text, rawBody: body };
}
