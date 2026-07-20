import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  buildStripeIdempotencyKey,
  createStripeClient,
  loadStripeServerConfig,
  STRIPE_PROVIDER,
} from '../_shared/stripeBilling.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  const [scheme, token] = authorization.trim().split(/\s+/, 2);
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

function normalizedDisplayName(metadata: Record<string, unknown> | undefined) {
  const name = typeof metadata?.name === 'string' ? metadata.name.trim() : '';
  const companyName = typeof metadata?.company_name === 'string'
    ? metadata.company_name.trim()
    : '';
  return companyName || name || undefined;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  const accessToken = readBearerToken(request);
  if (!accessToken) {
    return jsonResponse({ error: 'Sessão inválida.' }, 401);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('stripe-customer: missing Supabase server credentials');
    return jsonResponse({ error: 'Serviço indisponível.' }, 500);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  try {
    const { data: userData, error: userError } = await admin.auth.getUser(accessToken);
    if (userError || !userData.user) {
      return jsonResponse({ error: 'Sessão inválida.' }, 401);
    }

    const user = userData.user;
    const { data: subscription, error: subscriptionError } = await admin
      .from('subscriptions')
      .select('id, provider, provider_customer_id')
      .eq('account_id', user.id)
      .maybeSingle();

    if (subscriptionError || !subscription) {
      console.error('stripe-customer: subscription lookup failed', subscriptionError);
      return jsonResponse({ error: 'Assinatura indisponível.' }, 500);
    }

    if (subscription.provider && subscription.provider !== STRIPE_PROVIDER) {
      return jsonResponse({ error: 'A conta já está vinculada a outro provedor.' }, 409);
    }

    if (subscription.provider_customer_id) {
      return jsonResponse({ linked: true, existing: true });
    }

    const config = loadStripeServerConfig();
    const stripe = createStripeClient(config);

    const customer = await stripe.customers.create(
      {
        email: user.email || undefined,
        name: normalizedDisplayName(user.user_metadata as Record<string, unknown> | undefined),
        metadata: {
          supabase_account_id: user.id,
          product: 'solamigo',
        },
      },
      {
        idempotencyKey: buildStripeIdempotencyKey('customer:create', user.id),
      },
    );

    const { data: updatedSubscription, error: updateError } = await admin
      .from('subscriptions')
      .update({
        provider: STRIPE_PROVIDER,
        provider_customer_id: customer.id,
      })
      .eq('account_id', user.id)
      .is('provider_customer_id', null)
      .select('id')
      .maybeSingle();

    if (updateError) {
      console.error('stripe-customer: subscription update failed', updateError);
      return jsonResponse({ error: 'Não foi possível vincular a conta.' }, 500);
    }

    if (!updatedSubscription) {
      const { data: currentSubscription, error: currentError } = await admin
        .from('subscriptions')
        .select('provider, provider_customer_id')
        .eq('account_id', user.id)
        .maybeSingle();

      if (
        currentError ||
        currentSubscription?.provider !== STRIPE_PROVIDER ||
        !currentSubscription.provider_customer_id
      ) {
        console.error('stripe-customer: concurrent link verification failed', currentError);
        return jsonResponse({ error: 'Não foi possível confirmar o vínculo.' }, 500);
      }

      return jsonResponse({ linked: true, existing: true });
    }

    const { error: eventError } = await admin.from('billing_events').insert({
      account_id: user.id,
      subscription_id: subscription.id,
      event_type: 'provider.customer_linked',
      source: 'system',
      provider: STRIPE_PROVIDER,
      metadata: {
        provider: STRIPE_PROVIDER,
      },
    });

    if (eventError) {
      console.error('stripe-customer: event insert failed', eventError);
    }

    return jsonResponse({ linked: true, existing: false });
  } catch (error) {
    console.error('stripe-customer: unexpected failure', error);
    return jsonResponse({ error: 'Não foi possível conectar o provedor de pagamentos.' }, 500);
  }
});
