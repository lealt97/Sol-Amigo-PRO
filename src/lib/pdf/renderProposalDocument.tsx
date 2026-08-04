import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ProposalDocument } from '../../components/pdf/ProposalDocument';
import { resolvePdfDocumentTheme } from '../../components/pdf/pdfTheme';
import type { PdfUserModel } from '../../types/pdfModels';
import type { Proposal } from '../../types/proposal';
import { buildProposalIllustrationImages } from './utils/illustrationColorEngine';
import { generateSvgCoverImage } from './utils/svgToImage';

interface RenderProposalDocumentInput {
  proposal: Proposal;
  model?: PdfUserModel | null;
}

/**
 * Fonte única de renderização do documento.
 * O editor e a exportação final precisam passar por esta função para que
 * capa, páginas A4, ordem, cores e ilustrações nunca sejam implementadas
 * de maneiras diferentes.
 */
export async function renderProposalDocumentBlob({
  proposal,
  model = null,
}: RenderProposalDocumentInput): Promise<Blob> {
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

  return pdf(
    <ProposalDocument
      proposal={proposal}
      coverImage={coverImage}
      pdfTheme={model?.theme}
      pageConfig={model?.page_config}
      illustrationImages={illustrationImages}
    />,
  ).toBlob();
}
