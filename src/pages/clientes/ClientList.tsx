import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router-dom';
import { clientService } from '../../services/clientService';
import { filterClients } from '../../lib/clients/clientFlows';
import { Client } from '../../types/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Search, Plus, FileText, Edit, Trash2, Eye } from 'lucide-react';
import { DeleteConfirmModal } from '../../components/ui/DeleteConfirmModal';

export function ClientList() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const navigate = useNavigate();
  const filteredClients = filterClients(clients, searchTerm);

  const loadClients = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setClients(await clientService.getClients());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar clientes');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadClients();
  }, []);

  const triggerDelete = (id: string, name: string) => {
    setClientToDelete({ id, name });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;

    try {
      setIsDeleting(true);
      await clientService.deleteClient(clientToDelete.id);
      toast.success('Cliente excluído com sucesso!');
      await loadClients();
      setDeleteModalOpen(false);
      setClientToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir cliente');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-dark">Clientes</h1>
          <p className="text-sm text-slate-500">Gerencie sua base de clientes.</p>
        </div>
        <Link to="/clientes/novo">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Cliente
          </Button>
        </Link>
      </div>

      <Card className="flex flex-col overflow-hidden">
        <div className="p-4 border-b border-brand-border bg-gray-50 flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Buscar por nome, e-mail, documento..."
              className="pl-9"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
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
                <th className="px-4 py-3 font-medium">Nome / Razão Social</th>
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Cidade/UF</th>
                <th className="px-4 py-3 font-medium">Consumo</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm bg-brand-surface">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8">
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <div className="w-8 h-8 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-500">Carregando clientes...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length > 0 ? (
                filteredClients.map((client) => (
                  <tr key={client.id} className="border-b border-brand-border hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-dark">{client.name}</div>
                      <div className="text-[11px] text-slate-500">{client.document || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-brand-dark">{client.phone || '-'}</div>
                      <div className="text-[11px] text-slate-500">{client.email || '-'}</div>
                    </td>
                    <td className="px-4 py-3 text-brand-dark">
                      {client.city && client.state ? `${client.city}, ${client.state}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-brand-dark">
                      {client.avg_consumption_kwh ? `${client.avg_consumption_kwh} kWh/mês` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-white hover:bg-gray-100"
                          title="Visualizar"
                          onClick={() => navigate(`/clientes/${client.id}`)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-brand-light hover:bg-brand-blue/10"
                          title="Editar"
                          onClick={() => navigate(`/clientes/${client.id}/editar`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10"
                          title="Nova Proposta"
                          onClick={() => navigate(`/propostas/nova?clienteId=${client.id}`)}
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                          title="Excluir"
                          onClick={() => triggerDelete(client.id, client.name)}
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
                    Nenhum cliente encontrado.
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
        title="Excluir Cliente"
        description={`Tem certeza que deseja excluir o cliente "${clientToDelete?.name || ''}"? Esta ação é permanente, removerá todos os dados e propostas associados a este cliente e não poderá ser desfeita.`}
        isLoading={isDeleting}
      />
    </div>
  );
}
