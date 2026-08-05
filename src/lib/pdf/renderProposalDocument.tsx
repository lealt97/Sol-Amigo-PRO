import { resolvePdfDocumentTheme } from '../../components/pdf/pdfTheme';
import type { PdfPageConfig, PdfTheme, PdfUserModel } from '../../types/pdfModels';
import type { Proposal } from '../../types/proposal';
import type { ProposalPageKey } from './proposalPageRegistry';
import {
  applyPdfThemeToIllustration,
  buildProposalIllustrationImages,
  defaultProposalIllustrationImages,
  TIMELINE_ILLUSTRATION_RENDER_OPTIONS,
  type ProposalIllustrationImages,
} from './utils/illustrationColorEngine';
import { generateSvgCoverImage } from './utils/svgToImage';

interface PrepareProposalDocumentInput {
  proposal: Proposal;
  model?: PdfUserModel | null;
  previewPageKey?: ProposalPageKey | null;
}

export interface PreparedProposalDocumentAssets {
  coverImage: string | null;
  pdfTheme: Partial<PdfTheme> | null;
  pageConfig: Partial<PdfPageConfig> | null;
  illustrationImages: ProposalIllustrationImages;
}

async function prepareIllustrationsForPage(
  resolvedTheme: ReturnType<typeof resolvePdfDocumentTheme>,
  previewPageKey: ProposalPageKey | null,
): Promise<ProposalIllustrationImages> {
  if (!previewPageKey) {
    return buildProposalIllustrationImages(resolvedTheme);
  }

  const images = { ...defaultProposalIllustrationImages };

  switch (previewPageKey) {
    case 'intro':
      images.intro = await applyPdfThemeToIllustration(
        images.intro,
        resolvedTheme,
        { outputWidth: 2200 },
      );
      break;
    case 'kit':
      images.kit = await applyPdfThemeToIllustration(
        images.kit,
        resolvedTheme,
        { outputWidth: 1800 },
      );
      break;
    case 'timeline':
      images.timeline = await applyPdfThemeToIllustration(
        images.timeline,
        resolvedTheme,
        TIMELINE_ILLUSTRATION_RENDER_OPTIONS,
      );
      break;
    case 'financial':
    case 'payback':
      images.financial = await applyPdfThemeToIllustration(
        images.financial,
        resolvedTheme,
        { outputWidth: 1800 },
      );
      break;
    default:
      break;
  }

  return images;
}

/**
 * Fonte única dos recursos usados pelo documento.
 * Tanto o editor quanto a exportação recebem a mesma capa, o mesmo tema,
 * a mesma configuração de páginas e as mesmas ilustrações. No editor,
 * somente os recursos da página ativa são preparados para reduzir a latência.
 */
export async function prepareProposalDocumentAssets({
  proposal,
  model = null,
  previewPageKey = null,
}: PrepareProposalDocumentInput): Promise<PreparedProposalDocumentAssets> {
  const resolvedTheme = resolvePdfDocumentTheme(model?.theme);
  const shouldPrepareCover = Boolean(model && (!previewPageKey || previewPageKey === 'cover'));

  const coverPromise: Promise<string | null> = shouldPrepareCover && model
    ? generateSvgCoverImage(model, proposal).catch((error) => {
      console.warn('Não foi possível renderizar a capa personalizada do PDF.', error);
      return null;
    })
    : Promise.resolve(null);

  const [coverImage, illustrationImages] = await Promise.all([
    coverPromise,
    prepareIllustrationsForPage(resolvedTheme, previewPageKey),
  ]);

  return {
    coverImage,
    pdfTheme: model?.theme ?? null,
    pageConfig: model?.page_config ?? null,
    illustrationImages,
  };
}
