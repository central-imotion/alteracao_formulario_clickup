export default async function handler(req, res) {
  // ── Tokens seguros (Environment Variables da Vercel) ──
  const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN || 'pk_3068737_B93TDGSW2CSRIU5LFEHOOCDU0RYENTZU';
  const RICARDO_ID    = parseInt(process.env.RICARDO_ID || '3068737');
  const THIERRY_ID    = parseInt(process.env.THIERRY_ID || '82143493');
  const BASE          = 'https://api.clickup.com/api/v2';

  if (!CLICKUP_TOKEN) {
    return res.status(500).json({ error: 'CLICKUP_API_TOKEN não configurado nas variáveis de ambiente.' });
  }

  // ── Resolve o path da API ──
  const apiPath = req.query.path;
  if (!apiPath) {
    return res.status(400).json({ error: 'Parâmetro "path" obrigatório.' });
  }

  // ── Se for criação de task, injeta Ricardo e Thierry como assignees ──
  let body = req.body;
  if (req.method === 'POST' && apiPath.includes('/task') && !apiPath.includes('/checklist')) {
    if (body && typeof body === 'object') {
      const ids = new Set((body.assignees || []).map(Number));
      ids.add(RICARDO_ID);
      ids.add(THIERRY_ID);
      body.assignees = [...ids];
    }
  }

  // ── Proxy para o ClickUp ──
  const url = `${BASE}${apiPath}`;
  const opts = {
    method: req.method || 'GET',
    headers: {
      'Authorization': CLICKUP_TOKEN,
      'Content-Type':  'application/json'
    }
  };
  if (req.method !== 'GET' && req.method !== 'HEAD' && body) {
    opts.body = JSON.stringify(body);
  }

  try {
    const r = await fetch(url, opts);
    const ct = r.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await r.json() : await r.text();
    if (!r.ok) return res.status(r.status).json({ error: data });
    return res.status(200).json(data);
  } catch (err) {
    console.error('ClickUp proxy error:', err);
    return res.status(500).json({ error: 'Erro interno ao conectar com o ClickUp.' });
  }
}
