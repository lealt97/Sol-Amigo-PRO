import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Eye, Mail, MapPin, Phone, Trash2, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { clientService } from '../../services/clientService';
import { proposalService } from '../../services/proposalService';
import { supabase } from '../../lib/supabase/client';
import { Client } from '../../types/client';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/Card';
import { formatDate } from '../../lib/utils';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';

const statusLabel = (status: string) => ({
  draft: 'Pendente', pending: 'Pendente', sent: 'Enviada', viewed: 'Visualizada',
  accepted: 'Aprovada', approved: 'Aprovada', rejected: 'Recusada', expired: 'Expirada',
}[status] || status);

export function ClientDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [client, setClient] = useState<Client | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<{ id: string; title: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadClient() {
      if (!id) return;
      try {
        setIsLoading(true);
        const [clientData, proposalsResult] = await Promise.all([
          clientService.getClientById(id),
          supabase.from('proposals').select('id, title, code, status, created_at').eq('client_id', id).order('created_at', { ascending: false }),
        ]);
        setClient(clientData);
        setProposals(proposalsResult.data || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar detalhes do cliente');
      } finally {
        setIsLoading(false);
      }
    }

    void loadClient();
  }, [id]);

  const confirmDeleteProposal = async () => {
    if (!proposalToDelete) return;
    try {
      setIsDeleting(true);
      await proposalService.deleteProposal(proposalToDelete.id);
      setProposals((current) => current.filter((proposal) => proposal.id !== proposalToDelete.id));
      setDeleteModalOpen(false);
      setProposalToDelete(null);
      toast.success('Proposta excluída com sucesso.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir proposta');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) return <div className="text-brand-blue animate-pulse">Carregando detalhes...</div>;

  if (error || !client) {
    return (
      <div className="py-12 text-center">
        <h2 className="mb-2 text-xl font-semibold text-brand-dark">Erro</h2>
        <p className="mb-6 text-red-500">{error || 'Cliente não encontrado.'}</p>
        <Link to="/clientes"><Button variant="outline">Voltar para Clientes</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-brand-border bg-brand-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Link to="/clientes"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brand-blue">Cliente</p>
            <h1 className="mt-1 text-2xl font-bold text-brand-dark">{client.name}</h1>
            <p className="mt-1 text-sm text-slate-500">{client.document || 'Documento não informado'}</p>
          </div>
        </div>
        <Button variant="outline" className="gap-2" onClick={() => navigate(`/clientes/${client.id}/editar`)}><Edit className="h-4 w-4" />Editar cliente</Button>
      </header>

      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-lg">Contato</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex gap-3"><Phone className="h-5 w-5 text-slate-500" /><span>{client.phone || 'Não informado'}</span></div>
              <div className="flex gap-3"><Mail className="h-5 w-5 text-slate-500" /><span>{client.email || 'Não informado'}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Endereço</CardTitle></CardHeader>
            <CardContent className="flex gap-3 text-sm text-slate-500">
              <MapPin className="h-5 w-5 shrink-0" />
              <p>{client.address ? `${client.address}, ${client.number || 'S/N'}` : 'Não informado'}<br />{[client.neighborhood, client.city, client.state].filter(Boolean).join(', ')}{client.cep ? ` - ${client.cep}` : ''}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-lg">Dados cadastrados</CardTitle></CardHeader>
            <CardContent className="flex gap-3 text-sm text-slate-500">
              <Zap className="h-5 w-5 shrink-0" />
              <p>Consumo informado: {client.avg_consumption_kwh ? `${client.avg_consumption_kwh} kWh/mês` : 'não informado'}. Nenhum cálculo é realizado nesta tela.</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Propostas históricas</CardTitle>
            <CardDescription>O gerador foi removido. Estes registros permanecem somente para consulta e exclusão.</CardDescription>
          </CardHeader>
          <CardContent>
            {proposals.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Nenhuma proposta vinculada a este cliente.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-brand-border">
                <table className="w-full text-left text-sm">
                  <thead className="bg-brand-gray text-[10px] uppercase tracking-widest text-slate-500"><tr><th className="px-4 py-3">Proposta</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
                  <tbody>
                    {proposals.map((proposal) => (
                      <tr key={proposal.id} className="border-t border-brand-border">
                        <td className="px-4 py-3"><p className="font-medium text-brand-dark">{proposal.title || 'Sem título'}</p><p className="text-xs text-slate-500">{proposal.code || 'Sem código'}</p></td>
                        <td className="px-4 py-3 text-slate-500">{formatDate(proposal.created_at)}</td>
                        <td className="px-4 py-3"><span className="rounded-full border border-brand-border px-2 py-0.5 text-xs">{statusLabel(proposal.status)}</span></td>
                        <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Button variant="ghost" size="icon" title="Visualizar" onClick={() => navigate(`/propostas/${proposal.id}`)}><Eye className="h-4 w-4" /></Button><Button variant="ghost" size="icon" className="text-red-500" title="Excluir" onClick={() => { setProposalToDelete({ id: proposal.id, title: proposal.title }); setDeleteModalOpen(true); }}><Trash2 className="h-4 w-4" /></Button></div></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDeleteProposal}
        title="Excluir Proposta"
        description={`Tem certeza que deseja excluir a proposta "${proposalToDelete?.title || 'Sem título'}"? Esta ação é permanente.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
