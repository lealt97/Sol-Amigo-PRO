import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Eye, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card } from '../components/ui/Card';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { supabase } from '../lib/supabase/client';
import { formatDate } from '../lib/utils';
import { proposalService } from '../services/proposalService';

function StatusBadge({ status }: { status: string }) {
  const label = {
    draft: 'Pendente', pending: 'Pendente', sent: 'Enviada', viewed: 'Visualizada',
    approved: 'Aprovada', accepted: 'Aprovada', rejected: 'Recusada', expired: 'Expirada',
  }[status] || status;

  return <span className="rounded-full border border-brand-border px-2 py-0.5 text-[10px]">{label}</span>;
}

export function Dashboard() {
  const [clientCount, setClientCount] = useState(0);
  const [proposalCount, setProposalCount] = useState(0);
  const [recentProposals, setRecentProposals] = useState<any[]>([]);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<{ id: string; title: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    const [{ count: clients }, { data: proposals }] = await Promise.all([
      supabase.from('clients').select('*', { count: 'exact', head: true }),
      supabase.from('proposals').select('id, title, code, status, created_at, client:clients(name)').order('created_at', { ascending: false }),
    ]);

    setClientCount(clients || 0);
    setProposalCount(proposals?.length || 0);
    setRecentProposals((proposals || []).slice(0, 10));
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const confirmDelete = async () => {
    if (!proposalToDelete) return;
    try {
      setIsDeleting(true);
      await proposalService.deleteProposal(proposalToDelete.id);
      toast.success('Proposta excluída com sucesso.');
      setDeleteModalOpen(false);
      setProposalToDelete(null);
      await loadData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao excluir proposta');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Gerador e cálculos removidos</p>
          <p className="mt-1 text-sm">O dashboard não calcula mais potência, vendas, lucro, margem ou retorno. Os registros antigos continuam disponíveis para consulta.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Clientes cadastrados</p><p className="mt-2 text-3xl font-bold text-brand-dark">{clientCount}</p></Card>
        <Card className="p-5"><p className="text-xs uppercase tracking-wider text-slate-500">Propostas históricas</p><p className="mt-2 text-3xl font-bold text-brand-dark">{proposalCount}</p></Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-brand-border p-4">
          <h2 className="font-semibold text-brand-dark">Propostas recentes</h2>
          <Link to="/propostas" className="text-xs font-semibold text-brand-blue hover:underline">Ver todas</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-gray text-[10px] uppercase tracking-widest text-slate-500"><tr><th className="px-4 py-3">Proposta</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Data</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
            <tbody className="bg-brand-surface">
              {recentProposals.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhuma proposta encontrada.</td></tr>
              ) : recentProposals.map((proposal) => (
                <tr key={proposal.id} className="border-b border-brand-border">
                  <td className="px-4 py-3"><p className="font-medium text-brand-dark">{proposal.title || 'Sem título'}</p><p className="text-[11px] text-slate-500">{proposal.code || 'Sem código'}</p></td>
                  <td className="px-4 py-3 text-brand-dark">{proposal.client?.name || '-'}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(proposal.created_at)}</td>
                  <td className="px-4 py-3"><StatusBadge status={proposal.status} /></td>
                  <td className="px-4 py-3 text-right"><div className="flex justify-end gap-2"><Link to={`/propostas/${proposal.id}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-100" title="Visualizar"><Eye className="h-4 w-4" /></Link><button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-50" title="Excluir" onClick={() => { setProposalToDelete({ id: proposal.id, title: proposal.title }); setDeleteModalOpen(true); }}><Trash2 className="h-4 w-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Proposta"
        description={`Tem certeza que deseja excluir a proposta "${proposalToDelete?.title || 'Sem título'}"? Esta ação é permanente.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
