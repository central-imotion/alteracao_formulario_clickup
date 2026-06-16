// Estado compartilhado entre os módulos. Mantido como um único objeto mutável
// porque módulos ES não permitem reatribuir bindings importados diretamente.
export const state = {
  clients: [],
  mappings: [],
  mappingCounter: 0,
  selectedClientIdx: -1,
  metaForms: [],
  metaCampaigns: [],
  metaAdsets: [],
  selectedCamps: new Set(),
  metaAccounts: [],
  sortedMetaForms: [],
  selectedAdAccountIdx: -1,
  selectedOldFormIdx: -1,
  selectedNewFormIdx: -1,
  isManualForms: false,
  metaPages: []
};
