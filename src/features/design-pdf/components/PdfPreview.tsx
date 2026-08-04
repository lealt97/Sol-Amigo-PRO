import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getVisibleProposalPages,
  type ProposalPageKey,
} from '../../../lib/pdf/proposalPageRegistry';
import { renderProposalDocumentBlob } from '../../../lib/pdf/renderProposalDocument';
import { profileService } from '../../../services/profileService';
import { extractActiveLogo } from '../../../utils/logoHelper';
import { buildSvgTemplate } from '../engines/svgTemplateEngine';
import { pdfDesignService } from '../services/pdfDesignService';
import type { PdfUserModel } from '../types/pdfDesignTypes';
import { createDesignPdfPreviewProposal } from '../utils/createDesignPdfPreviewProposal';

interface PdfPreviewProps {
  model: PdfUserModel;
  isCardPreview?: boolean;
  onActivePageChange?: (pageKey: ProposalPageKey) => void;
}

export interface PdfPreviewHandle {
  scrollToPage: (pageKey: ProposalPageKey) => void;
}

const PDF_VIEWER_HASH = 'zoom=page-fit&toolbar=0&navpanes=0&scrollbar=1';
const PREVIEW_RENDER_DELAY_MS = 180;

export const PdfPreview = forwardRef<PdfPreviewHandle, PdfPreviewProps>(function PdfPreview(
  { model, isCardPreview = false, onActivePageChange },
  ref,
) {
  const { user } = useAuth();
  const [profileLogo, setProfileLogo] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [svgSource, setSvgSource] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRenderingPdf, setIsRenderingPdf] = useState(!isCardPreview);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [activePageKey, setActivePageKey] = useState<ProposalPageKey>('cover');
  const previewUrlRef = useRef<string | null>(null);
  const preset = useMemo(() => pdfDesignService.getPreset(model.preset_id), [model.preset_id]);
  const visiblePages = useMemo(() => getVisibleProposalPages(model.page_config), [model.page_config]);

  const replacePreviewUrl = useCallback((nextUrl: string | null) => {
    const previousUrl = previewUrlRef.current;
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);

    if (previousUrl && previousUrl !== nextUrl) {
      URL.revokeObjectURL(previousUrl);
    }
  }, []);

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    async function loadProfileLogo() {
      if (!user) return;
      try {
        const profile = await profileService.getProfile(user.id);
        setProfileLogo(extractActiveLogo(profile.logo_url));
      } catch (error) {
        console.error('Error loading profile logo in PDF preview:', error);
      }
    }

    void loadProfileLogo();
  }, [user]);

  useEffect(() => {
    if (!visiblePages.some(({ key }) => key === activePageKey)) {
      const fallbackPage = visiblePages[0]?.key || 'cover';
      setActivePageKey(fallbackPage);
      onActivePageChange?.(fallbackPage);
    }
  }, [activePageKey, onActivePageChange, visiblePages]);

  useEffect(() => {
    if (isCardPreview) return;

    let active = true;
    const timer = window.setTimeout(() => {
      const renderPreview = async () => {
        setIsRenderingPdf(true);
        setRenderError(null);

        try {
          const proposal = createDesignPdfPreviewProposal(profileLogo);
          const blob = await renderProposalDocumentBlob({ proposal, model });
          if (!active) return;

          replacePreviewUrl(URL.createObjectURL(blob));
        } catch (error) {
          console.error('Erro ao gerar o PDF usado no preview do editor:', error);
          if (active) {
            setRenderError('Não foi possível gerar a visualização fiel do PDF.');
          }
        } finally {
          if (active) setIsRenderingPdf(false);
        }
      };

      void renderPreview();
    }, PREVIEW_RENDER_DELAY_MS);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isCardPreview, model, profileLogo, replacePreviewUrl]);

  useEffect(() => {
    if (!isCardPreview) return;

    let active = true;

    async function resolveCoverImage() {
      if (!model.cover_image_url) {
        setCoverImageUrl(null);
        return;
      }

      try {
        const resolved = await pdfDesignService.resolveAssetUrl(model.cover_image_url, 900);
        if (active) setCoverImageUrl(resolved);
      } catch (error) {
        console.error('Error resolving private cover image in card preview:', error);
        if (active) setCoverImageUrl(null);
      }
    }

    void resolveCoverImage();
    return () => {
      active = false;
    };
  }, [isCardPreview, model.cover_image_url]);

  useEffect(() => {
    if (!isCardPreview) return;

    let active = true;

    async function loadSvg() {
      if (!preset) {
        setSvgSource('');
        return;
      }

      try {
        const text = await pdfDesignService.getPresetSvgContent(preset.id);
        if (active) setSvgSource(text);
      } catch (error) {
        console.error('Erro ao carregar SVG do preset:', error);
        if (active) setSvgSource('');
      }
    }

    void loadSvg();
    return () => {
      active = false;
    };
  }, [isCardPreview, preset]);

  const finalSvgContent = useMemo(() => {
    if (!isCardPreview || !svgSource || !preset) return '';

    return buildSvgTemplate({
      svgSource,
      theme: {
        current: model.theme,
        original: preset.default_theme,
      },
      texts: {
        clientName: 'Cliente Exemplo Ltda',
        powerKwp: '12,50 kWp',
        cityState: 'São Paulo - SP',
        date: new Date().toLocaleDateString('pt-BR'),
      },
      logoUrl: extractActiveLogo(model.logo_url) || profileLogo,
      coverImageUrl,
      logoTransform: model.logo_transform,
      coverImageTransform: model.cover_image_transform,
      modelId: model.id,
    });
  }, [coverImageUrl, isCardPreview, model, preset, profileLogo, svgSource]);

  const scrollToPage = useCallback((pageKey: ProposalPageKey) => {
    if (!visiblePages.some(({ key }) => key === pageKey)) return;
    setActivePageKey(pageKey);
    onActivePageChange?.(pageKey);
  }, [onActivePageChange, visiblePages]);

  useImperativeHandle(ref, () => ({ scrollToPage }), [scrollToPage]);

  const activePageNumber = useMemo(() => {
    const index = visiblePages.findIndex(({ key }) => key === activePageKey);
    return Math.max(1, index + 1);
  }, [activePageKey, visiblePages]);

  const iframeSource = previewUrl
    ? `${previewUrl}#page=${activePageNumber}&${PDF_VIEWER_HASH}`
    : null;

  if (isCardPreview) {
    if (!preset) return <div className="text-slate-500">Preset não encontrado.</div>;
    if (!finalSvgContent) return <div className="text-slate-500">Carregando preview...</div>;

    return (
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: finalSvgContent }}
      />
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      {iframeSource ? (
        <iframe
          key={`${previewUrl}-${activePageNumber}`}
          title="Visualização fiel do PDF final"
          src={iframeSource}
          className="h-full w-full border-0 bg-slate-900"
        />
      ) : (
        <div className="flex h-full items-center justify-center text-sm font-semibold text-slate-300">
          Gerando o mesmo PDF que será entregue ao cliente...
        </div>
      )}

      {isRenderingPdf && (
        <div className="pointer-events-none absolute right-5 top-5 rounded-full border border-white/10 bg-slate-950/85 px-4 py-2 text-xs font-bold text-white shadow-xl backdrop-blur">
          Atualizando PDF final...
        </div>
      )}

      {renderError && (
        <div className="absolute inset-x-5 bottom-5 rounded-xl border border-red-400/30 bg-red-950/90 p-4 text-sm font-semibold text-red-100 shadow-xl">
          {renderError}
        </div>
      )}
    </div>
  );
});
