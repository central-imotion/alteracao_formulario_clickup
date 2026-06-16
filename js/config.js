export const CONFIG = {
  SPACE_ID: '90141290843',
  CU: '/api/clickup?path=',
  META: '/api/meta',
  SHEETS_LOG_URL: 'https://script.google.com/macros/s/AKfycbzP9Mn7wiMdh96Y-4Ir463UIDgcsBY6Ztn6Jt4K7Qlor7x12jrWOpayeMxzJs7gSdtk/exec'
};

export const CHANGE_TYPES = [
  { value: 'add_question', label: '➕ Adicionar pergunta' },
  { value: 'remove_question', label: '➖ Remover pergunta' },
  { value: 'change_options', label: '🔄 Mudar opções da pergunta' },
  { value: 'add_remove_elimination', label: '🚫 Adicionar/Remover eliminação' },
  { value: 'internal_config', label: '⚙️ Configuração interna' }
];
