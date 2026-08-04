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
import { profileService } from '../../../services/profileService';
import type { Proposal } from '../../../types/proposal';
import { extractActiveLogo } from '../../../utils/logoHelper';
import { buildSvgTemplate } from '../engines/svgTemplateEngine';
import { pdfDesignService } from '../services/pdfDesignService';
import type { PdfUserModel } from '../types/pdfDesignTypes';

interface PdfPreviewProps {
  model: PdfUserModel;
  isCardPreview?: boolean;
  onActivePageChange?: (pageKey: ProposalPageKey) => void;
}

export interface PdfPreviewHandle {
  scrollToPage: (pageKey: ProposalPageKey) => void;
}

type PreviewProfile = NonNullable<Proposal['profile']>;
type ProposalPdfModule = typeof import('../../../lib/pdf/generateProposalPdf');

interface ExactPdfDocumentPreviewProps {
  proposal: Proposal;
  model: PdfUserModel;
  activePageKey: ProposalPageKey;
}

interface PreviewRenderRequest {
  sequence: number;
  proposal: Proposal;
  model: PdfUserModel;
  activePageKey: ProposalPageKey;
}

let proposalPdfModulePromise: Promise<ProposalPdfModule> | null = null;

function loadProposalPdfModule() {
  if (!proposalPdfModulePromise) {
    proposalPdfModulePromise = import('../../../lib/pdf/generateProposalPdf');
  }
  return proposalPdfModulePromise;
}

const defaultPreviewProfile: PreviewProfile = {
  company_name: 'Sol Amigo PRO',
  logo_url: null,
  seller_name: 'Consultor Solar',
  seller_phone: '(00) 00000-0000',
  seller_email: 'contato@empresa.com.br',
  seller_signature_url: null,
  website: 'www.empresa.com.br',
  company_email: 'contato@empresa.com.br',
  default_validity_days: 7,
  default_margin_percentage: 30,
};

function buildPreviewProposal(
  userId: string | undefined,
  profile: PreviewProfile,
  selectedLogo: string | null,
): Proposal {
  const now = new Date().toISOString();

  return {
    id: 'pdf-design-preview',
    user_id: userId || 'preview-user',
    client_id: 'preview-client',
    code: 'PREVIEW-001',
    title: 'Proposta comercial fotovoltaica',
    status: 'draft',
    system_type: 'on_grid',
    consumption_source: 'historical',
    history: [812, 784, 829, 846, 901, 934, 918, 887, 862, 831, 806, 790],
    estimated_daily_consumption: 28.3,
    monthly_consumption_kwh: 850,
    bill_amount: 820,
    energy_tariff: 0.96,
    battery_capacity_kwh: null,
    usable_battery_capacity_kwh: null,
    backup_power_kw: null,
    autonomy_hours: null,
    essential_loads_description: null,
    roof_type: 'Telhado cerâmico',
    roof_area_m2: 95,
    roof_image_url: null,
    roof_photo_url: null,
    roof_plan_image_url: null,
    roof_latitude_degrees: null,
    roof_planes_json: null,
    roof_orientation_factor: 0.96,
    effective_performance_ratio: 0.81,
    module_width_m: 1.13,
    module_height_m: 2.28,
    roof_layout_json: null,
    selected_solar_kit_id: 'preview-kit',
    solar_kit_snapshot: {
      id: 'preview-kit',
      name: 'Kit On-grid 12,50 kWp',
      supplier: 'Distribuidor homologado',
      system_type: 'on_grid',
      module_brand: 'Fabricante de referência',
      module_model: 'Módulo monocristalino 550 Wp',
      module_power_w: 550,
      module_quantity: 24,
      module_height_m: 2.28,
      module_width_m: 1.13,
      inverter_brand: 'Fabricante de referência',
      inverter_model: 'Inversor on-grid 10 kW',
      inverter_power_kw: 10,
      grid_connection_type: 'triphase',
      grid_voltage_v: 380,
      structure_type: 'Estrutura para telhado cerâmico',
      battery_brand: null,
      battery_model: null,
      battery_capacity_kwh: null,
      usable_battery_capacity_kwh: null,
      battery_quantity: null,
      backup_power_kw: null,
      autonomy_hours: null,
      essential_loads_description: null,
      kit_power_kwp: 13.2,
      cost_price: 27300,
      sale_price: 42900,
    },
    kit_cost: 27300,
    labor_cost: 4800,
    fixed_costs: 1200,
    freight_cost: 900,
    taxes: 2500,
    commission: 1400,
    other_costs: 500,
    margin_percentage: 30,
    discount_percentage: 0,
    total_cost: 30030,
    gross_price: 42900,
    discount_value: 0,
    final_price: 42900,
    estimated_profit: 12870,
    real_margin_percentage: 30,
    markup_percentage: 42.86,
    pdf_url: null,
    pdf_storage_path: null,
    public_token: null,
    sent_whatsapp_at: null,
    accepted_at: null,
    rejected_at: null,
    created_at: now,
    updated_at: now,
    client: {
      name: 'Cliente Exemplo Ltda',
      document: '00.000.000/0001-00',
      email: 'cliente@exemplo.com.br',
      phone: '(11) 99999-9999',
      cep: '00000-000',
      city: 'São Paulo',
      state: 'SP',
      address: 'Avenida Exemplo',
      number: '100',
      neighborhood: 'Centro',
      complement: null,
    },
    solar: {
      installed_power_kwp: 13.2,
      required_power_kwp: 12.5,
      monthly_consumption_kwh: 850,
      projected_consumption_kwh: 850,
      estimated_monthly_generation_kwh: 905,
      estimated_annual_generation_kwh: 10860,
      monthly_savings: 820,
      annual_savings: 9840,
      payback_years: 4,
      payback_months: 4,
      net_savings_25_years: 318000,
      return_25_years: 318000,
    } as unknown as Proposal['solar'],
    profile: {
      ...profile,
      logo_url: selectedLogo || profile.logo_url,
    },
  };
}

function ExactPdfDocumentPreview({
  proposal,
  model,
  activePageKey,
}: ExactPdfDocumentPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderError, setRenderError] = useState<string | null>(null);
  const pdfUrlRef = useRef<string | null>(null);
  const renderSequenceRef = useRef(0);
  const latestRequestRef = useRef<PreviewRenderRequest | null>(null);
  const renderingRef = useRef(false);
  const frameRef = useRef<number | null>(null);
  const mountedRef = useRef(true);

  const scheduleRender = useCallback(function scheduleLatestRender() {
    if (!mountedRef.current || renderingRef.current || frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const request = latestRequestRef.current;

      if (!request) {
        setIsRendering(false);
        return;
      }

      latestRequestRef.current = null;
      renderingRef.current = true;
      setIsRendering(true);
      setRenderError(null);

      void loadProposalPdfModule()
        .then(({ renderProposalPdfBlob }) => renderProposalPdfBlob(
          request.proposal,
          request.model,
          { previewPageKey: request.activePageKey },
        ))
        .then((blob) => {
          if (!mountedRef.current || request.sequence !== renderSequenceRef.current) return;

          const nextUrl = URL.createObjectURL(blob);
          const previousUrl = pdfUrlRef.current;
          pdfUrlRef.current = nextUrl;
          setPdfUrl(nextUrl);

          if (previousUrl) URL.revokeObjectURL(previousUrl);
        })
        .catch((error) => {
          if (!mountedRef.current || request.sequence !== renderSequenceRef.current) return;
          console.error('Error rendering exact PDF preview:', error);
          setRenderError('Não foi possível atualizar a visualização do PDF.');
        })
        .finally(() => {
          renderingRef.current = false;
          if (!mountedRef.current) return;

          if (latestRequestRef.current) {
            scheduleLatestRender();
          } else {
            setIsRendering(false);
          }
        });
    });
  }, []);

  useEffect(() => {
    const sequence = renderSequenceRef.current + 1;
    renderSequenceRef.current = sequence;
    latestRequestRef.current = {
      sequence,
      proposal,
      model,
      activePageKey,
    };
    setIsRendering(true);
    scheduleRender();
  }, [activePageKey, model, proposal, scheduleRender]);

  useEffect(() => {
    mountedRef.current = true;
    void loadProposalPdfModule();

    return () => {
      mountedRef.current = false;
      latestRequestRef.current = null;
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
      if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    };
  }, []);

  const iframeSource = pdfUrl
    ? `${pdfUrl}#page=1&zoom=page-width&toolbar=0&navpanes=0`
    : undefined;

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900 p-5">
      {iframeSource ? (
        <iframe
          key={pdfUrl}
          src={iframeSource}
          title="Visualização exata do PDF da proposta"
          className="h-full w-full rounded-xl border border-brand-border bg-slate-800 shadow-2xl"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-xl border border-brand-border bg-slate-950/40 text-sm text-slate-300">
          Gerando a visualização exata do PDF...
        </div>
      )}

      {isRendering && pdfUrl && (
        <div className="pointer-events-none absolute right-8 top-8 rounded-full border border-brand-border bg-slate-950/90 px-3 py-1.5 text-xs font-semibold text-slate-200 shadow-lg">
          Atualizando...
        </div>
      )}

      {renderError && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-lg border border-red-500/40 bg-red-950/95 px-4 py-2 text-sm font-medium text-red-100 shadow-xl">
          {renderError}
        </div>
      )}
    </div>
  );
}

export const PdfPreview = forwardRef<PdfPreviewHandle, PdfPreviewProps>(function PdfPreview(
  { model, isCardPreview = false, onActivePageChange },
  ref,
) {
  const { user } = useAuth();
  const [profileSnapshot, setProfileSnapshot] = useState<PreviewProfile>(defaultPreviewProfile);
  const [profileLogo, setProfileLogo] = useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = useState<string | null>(null);
  const [svgSource, setSvgSource] = useState('');
  const [activePageKey, setActivePageKey] = useState<ProposalPageKey>('cover');
  const preset = useMemo(() => pdfDesignService.getPreset(model.preset_id), [model.preset_id]);
  const visiblePages = useMemo(() => getVisibleProposalPages(model.page_config), [model.page_config]);
  const renderModel = useMemo(
    () => model,
    [
      model.id,
      model.preset_id,
      model.theme,
      model.logo_url,
      model.cover_image_url,
      model.logo_transform,
      model.cover_image_transform,
      model.page_config,
    ],
  );

  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        const profile = await profileService.getProfile(user.id);
        const activeLogo = extractActiveLogo(profile.logo_url);
        setProfileLogo(activeLogo);
        setProfileSnapshot({
          company_name: profile.company_name || defaultPreviewProfile.company_name,
          logo_url: activeLogo,
          seller_name: profile.seller_name || defaultPreviewProfile.seller_name,
          seller_phone: profile.seller_phone || defaultPreviewProfile.seller_phone,
          seller_email: profile.seller_email || defaultPreviewProfile.seller_email,
          seller_signature_url: profile.seller_signature_url || null,
          website: profile.website || defaultPreviewProfile.website,
          company_email: profile.company_email || defaultPreviewProfile.company_email,
          default_validity_days: profile.default_validity_days ?? defaultPreviewProfile.default_validity_days,
          default_margin_percentage:
            profile.default_margin_percentage ?? defaultPreviewProfile.default_margin_percentage,
        });
      } catch (error) {
        console.error('Error loading profile in PDF preview:', error);
      }
    }

    void loadProfile();
  }, [user]);

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
  }, [isCardPreview, svgSource, preset, model, profileLogo, coverImageUrl]);

  const previewProposal = useMemo(
    () => buildPreviewProposal(user?.id, profileSnapshot, extractActiveLogo(model.logo_url) || profileLogo),
    [user?.id, profileSnapshot, model.logo_url, profileLogo],
  );

  useEffect(() => {
    if (visiblePages.some((page) => page.key === activePageKey)) return;
    const fallbackPage = visiblePages[0]?.key || 'cover';
    setActivePageKey(fallbackPage);
    onActivePageChange?.(fallbackPage);
  }, [activePageKey, onActivePageChange, visiblePages]);

  const scrollToPage = useCallback((pageKey: ProposalPageKey) => {
    if (!visiblePages.some((page) => page.key === pageKey)) return;
    setActivePageKey(pageKey);
    onActivePageChange?.(pageKey);
  }, [onActivePageChange, visiblePages]);

  useImperativeHandle(ref, () => ({ scrollToPage }), [scrollToPage]);

  if (!preset) return <div className="p-6 text-slate-500">Preset não encontrado.</div>;

  if (isCardPreview) {
    if (!finalSvgContent) return <div className="p-4 text-slate-500">Carregando preview...</div>;

    return (
      <div
        className="flex h-full w-full items-center justify-center overflow-hidden [&>svg]:block [&>svg]:h-full [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: finalSvgContent }}
      />
    );
  }

  return (
    <ExactPdfDocumentPreview
      proposal={previewProposal}
      model={renderModel}
      activePageKey={activePageKey}
    />
  );
});
