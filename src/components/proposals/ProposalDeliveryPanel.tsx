import { useEffect, useMemo, useState } from 'react';
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
  buildQrCodeImageUrl,
  buildWhatsAppShareUrl,
} from '../../lib/proposals/delivery';
import { pdfModelService } from '../../services/pdfModelService';
import { proposalDeliveryService } from '../../services/proposalDeliveryService';
import { proposalService } from '../../services/proposalService';
import type { PdfUserModel } from '../../types/pdfModels';
import type { Proposal } from '../../types/proposal';

export type ProposalDeliveryPanelProps = {
  proposal: Proposal;
  onProposalChange?: (proposal: Proposal) => void;
};

function deliveryStatusLabel(status: Proposal['status']) {
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
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
  return `${normalized || 'proposta-solar'}.pdf`;
}

export function ProposalDeliveryPanel({ proposal, onProposalChange }: ProposalDeliveryPanelProps) {
  const [workingProposal, setWorkingProposal] = useState(proposal);
  const [models, setModels] = useState<PdfUserModel[]>([]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isOpeningWhatsApp, setIsOpeningWhatsApp] = useState(false);

  useEffect(() => {
    setWorkingProposal(proposal);
  }, [proposal]);

  useEffect(() => {
    let active = true;
    const loadModels = async () => {
      try {
        setIsLoadingModels(true);
        const userModels = await pdfModelService.getUserModels(proposal.user_id);
        if (!active) return;
        setModels(userModels);
        const preferred = userModels.find((model) => model.is_default) || userModels[0];
        setSelectedModelId(preferred?.id || '');
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
  }, [proposal.user_id]);

  const selectedModel = useMemo(
    () => models.find((model) => model.id === selectedModelId) || null,
    [models, selectedModelId],
  );

  const publicLink = useMemo(() => {
    if (!workingProposal.public_token || typeof window === 'undefined') return null;
    return buildPublicProposalUrl(workingProposal.public_token, window.location.origin);
  }, [workingProposal.public_token]);

  const qrCodeUrl = publicLink ? buildQrCodeImageUrl(publicLink) : null;
  const hasDeliveryAssets = Boolean(workingProposal.pdf_url && publicLink);

  const refreshProposal = async () => {
    const refreshed = await proposalService.getProposalById(workingProposal.id);
    setWorkingProposal(refreshed);
    onProposalChange?.(refreshed);
    return refreshed;
  };

  const generatePdf = async () => {
    if (isGenerating) return;
    try {
      setIsGenerating(true);
      const pdfUrl = await generateAndUploadPdf(workingProposal, selectedModelId || null);
      if (!pdfUrl) throw new Error('O PDF não pôde ser gerado. Revise os dados e tente novamente.');
      await refreshProposal();
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
    if (!workingProposal.pdf_url || isDownloading) return;
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
    if (!publicLink || isOpeningWhatsApp) return;
    try {
      setIsOpeningWhatsApp(true);
      const whatsappUrl = buildWhatsAppShareUrl({
        phone: workingProposal.client?.phone,
        clientName: workingProposal.client?.name,
        proposalTitle: workingProposal.title,
        publicUrl: publicLink,
      });
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      const updated = await proposalDeliveryService.markWhatsAppSent(workingProposal.id);
      setWorkingProposal(updated);
      onProposalChange?.(updated);
      toast.success('WhatsApp aberto com a mensagem da proposta.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível preparar o envio pelo WhatsApp.');
    } finally {
      setIsOpeningWhatsApp(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-brand-dark">Finalizar e enviar proposta</h2>
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
            <Select value={selectedModelId} onChange={(event) => setSelectedModelId(event.target.value)}>
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

          <Button type="button" onClick={() => void generatePdf()} disabled={isGenerating || isLoadingModels} className="w-full gap-2 sm:w-auto">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : hasDeliveryAssets ? <RefreshCw className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {isGenerating ? 'Gerando documento...' : hasDeliveryAssets ? 'Regenerar PDF com este modelo' : 'Gerar PDF e link público'}
          </Button>
        </CardContent>
      </Card>

      {hasDeliveryAssets && publicLink && (
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
                O cliente abre uma página pública, visualiza o PDF e escolhe entre Aceitar proposta ou Recusar proposta.
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base"><QrCode className="h-5 w-5 text-brand-light" /> QR Code</CardTitle>
              <CardDescription>Aponte a câmera para abrir a proposta pública.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4 text-center">
              {qrCodeUrl && (
                <img src={qrCodeUrl} alt="QR Code do link público da proposta" className="w-full max-w-[240px] rounded-xl border border-brand-border bg-white p-3" />
              )}
              {qrCodeUrl && (
                <a href={qrCodeUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-light hover:underline">
                  Abrir QR Code
                </a>
              )}
              <p className="text-xs leading-5 text-slate-500">O QR Code aponta para a mesma página pública compartilhada pelo WhatsApp.</p>
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
