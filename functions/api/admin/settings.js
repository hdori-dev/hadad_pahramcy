import { json, handle, readJson, methodNotAllowed } from '../../../lib/http.js';
import { cleanSettings, loadSettings } from '../../../lib/settings.js';

export const onRequest = handle(async ({ request, env }) => {
  if (request.method === 'GET') return json({ settings: await loadSettings(env) });
  if (request.method === 'PUT') {
    const clean = cleanSettings(await readJson(request));
    const stmts = Object.entries(clean).map(([k, v]) =>
      env.DB.prepare('INSERT INTO settings(key,value) VALUES(?1,?2) ON CONFLICT(key) DO UPDATE SET value=?2').bind(k, v));
    if (stmts.length) await env.DB.batch(stmts);
    return json({ ok: true, settings: await loadSettings(env) });
  }
  return methodNotAllowed();
});
