// Performance cache: teamId never changes, safe to reset on cold start
let cachedTeamId = null;

async function getTeamId(token) {
  if (cachedTeamId) return cachedTeamId;
  const r = await fetch('https://api.clickup.com/api/v2/team', {
    headers: { 'Authorization': token }
  });
  const data = await r.json();
  cachedTeamId = data.teams[0].id;
  return cachedTeamId;
}

// Stateless assignee rotation: reads the last task from ClickUp instead of relying
// on in-memory state (which resets on every serverless cold start).
async function getNextAssigneeFromClickUp(token, herickId, thierryId) {
  const BASE = 'https://api.clickup.com/api/v2';
  const headers = { 'Authorization': token };

  try {
    const teamId = await getTeamId(token);
    const taskParams = 'order_by=date_created&reverse_sort=true&include_closed=true&page=0&limit=1';

    // Two separate queries because tasks only carry ONE of these tags at a time.
    // A combined tags[] query uses AND logic in ClickUp and would return 0 results.
    const [novoRes, transicaoRes] = await Promise.all([
      fetch(`${BASE}/team/${teamId}/task?tags[]=novo-form&${taskParams}`, { headers }),
      fetch(`${BASE}/team/${teamId}/task?tags[]=transicao-form&${taskParams}`, { headers })
    ]);

    const [novoData, transicaoData] = await Promise.all([novoRes.json(), transicaoRes.json()]);

    const novoTask      = novoData.tasks?.[0]      ?? null;
    const transicaoTask = transicaoData.tasks?.[0] ?? null;

    // Pick whichever of the two is more recent
    let lastTask = null;
    if (novoTask && transicaoTask) {
      lastTask = Number(novoTask.date_created) >= Number(transicaoTask.date_created)
        ? novoTask
        : transicaoTask;
    } else {
      lastTask = novoTask ?? transicaoTask;
    }

    if (!lastTask) {
      console.log('[Assignee] Sem histórico de tasks — padrão: herick');
      return 'herick';
    }

    const assigneeIds = (lastTask.assignees || []).map(a => Number(a.id));

    if (assigneeIds.includes(herickId)) {
      console.log(`[Assignee] Última task (${lastTask.id}) foi Herick → próximo: thierry`);
      return 'thierry';
    }
    if (assigneeIds.includes(thierryId)) {
      console.log(`[Assignee] Última task (${lastTask.id}) foi Thierry → próximo: herick`);
      return 'herick';
    }

    // Nenhum dos dois gestores encontrado na última task (edge case)
    console.log(`[Assignee] Última task (${lastTask.id}) sem gestor identificado — padrão: herick`);
    return 'herick';

  } catch (err) {
    console.error('[Assignee] Erro ao consultar ClickUp — padrão: herick', err);
    return 'herick';
  }
}

export default async function handler(req, res) {
  // ── Tokens seguros (Environment Variables da Vercel) ──
  const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
  const RICARDO_ID    = parseInt(process.env.RICARDO_ID || '3068737');
  const THIERRY_ID    = parseInt(process.env.THIERRY_ID || '82143493');
  const HERICK_ID     = parseInt(process.env.HERICK_ID || '272628636');
  const BASE          = 'https://api.clickup.com/api/v2';

  if (!CLICKUP_TOKEN) {
    return res.status(500).json({ error: 'CLICKUP_API_TOKEN não configurado nas variáveis de ambiente.' });
  }

  // ── Resolve o path da API ──
  const apiPath = req.query.path;
  if (!apiPath) {
    return res.status(400).json({ error: 'Parâmetro "path" obrigatório.' });
  }

  // ── Se for criação de task, injeta Ricardo e o gestor correspondente como assignees ──
  let body = req.body;
  if (req.method === 'POST' && apiPath.includes('/task') && !apiPath.includes('/checklist')) {
    if (body && typeof body === 'object') {
      const ids = new Set((body.assignees || []).map(Number));
      ids.add(RICARDO_ID);

      const nextAssignee = await getNextAssigneeFromClickUp(CLICKUP_TOKEN, HERICK_ID, THIERRY_ID);
      if (nextAssignee === 'herick') {
        ids.add(HERICK_ID);
      } else {
        ids.add(THIERRY_ID);
      }

      body.assignees = [...ids];

      // Remove a propriedade temporária para não poluir ou dar erro na chamada oficial do ClickUp
      delete body.unidade;
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
