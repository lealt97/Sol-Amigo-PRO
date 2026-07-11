import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { proposalService } from '../../services/proposalService';
import { proposalEventService } from '../../services/proposalEventService';
import { pdfModelService } from '../../services/pdfModelService';
import { Proposal } from '../../types/proposal';
import { PdfUserModel } from '../../types/pdfModels';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { ArrowLeft, Edit, Copy, FileText, User, Download, Link as LinkIcon, CheckCircle, XCircle, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase/client';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { generateAndUploadPdf } from '../../lib/pdf/generateProposalPdf';

export function ProposalDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');
  const [events, setEvents] = useState<any[]>([]);
  const [showWaModal, setShowWaModal] = useState(false);
  const [waMessage, setWaMessage] = useState('');
  const [pdfModels, setPdfModels] = useState<PdfUserModel[]>([]);
  const [selectedPdfModelId, setSelectedPdfModelId] = useState('');
  const [isLoadingPdfModels, setIsLoadingPdfModels] = useState(false);

  const defaultPdfModel = pdfModels.find((model) => model.is_default) || pdfModels[0];
  const selectedPdfModel = selectedPdfModelId
    ? pdfModels.find((model) => model.id === selectedPdfModelId)
    : defaultPdfModel;

  useEffect(() => {
    async function loadProposal() {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await proposalService.getProposalById(id);
        setProposal(data);

        const eventData = await proposalEventService.getEvents(id);
        setEvents(eventData);
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar detalhes da proposta');
      } finally {
        setIsLoading(false);
      }
    }

    loadProposal();
  }, [id]);

  useEffect(() => {
    async function loadPdfModels() {
      if (!proposal?.user_id) return;

      try {
        setIsLoadingPdfModels(true);
        const models = await pdfModelService.getUserModels(proposal.user_id);
        setPdfModels(models);
      } catch (err) {
        console.error(err);
        toast.error('Erro ao carregar modelos do Design PDF. O PDF ainda poderá usar o padrão.');
      } finally {
        setIsLoadingPdfModels(false);
      }
    }

    loadPdfModels();
  }, [proposal?.user_id]);

  const handleDuplicate = async () => {
    if (!user || !proposal) return;
    try {
      const { id, created_at, updated_at, code, client, ...rest } = proposal;
      const duplicated = await proposalService.createProposal(
        { ...rest, title: `${proposal.title || 'Proposta'} (Cópia)` },
        user.id,
        true
      );
      navigate(`/propostas/${duplicated.id}/editar`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao duplicar proposta');
    }
  };

  const handleSendWhatsApp = async () => {
    if (!proposal) return;

    if (!proposal.client?.phone) {
      toast('O cliente não possui um telefone cadastrado. Por favor, edite o cadastro do cliente e adicione o número.');
      return;
    }

    if (!proposal.pdf_url) {
      toast('Por favor, gere o PDF da proposta antes de enviá-la.');
      return;
    }

    let publicToken = proposal.public_token;
    const updates: any = {
      sent_whatsapp_at: new Date().toISOString()
    };

    if (!publicToken) {
      publicToken = crypto.randomUUID();
      updates.public_token = publicToken;
    }

    if (proposal.status === 'draft') {
      updates.status = 'pending';
    }

    try {
      const { error: updateError } = await supabase
        .from('proposals')
        .update(updates)
        .eq('id', proposal.id);

      if (updateError) throw updateError;

      setProposal({
        ...proposal,
        ...updates
      });
    } catch (err: any) {
      console.error(err);
      toast.error('Erro ao atualizar dados da proposta antes do envio.');
      return;
    }

    const publicLink = `${window.location.origin}/proposta/${publicToken}`;
    const power = proposal.solar?.installed_power_kwp ? proposal.solar.installed_power_kwp.toFixed(2) : '0';
    const savings = formatMoney(proposal.solar?.monthly_savings);
    const finalPrice = formatMoney(proposal.final_price);
    const payback = proposal.solar?.payback_formatted || '0 anos';

    const message = `Olá, ${proposal.client.name}! Tudo bem?\n\nSegue sua proposta personalizada de energia solar fotovoltaica:\n\nPotência do sistema: ${power} kWp\nEconomia mensal estimada: ${savings}\nInvestimento: ${finalPrice}\nPayback estimado: ${payback}\n\nVocê pode visualizar e aprovar sua proposta pelo link abaixo:\n${publicLink}\n\nQualquer dúvida, estou à disposição.`;

    setWaMessage(message);
    setShowWaModal(true);
  };

  const openWhatsApp = () => {
    if (!proposal?.client?.phone) return;
    const phoneNum = proposal.client.phone.replace(/\D/g, '');
    const waUrl = `https://wa.me/${phoneNum}?text=${encodeURIComponent(waMessage)}`;
    window.open(waUrl, '_blank');
    setShowWaModal(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(waMessage);
    toast.success('Mensagem copiada!');
  };

  const handleGeneratePdf = async () => {
    if (!proposal) return;
    setGeneratingPdf(true);
    try {
      const url = await generateAndUploadPdf(proposal, selectedPdfModelId || undefined);
      if (url) {
        setProposal({ ...proposal, pdf_url: url });
        toast.success(selectedPdfModel ? `PDF gerado com o modelo ${selectedPdfModel.name}.` : 'PDF gerado com o modelo padrão.');
        window.open(url, '_blank');
      } else {
        toast.error('Erro ao gerar o PDF. Verifique se o bucket de storage está configurado.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Ocorreu um erro ao gerar o PDF.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleStatusChange = async (newStatus: Proposal['status']) => {
    if (!proposal) return;
    try {
      const { error: updateError } = await supabase
        .from('proposals')
        .update({ status: newStatus })
        .eq('id', proposal.id);

      if (updateError) throw updateError;

      setProposal({ ...proposal, status: newStatus });
      await proposalEventService.logEvent(proposal.id, 'status_changed', `Status alterado manualmente para ${newStatus}`);

      const eventData = await proposalEventService.getEvents(proposal.id);
      setEvents(eventData);
    } catch (err: any) {
      toast.error('Erro ao atualizar status');
    }
  };

  const formatMoney = (val: number | null | undefined) => {
    if (val == null) return '-';
    return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-500 border-gray-200',
      sent: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
      viewed: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
      pending: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
      accepted: 'bg-brand-green/20 text-emerald-700 border-brand-green/30',
      approved: 'bg-brand-green/20 text-emerald-700 border-brand-green/30',
      rejected: 'bg-red-50 text-red-600 border-red-100',
      expired: 'bg-slate-700/10 text-slate-700 border-slate-700/20',
    };
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      sent: 'Pendente',
      viewed: 'Visualizada',
      pending: 'Pendente',
      accepted: 'Aprovada',
      approved: 'Aprovada',
      rejected: 'Recusada',
      expired: 'Expirada',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.draft}`}>
        {labels[status] || 'Rascunho'}
      </span>
    );
  };

  if (isLoading) {
    return <div className="text-brand-blue animate-pulse">Carregando detalhes...</div>;
  }

  if (error || !proposal) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-brand-dark mb-2">Erro</h2>
        <p className="text-red-400 mb-6">{error || 'Proposta não encontrada.'}</p>
        <Link to="/propostas">
          <Button variant="outline">Voltar para Propostas</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-brand-border">
        <div className="flex items-center gap-3">
          <Link to="/propostas">
            <Button variant="ghost" size="icon" className="hover:bg-brand-surface border border-transparent hover:border-brand-border">
              <ArrowLeft className="h-5 w-5 text-slate-400" />
            </Button>
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-white tracking-tight">{proposal.title || 'Proposta sem título'}</h1>
              <div className="flex items-center gap-2">
                {getStatusBadge(proposal.status)}
                <select
                  value={proposal.status}
                  onChange={(e) => handleStatusChange(e.target.value as Proposal['status'])}
                  className="bg-brand-surface text-xs text-slate-300 border border-brand-border rounded px-2.5 py-1 outline-none font-semibold cursor-pointer focus:border-brand-blue"
                >
                  <option value="draft">Rascunho</option>
                  <option value="pending">Pendente</option>
                  <option value="approved">Aprovada</option>
                  <option value="rejected">Recusada</option>
                  <option value="expired">Expirada</option>
                </select>
              </div>
            </div>
            <p className="text-sm text-slate-400 mt-1">
              {proposal.code ? `Código: ${proposal.code} • ` : ''}Criada em {formatDate(proposal.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Button
            onClick={() => navigate(`/propostas/${proposal.id}/editar`)}
            className="flex-1 md:flex-none bg-brand-blue hover:bg-brand-blue-hover text-white gap-2 font-bold px-4 py-2 cursor-pointer shadow-md"
          >
            <Edit className="w-4 h-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            onClick={handleDuplicate}
            className="flex-1 md:flex-none border-brand-border bg-white/5 hover:bg-white/10 text-white gap-2 px-4 py-2 cursor-pointer"
          >
            <Copy className="w-4 h-4" />
            Duplicar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col gap-6">
          <Card className="border-brand-border bg-brand-surface shadow-xl">
            <CardHeader className="pb-3 border-b border-brand-border/60">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-blue" />
                Documento & Envio
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">
                Gere e baixe a proposta comercial em PDF ou envie ao cliente.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* PDF Model selector inside the action card */}
              <div className="space-y-1.5">
                <label htmlFor="pdf_model_id" className="text-xs font-semibold text-slate-300">
                  Modelo de Design PDF
                </label>
                <Select
                  id="pdf_model_id"
                  value={selectedPdfModelId}
                  onChange={(event) => setSelectedPdfModelId(event.target.value)}
                  disabled={isLoadingPdfModels || pdfModels.length === 0}
                  className="w-full bg-slate-900 border-brand-border text-xs text-white"
                >
                  <option value="">
                    {defaultPdfModel ? `Padrão (${defaultPdfModel.name})` : 'Usar modelo padrão'}
                  </option>
                  {pdfModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}{model.is_default ? ' (Padrão)' : ''}
                    </option>
                  ))}
                </Select>
                <p className="text-[10px] text-slate-400 leading-tight">
                  {isLoadingPdfModels
                    ? 'Carregando modelos do Design PDF...'
                    : 'A escolha vale para esta geração e não muda o modelo global padrão.'}
                </p>
              </div>

              <div className="h-px bg-brand-border/60" />

              {/* Action Buttons */}
              <div className="flex flex-col gap-2.5">
                <Button
                  onClick={handleGeneratePdf}
                  className="w-full bg-brand-blue hover:bg-brand-blue-hover text-white gap-2 font-bold justify-center cursor-pointer shadow-md py-2.5"
                  disabled={generatingPdf}
                >
                  <FileText className="w-4 h-4" />
                  {generatingPdf ? 'Gerando...' : proposal.pdf_url ? 'Gerar Novo PDF' : 'Gerar PDF'}
                </Button>

                {proposal.pdf_url && (
                  <Button
                    onClick={() => window.open(proposal.pdf_url || '', '_blank')}
                    variant="outline"
                    className="w-full border-brand-border bg-white/5 hover:bg-white/10 text-white gap-2 justify-center font-bold cursor-pointer py-2.5"
                  >
                    <Download className="w-4 h-4 text-brand-blue" />
                    Baixar/Visualizar PDF
                  </Button>
                )}

                <Button
                  onClick={handleSendWhatsApp}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-bold justify-center cursor-pointer shadow-md py-2.5"
                >
                  <Send className="w-4 h-4" />
                  Enviar por WhatsApp
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-brand-blue" />
                Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-brand-dark">{proposal.client?.name}</p>
                <p className="text-sm text-slate-500">{proposal.client?.document || 'Sem documento'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Contato</p>
                <p className="text-sm text-brand-dark">{proposal.client?.phone || '-'}</p>
                <p className="text-sm text-brand-dark">{proposal.client?.email || '-'}</p>
              </div>
              <Button
                variant="outline"
                className="w-full mt-2"
                onClick={() => navigate(`/clientes/${proposal.client_id}`)}
              >
                Ver Ficha do Cliente
              </Button>
            </CardContent>
          </Card>

          {proposal.public_token && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-blue-500" />
                  Link Público
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 bg-brand-surface border border-brand-border rounded-lg">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs text-slate-500 truncate">
                      {window.location.origin}/proposta/{proposal.public_token}
                    </p>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-slate-500 hover:text-brand-dark"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/proposta/${proposal.public_token}`);
                        toast.success('Link copiado!');
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <a
                    href={`/proposta/${proposal.public_token}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-400 hover:underline"
                  >
                    Abrir link
                  </a>
                </div>

                <div className="space-y-2 pt-2 border-t border-brand-border">
                  {proposal.public_viewed_at && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-500">Visualizada em:</span>
                      <span className="text-brand-dark">{formatDate(proposal.public_viewed_at)}</span>
                    </div>
                  )}
                  {proposal.accepted_at && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Aceita em:</span>
                      <span className="text-emerald-400">{formatDate(proposal.accepted_at)}</span>
                    </div>
                  )}
                  {proposal.rejected_at && (
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-red-400 flex items-center gap-1"><XCircle className="w-4 h-4" /> Recusada em:</span>
                        <span className="text-red-400">{formatDate(proposal.rejected_at)}</span>
                      </div>
                      {proposal.rejection_reason && (
                        <p className="text-xs text-slate-500 bg-brand-surface p-2 rounded border border-brand-border">
                          Motivo: {proposal.rejection_reason}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="md:col-span-2 flex flex-col gap-6">
          <div className="flex gap-4 border-b border-brand-border mb-2 pb-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'overview' ? 'text-brand-blue' : 'text-slate-500 hover:text-brand-dark'}`}
            >
              Visão Geral
              {activeTab === 'overview' && <span className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-brand-blue rounded-t-md" />}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'history' ? 'text-brand-blue' : 'text-slate-500 hover:text-brand-dark'}`}
            >
              Histórico
              {activeTab === 'history' && <span className="absolute bottom-[-9px] left-0 right-0 h-[2px] bg-brand-blue rounded-t-md" />}
            </button>
          </div>

          {activeTab === 'overview' && (
            <Card className="flex-1 flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg">Visão Geral da Proposta</CardTitle>
                <CardDescription>Resumo dos dados comerciais.</CardDescription>
              </CardHeader>
              <CardContent>
                {proposal.solar ? (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 bg-slate-950/40 border border-brand-border rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Potência</p>
                      <p className="text-lg font-bold text-white">
                        {proposal.solar.installed_power_kwp?.toFixed(2) || '-'} <span className="text-xs font-normal text-slate-400">kWp</span>
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/40 border border-brand-border rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Consumo Médio</p>
                      <p className="text-lg font-bold text-white">
                        {proposal.monthly_consumption_kwh || '-'} <span className="text-xs font-normal text-slate-400">kWh</span>
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/40 border border-brand-border rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Geração Est.</p>
                      <p className="text-lg font-bold text-brand-blue">
                        {proposal.solar.estimated_monthly_generation_kwh?.toFixed(0) || '-'} <span className="text-xs font-normal text-slate-400">kWh</span>
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/40 border border-brand-border rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Investimento</p>
                      <p className="text-lg font-bold text-white">
                        {formatMoney(proposal.final_price)}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-950/40 border border-brand-border rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Payback</p>
                      <p className="text-lg font-bold text-emerald-400">
                        {proposal.solar.payback_formatted || '-'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/40 border border-brand-border rounded-lg p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
                    <FileText className="w-12 h-12 text-slate-500 mb-4" />
                    <h3 className="text-lg font-medium text-brand-dark mb-2">Proposta Incompleta</h3>
                    <p className="text-sm text-slate-500 max-w-sm mb-6">
                      Esta proposta não possui dados técnicos e financeiros preenchidos.
                    </p>
                    <Button onClick={() => navigate(`/propostas/${proposal.id}/editar`)} className="gap-2">
                      <Edit className="w-4 h-4" />
                      Continuar Editando
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'history' && (
            <Card className="flex-1">
              <CardHeader>
                <CardTitle className="text-lg">Histórico da Proposta</CardTitle>
                <CardDescription>Eventos e alterações de status.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {events.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">Nenhum evento registrado.</p>
                  ) : (
                    events.map((evt: any) => (
                      <div key={evt.id} className="relative pl-6 border-l border-brand-border pb-6 last:pb-0">
                        <div className="absolute left-[-5px] top-1 w-2.5 h-2.5 rounded-full bg-brand-blue border-2 border-brand-border" />
                        <div className="flex flex-col gap-1">
                          <p className="text-sm font-medium text-brand-dark">{evt.description || evt.event_type}</p>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-xs text-slate-500">{formatDate(evt.created_at)}</p>
                            {evt.user_id && <p className="text-xs text-slate-500">Usuário</p>}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showWaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-brand-surface border border-brand-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-brand-dark mb-4">Enviar Mensagem</h3>
            <p className="text-sm text-slate-500 mb-4">Você pode revisar, editar e copiar a mensagem antes de enviar pelo WhatsApp.</p>
            <textarea
              value={waMessage}
              onChange={(e) => setWaMessage(e.target.value)}
              className="w-full h-48 bg-brand-gray border border-brand-border rounded-lg p-3 text-sm text-brand-dark focus:outline-none focus:border-[#3B82F6] mb-4"
            />
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowWaModal(false)}>
                Cancelar
              </Button>
              <Button variant="outline" onClick={copyToClipboard} className="gap-2">
                <Copy className="w-4 h-4" />
                Copiar
              </Button>
              <Button onClick={openWhatsApp} className="bg-green-600 hover:bg-green-700 text-brand-dark gap-2">
                <Send className="w-4 h-4" />
                Abrir WhatsApp
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
