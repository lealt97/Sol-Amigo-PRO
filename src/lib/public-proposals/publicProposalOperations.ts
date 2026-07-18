export type PublicProposalDecision = 'approved' | 'rejected';

export type PublicProposalPayload = Record<string, unknown> & {
  pdf_available?: boolean;
  pdf_url?: string | null;
  status?: string;
};

export type PublicProposalStatusUpdate = {
  token: string;
  status: PublicProposalDecision;
  reason: string | null;
  userAgent: string | null;
};

export interface PublicProposalRepository {
  fetchByToken(token: string): Promise<PublicProposalPayload | null>;
  createSignedPdfUrl(token: string): Promise<string | null>;
  updateStatus(input: PublicProposalStatusUpdate): Promise<unknown>;
}

export interface PublicProposalLogger {
  warn(message: string, error: unknown): void;
}

export class InvalidPublicProposalTokenError extends Error {
  constructor() {
    super('Token público da proposta inválido.');
    this.name = 'InvalidPublicProposalTokenError';
  }
}

const silentLogger: PublicProposalLogger = {
  warn: () => undefined,
};

export function normalizePublicProposalToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  if (token.length < 20 || token.length > 128) return null;
  return token;
}

export function normalizePublicProposalReason(
  status: PublicProposalDecision,
  value?: string | null,
): string | null {
  if (status !== 'rejected') return null;
  const reason = String(value || '').trim().slice(0, 1000);
  return reason || null;
}

export function normalizePublicProposalUserAgent(value?: string | null): string | null {
  const userAgent = String(value || '').trim().slice(0, 512);
  return userAgent || null;
}

export function createPublicProposalOperations(
  repository: PublicProposalRepository,
  logger: PublicProposalLogger = silentLogger,
) {
  const getProposalByToken = async (
    rawToken: unknown,
  ): Promise<PublicProposalPayload | null> => {
    const token = normalizePublicProposalToken(rawToken);
    if (!token) return null;

    const proposal = await repository.fetchByToken(token);
    if (!proposal) return null;

    let pdfUrl: string | null = null;
    if (proposal.pdf_available === true) {
      try {
        pdfUrl = await repository.createSignedPdfUrl(token);
      } catch (error) {
        logger.warn('Não foi possível criar a URL temporária do PDF público.', error);
      }
    }

    return {
      ...proposal,
      pdf_url: pdfUrl,
    };
  };

  const updateStatus = async (
    rawToken: unknown,
    status: PublicProposalDecision,
    reason?: string | null,
    userAgent?: string | null,
  ) => {
    const token = normalizePublicProposalToken(rawToken);
    if (!token) throw new InvalidPublicProposalTokenError();

    return repository.updateStatus({
      token,
      status,
      reason: normalizePublicProposalReason(status, reason),
      userAgent: normalizePublicProposalUserAgent(userAgent),
    });
  };

  return {
    getProposalByToken,
    updateStatus,
  };
}
