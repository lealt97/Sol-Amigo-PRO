import { resolvePdfDocumentTheme } from '../../components/pdf/pdfTheme';
import type { PdfPageConfig, PdfTheme, PdfUserModel } from '../../types/pdfModels';
import type { Proposal } from '../../types/proposal';
import {
  buildProposalIllustrationImages,
  type ProposalIllustrationImages,
} from './utils/illustrationColorEngine';
import { generateSvgCoverImage } from './utils/svgToImage';

interface PrepareProposalDocumentInput {
  proposal: Proposal;
  model?: PdfUserModel | null;
}

export interface PreparedProposalDocumentAssets {
  coverImage: string | null;
  pdfTheme: Partial<PdfTheme> | null;
  pageConfig: Partial<PdfPageConfig> | null;
  illustrationImages: ProposalIllustrationImages;
}

/**
 * Fonte única dos recursos usados pelo documento.
 * Tanto o editor quanto a exportação recebem exatamente a mesma capa,
 * o mesmo tema, a mesma configuração de páginas e as mesmas ilustrações.
 */
export async function prepareProposalDocumentAssets({
  proposal,
  model = null,
}: PrepareProposalDocumentInput): Promise<PreparedProposalDocumentAssets> {
  let coverImage: string | null = null;

  if (model) {
    try {
      coverImage = await generateSvgCoverImage(model, proposal);
    } catch (error) {
      console.warn('Não foi possível renderizar a capa personalizada do PDF.', error);
    }
  }

  const resolvedTheme = resolvePdfDocumentTheme(model?.theme);
  const illustrationImages = await buildProposalIllustrationImages(resolvedTheme);

  return {
    coverImage,
    pdfTheme: model?.theme ?? null,
    pageConfig: model?.page_config ?? null,
    illustrationImages,
  };
}
