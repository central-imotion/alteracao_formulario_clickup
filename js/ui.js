import { state } from './state.js';

export function setStatus(type, text) {
  const dot = document.getElementById('apiStatus');
  const label = document.getElementById('apiStatusText');
  dot.className = 'status-dot ' + (type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-warn');
  label.textContent = text;
}

export function setFormType(type) {
  document.getElementById('formType').value = type;
  document.getElementById('btnTransicao').classList.toggle('active', type === 'transicao');
  document.getElementById('btnNovoForm').classList.toggle('active', type === 'novo');
  const isNovo = type === 'novo';
  document.getElementById('oldFormContainer').style.display = isNovo ? 'none' : 'block';
  document.getElementById('cardAlteracoes').style.display = isNovo ? 'none' : 'block';

  // E-mail só aparece em Novo Form
  document.getElementById('emailContainer').style.display = isNovo ? 'block' : 'none';
  if (isNovo) {
    document.getElementById('clientEmail').setAttribute('required', 'true');
  } else {
    document.getElementById('clientEmail').removeAttribute('required');
  }

  // Ocultar Campanhas/Conjuntos se for Novo Form
  const container = document.getElementById('campaignsAdsetsContainer');
  const accountSelected = document.getElementById('adAccountSelect').value;
  if (isNovo) {
    container.classList.add('hidden');
  } else {
    if (accountSelected) container.classList.remove('hidden');
  }
}

export function toggleManualForms() {
  state.isManualForms = !state.isManualForms;
  const oldManual = document.getElementById('oldFormManual');
  const newManual = document.getElementById('newFormManual');

  const oldSearch = document.getElementById('oldFormSearch');
  const newSearch = document.getElementById('newFormSearch');

  if (state.isManualForms) {
    oldSearch.classList.add('hidden');
    newSearch.classList.add('hidden');
    oldManual.classList.remove('hidden');
    newManual.classList.remove('hidden');
  } else {
    oldSearch.classList.remove('hidden');
    newSearch.classList.remove('hidden');
    oldManual.classList.add('hidden');
    newManual.classList.add('hidden');
  }
}

export function getFormLabel(hiddenId, manualId) {
  if (state.isManualForms) {
    return document.getElementById(manualId).value.trim();
  }
  const hiddenEl = document.getElementById(hiddenId);
  const formId = hiddenEl.value;
  const form = state.sortedMetaForms.find(f => f.id === formId);
  return form ? form.name : '';
}

export function showModal(title, html) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = html;
  const m = document.getElementById('modal');
  m.classList.remove('hidden'); m.classList.add('flex');
}

export function closeModal() {
  const m = document.getElementById('modal');
  m.classList.add('hidden'); m.classList.remove('flex');
}

export function showToast(msg, type) {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  const bg = type === 'success' ? 'bg-success/20 border-success/30 text-success-light' : 'bg-danger/20 border-danger/30 text-danger';
  t.className = `toast px-5 py-3 rounded-xl border text-sm font-medium ${bg}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 4000);
}
