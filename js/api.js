import { CONFIG } from './config.js';

export async function cuGet(path) {
  const r = await fetch(`${CONFIG.CU}${encodeURIComponent(path)}`);
  if (!r.ok) throw new Error(`ClickUp ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function cuPost(path, body) {
  const r = await fetch(`${CONFIG.CU}${encodeURIComponent(path)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error(`ClickUp ${r.status}: ${await r.text()}`);
  return r.json();
}

export async function metaGet(action, params = {}) {
  const qs = new URLSearchParams({ action, ...params }).toString();
  const r = await fetch(`${CONFIG.META}?${qs}`);
  if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || `Meta ${r.status}`); }
  return r.json();
}

export async function logToSheets(data) {
  try {
    await fetch(CONFIG.SHEETS_LOG_URL, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(data)
    });
  } catch (e) { console.warn('Sheets log:', e); }
}
