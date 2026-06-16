import { state } from './state.js';
import { metaGet, cuGet } from './api.js';
import { initAdAccountSearchDropdown } from './dropdowns.js';
import { renderCampaignsList, renderSelectedItems } from './campaigns.js';

export async function loadMetaAdAccounts() {
  const searchInput = document.getElementById('adAccountSearch');
  const st = document.getElementById('metaStatus');
  try {
    const pages = await metaGet('pages');
    state.metaAccounts = await metaGet('adaccounts');
    searchInput.placeholder = 'Buscar conta de anúncio...';
    initAdAccountSearchDropdown();
    state.metaPages = pages;
    st.textContent = `✅ ${state.metaAccounts.length} contas encontradas`;
  } catch (err) {
    searchInput.placeholder = '⚠️ Meta não conectado';
    st.textContent = `Meta Ads indisponível: ${err.message}`;
    console.warn('Meta Ads:', err);
  }
}

export async function onAdAccountChange() {
  const accountId = document.getElementById('adAccountSelect').value;
  if (!accountId) return;
  const st = document.getElementById('metaStatus');
  st.textContent = '⏳ Carregando dados da conta...';

  try {
    // Ocultar campanhas inicialmente
    document.getElementById('campaignsAdsetsContainer').classList.add('hidden');

    // Dispara fetch de campanhas e adsets em paralelo
    const [camps, adsetsData] = await Promise.all([
      metaGet('campaigns', { account_id: accountId }),
      metaGet('adsets', { account_id: accountId })
    ]);

    state.metaCampaigns = camps || [];
    state.metaAdsets = adsetsData || [];

    // Extrair page_ids dos adsets (garantido para campanhas de lead)
    const adsetPages = new Set();
    state.metaAdsets.forEach(a => {
      if (a.promoted_object && a.promoted_object.page_id) {
        adsetPages.add(a.promoted_object.page_id);
      }
    });

    // Processa pages para forms
    let formsPromises = [];
    if (state.metaPages && state.metaPages.length > 0) {
      for (const page of state.metaPages) {
        // SÓ BUSCA SE A PÁGINA ESTIVER NA LISTA DAS PÁGINAS PROMOVIDAS PELA CONTA (ou se não houver nenhuma)
        if (adsetPages.size === 0 || adsetPages.has(page.id)) {
          formsPromises.push(metaGet('forms', { page_id: page.id, page_token: page.access_token })
            .then(forms => forms.map(f => ({ ...f, pageName: page.name })))
            .catch(e => { console.warn(`Forms página ${page.name}:`, e); return []; })
          );
        }
      }
    }

    const formsArrs = await Promise.all(formsPromises);
    state.metaForms = (formsArrs || []).flat();

    renderForms();

    // Limpar seleções e filtros anteriores
    state.selectedCamps.clear();
    document.getElementById('campSearch').value = '';

    renderCampaignsList();
    renderSelectedItems();

    const isNovo = document.getElementById('formType').value === 'novo';
    if (!isNovo) {
      document.getElementById('campaignsAdsetsContainer').classList.remove('hidden');
    }

    st.textContent = `✅ ${state.metaCampaigns.length} campanhas, ${state.metaAdsets.length} conjuntos, ${state.metaForms.length} forms`;
  } catch (err) {
    st.textContent = `Erro ao carregar: ${err.message}`;
    console.error(err);
  }
}

export function renderForms() {
  const oldSearch = document.getElementById('oldFormSearch');
  const newSearch = document.getElementById('newFormSearch');
  const oldHidden = document.getElementById('oldFormId');
  const newHidden = document.getElementById('newFormId');

  let clientName = '';
  if (state.selectedClientIdx >= 0) {
    // Tenta usar o valor customizado ou o nome base
    clientName = (state.clients[state.selectedClientIdx].clientFieldValue || state.clients[state.selectedClientIdx].name).toLowerCase();
  }

  // Filtrar forms por Campanhas Selecionadas e pelo nome do cliente
  let sortedForms = [...state.metaForms];

  // Ocultar forms que não são do cliente selecionado (se encontrarmos matches)
  if (clientName) {
    const words = clientName.split(' ').filter(w => w.length > 3); // pega palavras chave

    // Verifica quais forms dão match no nome do form ou no nome da página
    const matchedForms = sortedForms.filter(f => {
      const fName = f.name.toLowerCase();
      const pName = (f.pageName || '').toLowerCase();
      return words.some(w => fName.includes(w) || pName.includes(w));
    });

    // Se encontrou forms que pertencem a esse cliente, mostramos APENAS eles.
    // Se não encontrou nenhum match (nome pode ser muito diferente), deixamos todos por segurança, mas ordenamos.
    if (matchedForms.length > 0) {
      sortedForms = matchedForms;
    }
  }

  state.sortedMetaForms = sortedForms;

  // Habilitar os inputs
  oldSearch.disabled = false;
  newSearch.disabled = false;
  oldSearch.placeholder = 'Buscar form antigo...';
  newSearch.placeholder = 'Buscar form novo...';

  // Limpar seleção anterior se o ID selecionado não estiver na nova lista filtrada
  const oldVal = oldHidden.value;
  const newVal = newHidden.value;

  if (oldVal && !state.sortedMetaForms.some(f => f.id === oldVal)) {
    oldHidden.value = '';
    oldSearch.value = '';
  }
  if (newVal && !state.sortedMetaForms.some(f => f.id === newVal)) {
    newHidden.value = '';
    newSearch.value = '';
  }
}

export async function fetchClientFieldValue(idx) {
  if (state.clients[idx].clientFieldValue) return; // Já possui, skip
  try {
    const data = await cuGet(`/list/${state.clients[idx].otimizacoesListId}/task?page=0&limit=1`);
    if (data.tasks && data.tasks.length > 0) {
      const cf = data.tasks[0].custom_fields?.find(f => f.name === 'Cliente');
      if (cf && cf.value) state.clients[idx].clientFieldValue = cf.value;
    }
  } catch (e) { console.warn('Campo cliente:', e); }
}
