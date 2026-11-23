import { json, handle, methodNotAllowed } from '../../../lib/http.js';
import { issueNonce } from '../../../lib/auth.js';

export const onRequest = handle(async ({ request, env }) => {
  if (request.method !== 'GET') return methodNotAllowed();
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_nonces').first();
  if (n.n > 300) return json({ error: 'طلبات كثيرة', code: 'busy' }, 429);
  return json({ nonce: await issueNonce(env), clientId: env.GOOGLE_CLIENT_ID || '' });
});
