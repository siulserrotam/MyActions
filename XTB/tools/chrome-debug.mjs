import { chromium } from 'playwright';

export const DEFAULT_CDP_ENDPOINT = process.env.CDP_ENDPOINT || 'http://127.0.0.1:9222';
export const XTB_URL_HINT = 'xstation5.xtb.com';
export const DASHBOARD_URL_HINT = 'api.manantiallodge.com';

export function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function parseMoney(value) {
  const text = normalize(value).replace(/\s/g, '').replace(',', '.');
  const match = text.match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
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
