import { state } from './state.js';

export function renderCampaignsList(filter = '') {
  const campSel = document.getElementById('campaignsList');
  const term = filter.toLowerCase();
  const filtered = state.metaCampaigns.filter(c => c.name.toLowerCase().includes(term));

  campSel.innerHTML = '';
  if (filtered.length === 0) {
    campSel.innerHTML = '<div class="text-xs text-dark-500 py-2">(Nenhuma campanha encontrada)</div>';
  } else {
    const frag = document.createDocumentFragment();
    filtered.forEach(c => {
      const label = document.createElement('label');
      label.className = 'flex items-start gap-2 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-colors';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = c.id;
      checkbox.checked = state.selectedCamps.has(c.id);
      checkbox.className = 'mt-0.5 w-4 h-4 rounded border-white/10 bg-[#343541] accent-[#6366f1] cursor-pointer';
      checkbox.addEventListener('change', () => toggleCampSelection(c.id));
      const span = document.createElement('span');
      span.className = 'text-xs text-[#ececf1] leading-tight break-words';
      span.textContent = c.name;
      label.appendChild(checkbox);
      label.appendChild(span);
      frag.appendChild(label);
    });
    campSel.appendChild(frag);
  }
}

export function toggleCampSelection(id) {
  if (state.selectedCamps.has(id)) state.selectedCamps.delete(id);
  else state.selectedCamps.add(id);
  renderSelectedItems();
}

export function renderSelectedItems() {
  const campsContainer = document.getElementById('selectedCampsContainer');

  campsContainer.innerHTML = '';
  if (state.selectedCamps.size > 0) {
    const frag = document.createDocumentFragment();
    state.metaCampaigns.filter(c => state.selectedCamps.has(c.id)).forEach(c => {
      const div = document.createElement('div');
      div.className = 'flex items-center gap-1.5 bg-[#4f46e5]/30 border border-[#4f46e5]/50 text-white px-2 py-1 rounded-md text-xs transition-colors';
      const span = document.createElement('span');
      span.className = 'truncate max-w-[200px] leading-tight';
      span.title = c.name;
      span.textContent = c.name;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'text-[#818cf8] hover:text-[#ef4444] hover:bg-[#ef4444]/20 rounded-full w-4 h-4 flex items-center justify-center transition-colors pb-0.5';
      btn.innerHTML = '&times;';
      btn.addEventListener('click', () => removeSelectedItem('camp', c.id));
      div.appendChild(span);
      div.appendChild(btn);
      frag.appendChild(div);
    });
    campsContainer.appendChild(frag);
  }
}

export function removeSelectedItem(type, id) {
  if (type === 'camp') {
    state.selectedCamps.delete(id);
    renderCampaignsList(document.getElementById('campSearch').value);
  }
  renderSelectedItems();
}
