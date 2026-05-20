export default async function handler(req, res) {
  // ── Token seguro (Environment Variable da Vercel) ──
  const META_TOKEN = process.env.META_ACCESS_TOKEN;
  const GRAPH_URL  = 'https://graph.facebook.com/v21.0';

  if (!META_TOKEN) {
    return res.status(500).json({ error: 'META_ACCESS_TOKEN não configurado nas variáveis de ambiente.' });
  }

  // ── Helper: busca todas as páginas de resultados (cursor-based pagination) ──
  async function fetchAllPages(url) {
    const allData = [];
    let nextUrl = url;
    while (nextUrl) {
      const r = await fetch(nextUrl);
      const data = await r.json();
      if (data.error) throw new Error(data.error.message);
      allData.push(...(data.data || []));
      nextUrl = data.paging?.next || null;
    }
    return allData;
  }

  const { action } = req.query;

  try {
    // ── Lista contas de anúncio acessíveis ──
    if (action === 'adaccounts') {
      const data = await fetchAllPages(`${GRAPH_URL}/me/adaccounts?fields=id,name,account_id&limit=200&access_token=${META_TOKEN}`);
      return res.status(200).json(data);
    }

    // ── Lista campanhas de uma conta ──
    if (action === 'campaigns') {
      const accountId = req.query.account_id;
      if (!accountId) return res.status(400).json({ error: 'account_id obrigatório' });
      const data = await fetchAllPages(`${GRAPH_URL}/act_${accountId}/campaigns?fields=id,name,status,objective&limit=500&access_token=${META_TOKEN}`);
      return res.status(200).json(data);
    }

    // ── Lista conjuntos de anúncios de uma conta ──
    if (action === 'adsets') {
      const accountId = req.query.account_id;
      if (!accountId) return res.status(400).json({ error: 'account_id obrigatório' });
      const campaignId = req.query.campaign_id;
      let url;
      if (campaignId) {
        url = `${GRAPH_URL}/${campaignId}/adsets?fields=id,name,status&limit=500&access_token=${META_TOKEN}`;
      } else {
        url = `${GRAPH_URL}/act_${accountId}/adsets?fields=id,name,status,campaign_id,promoted_object&limit=500&access_token=${META_TOKEN}`;
      }
      const data = await fetchAllPages(url);
      return res.status(200).json(data);
    }

    // ── Lista lead gen forms de uma página ──
    if (action === 'forms') {
      const pageId = req.query.page_id;
      if (!pageId) return res.status(400).json({ error: 'page_id obrigatório' });
      const pToken = req.query.page_token || META_TOKEN;
      const data = await fetchAllPages(`${GRAPH_URL}/${pageId}/leadgen_forms?fields=id,name,status,leads_count&limit=200&access_token=${pToken}`);
      return res.status(200).json(data);
    }

    // ── Mapa de Ads Ativos para filtrar por Form ──
    if (action === 'ads_map') {
      const accountId = req.query.account_id;
      if (!accountId) return res.status(400).json({ error: 'account_id obrigatório' });
      // Busca anúncios incluindo pausados e arquivados para encontrar formulários antigos
      const url = `${GRAPH_URL}/act_${accountId}/ads?fields=campaign_id,adset_id,creative{object_story_spec,asset_feed_spec}&filtering=[{"field":"ad.effective_status","operator":"IN","value":["ACTIVE","PAUSED","CAMPAIGN_PAUSED","ADSET_PAUSED","ARCHIVED","DELETED"]}]&limit=500&access_token=${META_TOKEN}`;
      const ads = await fetchAllPages(url);
      
      const map = {};
      
      for (const ad of ads) {
        let formId = null;
        
        // Extrair formId de object_story_spec
        if (ad.creative?.object_story_spec?.link_data?.call_to_action?.value?.lead_gen_form_id) {
            formId = ad.creative.object_story_spec.link_data.call_to_action.value.lead_gen_form_id;
        } else if (ad.creative?.object_story_spec?.video_data?.call_to_action?.value?.lead_gen_form_id) {
            formId = ad.creative.object_story_spec.video_data.call_to_action.value.lead_gen_form_id;
        }
        
        // Tentar extrair do root lead_gen_form_id caso exista
        if (!formId && ad.creative?.lead_gen_form_id) {
           formId = ad.creative.lead_gen_form_id;
        }

        if (formId) {
          if (!map[formId]) map[formId] = { campaigns: new Set(), adsets: new Set() };
          map[formId].campaigns.add(ad.campaign_id);
          map[formId].adsets.add(ad.adset_id);
        }
      }
      
      // Converter Sets para Arrays
      const result = {};
      for (const [fId, obj] of Object.entries(map)) {
        result[fId] = { campaigns: [...obj.campaigns], adsets: [...obj.adsets] };
      }
      return res.status(200).json(result);
    }

    // ── Lista páginas acessíveis (pra associar forms) ──
    if (action === 'pages') {
      const data = await fetchAllPages(`${GRAPH_URL}/me/accounts?fields=id,name,access_token&limit=200&access_token=${META_TOKEN}`);
      return res.status(200).json(data);
    }

    return res.status(400).json({ error: 'Ação inválida. Use: adaccounts, campaigns, adsets, forms, pages' });

  } catch (err) {
    console.error('Meta API proxy error:', err);
    return res.status(500).json({ error: 'Erro interno ao conectar com o Meta.' });
  }
}
