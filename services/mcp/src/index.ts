import { createMcpFastifyApp } from '@modelcontextprotocol/fastify';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { verifySupabaseToken } from './auth.js';
import { buildHomeServer } from './server.js';

const port = Number(process.env.MCP_PORT ?? 8787);
const host = process.env.MCP_HOST ?? '127.0.0.1';
const allowNoAuth = process.env.MCP_ALLOW_NO_AUTH === 'true';
const publicMcpUrl = process.env.MCP_PUBLIC_URL ?? `http://${host}:${port}/mcp`;
const protectedResourceUrl = new URL('/.well-known/oauth-protected-resource', publicMcpUrl).toString();
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, '');
const authorizationServer = supabaseUrl ? `${supabaseUrl}/auth/v1` : null;

const app = createMcpFastifyApp({ host });
const handler = createMcpHandler((ctx) => buildHomeServer(ctx.authInfo?.token));
const nodeHandler = toNodeHandler(handler);

app.get('/health', async () => ({ ok: true, service: 'lingqi-home-mcp' }));

app.get('/.well-known/oauth-protected-resource', async (_request, reply) => {
  if (!authorizationServer) return reply.code(503).send({ error: 'SUPABASE_URL is not configured' });
  return reply.send({
    resource: publicMcpUrl,
    authorization_servers: [authorizationServer],
    scopes_supported: ['email', 'profile']
  });
});

app.get('/.well-known/oauth-protected-resource/mcp', async (_request, reply) => {
  if (!authorizationServer) return reply.code(503).send({ error: 'SUPABASE_URL is not configured' });
  return reply.send({
    resource: publicMcpUrl,
    authorization_servers: [authorizationServer],
    scopes_supported: ['email', 'profile']
  });
});

app.all('/mcp', async (request, reply) => {
  const authorization = request.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7).trim() : undefined;

  if (!token && !allowNoAuth) {
    reply
      .code(401)
      .header('WWW-Authenticate', `Bearer resource_metadata="${protectedResourceUrl}" scope="email profile"`)
      .send({ error: 'OAuth authorization required' });
    return;
  }

  let auth;
  if (token) {
    try {
      auth = await verifySupabaseToken(token);
    } catch {
      reply
        .code(401)
        .header('WWW-Authenticate', `Bearer error="invalid_token" resource_metadata="${protectedResourceUrl}"`)
        .send({ error: 'Invalid or expired access token' });
      return;
    }
  }

  return nodeHandler(Object.assign(request.raw, { auth }), reply.raw, request.body);
});

await app.listen({ port, host });
console.error(`Home MCP listening on http://${host}:${port}/mcp`);
