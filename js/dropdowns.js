import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { onAdAccountChange, fetchClientFieldValue, renderForms } from './meta-ads.js';

export function initSearchDropdown() {
  const input = document.getElementById('clientSearch');
  const dropdown = document.getElementById('clientDropdown');
  const hidden = document.getElementById('clientSelect');
  function renderList(filter = '') {
    const term = filter.toLowerCase();
    const f = state.clients.map((c, i) => ({ ...c, idx: i })).filter(c => c.name.toLowerCase().includes(term));
    dropdown.innerHTML = f.length ? f.map(c => `<div class="dropdown-item" data-idx="${c.idx}">${escapeHtml(c.name)}</div>`).join('') : '<div class="dropdown-empty">Nenhum cliente encontrado</div>';
  }
  input.addEventListener('focus', () => { renderList(input.value); dropdown.classList.add('open'); });
  input.addEventListener('input', () => { renderList(input.value); dropdown.classList.add('open'); hidden.value = ''; state.selectedClientIdx = -1; });
  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item'); if (!item) return;
    const idx = parseInt(item.dataset.idx);
    input.value = state.clients[idx].name; hidden.value = idx; state.selectedClientIdx = idx;
    dropdown.classList.remove('open');
    fetchClientFieldValue(idx).then(() => { if (state.metaForms.length) renderForms(); });
  });
}

export function initAdAccountSearchDropdown() {
  const input = document.getElementById('adAccountSearch');
  const dropdown = document.getElementById('adAccountDropdown');
  const hidden = document.getElementById('adAccountSelect');

  function renderList(filter = '') {
    const term = filter.toLowerCase();
    const f = state.metaAccounts
      .map((a, i) => ({ ...a, origIdx: i }))
      .filter(a => a.name.toLowerCase().includes(term) || a.account_id.toLowerCase().includes(term));
    dropdown.innerHTML = f.length ? f.map(a =>
      `<div class="dropdown-item" data-idx="${a.origIdx}">${escapeHtml(a.name)} (${a.account_id})</div>`
    ).join('') : '<div class="dropdown-empty">Nenhuma conta encontrada</div>';
  }

  input.addEventListener('focus', () => { renderList(input.value); dropdown.classList.add('open'); });
  input.addEventListener('input', () => { renderList(input.value); dropdown.classList.add('open'); hidden.value = ''; state.selectedAdAccountIdx = -1; });
  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item'); if (!item) return;
    const idx = parseInt(item.dataset.idx);
    input.value = `${state.metaAccounts[idx].name} (${state.metaAccounts[idx].account_id})`;
    hidden.value = state.metaAccounts[idx].account_id;
    state.selectedAdAccountIdx = idx;
    dropdown.classList.remove('open');
    onAdAccountChange();
  });
}

export function initFormSearchDropdown(inputId, dropdownId, hiddenId, setSelectedIdx) {
  const input = document.getElementById(inputId);
  const dropdown = document.getElementById(dropdownId);
  const hidden = document.getElementById(hiddenId);

  function renderList(filter = '') {
    const term = filter.toLowerCase();
    const f = state.sortedMetaForms
      .map((form, i) => ({ ...form, origIdx: i }))
      .filter(item =>
        item.name.toLowerCase().includes(term) ||
        (item.pageName || '').toLowerCase().includes(term)
      );
    dropdown.innerHTML = f.length ? f.map(item => {
      const label = `${escapeHtml(item.name)} (${escapeHtml(item.pageName || '')})`;
      return `<div class="dropdown-item" data-idx="${item.origIdx}">${label}</div>`;
    }).join('') : '<div class="dropdown-empty">Nenhum form encontrado</div>';
  }

  input.addEventListener('focus', () => { renderList(input.value); dropdown.classList.add('open'); });
  input.addEventListener('input', () => { renderList(input.value); dropdown.classList.add('open'); hidden.value = ''; setSelectedIdx(-1); });
  dropdown.addEventListener('click', (e) => {
    const item = e.target.closest('.dropdown-item'); if (!item) return;
    const idx = parseInt(item.dataset.idx);
    const form = state.sortedMetaForms[idx];
    input.value = `${form.name} (${form.pageName})`;
    hidden.value = form.id;
    setSelectedIdx(idx);
    dropdown.classList.remove('open');
  });
}
