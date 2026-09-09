import { createClient } from '@supabase/supabase-js';

interface TokenClaims {
  exp?: number;
  client_id?: string;
  scope?: string | string[];
}

function decodeClaims(token: string): TokenClaims {
  try {
    const payload = token.split('.')[1];
    if (!payload) return {};
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as TokenClaims;
  } catch {
    return {};
  }
}

export async function verifySupabaseToken(token: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY are required');

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new Error('Invalid or expired Supabase access token');

  const claims = decodeClaims(token);
  const scopes = Array.isArray(claims.scope)
    ? claims.scope
    : typeof claims.scope === 'string'
      ? claims.scope.split(' ').filter(Boolean)
      : [];

  return {
    token,
    clientId: claims.client_id ?? 'supabase-oauth-client',
    scopes,
    expiresAt: claims.exp ?? Math.floor(Date.now() / 1000) + 300
  };
}
