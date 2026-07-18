import type { Proposal } from '../../types/proposal';

export type PdfMetadataInput = {
  proposalId: string;
  publicToken: string;
  storagePath: string;
  secureUrl: string;
};

export interface PdfGenerationRepository {
  render(proposal: Proposal, selectedModelId?: string | null): Promise<Blob>;
  upload(storagePath: string, blob: Blob): Promise<void>;
  persistMetadata(input: PdfMetadataInput): Promise<string>;
  remove(storagePath: string): Promise<void>;
}

export interface PdfGenerationLogger {
  error(message: string, error: unknown): void;
  warn(message: string, error: unknown): void;
}

export type PdfGenerationOptions = {
  createToken: () => string;
  buildSecureUrl: (publicToken: string) => string;
  logger?: PdfGenerationLogger;
};

const silentLogger: PdfGenerationLogger = {
  error: () => undefined,
  warn: () => undefined,
};

function sanitizeStorageSegment(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function buildProposalPdfStoragePath(proposal: Proposal) {
  const userId = sanitizeStorageSegment(proposal.user_id);
  const proposalId = sanitizeStorageSegment(proposal.id);

  if (!userId || !proposalId) {
    throw new Error('Não foi possível definir o caminho seguro do PDF.');
  }

  return `${userId}/proposta-${proposalId}.pdf`;
}

export function createPdfGenerationOperations(
  repository: PdfGenerationRepository,
  options: PdfGenerationOptions,
) {
  const logger = options.logger || silentLogger;

  const generateAndStore = async (
    proposal: Proposal,
    selectedModelId?: string | null,
  ): Promise<string | null> => {
    let uploadedPath: string | null = null;

    try {
      const blob = await repository.render(proposal, selectedModelId);

      if (!(blob instanceof Blob) || blob.size <= 0) {
        throw new Error('O gerador produziu um PDF vazio.');
      }

      const storagePath = buildProposalPdfStoragePath(proposal);
      await repository.upload(storagePath, blob);
      uploadedPath = storagePath;

      const publicToken = proposal.public_token || options.createToken();
      const secureUrl = options.buildSecureUrl(publicToken);
      const persistedUrl = await repository.persistMetadata({
        proposalId: proposal.id,
        publicToken,
        storagePath,
        secureUrl,
      });

      const previousPath = proposal.pdf_storage_path;
      if (previousPath && previousPath !== storagePath) {
        try {
          await repository.remove(previousPath);
        } catch (cleanupError) {
          logger.warn('Não foi possível remover a versão anterior do PDF.', cleanupError);
        }
      }

      return persistedUrl || secureUrl;
    } catch (error) {
      const currentPath = proposal.pdf_storage_path || null;
      if (uploadedPath && uploadedPath !== currentPath) {
        try {
          await repository.remove(uploadedPath);
        } catch (rollbackError) {
          logger.warn('Não foi possível reverter o upload do PDF após a falha.', rollbackError);
        }
      }

      logger.error('Falha ao gerar ou armazenar o PDF da proposta.', error);
      return null;
    }
  };

  return { generateAndStore };
}
