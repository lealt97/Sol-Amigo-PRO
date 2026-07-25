from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    source = read(path)
    if old not in source:
        raise RuntimeError(f'Marcador não encontrado em {path}: {old[:120]!r}')
    write(path, source.replace(old, new, 1))


write('src/lib/proposals/delivery.ts', '''export type WhatsAppShareInput = {
  phone?: string | null;
  clientName?: string | null;
  proposalTitle?: string | null;
  publicUrl: string;
};

export function buildPublicProposalUrl(publicToken: string | null | undefined, origin: string) {
  if (!publicToken) return null;
  return `${origin.replace(/\\/$/, '')}/proposta/${encodeURIComponent(publicToken)}`;
}

export function normalizeWhatsAppPhone(phone?: string | null) {
  let digits = String(phone || '').replace(/\\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  return digits;
}

export function buildWhatsAppShareUrl(input: WhatsAppShareInput) {
  const phone = normalizeWhatsAppPhone(input.phone);
  const greeting = input.clientName?.trim() ? `Olá, ${input.clientName.trim()}!` : 'Olá!';
  const proposalName = input.proposalTitle?.trim() || 'sua proposta de energia solar';
  const message = [
    greeting,
    '',
    `A proposta “${proposalName}” está disponível para visualização.`,
    'Você pode abrir o PDF e aceitar ou recusar diretamente pelo link:',
    input.publicUrl,
  ].join('\\n');
  const baseUrl = phone ? `https://wa.me/${phone}` : 'https://wa.me/';
  return `${baseUrl}?text=${encodeURIComponent(message)}`;
}
''')

write('src/components/proposals/ProposalDeliveryPanel.tsx', '''import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  MessageCircle,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/Card';
import { Select } from '../ui/Select';
import { generateAndUploadPdf } from '../../lib/pdf/generateProposalPdf';
import {
  buildPublicProposalUrl,
  buildWhatsAppShareUrl,
} from '../../lib/proposals/delivery';
import { pdfModelService } from '../../services/pdfModelService';
import { proposalService } from '../../services/proposalService';
import type { PdfUserModel } from '../../types/pdfModels';
import type { Proposal } from '../../types/proposal';

export type ProposalDeliveryPanelProps = {
  proposal?: Proposal | null;
  userId: string;
  clientPhone?: string | null;
  selectedModelId: string;
  onSelectedModelIdChange: (modelId: string) => void;
  onPrepareProposal?: () => Promise<Proposal>;
  onProposalChange?: (proposal: Proposal) => void;
  onDeliveryCompleted?: (proposal: Proposal) => void;
};

function deliveryStatusLabel(status?: Proposal['status']) {
  if (status === 'accepted' || status === 'approved') return 'Aceita pelo cliente';
  if (status === 'rejected') return 'Recusada pelo cliente';
  if (status === 'viewed') return 'Visualizada pelo cliente';
  if (status === 'sent') return 'Enviada ao cliente';
  return 'Pronta para envio';
}

function safePdfFilename(proposal: Proposal) {
  const base = proposal.title || proposal.code || 'proposta-solar';
  const normalized = base
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${normalized || 'proposta-solar'}.pdf`;
}

export function ProposalDeliveryPanel({
  proposal,
  userId,
  clientPhone,
  selectedModelId,
  onSelectedModelIdChange,
  onPrepareProposal,
  onProposalChange,
  onDeliveryCompleted,
}: ProposalDeliveryPanelProps) {
  const [models, setModels] = useState<PdfUserModel[]>([]);
  const [workingProposal, setWorkingProposal] = useState<Proposal | null>(proposal || null);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpeningWhatsApp, setIsOpeningWhatsApp] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    setWorkingProposal(proposal || null);
  }, [proposal]);

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        const userModels = await pdfModelService.getUserModels(userId);
        if (!active) return;
        setModels(userModels);
        const selectedExists = userModels.some((model) => model.id === selectedModelId);
        if (!selectedExists) {
          const preferred = userModels.find((model) => model.is_default) || userModels[0];
          onSelectedModelIdChange(preferred?.id || '');
        }
      } catch (error) {
        if (!active) return;
        toast.error(error instanceof Error ? error.message : 'Não foi possível carregar os modelos de PDF.');
      } finally {
        if (active) setIsLoadingModels(false);
      }
    };

    void loadModels();
    return () => {
      active = false;
    };
  }, [onSelectedModelIdChange, selectedModelId, userId]);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) || null,
    [models, selectedModelId],
  );

  const publicLink = useMemo(() => {
    if (!workingProposal?.public_token || typeof window === 'undefined') return null;
    return buildPublicProposalUrl(workingProposal.public_token, window.location.origin);
  }, [workingProposal?.public_token]);

  useEffect(() => {
    let active = true;
    if (!publicLink) {
      setQrCodeDataUrl(null);
      return undefined;
    }

    void QRCode.toDataURL(publicLink, {
      width: 320,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#0F172A', light: '#FFFFFF' },
    }).then((dataUrl) => {
      if (active) setQrCodeDataUrl(dataUrl);
    }).catch((error) => {
      console.error('Não foi possível gerar o QR Code da proposta.', error);
      if (active) setQrCodeDataUrl(null);
    });

    return () => {
      active = false;
    };
  }, [publicLink]);

  const handleGenerate = async () => {
    if (isGenerating) return;
    try {
      setIsGenerating(true);
      let targetProposal = workingProposal;
      if (!targetProposal && onPrepareProposal) {
        targetProposal = await onPrepareProposal();
      }
      if (!targetProposal) throw new Error('Não foi possível preparar a proposta para gerar o PDF.');

      const pdfUrl = await generateAndUploadPdf(targetProposal, selectedModelId || null);
      if (!pdfUrl) throw new Error('O PDF não pôde ser gerado. Revise os dados e tente novamente.');

      const refreshed = await proposalService.getProposalById(targetProposal.id);
      setWorkingProposal(refreshed);
      onProposalChange?.(refreshed);
      onDeliveryCompleted?.(refreshed);
      toast.success('PDF, link público e QR Code gerados com sucesso.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível gerar a proposta.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyPublicLink = async () => {
    if (!publicLink) return;
    try {
      await navigator.clipboard.writeText(publicLink);
      toast.success('Link público copiado.');
    } catch {
      toast.error('Não foi possível copiar o link automaticamente.');
    }
  };

  const downloadPdf = async () => {
    if (!workingProposal?.pdf_url || isDownloading) return;
    try {
      setIsDownloading(true);
      const response = await fetch(workingProposal.pdf_url);
      if (!response.ok) throw new Error('Falha ao baixar o PDF.');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = safePdfFilename(workingProposal);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível baixar o PDF.');
    } finally {
      setIsDownloading(false);
    }
  };

  const sendByWhatsApp = async () => {
    if (!workingProposal || !publicLink || isOpeningWhatsApp) return;
    try {
      setIsOpeningWhatsApp(true);
      const whatsappUrl = buildWhatsAppShareUrl({
        phone: clientPhone || workingProposal.client?.phone,
        clientName: workingProposal.client?.name,
        proposalTitle: workingProposal.title,
        publicUrl: publicLink,
      });
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      const updated = await proposalService.markWhatsAppSent(workingProposal.id);
      setWorkingProposal(updated);
      onProposalChange?.(updated);
      toast.success('WhatsApp aberto com a mensagem da proposta.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível preparar o envio pelo WhatsApp.');
    } finally {
      setIsOpeningWhatsApp(false);
    }
  };

  const hasDeliveryAssets = Boolean(workingProposal?.pdf_url && publicLink);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-brand-dark">PDF e envio da proposta</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Escolha um modelo salvo em Meus modelos. O modelo padrão já vem selecionado, mas pode ser trocado antes de gerar.
        </p>
      </div>

      <Card className="border-brand-light/25 bg-brand-gray/45 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-5 w-5 text-brand-light" /> Modelo do PDF
          </CardTitle>
          <CardDescription>O modelo selecionado define capa, cores, imagens e páginas do documento.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingModels ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando Meus modelos...
            </div>
          ) : (
            <Select value={selectedModelId} onChange={(event) => onSelectedModelIdChange(event.target.value)}>
              {models.length === 0 && <option value="">Modelo padrão interno</option>}
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}{model.is_default ? ' — Padrão' : ''}
                </option>
              ))}
            </Select>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-brand-border bg-brand-surface/60 p-4 text-sm">
            <div>
              <p className="font-semibold text-brand-dark">{selectedModel?.name || 'Modelo padrão interno'}</p>
              <p className="mt-1 text-xs text-slate-500">
                {selectedModel?.is_default ? 'Este é o modelo padrão da conta.' : 'Este modelo será usado somente nesta geração.'}
              </p>
            </div>
            <a href="/design-pdf" className="text-sm font-semibold text-brand-light hover:underline">Abrir Meus modelos</a>
          </div>

          <Button type="button" onClick={() => void handleGenerate()} disabled={isGenerating || isLoadingModels} className="w-full gap-2 sm:w-auto">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : hasDeliveryAssets ? <RefreshCw className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {isGenerating ? 'Gerando documento...' : hasDeliveryAssets ? 'Regenerar PDF com este modelo' : 'Concluir e gerar PDF'}
          </Button>
        </CardContent>
      </Card>

      {hasDeliveryAssets && workingProposal && publicLink && (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
          <Card className="border-emerald-400/30 bg-emerald-500/10 shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" /> Proposta pronta
              </CardTitle>
              <CardDescription>{deliveryStatusLabel(workingProposal.status)}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-brand-border bg-brand-surface/70 p-4">
                <div className="flex items-start gap-3">
                  <Link2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-light" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-dark">Link público com aceite e recusa</p>
                    <p className="mt-1 break-all text-xs leading-5 text-slate-500">{publicLink}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" variant="outline" onClick={() => window.open(workingProposal.pdf_url || '', '_blank', 'noopener,noreferrer')} className="gap-2">
                  <ExternalLink className="h-4 w-4" /> Abrir PDF
                </Button>
                <Button type="button" variant="outline" onClick={() => void downloadPdf()} disabled={isDownloading} className="gap-2">
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Baixar PDF
                </Button>
                <Button type="button" variant="outline" onClick={() => void copyPublicLink()} className="gap-2">
                  <Copy className="h-4 w-4" /> Copiar link
                </Button>
                <Button type="button" variant="outline" onClick={() => window.open(publicLink, '_blank', 'noopener,noreferrer')} className="gap-2">
                  <ExternalLink className="h-4 w-4" /> Ver como cliente
                </Button>
              </div>

              <Button type="button" onClick={() => void sendByWhatsApp()} disabled={isOpeningWhatsApp} className="w-full gap-2 bg-emerald-600 text-white hover:bg-emerald-700">
                {isOpeningWhatsApp ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
                Enviar pelo WhatsApp
              </Button>

              <p className="text-xs leading-5 text-slate-500">
                O cliente abre a proposta em uma página pública, visualiza o PDF e escolhe entre Aceitar proposta ou Recusar proposta.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><QrCode className="h-5 w-5 text-brand-light" /> QR Code</CardTitle>
              <CardDescription>Aponte a câmera para abrir a proposta pública.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 text-center">
              {qrCodeDataUrl ? (
                <img src={qrCodeDataUrl} alt="QR Code do link público da proposta" className="w-full max-w-[240px] rounded-xl border border-brand-border bg-white p-3" />
              ) : (
                <div className="grid aspect-square w-full max-w-[240px] place-items-center rounded-xl border border-dashed border-brand-border text-sm text-slate-500">
                  Gerando QR Code...
                </div>
              )}
              {qrCodeDataUrl && (
                <a href={qrCodeDataUrl} download={`qrcode-${workingProposal.code || workingProposal.id}.png`} className="text-sm font-semibold text-brand-light hover:underline">
                  Baixar QR Code
                </a>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
''')

replace_once(
    'src/lib/proposals/flow.ts',
    "export const PROPOSAL_FLOW_LAST_STEP = 6;",
    "export const PROPOSAL_FLOW_LAST_STEP = 7;",
)

replace_once(
    'src/types/proposalDraft.ts',
    "  paybackForm: ProposalDraftPaybackForm | null;\n};",
    "  paybackForm: ProposalDraftPaybackForm | null;\n  selectedPdfModelId?: string;\n};",
)

replace_once(
    'src/services/proposalService.ts',
    "async function deleteProposal(id: string) {",
    "async function markWhatsAppSent(id: string): Promise<Proposal> {\n  const proposal = await getProposalById(id);\n  const nextStatus = proposal.status === 'pending' ? 'sent' : proposal.status;\n  const { error } = await supabase\n    .from('proposals')\n    .update({\n      status: nextStatus,\n      sent_whatsapp_at: new Date().toISOString(),\n    })\n    .eq('id', id);\n\n  if (error) throw error;\n  return getProposalById(id);\n}\n\nasync function deleteProposal(id: string) {",
)

replace_once(
    'src/services/proposalService.ts',
    "  duplicateProposal,\n  deleteProposal,",
    "  duplicateProposal,\n  markWhatsAppSent,\n  deleteProposal,",
)

calculator = read('src/pages/propostas/ProfessionalSizingCalculatorView.tsx')
calculator = calculator.replace(
    "import { ProposalActionButtons }",
    "import { ProposalActionButtons }",
) if "import { ProposalActionButtons }" in calculator else calculator
calculator = calculator.replace(
    "import { PaybackStep } from './PaybackStep';\nimport { RoofPhotoUpload } from './RoofPhotoUpload';",
    "import { ProposalDeliveryPanel } from '../../components/proposals/ProposalDeliveryPanel';\nimport type { Proposal } from '../../types/proposal';\nimport { PaybackStep } from './PaybackStep';\nimport { RoofPhotoUpload } from './RoofPhotoUpload';",
)
calculator = calculator.replace(
    "  { id: 'result', title: 'Resultado' },\n] as const;",
    "  { id: 'result', title: 'Resultado' },\n  { id: 'delivery', title: 'PDF e envio' },\n] as const;",
)
calculator = calculator.replace(
    "  const [roofPhotoReference, setRoofPhotoReference] = useState<string | null>(null);",
    "  const [roofPhotoReference, setRoofPhotoReference] = useState<string | null>(null);\n  const [selectedPdfModelId, setSelectedPdfModelId] = useState('');\n  const [deliveryCompleted, setDeliveryCompleted] = useState(false);",
)
calculator = calculator.replace(
    "    setPaybackForm(state.paybackForm);\n    setPaybackResult(null);",
    "    setPaybackForm(state.paybackForm);\n    setSelectedPdfModelId(state.selectedPdfModelId || '');\n    setDeliveryCompleted(false);\n    setPaybackResult(null);",
)
calculator = calculator.replace(
    "    selectedKitId,\n    paybackForm,\n  });",
    "    selectedKitId,\n    paybackForm,\n    selectedPdfModelId,\n  });",
)
old_complete = '''  const completeSizing = async () => {
    if (!validateStep() || isSavingDraft) return;
    if (!draftId) {
      toast.error('O rascunho ainda não foi criado.');
      return;
    }

    try {
      setIsSavingDraft(true);
      const flowState = buildDraftState(STEPS.length - 1);
      const saveInput = {
        proposalId: draftId,
        flowStep: STEPS.length - 1,
        flowState,
        summary: {
          ...buildDraftSummary(),
          title: proposalTitle.trim().replace(/\\s+/g, ' '),
        },
      };

      if (isEditMode) {
        await proposalService.saveCompletedProposal(saveInput);
        toast.success('Proposta atualizada com sucesso.');
      } else {
        await proposalService.completeFlowDraft(saveInput);
        toast.success('Proposta concluída e salva.');
      }
      navigate(`/propostas/${draftId}`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível concluir a proposta.');
    } finally {
      setIsSavingDraft(false);
    }
  };'''
new_complete = '''  const finalizeProposalForDelivery = async (): Promise<Proposal> => {
    if (isSavingDraft) throw new Error('A proposta ainda está sendo salva.');
    if (!draftId) throw new Error('O rascunho ainda não foi criado.');
    if (!selectedKit || !result || !paybackResult) {
      throw new Error('Revise o resultado técnico e financeiro antes de gerar o PDF.');
    }

    try {
      setIsSavingDraft(true);
      const flowState = buildDraftState(STEPS.length - 1);
      const saveInput = {
        proposalId: draftId,
        flowStep: STEPS.length - 1,
        flowState,
        summary: {
          ...buildDraftSummary(),
          title: proposalTitle.trim().replace(/\\s+/g, ' '),
        },
      };

      if (isEditMode) {
        await proposalService.saveCompletedProposal(saveInput);
      } else {
        await proposalService.completeFlowDraft(saveInput);
      }

      return await proposalService.getProposalById(draftId);
    } finally {
      setIsSavingDraft(false);
    }
  };'''
if old_complete not in calculator:
    raise RuntimeError('Bloco completeSizing não encontrado')
calculator = calculator.replace(old_complete, new_complete, 1)

result_marker = '''            {currentStep === 6 && (
              <section className="space-y-6">'''
if result_marker not in calculator:
    raise RuntimeError('Etapa de resultado não encontrada')

insert_after_result = '''            {currentStep === 7 && draftId && user?.id && (
              <ProposalDeliveryPanel
                proposal={null}
                userId={user.id}
                clientPhone={selectedClient?.phone}
                selectedModelId={selectedPdfModelId}
                onSelectedModelIdChange={setSelectedPdfModelId}
                onPrepareProposal={finalizeProposalForDelivery}
                onDeliveryCompleted={() => setDeliveryCompleted(true)}
              />
            )}

'''
result_end_marker = '''            <div className="mt-8 flex justify-between border-t border-brand-border pt-6">'''
if result_end_marker not in calculator:
    raise RuntimeError('Rodapé do Wizard não encontrado')
calculator = calculator.replace(result_end_marker, insert_after_result + result_end_marker, 1)

calculator = calculator.replace(
    "                disabled={currentStep === 0 || isSavingDraft}",
    "                disabled={currentStep === 0 || isSavingDraft || deliveryCompleted}",
    1,
)
calculator = calculator.replace(
    '''              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={() => void goNext()} className="gap-2" disabled={isSavingDraft}>
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" onClick={() => void completeSizing()} className="gap-2" disabled={isSavingDraft}>
                  {isEditMode ? 'Salvar alterações' : 'Concluir dimensionamento'} <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}''',
    '''              {currentStep < STEPS.length - 1 ? (
                <Button type="button" onClick={() => void goNext()} className="gap-2" disabled={isSavingDraft}>
                  Próximo <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(draftId ? `/propostas/${draftId}` : '/propostas')}
                  className="gap-2"
                  disabled={!deliveryCompleted || isSavingDraft}
                >
                  Ver proposta finalizada <CheckCircle2 className="h-4 w-4" />
                </Button>
              )}''',
    1,
)
write('src/pages/propostas/ProfessionalSizingCalculatorView.tsx', calculator)

write('src/pages/propostas/ProposalDetails.tsx', '''import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, FileText, User } from 'lucide-react';
import { ProposalDeliveryPanel } from '../../components/proposals/ProposalDeliveryPanel';
import { proposalService } from '../../services/proposalService';
import { proposalEventService } from '../../services/proposalEventService';
import type { Proposal } from '../../types/proposal';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { formatDate } from '../../lib/utils';
import { getProposalContinuePath, isActiveProposalFlowDraft } from '../../lib/proposals/flow';

const getStatusLabel = (status: string) => ({
  draft: 'Rascunho',
  pending: 'Pendente',
  sent: 'Enviada',
  viewed: 'Visualizada',
  accepted: 'Aprovada',
  approved: 'Aprovada',
  rejected: 'Recusada',
  expired: 'Expirada',
}[status] || status);

export function ProposalDetails() {
  const { id } = useParams<{ id: string }>();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedPdfModelId, setSelectedPdfModelId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadProposal = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const proposalData = await proposalService.getProposalById(id);
      setProposal(proposalData);
      if (!isActiveProposalFlowDraft(proposalData)) {
        setEvents(await proposalEventService.getEvents(id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes da proposta');
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadProposal();
  }, [loadProposal]);

  if (isLoading) return <div className="animate-pulse text-brand-blue">Carregando detalhes...</div>;

  if (error || !proposal) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-brand-dark">Erro</h2>
        <p className="mb-6 text-red-500">{error || 'Proposta não encontrada.'}</p>
        <Link to="/propostas"><Button variant="outline">Voltar para Propostas</Button></Link>
      </div>
    );
  }

  if (isActiveProposalFlowDraft(proposal)) {
    return <Navigate to={getProposalContinuePath(proposal.id)} replace />;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex items-start gap-3 border-b border-brand-border pb-5">
        <Link to="/propostas"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">{proposal.title || 'Proposta sem título'}</h1>
          <p className="mt-1 text-sm text-slate-500">{proposal.code ? `Código: ${proposal.code}` : 'Sem código'} · {getStatusLabel(proposal.status)}</p>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-amber-300/40 bg-amber-500/10 p-4 text-amber-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Dados técnicos e financeiros preservados</p>
          <p className="mt-1 text-sm leading-6">Os cálculos finalizados não são refeitos nesta tela. Você pode regenerar o documento com outro modelo, baixar, copiar o link ou reenviar a mesma proposta.</p>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-lg"><User className="h-5 w-5 text-brand-blue" /> Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-semibold text-brand-dark">{proposal.client?.name || 'Cliente não disponível'}</p>
              <p className="text-slate-500">{proposal.client?.document || 'Sem documento'}</p>
              <p className="text-slate-500">{proposal.client?.phone || 'Sem telefone'}</p>
              <p className="text-slate-500">{proposal.client?.email || 'Sem e-mail'}</p>
              <Link to={`/clientes/${proposal.client_id}`} className="block pt-2"><Button variant="outline" className="w-full">Ver ficha do cliente</Button></Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg"><FileText className="h-5 w-5 text-brand-blue" /> Histórico</CardTitle>
              <CardDescription>Eventos de envio, visualização, aceite ou recusa.</CardDescription>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-500">Nenhum evento registrado.</p>
              ) : (
                <div className="space-y-5">
                  {events.map((event) => (
                    <div key={event.id} className="border-l-2 border-brand-blue pl-4">
                      <p className="text-sm font-semibold text-brand-dark">{event.description || event.event_type}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatDate(event.created_at)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-6">
            <ProposalDeliveryPanel
              proposal={proposal}
              userId={proposal.user_id}
              clientPhone={proposal.client?.phone}
              selectedModelId={selectedPdfModelId}
              onSelectedModelIdChange={setSelectedPdfModelId}
              onProposalChange={setProposal}
              onDeliveryCompleted={setProposal}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
''')

replace_once(
    'tests/proposal-draft-flow.test.ts',
    "  assert.equal(clampProposalFlowStep(99), 6);",
    "  assert.equal(clampProposalFlowStep(99), 7);",
)
replace_once(
    'tests/proposal-draft-flow.test.ts',
    "  assert.match(calculator, /paybackForm,/);",
    "  assert.match(calculator, /paybackForm,/);\n  assert.match(calculator, /selectedPdfModelId,/);",
)

write('tests/proposal-delivery-flow.test.ts', '''import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  buildPublicProposalUrl,
  buildWhatsAppShareUrl,
  normalizeWhatsAppPhone,
} from '../src/lib/proposals/delivery';

const CALCULATOR = 'src/pages/propostas/ProfessionalSizingCalculatorView.tsx';
const PANEL = 'src/components/proposals/ProposalDeliveryPanel.tsx';
const DETAILS = 'src/pages/propostas/ProposalDetails.tsx';
const PDF_GENERATOR = 'src/lib/pdf/generateProposalPdf.tsx';
const PUBLIC_PAGE = 'src/pages/public/PublicProposal.tsx';

 test('normaliza telefone brasileiro e cria links de entrega', () => {
  assert.equal(normalizeWhatsAppPhone('(11) 98765-4321'), '5511987654321');
  assert.equal(normalizeWhatsAppPhone('+55 11 98765-4321'), '5511987654321');
  assert.equal(buildPublicProposalUrl('token seguro', 'https://app.exemplo.com/'), 'https://app.exemplo.com/proposta/token%20seguro');
  const whatsapp = buildWhatsAppShareUrl({
    phone: '(11) 98765-4321',
    clientName: 'Ana',
    proposalTitle: 'Residência Ana',
    publicUrl: 'https://app.exemplo.com/proposta/abc',
  });
  assert.match(whatsapp, /^https:\/\/wa\.me\/5511987654321\?text=/);
  assert.match(decodeURIComponent(whatsapp), /Aceitar|aceitar|recusar/);
});

test('última etapa integra modelo, PDF, link público, WhatsApp e QR Code', async () => {
  const [calculator, panel, details, generator, publicPage] = await Promise.all([
    readFile(CALCULATOR, 'utf8'),
    readFile(PANEL, 'utf8'),
    readFile(DETAILS, 'utf8'),
    readFile(PDF_GENERATOR, 'utf8'),
    readFile(PUBLIC_PAGE, 'utf8'),
  ]);

  assert.match(calculator, /id: 'delivery', title: 'PDF e envio'/);
  assert.match(calculator, /<ProposalDeliveryPanel/);
  assert.match(calculator, /selectedPdfModelId/);
  assert.match(panel, /pdfModelService\.getUserModels/);
  assert.match(panel, /model\.is_default/);
  assert.match(panel, /generateAndUploadPdf\(targetProposal, selectedModelId \|\| null\)/);
  assert.match(panel, /QRCode\.toDataURL/);
  assert.match(panel, /buildWhatsAppShareUrl/);
  assert.match(panel, /Aceitar proposta ou Recusar proposta/);
  assert.match(details, /<ProposalDeliveryPanel/);
  assert.match(generator, /selectedModelId\?: string \| null/);
  assert.match(publicPage, /Aceitar Proposta/);
  assert.match(publicPage, /Recusar Proposta/);
});
''')

print('Integração de entrega da proposta aplicada.')
