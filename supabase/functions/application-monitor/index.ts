import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

const ALLOWED_EVENT_TYPES = new Set([
  'pdf.generation_failed',
  'checkout.failed',
  'storage.asset_failed',
  'client.unhandled_error',
]);

const ALLOWED_SEVERITIES = new Set(['warning', 'error', 'critical']);
const SENSITIVE_KEY_PATTERN = /(password|secret|token|authorization|cookie|session|card|cvv|document|cpf|cnpj)/i;

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 3 || value === null || value === undefined) return null;
  if (typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return value.slice(0, 300);
  if (Array.isArray(value)) return value.slice(0, 10).map((item) => sanitizeValue(item, depth + 1));
  if (typeof value !== 'object') return String(value).slice(0, 300);

  const result: Record<string, unknown> = {};
  const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
  for (const [key, item] of entries) {
    const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, '_').slice(0, 80);
    if (!safeKey || SENSITIVE_KEY_PATTERN.test(safeKey)) {
      if (safeKey) result[safeKey] = '[redacted]';
      continue;
    }
    result[safeKey] = sanitizeValue(item, depth + 1);
  }
  return result;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);

  const accessToken = readBearerToken(request);
  if (!accessToken) return jsonResponse({ error: 'Sessão inválida.' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('application-monitor: missing Supabase server credentials');
    return jsonResponse({ error: 'Serviço indisponível.' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
  if (userError || !userData.user) return jsonResponse({ error: 'Sessão inválida.' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Corpo da requisição inválido.' }, 400);
  }

  const eventType = typeof body.eventType === 'string' ? body.eventType : '';
  const severity = typeof body.severity === 'string' ? body.severity : 'error';
  if (!ALLOWED_EVENT_TYPES.has(eventType) || !ALLOWED_SEVERITIES.has(severity)) {
    return jsonResponse({ error: 'Evento de monitoramento inválido.' }, 400);
  }

  const fingerprint = typeof body.fingerprint === 'string'
    ? body.fingerprint.replace(/[^a-zA-Z0-9_.:-]/g, '_').slice(0, 160)
    : `${eventType}:generic`;
  const requestId = request.headers.get('x-request-id')?.slice(0, 160) || crypto.randomUUID();
  const metadata = sanitizeValue(body.metadata) as Record<string, unknown> | null;

  const { error } = await admin.from('application_events').insert({
    account_id: userData.user.id,
    source: eventType.startsWith('pdf.') ? 'pdf' : eventType.startsWith('checkout.') ? 'billing_checkout' : 'web',
    event_type: eventType,
    severity,
    request_id: requestId,
    fingerprint,
    metadata: metadata || {},
  });

  if (error) {
    console.error('application-monitor: insert failed', { code: error.code, eventType });
    return jsonResponse({ error: 'Falha ao registrar evento.' }, 500);
  }

  return jsonResponse({ accepted: true, requestId }, 202);
});
