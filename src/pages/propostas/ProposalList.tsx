import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Eye, Search, Trash2 } from 'lucide-react';
import { proposalService } from '../../services/proposalService';
import { Proposal } from '../../types/proposal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { formatDate } from '../../lib/utils';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { PENDING_PROPOSAL_STATUSES } from '../../lib/proposals/status';

export function ProposalList() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<{ id: string; title: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const navigate = useNavigate();

  const loadProposals = async () => {
    try {
      setIsLoading(true);
      const data = await proposalService.getProposals();
      setProposals(data);
      setFilteredProposals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar propostas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadProposals();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    setFilteredProposals(proposals.filter((proposal) => {
      const matchSearch = proposal.title?.toLowerCase().includes(term)
        || proposal.code?.toLowerCase().includes(term)
        || proposal.client?.name.toLowerCase().includes(term);
      const matchStatus = statusFilter
        ? statusFilter === 'pending_like'
          ? PENDING_PROPOSAL_STATUSES.includes(proposal.status as (typeof PENDING_PROPOSAL_STATUSES)[number])
          : proposal.status === statusFilter
        : true;
      return Boolean(matchSearch && matchStatus);
    }));
  }, [searchTerm, statusFilter, proposals]);

  const confirmDelete = async () => {
    if (!proposalToDelete) return;
    try {
      setIsDeleting(true);
      await proposalService.deleteProposal(proposalToDelete.id);
      toast.success('Proposta excluída com sucesso.');
      setDeleteModalOpen(false);
      setProposalToDelete(null);
      await loadProposals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir proposta');
    } finally {
      setIsDeleting(false);
    }
  };

  const statusLabel = (status: string) => ({
    draft: 'Pendente', pending: 'Pendente', sent: 'Enviada', viewed: 'Visualizada',
    accepted: 'Aprovada', approved: 'Aprovada', rejected: 'Recusada', expired: 'Expirada',
  }[status] || status);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-brand-dark">Propostas</h1>
        <p className="text-sm text-slate-500">Consulte e exclua propostas já existentes.</p>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Gerador de propostas removido</p>
          <p className="mt-1 text-sm">O Wizard, a edição, a duplicação e os cálculos foram removidos. Os registros existentes foram preservados apenas para consulta e exclusão.</p>
        </div>
      </div>

      <Card className="flex flex-col overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-brand-border bg-gray-50 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input placeholder="Buscar por cliente, título ou código..." className="pl-9" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </div>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full md:w-48">
            <option value="">Todos os status</option>
            <option value="pending_like">Pendente</option>
            <option value="sent">Enviada</option>
            <option value="viewed">Visualizada</option>
            <option value="approved">Aprovada</option>
            <option value="rejected">Recusada</option>
          </Select>
        </div>

        {error && <div className="border-b border-brand-border bg-red-50 p-4 text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-gray text-[10px] uppercase tracking-widest text-slate-500">
              <tr><th className="px-4 py-3">Proposta</th><th className="px-4 py-3">Cliente</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Data</th><th className="px-4 py-3 text-right">Ações</th></tr>
            </thead>
            <tbody className="bg-brand-surface text-sm">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Carregando propostas...</td></tr>
              ) : filteredProposals.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhuma proposta encontrada.</td></tr>
              ) : filteredProposals.map((proposal) => (
                <tr key={proposal.id} className="border-b border-brand-border hover:bg-gray-50">
                  <td className="px-4 py-3"><p className="font-medium text-brand-dark">{proposal.title || 'Sem título'}</p><p className="text-[11px] text-slate-500">{proposal.code || 'Sem código'}</p></td>
                  <td className="px-4 py-3 text-brand-dark">{proposal.client?.name || '-'}</td>
                  <td className="px-4 py-3"><span className="rounded-full border border-brand-border px-2.5 py-0.5 text-xs">{statusLabel(proposal.status)}</span></td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(proposal.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" title="Visualizar" onClick={() => navigate(`/propostas/${proposal.id}`)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" title="Excluir" className="text-red-500" onClick={() => { setProposalToDelete({ id: proposal.id, title: proposal.title }); setDeleteModalOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
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
