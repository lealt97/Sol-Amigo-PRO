import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { resolvePdfDocumentTheme, type PdfDocumentTheme } from '../../../components/pdf/pdfTheme';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getVisibleProposalPages,
  type ProposalPageKey,
} from '../../../lib/pdf/proposalPageRegistry';
import { profileService } from '../../../services/profileService';
import { extractActiveLogo } from '../../../utils/logoHelper';
import { buildSvgTemplate } from '../engines/svgTemplateEngine';
import { pdfDesignService } from '../services/pdfDesignService';
import { PdfUserModel } from '../types/pdfDesignTypes';
import { ProposalPreviewPage } from './ProposalPagesPreviewWithVectorArt';
import { TimelineTallPreview } from './TimelineTallPreview';

interface PdfPreviewProps {
  model: PdfUserModel;
  isCardPreview?: boolean;
  onActivePageChange?: (pageKey: ProposalPageKey) => void;
}

export interface PdfPreviewHandle {
  scrollToPage: (pageKey: ProposalPageKey) => void;
}

const previewParityCss = `
  .pdf-preview-page [style*="linear-gradient(90deg"] {
    background: transparent !important;
  }

  .pdf-preview-page [style*="linear-gradient(145deg"] {
    background: var(--pdf-preview-surface) !important;
  }
`;

function PreviewTopStripe({ theme }: { theme: PdfDocumentTheme }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-50 flex h-2" aria-hidden="true">
      <div className="flex-1" style={{ backgroundColor: theme.primary }} />
      <div className="flex-1" style={{ backgroundColor: theme.secondary }} />
      <div className="flex-1" style={{ backgroundColor: theme.accent }} />
    </div>
  );
}

export const PdfPreview = forwardRef<PdfPreviewHandle, PdfPreviewProps>(function PdfPreview(
  { model, isCardPreview, onActivePageChange },
  ref,
) {
  const { user } = useAuth();
  const [profileLogo, setProfileLogo] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const preset = useMemo(() => pdfDesignService.getPreset(model.preset_id), [model.preset_id]);
  const [svgSource, setSvgSource] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Partial<Record<ProposalPageKey, HTMLDivElement | null>>>({});
  const visiblePages = useMemo(() => getVisibleProposalPages(model.page_config), [model.page_config]);
  const previewTheme = useMemo(() => resolvePdfDocumentTheme(model.theme), [model.theme]);

  useEffect(() => {
    async function loadProfileLogo() {
      if (!user) return;
      try {
        const profile = await profileService.getProfile(user.id);
        setProfileLogo(extractActiveLogo(profile.logo_url));
      } catch (err) {
        console.error('Error loading profile logo in preview:', err);
      }
    }
    loadProfileLogo();
  }, [user]);

  useEffect(() => {
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
        console.error('Error resolving private cover image in preview:', error);
        if (active) setCoverImageUrl(null);
      }
    }

    resolveCoverImage();
    return () => {
      active = false;
    };
  }, [model.cover_image_url]);

  useEffect(() => {
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

    loadSvg();
    return () => {
      active = false;
    };
  }, [preset]);

  const finalSvgContent = useMemo(() => {
    if (!svgSource || !preset) return '';

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
  }, [svgSource, preset, model, profileLogo, coverImageUrl]);

  const scrollToPage = useCallback((pageKey: ProposalPageKey) => {
    const container = scrollContainerRef.current;
    const page = pageRefs.current[pageKey];
    if (!container || !page) return;

    container.scrollTo({
      top: Math.max(0, page.offsetTop - 24),
      behavior: 'smooth',
    });
  }, []);

  useImperativeHandle(ref, () => ({ scrollToPage }), [scrollToPage]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container || !onActivePageChange || visiblePages.length === 0) return;

    const containerTop = container.getBoundingClientRect().top;
    let closestPage = visiblePages[0].key;
    let closestDistance = Number.POSITIVE_INFINITY;

    visiblePages.forEach(({ key }) => {
      const page = pageRefs.current[key];
      if (!page) return;
      const distance = Math.abs(page.getBoundingClientRect().top - containerTop - 24);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPage = key;
      }
    });

    onActivePageChange(closestPage);
  }, [onActivePageChange, visiblePages]);

  if (!preset) return <div className="text-slate-500">Preset não encontrado.</div>;
  if (!finalSvgContent) return <div className="text-slate-500">Carregando preview...</div>;

  if (isCardPreview) {
    return (
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: finalSvgContent }}
      />
    );
  }

  return (
    <>
      <style>{previewParityCss}</style>
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="h-full w-full overflow-y-auto scroll-smooth px-5 py-6"
      >
        <div className="mx-auto flex w-full max-w-[794px] flex-col gap-7 pb-12">
          {visiblePages.map((page, index) => (
            <div
              key={page.key}
              ref={(node) => {
                pageRefs.current[page.key] = node;
              }}
              data-pdf-page={page.key}
              className="pdf-preview-page relative aspect-[210/297] w-full shrink-0 overflow-hidden border border-brand-border bg-white shadow-2xl"
              style={{ '--pdf-preview-surface': previewTheme.surface } as CSSProperties}
            >
              {page.key !== 'cover' && <PreviewTopStripe theme={previewTheme} />}
              {page.key === 'cover' ? (
                <div
                  className="flex h-full w-full items-center justify-center [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: finalSvgContent }}
                />
              ) : page.key === 'timeline' ? (
                <TimelineTallPreview
                  pageNumber={index + 1}
                  theme={previewTheme}
                />
              ) : (
                <ProposalPreviewPage
                  pageKey={page.key}
                  pageNumber={index + 1}
                  theme={previewTheme}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
});
