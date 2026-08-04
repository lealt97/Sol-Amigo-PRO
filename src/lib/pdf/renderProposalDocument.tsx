import React from 'react';
import { pdf } from '@react-pdf/renderer';
import { ProposalDocument } from '../../components/pdf/ProposalDocument';
import { resolvePdfDocumentTheme } from '../../components/pdf/pdfTheme';
import type { PdfUserModel } from '../../types/pdfModels';
import type { Proposal } from '../../types/proposal';
import { buildProposalIllustrationImages } from './utils/illustrationColorEngine';
import { generateSvgCoverImage } from './utils/svgToImage';

export interface RenderProposalDocumentInput {
  proposal: Proposal;
  model?: PdfUserModel | null;
}

/**
 * Única entrada de renderização visual da proposta.
 *
 * Tanto o arquivo definitivo quanto o preview do menu Design PDF passam por
 * esta função. Isso impede que um componente HTML aproximado se afaste do PDF
 * realmente entregue ao cliente.
 */
export async function renderProposalDocumentBlob({
  proposal,
  model,
}: RenderProposalDocumentInput): Promise<Blob> {
  const resolvedTheme = resolvePdfDocumentTheme(model?.theme);
  const [coverImage, illustrationImages] = await Promise.all([
    model ? generateSvgCoverImage(model, proposal) : Promise.resolve(null),
    buildProposalIllustrationImages(resolvedTheme),
  ]);

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
