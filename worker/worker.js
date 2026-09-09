const STATE_KEY = 'shared-state';

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-headers': 'authorization, content-type',
      'access-control-allow-methods': 'GET, PUT, OPTIONS',
      'cache-control': 'no-store',
      ...extra
    }
  });
}

function blankState() {
  return {
    schemaVersion: 1,
    revision: 0,
    updatedAt: new Date().toISOString(),
    tasks: [],
    notes: [],
    projects: [],
    dailyStates: []
  };
}

async function readState(env) {
  const raw = await env.HOME_KV.get(STATE_KEY, 'json');
  return raw && typeof raw === 'object' ? raw : blankState();
}

function authorized(request, env) {
  const expected = env.HOME_TOKEN;
  if (!expected) return false;
  const auth = request.headers.get('authorization') || '';
  return auth === `Bearer ${expected}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return json({ ok: true });
    if (url.pathname === '/health') return json({ ok: true, service: 'home-api' });
    if (url.pathname !== '/api/state') return json({ error: 'not_found' }, 404);
    if (!authorized(request, env)) return json({ error: 'unauthorized' }, 401);

    if (request.method === 'GET') {
      return json({ state: await readState(env) });
    }

    if (request.method === 'PUT') {
      let body;
      try { body = await request.json(); }
      catch { return json({ error: 'invalid_json' }, 400); }

      if (!body?.state || typeof body.state !== 'object') return json({ error: 'state_required' }, 400);
      const current = await readState(env);
      const expectedRevision = Number(body.ifRevision ?? 0);
      const currentRevision = Number(current.revision ?? 0);

      if (expectedRevision !== currentRevision) {
        return json({ error: 'revision_conflict', state: current }, 409);
      }

      const next = {
        schemaVersion: 1,
        ...body.state,
        revision: currentRevision + 1,
        updatedAt: new Date().toISOString()
      };

      for (const key of ['tasks', 'notes', 'projects', 'dailyStates']) {
        if (!Array.isArray(next[key])) next[key] = [];
      }

      await env.HOME_KV.put(STATE_KEY, JSON.stringify(next));
      return json({ state: next });
    }

    return json({ error: 'method_not_allowed' }, 405, { allow: 'GET, PUT, OPTIONS' });
  }
};
