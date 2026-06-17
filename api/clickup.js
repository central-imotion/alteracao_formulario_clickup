const SHEET_ID = '1zi2nFkepQDjVvzHu4ButQxRT4JKUI2mqNHr69kThciU';

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

// Reads the last logged task from the public Google Sheet to determine who's next.
// Uses the gviz CSV export which works without authentication on public sheets.
async function getNextAssigneeFromSheets() {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=Sheet1`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Sheets HTTP ${r.status}`);
    const text = await r.text();
    const rows = text.trim().split('\n').filter(l => l.trim());

    if (rows.length < 2) {
      console.log('[Assignee] Planilha sem dados — padrão: herick');
      return 'herick';
    }

    // Find the Responsável column from the header row
    const headers = parseCSVLine(rows[0]);
    const respIdx = headers.findIndex(h => h.toLowerCase().replace(/[^a-z]/g, '').includes('respons'));

    if (respIdx === -1) {
      console.warn('[Assignee] Coluna "Responsável" não encontrada no header — padrão: herick');
      return 'herick';
    }

    // Read the last data row
    const lastCols = parseCSVLine(rows[rows.length - 1]);
    const responsavel = (lastCols[respIdx] || '').toLowerCase().replace(/"/g, '');

    if (responsavel.includes('herick')) {
      console.log(`[Assignee] Último responsável: Herick → próximo: thierry`);
      return 'thierry';
    }
    if (responsavel.includes('thierry')) {
      console.log(`[Assignee] Último responsável: Thierry → próximo: herick`);
      return 'herick';
    }

    console.log(`[Assignee] Responsável não identificado ("${responsavel}") — padrão: herick`);
    return 'herick';

  } catch (err) {
    console.error('[Assignee] Erro ao consultar Sheets — padrão: herick', err);
    return 'herick';
  }
}

export default async function handler(req, res) {
  const CLICKUP_TOKEN = process.env.CLICKUP_API_TOKEN;
  const RICARDO_ID    = parseInt(process.env.RICARDO_ID || '3068737');
  const THIERRY_ID    = parseInt(process.env.THIERRY_ID || '82143493');
  const HERICK_ID     = parseInt(process.env.HERICK_ID || '272628636');
  const BASE          = 'https://api.clickup.com/api/v2';

  if (!CLICKUP_TOKEN) {
    return res.status(500).json({ error: 'CLICKUP_API_TOKEN não configurado nas variáveis de ambiente.' });
  }

  // ── Action: preview de quem recebe a próxima task (chamado pelo frontend) ──
  if (req.query.action === 'next_assignee') {
    const next = await getNextAssigneeFromSheets();
    const name = next === 'thierry' ? 'Thierry' : 'Herick';
    return res.status(200).json({ next, name });
  }

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

      const nextAssignee = await getNextAssigneeFromSheets();
      ids.add(nextAssignee === 'thierry' ? THIERRY_ID : HERICK_ID);
      body.assignees = [...ids];

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
