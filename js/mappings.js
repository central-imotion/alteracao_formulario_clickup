import { state } from './state.js';
import { CHANGE_TYPES } from './config.js';

export function addMapping() {
  const id = state.mappingCounter++;
  state.mappings.push(id);
  const container = document.getElementById('mappingsContainer');
  const row = document.createElement('div');
  row.className = 'mapping-row flex flex-col md:flex-row items-start md:items-center gap-3';
  row.id = `mapping-${id}`;
  const opts = CHANGE_TYPES.map(t => `<option value="${t.value}">${t.label}</option>`).join('');
  row.innerHTML = `
    <select class="input-field md:w-64 flex-shrink-0" data-mapping-type="${id}">
      <option value="">Tipo de alteração...</option>
      ${opts}
    </select>
    <input type="text" class="input-field flex-1" placeholder="Descreva a mudança..." data-mapping-desc="${id}">
    <button type="button" class="btn-danger-sm flex-shrink-0" onclick="removeMapping(${id})">🗑️</button>
  `;
  container.appendChild(row);
}

export function removeMapping(id) {
  state.mappings = state.mappings.filter(m => m !== id);
  const el = document.getElementById(`mapping-${id}`);
  if (el) { el.style.opacity = '0'; el.style.transform = 'translateY(-8px)'; setTimeout(() => el.remove(), 200); }
}

export function getMappings() {
  const result = [];
  for (const id of state.mappings) {
    const typeVal = document.querySelector(`[data-mapping-type="${id}"]`)?.value;
    const descVal = document.querySelector(`[data-mapping-desc="${id}"]`)?.value?.trim();
    if (typeVal || descVal) {
      const typeLabel = CHANGE_TYPES.find(t => t.value === typeVal)?.label || typeVal || '—';
      result.push({ type: typeVal, typeLabel, description: descVal || '—' });
    }
  }
  return result;
}
