import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function extractLegacyStoragePath(pdfUrl: string | null): string | null {
  if (!pdfUrl) return null;

  try {
    const url = new URL(pdfUrl);
    const markers = [
      '/storage/v1/object/public/proposals/',
      '/storage/v1/object/sign/proposals/',
    ];

    for (const marker of markers) {
      const markerIndex = url.pathname.indexOf(marker);
      if (markerIndex >= 0) {
        return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
      }
    }
  } catch {
    return null;
  }

  return null;
}

function isPublicTokenUnavailable(
  expiresAt: string | null,
  revokedAt: string | null,
): boolean {
  if (revokedAt) return true;
  if (!expiresAt) return false;

  const expirationTime = Date.parse(expiresAt);
  return !Number.isFinite(expirationTime) || expirationTime <= Date.now();
}

async function readToken(request: Request): Promise<string | null> {
  if (request.method === 'GET') {
    return new URL(request.url).searchParams.get('token');
  }

  if (request.method === 'POST') {
    const body = await request.json();
    return typeof body?.token === 'string' ? body.token : null;
  }

  return null;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (!['GET', 'POST'].includes(request.method)) {
    return jsonResponse({ error: 'Método não permitido.' }, 405);
  }

  try {
    const token = await readToken(request);

    if (typeof token !== 'string' || token.trim().length < 20 || token.length > 128) {
      return jsonResponse({ error: 'Token inválido.' }, 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
      return jsonResponse({ error: 'Serviço indisponível.' }, 500);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: proposal, error: proposalError } = await admin
      .from('proposals')
      .select(
        'pdf_storage_path, pdf_url, public_token_expires_at, public_token_revoked_at',
      )
      .eq('public_token', token.trim())
      .maybeSingle();

    if (proposalError) {
      console.error('Error locating public proposal PDF:', proposalError);
      return jsonResponse({ error: 'Não foi possível localizar o documento.' }, 500);
    }

    if (
      !proposal
      || isPublicTokenUnavailable(
        proposal.public_token_expires_at,
        proposal.public_token_revoked_at,
      )
    ) {
      return jsonResponse({ error: 'Proposta não encontrada.' }, 404);
    }

    const storagePath = proposal.pdf_storage_path
      || extractLegacyStoragePath(proposal.pdf_url);

    if (!storagePath) {
      return jsonResponse({ error: 'PDF não disponível.' }, 404);
    }

    const expiresIn = 15 * 60;
    const { data: signedData, error: signedError } = await admin.storage
      .from('proposals')
      .createSignedUrl(storagePath, expiresIn);

    if (signedError || !signedData?.signedUrl) {
      console.error('Error signing public proposal PDF:', signedError);
      return jsonResponse({ error: 'Não foi possível abrir o PDF.' }, 500);
    }

    if (request.method === 'GET') {
      return new Response(null, {
        status: 302,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store',
          Location: signedData.signedUrl,
        },
      });
    }

    return jsonResponse({
      signedUrl: signedData.signedUrl,
      expiresIn,
    });
  } catch (error) {
    console.error('Unexpected public-proposal-pdf error:', error);
    return jsonResponse({ error: 'Requisição inválida.' }, 400);
  }
});
