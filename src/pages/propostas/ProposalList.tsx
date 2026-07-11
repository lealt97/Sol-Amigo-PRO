import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { proposalService } from '../../services/proposalService';
import { Proposal } from '../../types/proposal';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { Search, Plus, MoreHorizontal, Copy, Edit, Trash2, Eye } from 'lucide-react';
import { formatDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';

export function ProposalList() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filteredProposals, setFilteredProposals] = useState<Proposal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  
  // Custom Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<{ id: string; title: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  const loadProposals = async () => {
    try {
      setIsLoading(true);
      const data = await proposalService.getProposals();
      setProposals(data);
      setFilteredProposals(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar propostas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProposals();
  }, []);

  useEffect(() => {
    const term = searchTerm.toLowerCase();
    const filtered = proposals.filter((p) => {
      const matchSearch = p.title?.toLowerCase().includes(term) || 
                          p.code?.toLowerCase().includes(term) ||
                          p.client?.name.toLowerCase().includes(term);
      const matchStatus = statusFilter ? p.status === statusFilter : true;
      return matchSearch && matchStatus;
    });
    setFilteredProposals(filtered);
  }, [searchTerm, statusFilter, proposals]);

  const triggerDelete = (id: string, title: string | null) => {
    setProposalToDelete({ id, title });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!proposalToDelete) return;
    try {
      setIsDeleting(true);
      await proposalService.deleteProposal(proposalToDelete.id);
      toast.success('Proposta excluída com sucesso!');
      await loadProposals();
      setDeleteModalOpen(false);
      setProposalToDelete(null);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir proposta');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDuplicate = async (proposal: Proposal) => {
    if (!user) return;
    try {
      const { id, created_at, updated_at, code, client, ...rest } = proposal;
      const duplicated = await proposalService.createProposal(
        { ...rest, title: `${proposal.title || 'Proposta'} (Cópia)` },
        user.id
      );
      navigate(`/propostas/${duplicated.id}/editar`);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao duplicar proposta');
    }
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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Propostas</h1>
          <p className="text-sm text-slate-500">Gerencie seus projetos e propostas comerciais.</p>
        </div>
        <Link to="/propostas/nova">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Proposta
          </Button>
        </Link>
      </div>

      <Card className="flex flex-col overflow-hidden">
        <div className="p-4 border-b border-brand-border bg-gray-50 flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por cliente, título ou código..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="w-full md:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="draft">Rascunho</option>
              <option value="sent">Enviada</option>
              <option value="viewed">Visualizada</option>
              <option value="accepted">Aprovada</option>
              <option value="rejected">Recusada</option>
            </Select>
          </div>
        </div>

        {error && (
          <div className="p-4 text-red-600 bg-red-50 border-b border-brand-border">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-gray text-slate-500 text-[10px] uppercase tracking-widest">
              <tr>
                <th className="px-4 py-3 font-medium">Proposta</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm bg-brand-surface">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-500">Carregando propostas...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredProposals.length > 0 ? (
                filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="border-b border-brand-border hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-dark">{proposal.title || 'Sem título'}</div>
                      <div className="text-[11px] text-slate-500">{proposal.code || 'Sem código'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-brand-dark">{proposal.client?.name || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(proposal.status)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {formatDate(proposal.created_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-brand-dark"
                          title="Visualizar"
                          onClick={() => navigate(`/propostas/${proposal.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-brand-blue"
                          title="Editar"
                          onClick={() => navigate(`/propostas/${proposal.id}/editar`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-blue-500"
                          title="Duplicar"
                          onClick={() => handleDuplicate(proposal)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-slate-500 hover:text-red-600"
                          title="Excluir"
                          onClick={() => triggerDelete(proposal.id, proposal.title)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-500 text-sm">
                    Nenhuma proposta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Excluir Proposta"
        description={`Tem certeza que deseja excluir a proposta "${proposalToDelete?.title || 'Sem título'}"? Esta ação é permanente e não poderá ser desfeita.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
