import { PdfTheme, TransformConfig } from '../../../types/pdfModels';
import { buildSvgTemplate } from '../../../features/design-pdf/engines/svgTemplateEngine';

type CoverValues = {
  clientName?: string;
  powerKwp?: string;
  cityState?: string;
  date?: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  coverImageTransform?: TransformConfig;
  logoTransform?: TransformConfig;
};

type CoverTheme = {
  current: PdfTheme;
  original?: PdfTheme;
};

export function buildCoverSvg(svgSource: string, theme: CoverTheme, values: CoverValues = {}, modelId?: string) {
  return buildSvgTemplate({
    svgSource,
    theme,
    texts: {
      clientName: values.clientName,
      powerKwp: values.powerKwp,
      cityState: values.cityState,
      date: values.date,
    },
    logoUrl: values.logoUrl,
    coverImageUrl: values.coverImageUrl,
    logoTransform: values.logoTransform,
    coverImageTransform: values.coverImageTransform,
    modelId,
  });
}
