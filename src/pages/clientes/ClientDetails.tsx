import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { clientService } from '../../services/clientService';
import { proposalService } from '../../services/proposalService';
import { supabase } from '../../lib/supabase/client';
import { Client } from '../../types/client';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/Card';
import { ArrowLeft, Edit, Plus, MapPin, Phone, Mail, FileText, Zap, Trash2, Eye } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { toast } from 'sonner';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';

export function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);

  // Custom Delete Modal State for Proposals
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<{ id: string; title: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadClient() {
      if (!id) return;
      try {
        setIsLoading(true);
        const data = await clientService.getClientById(id);
        setClient(data);
        
        const { data: propsData } = await supabase
          .from('proposals')
          .select('id, title, code, status, final_price, created_at, updated_at, proposal_events(event_type, description, created_at)')
          .eq('client_id', id)
          .order('created_at', { ascending: false });
        
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
    const styles: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-500 border-gray-200',
      sent: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
      viewed: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
      pending: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
      accepted: 'bg-brand-green/20 text-emerald-700 border-brand-green/30',
      rejected: 'bg-red-50 text-red-600 border-red-100',
      expired: 'bg-slate-700/10 text-slate-700 border-slate-700/20',
    };
    const labels: Record<string, string> = {
      draft: 'Rascunho',
      sent: 'Pendente',
      viewed: 'Visualizada',
      pending: 'Pendente',
      accepted: 'Aprovada',
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
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link to="/clientes">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-brand-dark">{client.name}</h1>
            <p className="text-sm text-slate-500">
              {client.document ? `Documento: ${client.document}` : 'Sem documento cadastrado'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/clientes/${client.id}/editar`)}
            className="gap-2"
          >
            <Edit className="w-4 h-4" />
            Editar
          </Button>
          <Button 
            onClick={() => navigate(`/propostas/nova?clienteId=${client.id}`)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Proposta
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 flex flex-col gap-6">
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

        <div className="md:col-span-2 flex flex-col gap-6">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Histórico de Propostas</CardTitle>
                <CardDescription>Propostas geradas para este cliente.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {proposals.length === 0 ? (
              <div className="bg-gray-50 border border-brand-border rounded-lg p-8 flex flex-col items-center justify-center flex-1 text-center min-h-[300px]">
                <FileText className="w-12 h-12 text-slate-500 mb-4" />
                <h3 className="text-lg font-medium text-brand-dark mb-2">Nenhuma proposta gerada</h3>
                <p className="text-sm text-slate-500 max-w-sm mb-6">
                  Este cliente ainda não possui nenhuma proposta comercial vinculada ao seu cadastro.
                </p>
                <Button onClick={() => navigate(`/propostas/nova?clienteId=${client.id}`)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Gerar Primeira Proposta
                </Button>
              </div>
              ) : (
                <div className="flex-1 overflow-auto max-h-[400px]">
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
                      {proposals.map(prop => (
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
                            {prop.proposal_events && prop.proposal_events.length > 0 ? (
                              <div>
                                <p className="text-xs text-brand-dark">{prop.proposal_events.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].description || prop.proposal_events[0].event_type}</p>
                                <p className="text-[10px] text-slate-500">{formatDate(prop.proposal_events.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0].created_at)}</p>
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
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

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
