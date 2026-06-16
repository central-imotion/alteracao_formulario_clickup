import { CONFIG } from './config.js';
import { state } from './state.js';
import { cuGet } from './api.js';
import { debounce } from './utils.js';
import { initSearchDropdown, initFormSearchDropdown } from './dropdowns.js';
import { loadMetaAdAccounts } from './meta-ads.js';
import { renderCampaignsList } from './campaigns.js';
import { addMapping, removeMapping } from './mappings.js';
import { setStatus, setFormType, toggleManualForms, closeModal } from './ui.js';
import { submitForm } from './submit.js';

const debouncedRenderCamps = debounce((val) => renderCampaignsList(val), 150);

// ==================== INIT ====================
async function init() {
  try {
    const data = await cuGet(`/space/${CONFIG.SPACE_ID}/folder?archived=false`);
    const folders = data.folders.filter(f => f.name !== '[CS] Client Success');
    state.clients = [];
    for (const f of folders) {
      const ol = f.lists.find(l => l.name.toLowerCase().includes('otimiza'));
      if (ol) state.clients.push({ name: f.name, folderId: f.id, otimizacoesListId: ol.id, clientFieldValue: null });
    }
    state.clients.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    document.getElementById('clientSearch').placeholder = 'Buscar cliente...';
    initSearchDropdown();
    setStatus('success', `ClickUp OK — ${state.clients.length} clientes`);
  } catch (err) {
    setStatus('error', `Erro ClickUp: ${err.message}`);
    console.error(err);
  }

  // Meta Ads — carrega contas de anúncio
  loadMetaAdAccounts();

  addMapping();
}

// Bind onChange nos formulários
document.addEventListener('DOMContentLoaded', () => {
  initFormSearchDropdown('oldFormSearch', 'oldFormDropdown', 'oldFormId', (v) => { state.selectedOldFormIdx = v; });
  initFormSearchDropdown('newFormSearch', 'newFormDropdown', 'newFormId', (v) => { state.selectedNewFormIdx = v; });

  // Fechar dropdowns ao clicar fora globalmente
  document.addEventListener('click', (e) => {
    const currentContainer = e.target.closest('.search-dropdown');
    document.querySelectorAll('.dropdown-list').forEach(dl => {
      if (!currentContainer || dl.parentNode !== currentContainer) {
        dl.classList.remove('open');
      }
    });
  });
});

document.getElementById('modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modal')) closeModal();
});

// Expõe no window as funções referenciadas via onclick="" / oninput="" no HTML
window.setFormType = setFormType;
window.toggleManualForms = toggleManualForms;
window.debouncedRenderCamps = debouncedRenderCamps;
window.addMapping = addMapping;
window.removeMapping = removeMapping;
window.submitForm = submitForm;
window.closeModal = closeModal;

// ==================== START ====================
init();
