import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Eye, RefreshCw, Trash2 } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { toast } from 'sonner';
import {
  ClientsCategoryIcon,
  DashboardCategoryIcon,
  ProposalsCategoryIcon,
  SolarKitsCategoryIcon,
} from '../components/icons/SolAmigoCategoryIcons';
import { Card } from '../components/ui/Card';
import { DeleteConfirmModal } from '../components/ui/DeleteConfirmModal';
import { getProposalContinuePath, isActiveProposalFlowDraft } from '../lib/proposals/flow';
import { getProposalStatusPresentation } from '../lib/proposals/presentation';
import { supabase } from '../lib/supabase/client';
import { formatDate } from '../lib/utils';
import { proposalService } from '../services/proposalService';
import type { Proposal } from '../types/proposal';

type ProposalRow = Pick<Proposal,
  | 'id'
  | 'title'
  | 'code'
  | 'status'
  | 'created_at'
  | 'selected_solar_kit_id'
  | 'flow_state'
  | 'flow_completed'
> & {
  client: { name: string | null } | null;
};

type MetricCardProps = {
  label: string;
  value: string | number;
  helper: string;
  icon: ReactNode;
  trend?: number;
};

const STATUS_CHART_COLORS = [
  '#94A3B8',
  'var(--color-brand-yellow, #FACB5C)',
  'var(--color-brand-light, #64B0F3)',
  '#A78BFA',
  '#34D399',
  '#F87171',
  '#64748B',
];

function StatusBadge({ status }: { status: string }) {
  const presentation = getProposalStatusPresentation(status);

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${presentation.className}`}
      title={presentation.description}
    >
      {presentation.label}
    </span>
  );
}

function MetricCard({ label, value, helper, icon, trend }: MetricCardProps) {
  const hasTrend = typeof trend === 'number';
  const isPositive = (trend || 0) >= 0;

  return (
    <Card className="group relative overflow-hidden p-5">
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-brand-blue/10 blur-2xl transition-transform duration-300 group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-brand-dark">{value}</p>
          <div className="mt-2 flex min-h-5 items-center gap-1.5 text-xs text-slate-500">
            {hasTrend && (
              <span className={`inline-flex items-center gap-0.5 font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(trend || 0)}%
              </span>
            )}
            <span>{helper}</span>
          </div>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-brand-border bg-gray-50 shadow-sm">
          {icon}
        </div>
      </div>
    </Card>
  );
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getClientName(client: ProposalRow['client']) {
  return client?.name || 'Cliente não informado';
}

export function Dashboard() {
  const [clientCount, setClientCount] = useState(0);
  const [kitCount, setKitCount] = useState(0);
  const [proposalTotal, setProposalTotal] = useState(0);
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [proposalToDelete, setProposalToDelete] = useState<{ id: string; title: string | null } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setLoadError(null);

      const [clientsResult, kitsResult, proposalsResult] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('solar_kits').select('*', { count: 'exact', head: true }),
        supabase
          .from('proposals')
          .select('id, title, code, status, created_at, selected_solar_kit_id, flow_state, flow_completed, client:clients(name)', { count: 'exact' })
          .order('created_at', { ascending: false }),
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (kitsResult.error) throw kitsResult.error;
      if (proposalsResult.error) throw proposalsResult.error;

      setClientCount(clientsResult.count || 0);
      setKitCount(kitsResult.count || 0);
      setProposalTotal(proposalsResult.count || 0);
      setProposals((proposalsResult.data || []) as unknown as ProposalRow[]);
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      const message = error instanceof Error ? error.message : 'Não foi possível carregar os indicadores.';
      setLoadError(message);
      toast.error('Não foi possível atualizar o dashboard.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const dashboardMetrics = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const currentMonth = proposals.filter((proposal) => new Date(proposal.created_at) >= currentMonthStart).length;
    const previousMonth = proposals.filter((proposal) => {
      const createdAt = new Date(proposal.created_at);
      return createdAt >= previousMonthStart && createdAt < currentMonthStart;
    }).length;

    const monthlyTrend = previousMonth > 0
      ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100)
      : currentMonth > 0
        ? 100
        : 0;

    const approved = proposals.filter((proposal) => ['approved', 'accepted'].includes(proposal.status)).length;
    const rejected = proposals.filter((proposal) => proposal.status === 'rejected').length;
    const decided = approved + rejected;
    const approvalRate = decided > 0 ? Math.round((approved / decided) * 100) : 0;

    return { currentMonth, monthlyTrend, approvalRate };
  }, [proposals]);

  const performanceData = useMemo(() => {
    const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setDate(1);
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: getMonthKey(date),
        month: monthFormatter.format(date).replace('.', ''),
        propostas: 0,
      };
    });
    const monthMap = new Map(months.map((item) => [item.key, item]));

    proposals.forEach((proposal) => {
      const item = monthMap.get(getMonthKey(new Date(proposal.created_at)));
      if (item) item.propostas += 1;
    });

    return months;
  }, [proposals]);

  const proposalStatusData = useMemo(() => {
    const groups = [
      { name: 'Rascunhos', statuses: ['draft'] },
      { name: 'Prontas para envio', statuses: ['pending'] },
      { name: 'Enviadas', statuses: ['sent'] },
      { name: 'Visualizadas', statuses: ['viewed'] },
      { name: 'Aprovadas', statuses: ['approved', 'accepted'] },
      { name: 'Recusadas', statuses: ['rejected'] },
      { name: 'Expiradas', statuses: ['expired'] },
    ];

    return groups.map((group) => ({
      name: group.name,
      value: proposals.filter((proposal) => group.statuses.includes(proposal.status)).length,
    }));
  }, [proposals]);

  const recentProposals = proposals.slice(0, 6);

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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-blue">
            <DashboardCategoryIcon className="h-5 w-5" />
            <span className="text-[11px] font-black uppercase tracking-[0.2em]">Visão operacional</span>
          </div>
          <h1 className="mt-2 text-2xl font-black tracking-tight text-brand-dark sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">Bem-vindo de volta! Acompanhe clientes, propostas e kits solares.</p>
        </div>
        <button
          type="button"
          onClick={() => void loadData()}
          disabled={isLoading}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl border border-brand-border bg-brand-surface px-4 text-sm font-bold text-brand-dark transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </header>

      {loadError && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {loadError}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
        <MetricCard
          label="Propostas"
          value={isLoading ? '—' : proposalTotal}
          trend={dashboardMetrics.monthlyTrend}
          helper={`${dashboardMetrics.currentMonth} neste mês`}
          icon={<ProposalsCategoryIcon className="h-8 w-8 text-brand-blue" />}
        />
        <MetricCard
          label="Clientes"
          value={isLoading ? '—' : clientCount}
          helper="cadastrados na conta"
          icon={<ClientsCategoryIcon className="h-8 w-8 text-brand-blue" />}
        />
        <MetricCard
          label="Kits solares"
          value={isLoading ? '—' : kitCount}
          helper="disponíveis no catálogo"
          icon={<SolarKitsCategoryIcon className="h-8 w-8 text-brand-blue" />}
        />
        <MetricCard
          label="Taxa de aprovação"
          value={isLoading ? '—' : `${dashboardMetrics.approvalRate}%`}
          helper="entre aprovadas e recusadas"
          icon={<DashboardCategoryIcon className="h-8 w-8 text-brand-blue" />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,0.8fr)]" aria-label="Gráficos do dashboard">
        <Card className="min-w-0 p-5 sm:p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-black text-brand-dark">Desempenho</h2>
              <p className="mt-1 text-xs text-slate-500">Propostas criadas nos últimos seis meses</p>
            </div>
            <span className="rounded-full border border-brand-border bg-gray-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">6 meses</span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={performanceData} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="dashboardPerformanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand-blue, #0076DD)" stopOpacity={0.38} />
                    <stop offset="95%" stopColor="var(--color-brand-blue, #0076DD)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-brand-border, #1C3F5E)" strokeDasharray="4 5" vertical={false} opacity={0.55} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-slate-500, #94A3B8)', fontSize: 11 }} dy={10} />
                <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: 'var(--color-slate-500, #94A3B8)', fontSize: 11 }} />
                <Tooltip
                  cursor={{ stroke: 'var(--color-brand-light, #64B0F3)', strokeDasharray: '4 4' }}
                  contentStyle={{
                    background: 'var(--color-brand-surface, #142E46)',
                    border: '1px solid var(--color-brand-border, #1C3F5E)',
                    borderRadius: 12,
                    color: 'var(--color-brand-dark, #F8FAFC)',
                    boxShadow: '0 16px 32px rgba(0,0,0,.24)',
                  }}
                  labelStyle={{ color: 'var(--color-brand-dark, #F8FAFC)', fontWeight: 700 }}
                  itemStyle={{ color: 'var(--color-brand-light, #64B0F3)' }}
                  formatter={(value) => [Number(value), 'Propostas']}
                />
                <Area
                  type="monotone"
                  dataKey="propostas"
                  stroke="var(--color-brand-blue, #0076DD)"
                  strokeWidth={3}
                  fill="url(#dashboardPerformanceFill)"
                  activeDot={{ r: 5, strokeWidth: 3, fill: 'var(--color-brand-surface, #142E46)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div>
            <h2 className="font-black text-brand-dark">Status das propostas</h2>
            <p className="mt-1 text-xs text-slate-500">Cada etapa do ciclo comercial, sem misturar rascunhos com propostas enviadas</p>
          </div>
          <div className="relative mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={proposalStatusData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="58%"
                  outerRadius="82%"
                  paddingAngle={3}
                  stroke="none"
                >
                  {proposalStatusData.map((entry, index) => (
                    <Cell key={entry.name} fill={STATUS_CHART_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-brand-surface, #142E46)',
                    border: '1px solid var(--color-brand-border, #1C3F5E)',
                    borderRadius: 12,
                    color: 'var(--color-brand-dark, #F8FAFC)',
                  }}
                  formatter={(value) => [Number(value), 'Propostas']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-brand-dark">{proposalTotal}</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total</span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {proposalStatusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 text-slate-500">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: STATUS_CHART_COLORS[index] }} />
                  <span className="truncate">{entry.name}</span>
                </span>
                <strong className="text-brand-dark">{entry.value}</strong>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-brand-border p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-black text-brand-dark">Propostas recentes</h2>
            <p className="mt-1 text-xs text-slate-500">Últimas movimentações comerciais registradas</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/clientes/novo" className="rounded-lg border border-brand-border px-3 py-2 text-xs font-bold text-brand-dark transition hover:bg-gray-50">Novo cliente</Link>
            <Link to="/propostas" className="rounded-lg bg-brand-blue px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-blue-hover">Ver propostas</Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-brand-gray text-[10px] uppercase tracking-[0.15em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Proposta</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="bg-brand-surface">
              {recentProposals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                    {isLoading ? 'Carregando propostas...' : 'Nenhuma proposta encontrada.'}
                  </td>
                </tr>
              ) : recentProposals.map((proposal) => (
                <tr key={proposal.id} className="border-t border-brand-border transition hover:bg-gray-50/50">
                  <td className="px-5 py-4">
                    <p className="font-bold text-brand-dark">{proposal.title || 'Sem título'}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">{proposal.code || 'Sem código'}</p>
                  </td>
                  <td className="px-5 py-4 text-brand-dark">{getClientName(proposal.client)}</td>
                  <td className="px-5 py-4 text-slate-500">{formatDate(proposal.created_at)}</td>
                  <td className="px-5 py-4"><StatusBadge status={proposal.status} /></td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      {isActiveProposalFlowDraft(proposal) ? (
                        <Link
                          to={getProposalContinuePath(proposal.id)}
                          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-brand-blue px-3 text-xs font-bold text-white transition hover:bg-brand-blue-hover"
                          title="Continuar preenchimento"
                          aria-label={`Continuar proposta ${proposal.title || proposal.code || ''}`}
                        >
                          Continuar
                          <ArrowRight className="h-4 w-4" aria-hidden="true" />
                        </Link>
                      ) : (
                        <Link
                          to={`/propostas/${proposal.id}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-500 transition hover:border-brand-border hover:bg-gray-50 hover:text-brand-blue"
                          title="Visualizar"
                          aria-label={`Visualizar proposta ${proposal.title || proposal.code || ''}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      )}
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-red-400 transition hover:border-red-400/20 hover:bg-red-400/10"
                        title="Excluir"
                        aria-label={`Excluir proposta ${proposal.title || proposal.code || ''}`}
                        onClick={() => {
                          setProposalToDelete({ id: proposal.id, title: proposal.title });
                          setDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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
