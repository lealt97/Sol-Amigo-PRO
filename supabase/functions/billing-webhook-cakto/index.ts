import { createClient } from 'npm:@supabase/supabase-js@2';

const responseHeaders = {
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function readString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function findValueDeep(value: unknown, keys: Set<string>, depth = 0): unknown {
  if (depth > 7 || value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findValueDeep(item, keys, depth + 1);
      if (found !== null && found !== undefined) return found;
    }
    return null;
  }
  if (typeof value !== 'object') return null;

  const record = value as Record<string, unknown>;
  for (const [key, item] of Object.entries(record)) {
    if (keys.has(key.toLowerCase()) && item !== null && item !== undefined) return item;
  }
  for (const item of Object.values(record)) {
    const found = findValueDeep(item, keys, depth + 1);
    if (found !== null && found !== undefined) return found;
  }
  return null;
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function resolvePresentedSecret(request: Request, payload: Record<string, unknown>) {
  const authorization = request.headers.get('authorization') || '';
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || null;
  const fields = asRecord(payload.fields);
  return request.headers.get('x-cakto-secret')
    || request.headers.get('x-webhook-secret')
    || bearer
    || readString(payload.secret)
    || readString(fields.secret);
}

function resolveEventType(payload: Record<string, unknown>) {
  const direct = readString(payload.event)
    || readString(payload.event_type)
    || readString(payload.type);
  if (direct) return direct;

  const nested = findValueDeep(payload, new Set(['custom_id', 'event_name']));
  return readString(nested);
}

function parseTrackingCode(payload: Record<string, unknown>) {
  const raw = readString(findValueDeep(payload, new Set(['sck', 'tracking_code', 'trackingcode'])));
  if (!raw) return null;
  const match = raw.match(/^solamigo\.([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(month|year)$/i);
  if (!match) return null;
  return {
    accountId: match[1].toLowerCase(),
    interval: match[2] as 'month' | 'year',
  };
}

function resolveProviderIdentifier(payload: Record<string, unknown>, keys: string[]) {
  const value = findValueDeep(payload, new Set(keys.map((key) => key.toLowerCase())));
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return readString(asRecord(value).id);
}

function mapCaktoStatus(eventType: string) {
  if (['purchase_approved', 'subscription_created', 'subscription_renewed'].includes(eventType)) return 'active';
  if (['subscription_renewal_refused', 'purchase_refused'].includes(eventType)) return 'past_due';
  if (['subscription_canceled', 'refund', 'chargeback'].includes(eventType)) return 'canceled';
  return null;
}

function parseDate(value: unknown) {
  const raw = readString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return jsonResponse({ error: 'Método não permitido.' }, 405);

  const webhookSecret = String(Deno.env.get('CAKTO_WEBHOOK_SECRET') || '').trim();
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('billing-webhook-cakto: missing server configuration');
    return jsonResponse({ error: 'Serviço indisponível.' }, 503);
  }

  const rawBody = await request.text();
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: 'Payload inválido.' }, 400);
  }

  const presentedSecret = resolvePresentedSecret(request, payload);
  if (!presentedSecret || !constantTimeEqual(presentedSecret, webhookSecret)) {
    return jsonResponse({ error: 'Segredo inválido.' }, 401);
  }

  const eventType = resolveEventType(payload);
  if (!eventType) return jsonResponse({ error: 'Evento inválido.' }, 400);

  const supportedEvents = new Set([
    'purchase_approved',
    'purchase_refused',
    'subscription_created',
    'subscription_canceled',
    'subscription_renewed',
    'subscription_renewal_refused',
    'refund',
    'chargeback',
  ]);
  if (!supportedEvents.has(eventType)) return jsonResponse({ received: true, ignored: true });

  const tracking = parseTrackingCode(payload);
  if (!tracking) {
    console.error('billing-webhook-cakto: missing or invalid SolAmigo tracking code', { eventType });
    return jsonResponse({ error: 'Conta não identificada.' }, 422);
  }

  const rawEventId = resolveProviderIdentifier(payload, ['event_id', 'eventid'])
    || resolveProviderIdentifier(payload, ['order_id', 'orderid', 'refid'])
    || resolveProviderIdentifier(payload, ['id']);
  const eventId = rawEventId
    ? `${eventType}:${rawEventId}`
    : `${eventType}:sha256:${await sha256Hex(rawBody)}`;

  const providerSubscriptionId = resolveProviderIdentifier(payload, [
    'subscription_id',
    'subscriptionid',
    'subscription',
  ]);
  const providerCustomerId = resolveProviderIdentifier(payload, [
    'customer_id',
    'customerid',
    'customer',
  ]);
  const status = mapCaktoStatus(eventType);
  const graceDays = Math.min(30, Math.max(0, Number(Deno.env.get('BILLING_GRACE_DAYS') || 3)));
  const gracePeriodEndsAt = status === 'past_due'
    ? new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const periodStart = parseDate(findValueDeep(payload, new Set([
    'current_period_start',
    'period_start',
    'startedat',
  ])));
  const periodEnd = parseDate(findValueDeep(payload, new Set([
    'current_period_end',
    'period_end',
    'next_charge_date',
    'nextbillingdate',
  ])));

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const { data, error } = await admin.rpc('apply_billing_provider_event', {
    p_provider: 'cakto',
    p_provider_event_id: eventId,
    p_event_type: eventType,
    p_account_id: tracking.accountId,
    p_provider_customer_id: providerCustomerId,
    p_provider_subscription_id: providerSubscriptionId,
    p_billing_interval: tracking.interval,
    p_status: status,
    p_current_period_start: periodStart,
    p_current_period_end: periodEnd,
    p_grace_period_ends_at: gracePeriodEndsAt,
    p_metadata: {
      has_order_reference: Boolean(rawEventId),
    },
  });

  if (error) {
    console.error('billing-webhook-cakto: apply event failed', {
      eventId,
      eventType,
      code: error.code,
    });
    return jsonResponse({ error: 'Falha ao processar evento.' }, 500);
  }

  return jsonResponse({ received: true, result: data });
});
