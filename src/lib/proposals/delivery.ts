export type WhatsAppShareInput = {
  phone?: string | null;
  clientName?: string | null;
  proposalTitle?: string | null;
  publicUrl: string;
};

function getRuntimeBasePath() {
  if (typeof window === 'undefined') return '';
  const configuredBase = import.meta.env?.BASE_URL || '/';
  if (configuredBase === '/') return '';
  return `/${configuredBase.replace(/^\/+|\/+$/g, '')}`;
}

export function buildPublicProposalUrl(publicToken: string | null | undefined, origin: string) {
  if (!publicToken) return null;
  const cleanOrigin = origin.replace(/\/+$/, '');
  return `${cleanOrigin}${getRuntimeBasePath()}/proposta/${encodeURIComponent(publicToken)}`;
}

export function normalizeWhatsAppPhone(phone?: string | null) {
  let digits = String(phone || '').replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

export function buildWhatsAppShareUrl(input: WhatsAppShareInput) {
  const phone = normalizeWhatsAppPhone(input.phone);
  const greeting = input.clientName?.trim() ? `Olá, ${input.clientName.trim()}!` : 'Olá!';
  const proposalName = input.proposalTitle?.trim() || 'sua proposta de energia solar';
  const message = [
    greeting,
    '',
    `A proposta “${proposalName}” está disponível para visualização.`,
    'Você pode abrir o PDF e aceitar ou recusar diretamente pelo link:',
    input.publicUrl,
  ].join('\n');
  const baseUrl = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}

export function buildQrCodeImageUrl(publicUrl: string, size = 320) {
  const safeSize = Math.max(160, Math.min(600, Math.round(size)));
  return `https://api.qrserver.com/v1/create-qr-code/?size=${safeSize}x${safeSize}&margin=8&data=${encodeURIComponent(publicUrl)}`;
}
