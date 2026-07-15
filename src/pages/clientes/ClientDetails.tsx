import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { clientService } from '../../services/clientService';
import { proposalService } from '../../services/proposalService';
import { supabase } from '../../lib/supabase/client';
import { Client } from '../../types/client';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { ArrowLeft, Edit, Plus, MapPin, Phone, Mail, FileText, Zap, Trash2, Eye, Clock, ArrowRight } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';

const OPEN_PROPOSAL_STATUSES = ['draft', 'pending'];

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    draft: 'Pendente',
    pending: 'Pendente',
    sent: 'Enviada',
    viewed: 'Visualizada',
    accepted: 'Aprovada',
    approved: 'Aprovada',
    rejected: 'Recusada',
    expired: 'Expirada',
  };

  return labels[status] || 'Pendente';
};

const getStatusBadgeClasses = (status: string) => {
  const styles: Record<string, string> = {
    draft: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
    pending: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
    sent: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    viewed: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    accepted: 'bg-brand-green/20 text-emerald-700 border-brand-green/30',
    approved: 'bg-brand-green/20 text-emerald-700 border-brand-green/30',
    rejected: 'bg-red-50 text-red-600 border-red-100',
    expired: 'bg-slate-700/10 text-slate-700 border-slate-700/20',
  };

  return styles[status] || styles.pending;
};

const getLastEvent = (proposal: any) => {
  const events = Array.isArray(proposal.proposal_events) ? proposal.proposal_events : [];
  if (events.length === 0) return null;

  return [...events].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
};

export function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<{ id: string; title: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOpenProposal = (proposal: any) => {
    return OPEN_PROPOSAL_STATUSES.includes(proposal.status)
      && !proposal.pdf_url
      && !proposal.sent_whatsapp_at
      && !proposal.public_viewed_at
      && !proposal.accepted_at
      && !proposal.rejected_at;
  };

  const openProposals = proposals
    .filter(isOpenProposal)
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());
  const closedOrSentProposals = proposals.filter((proposal) => !isOpenProposal(proposal));

  const getProposalProgress = (proposal: any) => {
    let stepIndex = 0;
    let stepName = 'Cliente';
    const remaining: string[] = ['Local', 'Consumo', 'Dimensionamento', 'Kit Solar', 'Custos', 'Revisão'];

    if (proposal.final_price != null && Number(proposal.final_price) > 0) {
      stepIndex = 6;
      stepName = 'Revisão';
      remaining.splice(0, remaining.length);
    } else if (proposal.kit_cost != null && Number(proposal.kit_cost) > 0) {
      stepIndex = 5;
      stepName = 'Custos';
      remaining.splice(0, remaining.length, 'Revisão');
    } else if (proposal.selected_solar_kit_id || proposal.solar_kit_snapshot) {
      stepIndex = 4;
      stepName = 'Kit Solar';
      remaining.splice(0, remaining.length, 'Custos', 'Revisão');
    } else if (proposal.monthly_consumption_kwh != null && Number(proposal.monthly_consumption_kwh) > 0) {
      stepIndex = 3;
      stepName = 'Dimensionamento';
      remaining.splice(0, remaining.length, 'Kit Solar', 'Custos', 'Revisão');
    } else if (proposal.consumption_source) {
      stepIndex = 2;
      stepName = 'Consumo';
      remaining.splice(0, remaining.length, 'Dimensionamento', 'Kit Solar', 'Custos', 'Revisão');
    } else if (proposal.roof_type || (proposal.roof_area_m2 != null && Number(proposal.roof_area_m2) > 0)) {
      stepIndex = 1;
      stepName = 'Local';
      remaining.splice(0, remaining.length, 'Consumo', 'Dimensionamento', 'Kit Solar', 'Custos', 'Revisão');
    }

    const percentage = Math.min(Math.round(((stepIndex + 1) / 7) * 100), 100);
    return { stepName, percentage, stepIndex, remaining };
  };

  useEffect(() => {
    async function loadClient() {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await clientService.getClientById(id);
        setClient(data);
        
        const { data: propsData } = await supabase
          .from('proposals')
          .select('*, proposal_events(event_type, description, created_at)')
          .eq('client_id', id)
          .order('updated_at', { ascending: false });
        
        if (propsData) {
          setProposals(propsData);
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar detalhes do cliente');
      } finally {
        setIsLoading(false);
      }
    }
    loadClient();
  }, [id]);

  const startNewProposal = () => {
    if (client) {
      navigate(`/propostas/nova?clienteId=${client.id}`);
    }
  };

  const triggerDeleteProposal = (proposalId: string, title: string | null) => {
    setProposalToDelete({ id: proposalId, title });
    setDeleteModalOpen(true);
  };

  const confirmDeleteProposal = async () => {
    if (!proposalToDelete) return;
    try {
      setIsDeleting(true);
      await proposalService.deleteProposal(proposalToDelete.id);
      toast.success('Proposta excluída com sucesso!');
      setProposals((prev) => prev.filter((p) => p.id !== proposalToDelete.id));
      setDeleteModalOpen(false);
      setProposalToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir proposta');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatMoney = (val: number | null | undefined) => {
    if (val == null) return '-';
    return 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const getStatusBadge = (status: string) => {
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadgeClasses(status)}`}>
        {getStatusLabel(status)}
      </span>
    );
  };

  if (isLoading) {
    return <div className="text-brand-blue animate-pulse">Carregando detalhes...</div>;
  }

  if (error || !client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-brand-dark mb-2">Erro</h2>
        <p className="text-red-400 mb-6">{error || 'Cliente não encontrado.'}</p>
        <Link to="/clientes">
          <Button variant="outline">Voltar para Clientes</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div className="rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <Link to="/clientes">
              <Button variant="ghost" size="icon" className="border border-transparent hover:border-brand-border">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-brand-blue">Cliente</p>
              <h1 className="mt-1 text-2xl font-bold text-white tracking-tight">{client.name}</h1>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full border border-brand-border bg-slate-950/30 px-3 py-1">
                  Documento: {client.document || 'Não informado'}
                </span>
                <span className="rounded-full border border-brand-border bg-slate-950/30 px-3 py-1">
                  {client.phone || 'Telefone não informado'}
                </span>
                <span className="rounded-full border border-brand-border bg-slate-950/30 px-3 py-1">
                  {client.email || 'E-mail não informado'}
                </span>
                {(client.city || client.state) && (
                  <span className="rounded-full border border-brand-border bg-slate-950/30 px-3 py-1">
                    {[client.city, client.state].filter(Boolean).join(' - ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/clientes/${client.id}/editar`)}
              className="gap-2 border-brand-border bg-white/5 text-white hover:bg-white/10"
            >
              <Edit className="w-4 h-4" />
              Editar Cliente
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-brand-dark">WhatsApp / Telefone</p>
                  <p className="text-sm text-slate-500">{client.phone || '-'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-brand-dark">E-mail</p>
                  <p className="text-sm text-slate-500">{client.email || '-'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-500">
                  <p className="text-brand-dark font-medium mb-1">
                    {client.address ? `${client.address}, ${client.number || 'S/N'}` : 'Endereço não informado'}
                  </p>
                  {client.complement && <p>{client.complement}</p>}
                  {(client.neighborhood || client.city || client.state || client.cep) && (
                    <p>
                      {[client.neighborhood, client.city, client.state].filter(Boolean).join(', ')}
                      {client.cep ? ` - CEP: ${client.cep}` : ''}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Dados Técnicos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <Zap className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-brand-dark">Consumo Médio</p>
                  <p className="text-sm text-slate-500">
                    {client.avg_consumption_kwh ? `${client.avg_consumption_kwh} kWh/mês` : 'Não informado'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Propostas do Cliente</CardTitle>
                <CardDescription>Acompanhe as propostas pendentes e o histórico comercial deste cliente.</CardDescription>
              </div>
              <Button onClick={startNewProposal} className="gap-2 bg-brand-blue text-white hover:bg-brand-blue-hover">
                <Plus className="w-4 h-4" />
                Nova Proposta
              </Button>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-5">
              {openProposals.length > 0 && (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-brand-dark">Propostas em preenchimento</h3>
                    <p className="text-xs text-slate-500">Estas propostas ainda não foram concluídas. Use apenas continuar ou excluir.</p>
                  </div>
                  {openProposals.map((proposal) => {
                    const { stepName, percentage, stepIndex, remaining } = getProposalProgress(proposal);
                    return (
                      <div key={proposal.id} className="rounded-2xl border border-brand-blue/30 bg-brand-blue/10 p-5 shadow-md">
                        <div className="flex flex-col gap-4">
                          <div className="min-w-0 flex-1 space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {getStatusBadge(proposal.status)}
                              <span className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-slate-950/20 px-2.5 py-1 text-[11px] text-slate-400">
                                <Clock className="h-3 w-3" /> Última alteração: {formatDate(proposal.updated_at || proposal.created_at)}
                              </span>
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-white">{proposal.title || 'Nova Proposta'}</h3>
                              <p className="mt-1 text-xs text-slate-400">Código: {proposal.code || 'Será gerado ao salvar'} · Valor: {formatMoney(proposal.final_price)}</p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <span className="text-slate-400">Etapa atual: <strong className="text-brand-blue">{stepName}</strong></span>
                                <span className="font-semibold text-brand-blue">{percentage}%</span>
                              </div>
                              <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
                                <div className="h-1.5 rounded-full bg-brand-blue transition-all duration-500" style={{ width: `${percentage}%` }} />
                              </div>
                              {remaining.length > 0 && (
                                <p className="text-[11px] text-slate-500">Faltam: {remaining.join(', ')}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex w-full items-center gap-2">
                            <Button 
                              onClick={() => navigate(`/propostas/${proposal.id}/editar?step=${stepIndex}`)}
                              className="flex-1 gap-2 bg-brand-blue hover:bg-brand-blue-hover text-white"
                            >
                              <ArrowRight className="w-4 h-4" />
                              Continuar Proposta
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-10 w-10 text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-brand-border hover:border-red-500/20"
                              title="Excluir proposta"
                              onClick={() => triggerDeleteProposal(proposal.id, proposal.title)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {proposals.length === 0 ? (
                <div className="bg-gray-50 border border-brand-border rounded-lg p-8 flex flex-col items-center justify-center flex-1 text-center min-h-[300px]">
                  <FileText className="w-12 h-12 text-slate-500 mb-4" />
                  <h3 className="text-lg font-medium text-brand-dark mb-2">Nenhuma proposta gerada</h3>
                  <p className="text-sm text-slate-500 max-w-sm mb-6">
                    Este cliente ainda não possui nenhuma proposta comercial vinculada ao seu cadastro.
                  </p>
                  <Button onClick={startNewProposal} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Gerar Primeira Proposta
                  </Button>
                </div>
              ) : closedOrSentProposals.length > 0 ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold text-brand-dark">Propostas concluídas ou enviadas</h3>
                    <p className="text-xs text-slate-500">Aqui entram propostas que já podem ser visualizadas, editadas ou acompanhadas.</p>
                  </div>
                  <div className="overflow-auto rounded-xl border border-brand-border">
                    <table className="w-full text-left border-collapse">
                      <thead className="sticky top-0 bg-brand-gray text-xs font-medium text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-3 border-b border-brand-border">Proposta</th>
                          <th className="px-4 py-3 border-b border-brand-border">Valor</th>
                          <th className="px-4 py-3 border-b border-brand-border">Status</th>
                          <th className="px-4 py-3 border-b border-brand-border">Último Evento</th>
                          <th className="px-4 py-3 border-b border-brand-border text-right">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border">
                        {closedOrSentProposals.map(prop => {
                          const lastEvent = getLastEvent(prop);
                          return (
                            <tr key={prop.id} className="hover:bg-brand-surface transition-colors">
                              <td className="px-4 py-3">
                                <p className="text-sm font-medium text-brand-dark">{prop.title || 'Sistema Solar'}</p>
                                <p className="text-xs text-slate-500">{formatDate(prop.created_at)} {prop.code && `- ${prop.code}`}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm text-brand-dark font-medium">{formatMoney(prop.final_price)}</p>
                              </td>
                              <td className="px-4 py-3">
                                {getStatusBadge(prop.status)}
                              </td>
                              <td className="px-4 py-3">
                                {lastEvent ? (
                                  <div>
                                    <p className="text-xs text-brand-dark">{lastEvent.description || lastEvent.event_type}</p>
                                    <p className="text-[10px] text-slate-500">{formatDate(lastEvent.created_at)}</p>
                                  </div>
                                ) : (
                                  <p className="text-xs text-slate-500">-</p>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-white hover:bg-gray-100"
                                    title="Visualizar Proposta"
                                    onClick={() => navigate(`/propostas/${prop.id}`)}
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-brand-light hover:bg-brand-blue/10"
                                    title="Editar Proposta"
                                    onClick={() => navigate(`/propostas/${prop.id}/editar`)}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                                    title="Excluir Proposta"
                                    onClick={() => triggerDeleteProposal(prop.id, prop.title)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : openProposals.length > 0 ? (
                <p className="text-center text-sm text-slate-500">Nenhuma proposta finalizada ou enviada ainda.</p>
              ) : null}
            </CardContent>
          </Card>
          
          {client.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500 whitespace-pre-wrap">{client.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteProposal}
        title="Excluir Proposta"
        description={`Tem certeza que deseja excluir a proposta "${proposalToDelete?.title || 'Sem título'}"? Esta ação é permanente e não poderá ser desfeita.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
