import { Card } from '../components/ui/Card';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase/client';
import { formatCurrency, formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';
import { ArrowRight, Eye, Edit } from 'lucide-react';

const PENDING_PROPOSAL_STATUSES = ['draft', 'pending'];

function isProposalPending(proposal: any) {
  return PENDING_PROPOSAL_STATUSES.includes(proposal.status);
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
    pending: 'bg-brand-yellow/10 text-amber-600 border-brand-yellow/20',
    sent: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    viewed: 'bg-brand-blue/10 text-brand-blue border-brand-blue/20',
    approved: 'bg-brand-green/20 text-emerald-700 border-brand-green/30',
    accepted: 'bg-brand-green/20 text-emerald-700 border-brand-green/30',
    rejected: 'bg-red-50 text-red-600 border-red-100',
    expired: 'bg-slate-700/10 text-slate-700 border-slate-700/20',
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] border rounded-full ${styles[status] || styles.pending}`}>
      {
      status === 'draft' || status === 'pending' ? 'Pendente' :
      status === 'sent' ? 'Enviada' :
      status === 'viewed' ? 'Visualizada' :
      status === 'approved' || status === 'accepted' ? 'Aprovada' :
      status === 'rejected' ? 'Recusada' :
      status === 'expired' ? 'Expirada' : status
    }
    </span>
  );
}

export function Dashboard() {
  const [kpiData, setKpiData] = useState({
    clientesAtivos: 0,
    propostasMes: 0,
    propostasTotal: 0,
    valorVendidoAno: 0,
    lucroAcumulado: 0
  });
  const [propostasRecentes, setPropostasRecentes] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        // Load Clients count
        const { count: clientsCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true });
        
        // Load Proposals
        const { data: proposals } = await supabase
          .from('proposals')
          .select('*, client:clients(name), solar:solar_system_calculations(installed_power_kwp)')
          .order('created_at', { ascending: false });
          
        if (proposals) {
          const now = new Date();
          const currentMonth = now.getMonth();
          const currentYear = now.getFullYear();
          
          let propMes = 0;
          let valorVendido = 0;
          let lucroTotal = 0;
          
          proposals.forEach(p => {
            const d = new Date(p.created_at);
            if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
              propMes++;
            }
            
            // Only consider approved/accepted for sales/profit KPIs
            if (p.status === 'approved' || p.status === 'accepted') {
              if (d.getFullYear() === currentYear) {
                valorVendido += (p.final_price || 0);
              }
              lucroTotal += (p.estimated_profit || 0);
            }
          });
          
          setKpiData({
            clientesAtivos: clientsCount || 0,
            propostasMes: propMes,
            propostasTotal: proposals.length,
            valorVendidoAno: valorVendido,
            lucroAcumulado: lucroTotal
          });
          
          setPropostasRecentes(proposals.slice(0, 10));
        }
      } catch (err) {
        console.error('Error loading dashboard data:', err);
      }
    }
    loadData();
  }, []);
  return (
    <div className="flex flex-col gap-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Clientes Ativos</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-semibold">{kpiData.clientesAtivos}</h3>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Propostas (Mês)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-semibold">{kpiData.propostasMes}</h3>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Propostas (Total)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-semibold">{kpiData.propostasTotal}</h3>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Vendido (Ano)</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-semibold text-emerald-700">{formatCurrency(kpiData.valorVendidoAno)}</h3>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-1 uppercase tracking-wider">Lucro Acumulado</p>
          <div className="flex items-end justify-between">
            <h3 className="text-2xl font-semibold text-brand-blue">{formatCurrency(kpiData.lucroAcumulado)}</h3>
          </div>
        </Card>
      </div>

      {/* Propostas Recentes Table */}
      <Card className="flex flex-col overflow-hidden">
        <div className="p-4 border-b border-brand-border flex justify-between items-center bg-brand-surface">
          <h3 className="text-sm font-medium">Propostas Recentes</h3>
          <Link to="/propostas" className="text-xs text-brand-blue hover:underline">
            Ver todas
          </Link>
        </div>
        <div className="overflow-x-auto scroll-after-3-table">
          <table className="w-full text-left border-collapse">
            <thead className="bg-brand-gray text-slate-500 text-[10px] uppercase tracking-widest sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Potência</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="text-sm bg-brand-surface">
              {propostasRecentes.map((prop) => {
                const pending = isProposalPending(prop);

                return (
                  <tr key={prop.id} className="border-b border-brand-border hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-brand-dark">{prop.client?.name}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{formatDate(prop.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-brand-dark">
                      {(() => {
                        const solarObj = Array.isArray(prop.solar) ? prop.solar[0] : prop.solar;
                        return solarObj?.installed_power_kwp ? solarObj.installed_power_kwp.toFixed(1) + ' kWp' : '-';
                      })()}
                    </td>
                    <td className="px-4 py-3 font-mono text-brand-dark">{formatCurrency(prop.final_price || 0)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={prop.status} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {pending ? (
                          <Link 
                            to={`/propostas/${prop.id}/editar`} 
                            className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-brand-blue px-3 text-xs font-semibold text-white transition-colors hover:bg-brand-blue-hover"
                            title="Continuar proposta"
                            aria-label="Continuar proposta"
                          >
                            <ArrowRight className="w-4 h-4" />
                            Continuar
                          </Link>
                        ) : (
                          <>
                            <Link 
                              to={`/propostas/${prop.id}`} 
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-white hover:bg-gray-100 transition-colors"
                              title="Visualizar Proposta"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                            <Link 
                              to={`/propostas/${prop.id}/editar`} 
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md text-slate-500 hover:text-brand-light hover:bg-brand-blue/10 transition-colors"
                              title="Editar Proposta"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {propostasRecentes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500 text-sm">
                    Nenhuma proposta encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
