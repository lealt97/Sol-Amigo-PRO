import { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ProposalActionButtons } from '../../components/proposals/ProposalActionButtons';
import { RenameProposalModal } from '../../components/proposals/RenameProposalModal';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { getProposalStatusPresentation } from '../../lib/proposals/presentation';
import { formatDate } from '../../lib/utils';
import { proposalService } from '../../services/proposalService';
import { Proposal } from '../../types/proposal';

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
  const [proposalToRename, setProposalToRename] = useState<{ id: string; title: string } | null>(null);
  const [isRenaming, setIsRenaming] = useState(false);
  const [duplicatingProposalId, setDuplicatingProposalId] = useState<string | null>(null);
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
        ? statusFilter === 'approved'
          ? proposal.status === 'approved' || proposal.status === 'accepted'
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

  const confirmRename = async (title: string) => {
    if (!proposalToRename) return;
    try {
      setIsRenaming(true);
      await proposalService.renameProposal(proposalToRename.id, title);
      toast.success('Proposta renomeada.');
      setProposalToRename(null);
      await loadProposals();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao renomear proposta');
    } finally {
      setIsRenaming(false);
    }
  };

  const duplicateProposal = async (proposal: Proposal) => {
    try {
      setDuplicatingProposalId(proposal.id);
      const duplicate = await proposalService.duplicateProposal(proposal.id);
      toast.success('Proposta duplicada com sucesso.');
      await loadProposals();
      navigate(`/propostas/${duplicate.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao duplicar proposta');
    } finally {
      setDuplicatingProposalId(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Propostas</h1>
          <p className="text-sm text-slate-500">Dimensione um sistema com seus kits cadastrados e continue rascunhos salvos.</p>
        </div>
        <Button className="gap-2" onClick={() => navigate('/propostas/nova')}>
          <Plus className="h-4 w-4" /> Novo dimensionamento
        </Button>
      </div>

      <Card className="flex flex-col overflow-hidden">
        <div className="flex flex-col gap-4 border-b border-brand-border bg-gray-50 p-4 md:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              placeholder="Buscar por cliente, título ou código..."
              className="pl-9"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="w-full md:w-52">
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="pending">Pronta para envio</option>
            <option value="sent">Enviada</option>
            <option value="viewed">Visualizada</option>
            <option value="approved">Aprovada</option>
            <option value="rejected">Recusada</option>
            <option value="expired">Expirada</option>
          </Select>
        </div>

        {error && <div className="border-b border-brand-border bg-red-50 p-4 text-red-600">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-brand-gray text-[10px] uppercase tracking-widest text-slate-500">
              <tr>
                <th className="px-4 py-3">Proposta</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-brand-surface text-sm">
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Carregando propostas...</td></tr>
              ) : filteredProposals.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-500">Nenhuma proposta encontrada.</td></tr>
              ) : filteredProposals.map((proposal) => {
                const statusPresentation = getProposalStatusPresentation(proposal.status);
                return (
                  <tr key={proposal.id} className="border-b border-brand-border hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-brand-dark">{proposal.title || 'Sem título'}</p>
                      <p className="text-[11px] text-slate-500">{proposal.code || 'Sem código'}</p>
                    </td>
                    <td className="px-4 py-3 text-brand-dark">{proposal.client?.name || '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-xs ${statusPresentation.className}`}
                        title={statusPresentation.description}
                      >
                        {statusPresentation.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(proposal.updated_at || proposal.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <ProposalActionButtons
                        proposal={proposal}
                        isDuplicating={duplicatingProposalId === proposal.id}
                        onDuplicate={duplicateProposal}
                        onRename={(target) => setProposalToRename({ id: target.id, title: target.title || 'Proposta sem título' })}
                        onDelete={(target) => {
                          setProposalToDelete({ id: target.id, title: target.title });
                          setDeleteModalOpen(true);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <RenameProposalModal
        isOpen={Boolean(proposalToRename)}
        initialTitle={proposalToRename?.title || ''}
        isLoading={isRenaming}
        onClose={() => { if (!isRenaming) setProposalToRename(null); }}
        onConfirm={(title) => void confirmRename(title)}
      />

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
