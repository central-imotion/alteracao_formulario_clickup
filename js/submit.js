import { state } from './state.js';
import { cuPost, logToSheets } from './api.js';
import { formatDateBR } from './utils.js';
import { getMappings, addMapping } from './mappings.js';
import { renderSelectedItems } from './campaigns.js';
import { showModal, showToast, setFormType, getFormLabel } from './ui.js';

export async function submitForm() {
  const btn = document.getElementById('submitBtn');
  const clientIdx = document.getElementById('clientSelect').value;
  const clientEmail = document.getElementById('clientEmail').value.trim();
  const isNovo = document.getElementById('formType').value === 'novo';

  // Auto-set Prioridade Urgente (1) e Prazo baseado no horário e dia da semana (timezone São Paulo)
  const priority = 1;
  const spNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  let d = new Date(spNow);

  // Se criada após as 16h (horário de SP), joga para amanhã
  if (spNow.getHours() >= 16) {
    d.setDate(d.getDate() + 1);
  }

  // Se o prazo cair no final de semana, move para segunda-feira
  if (d.getDay() === 6) { // Sábado
    d.setDate(d.getDate() + 2);
  } else if (d.getDay() === 0) { // Domingo
    d.setDate(d.getDate() + 1);
  }

  const yyyy = d.getFullYear(), mm = String(d.getMonth() + 1).padStart(2, '0'), dd = String(d.getDate()).padStart(2, '0');
  const goLive = `${yyyy}-${mm}-${dd}`;

  const oldForm = getFormLabel('oldFormId', 'oldFormManual');
  const newForm = getFormLabel('newFormId', 'newFormManual');

  // Obter textos de campanhas selecionadas
  const selectedCampObjs = state.metaCampaigns.filter(c => state.selectedCamps.has(c.id));
  const campTexts = isNovo ? [] : selectedCampObjs.map(c => c.name);
  const sheetsLink = document.getElementById('sheetsLink').value.trim();
  const obs = document.getElementById('observations').value.trim();
  const mapData = getMappings();

  if (clientIdx === '' || (isNovo && !clientEmail) || !newForm || (!isNovo && !oldForm) || !sheetsLink) {
    showToast('Preencha todos os campos obrigatórios (*)', 'error');
    return;
  }

  const goLiveBR = formatDateBR(goLive);
  const client = state.clients[parseInt(clientIdx)];
  btn.disabled = true;
  btn.textContent = '⏳ Criando task...';

  // ── Montar descrição com markdown (--- = divider no ClickUp) ──
  let md = `## 📋 IDENTIFICADORES TÉCNICOS\n\n---\n\n`;
  if (!isNovo) {
    md += `▸ **Form Antigo:** ${oldForm}\n`;
    md += `▸ **Form Novo:** ${newForm}\n`;
  } else {
    md += `▸ **Form Novo:** ${newForm}\n`;
    md += `▸ **E-mail do Cliente:** ${clientEmail}\n`;
  }

  md += `\n## 📊 PLANILHA DE LEADS\n\n---\n\n▸ **Link:** ${sheetsLink}\n`;

  if (campTexts.length > 0) {
    md += `\n## 🎯 CAMPANHAS AFETADAS\n\n---\n\n`;
    campTexts.forEach(c => { md += `▸ ${c}\n`; });
    if (!isNovo) md += `\n⚠️ Todos os conjuntos de anúncios dentro das campanhas acima serão alterados.\n`;
  }

  if (!isNovo && mapData.length > 0) {
    md += `\n## 🔧 PERGUNTAS / CONFIGURAÇÕES ALTERADAS\n\n---\n\n`;
    mapData.forEach(m => { md += `▸ **[${m.typeLabel}]** — ${m.description}\n`; });
  }

  if (obs) {
    md += `\n## 📝 OBSERVAÇÕES\n\n---\n\n${obs}\n`;
  }

  md += `\n---\n\n⚡ *Task gerada automaticamente pelo Formulário de ${isNovo ? 'Criação' : 'Transição'} — iMotion Agency*`;

  const dueMs = new Date(goLive + 'T23:59:59').getTime();
  const clientName = client.clientFieldValue || client.name;
  const taskName = isNovo ? 'Criação de Formulário - Meta Ads' : 'Transição de Formulários - Meta Ads';

  const taskBody = {
    name: taskName,
    markdown_description: md,
    assignees: [],
    tags: [isNovo ? 'novo-form' : 'transicao-form'],
    priority: priority,
    due_date: dueMs,
    due_date_time: false,
    status: 'agendado',
    custom_fields: [
      { id: '7a39eb0f-c345-4a0e-afb6-731face29d55', value: 'b1728ec3-c653-4bed-9367-298e041fa637' },
      { id: '255f93b7-5151-4786-b1ba-076a50fa0ded', value: clientName },
      { id: '44731507-befe-40e3-b64e-fd9ed7eb52bb', value: true }
    ]
  };

  try {
    const task = await cuPost(`/list/${client.otimizacoesListId}/task`, taskBody);

    // Determine responsible persons dynamically from task assignees
    const assignedIds = (task.assignees || []).map(a => Number(a.id));
    const names = [];
    if (assignedIds.includes(3068737)) names.push('Ricardo');
    if (assignedIds.includes(272628636)) names.push('Herick');
    if (assignedIds.includes(82143493)) names.push('Thierry');
    const responsavelText = names.join(' e ') || 'Ricardo e Herick';

    const checklist = await cuPost(`/task/${task.id}/checklist`, { name: isNovo ? 'Passos de Execução' : 'Execução da Transição' });

    let checkItems = [];
    if (isNovo) {
      checkItems = [
        'Seguir passos do checklist: https://docs.google.com/document/d/1Pnwqp6WllLZssFRFKAqd45LTviCy4l1XiATa9NM1Ie0/edit?usp=sharing'
      ];
    } else {
      checkItems = [
        'Alterar o gatilho de forms na automação do Make para o novo formulário (seguindo nomenclatura padrão)',
        'Desconectar o trigger do restante da automação e disparar um teste no Meta for Business',
        'Reconectar o Trigger no restante da automação',
        'Reconfigurar os novos campos em TODOS os módulos do Make (Sheets, HTTP Request, HTML do Email, Kommo etc)',
        'Salvar tudo e disparar um teste final',
        'Apagar o dado do teste da planilha de leads do cliente',
        'Trocar o forms novo nos anúncios indicados pelo gestor dentro da campanha do cliente',
      ];
    }
    for (const item of checkItems) {
      await cuPost(`/checklist/${checklist.checklist.id}/checklist_item`, { name: item });
    }

    const taskUrl = `https://app.clickup.com/t/${task.id}`;

    logToSheets({
      timestamp: new Date().toLocaleString('pt-BR'),
      cliente: clientName,
      email: clientEmail,
      formAntigo: isNovo ? '-' : oldForm,
      formNovo: newForm,
      campanhas: campTexts.join('; '),
      alteracoes: (!isNovo && mapData.length > 0) ? mapData.map(m => `[${m.typeLabel}] ${m.description}`).join('; ') : '-',
      responsavel: responsavelText,
      prioridade: ['', '🔴 Urgente', '🟡 Alta', '🔵 Normal', '🟢 Baixa'][priority],
      prazo: goLiveBR,
      taskUrl, taskId: task.id
    });

    showModal('✅ Task Criada com Sucesso!', `
      <div class="space-y-4">
        <div class="p-4 rounded-xl bg-success/10 border border-success/20">
          <p class="text-success font-semibold text-sm mb-1">Task criada em:</p>
          <p class="text-dark-200 text-sm">${client.name} → Otimizações</p>
        </div>
        <div class="space-y-2 text-sm">
          <p class="text-dark-400">Nome: <span class="text-dark-200">${taskName}</span></p>
          <p class="text-dark-400">Cliente: <span class="text-dark-200">${clientName}</span></p>
          <p class="text-dark-400">Tipo: <span class="text-dark-200">${isNovo ? '🆕 Novo Form' : '🔄 Transição'}</span></p>
          <p class="text-dark-400">Responsável: <span class="text-dark-200">${responsavelText}</span></p>
          <p class="text-dark-400">Prioridade: <span class="text-dark-200">${['', '🔴 Urgente', '🟡 Alta', '🔵 Normal', '🟢 Baixa'][priority]}</span></p>
          <p class="text-dark-400">Prazo: <span class="text-dark-200">${goLiveBR}</span></p>
        </div>
        <a href="${taskUrl}" target="_blank" class="btn-primary inline-block text-center text-sm no-underline" style="text-decoration:none;">Abrir Task no ClickUp ↗</a>
      </div>
    `);

    showToast('Task criada com sucesso!', 'success');
    document.getElementById('mainForm').reset();

    // Reset Custom UI & State
    document.getElementById('clientSearch').value = '';
    document.getElementById('clientSelect').value = '';
    state.selectedClientIdx = -1;

    document.getElementById('adAccountSearch').value = '';
    document.getElementById('adAccountSelect').value = '';
    state.selectedAdAccountIdx = -1;

    document.getElementById('oldFormSearch').value = '';
    document.getElementById('oldFormSearch').placeholder = 'Selecione a conta primeiro...';
    document.getElementById('oldFormSearch').disabled = true;
    document.getElementById('oldFormId').value = '';
    state.selectedOldFormIdx = -1;

    document.getElementById('newFormSearch').value = '';
    document.getElementById('newFormSearch').placeholder = 'Selecione a conta primeiro...';
    document.getElementById('newFormSearch').disabled = true;
    document.getElementById('newFormId').value = '';
    state.selectedNewFormIdx = -1;

    document.getElementById('sheetsLink').value = '';
    document.getElementById('metaStatus').textContent = '';

    document.getElementById('campaignsList').innerHTML = '<div class="text-xs text-dark-500">Aguardando conta de anúncio...</div>';
    document.getElementById('campaignsAdsetsContainer').classList.add('hidden');
    document.getElementById('campSearch').value = '';
    state.selectedCamps.clear();
    renderSelectedItems();

    state.metaForms = [];
    state.metaCampaigns = [];
    state.metaAdsets = [];

    document.getElementById('mappingsContainer').innerHTML = '';
    state.mappings = [];
    addMapping();
    setFormType('transicao');

  } catch (err) {
    console.error(err);
    showModal('❌ Erro ao Criar Task', `<div class="p-4 rounded-xl bg-danger/10 border border-danger/20"><p class="text-danger text-sm font-mono">${err.message}</p></div>`);
    showToast('Erro ao criar task', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🚀 Criar Task de Automação';
  }
}
