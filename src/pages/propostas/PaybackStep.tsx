import { useEffect, useMemo, useState } from 'react';
import {
  BadgeCheck,
  Calculator,
  CircleDollarSign,
  Plus,
  Trash2,
  TriangleAlert,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import {
  calculatePayback,
  type PaybackResult,
  type PaybackStatus,
} from '../../lib/calculations/payback';
import {
  CONNECTION_AVAILABILITY_KWH,
  type ConnectionType,
} from '../../lib/calculations/professionalSizing';
import { profileService } from '../../services/profileService';
import type { ProposalDraftPaybackForm } from '../../types/proposalDraft';
import type { SolarKit } from '../../types/solarKit';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const CONNECTION_LABELS: Record<ConnectionType, string> = {
  monophase: 'Monofásica',
  biphase: 'Bifásica',
  triphase: 'Trifásica',
};

const STATUS_STYLES: Record<PaybackStatus, string> = {
  excellent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  very_good: 'border-green-200 bg-green-50 text-green-700',
  good: 'border-brand-blue/30 bg-brand-blue/10 text-brand-blue',
  regular: 'border-amber-200 bg-amber-50 text-amber-800',
  unfeasible: 'border-red-200 bg-red-50 text-red-700',
};

type AdditionalCostDraft = ProposalDraftPaybackForm['additionalCosts'][number];
type PaybackFormState = ProposalDraftPaybackForm;

const createCost = (): AdditionalCostDraft => ({
  id: `cost-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description: '',
  amount: '',
});

const createDefaultForm = (margin = 20): PaybackFormState => ({
  tariffCentsPerKwh: '100',
  averageMonthlyBillAmount: '',
  pisPercent: '0',
  cofinsPercent: '0',
  icmsPercent: '0',
  otherTariffsPercent: '0',
  marginPercentage: String(margin),
  additionalCosts: [],
});

const normalizeForm = (form: ProposalDraftPaybackForm): PaybackFormState => ({
  ...form,
  averageMonthlyBillAmount: form.averageMonthlyBillAmount ?? '',
});

const parseNumber = (value: string) => {
  const normalized = value.trim().replace(',', '.');
  return normalized ? Number(normalized) : Number.NaN;
};

function PaybackField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  helper,
  min = 0,
  max,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  helper?: string;
  min?: number;
  max?: number;
}) {
  const inputClassName = [prefix ? 'pl-10' : '', suffix ? 'pr-24' : '']
    .filter(Boolean)
    .join(' ');

  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-brand-dark">{label}</span>
      <div className="relative">
        <Input
type="number"
min={min}
max={max}
step="0.01"
value={value}
onChange={(event) => onChange(event.target.value)}
className={inputClassName || undefined}
        />
        {prefix && (
<span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-slate-500">
  {prefix}
</span>
        )}
        {suffix && (
<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">
  {suffix}
</span>
        )}
      </div>
      {helper && <p className="text-xs leading-5 text-slate-500">{helper}</p>}
    </label>
  );
}

export function PaybackStep({
  selectedKit,
  connectionType,
  monthlyCompensableConsumptionKwh,
  monthlyGenerationKwh,
  initialForm,
  onDraftChange,
  onResultChange,
}: {
  selectedKit: SolarKit;
  connectionType: ConnectionType;
  monthlyCompensableConsumptionKwh: number;
  monthlyGenerationKwh: number;
  initialForm?: ProposalDraftPaybackForm | null;
  onDraftChange?: (form: ProposalDraftPaybackForm) => void;
  onResultChange: (result: PaybackResult | null) => void;
}) {
  const { user } = useAuth();
  const storageKey = `sol-amigo:payback:${selectedKit.id}`;
  const [form, setForm] = useState<PaybackFormState>(() => normalizeForm(initialForm || createDefaultForm()));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      setHydrated(false);
      if (initialForm) {
        if (active) setForm(normalizeForm(initialForm));
        if (active) setHydrated(true);
        return;
      }

      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as PaybackFormState;
          if (active) setForm(normalizeForm(parsed));
          if (active) setHydrated(true);
          return;
        } catch {
          sessionStorage.removeItem(storageKey);
        }
      }

      let defaultMargin = 20;
      if (user?.id) {
        try {
          const profile = await profileService.getProfile(user.id);
          if (Number.isFinite(profile.default_margin_percentage)) {
            defaultMargin = Number(profile.default_margin_percentage);
          }
        } catch {
          defaultMargin = 20;
        }
      }

      if (active) {
        setForm(createDefaultForm(defaultMargin));
        setHydrated(true);
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [initialForm, storageKey, user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(storageKey, JSON.stringify(form));
    onDraftChange?.(form);
  }, [form, hydrated, onDraftChange, storageKey]);

  const calculation = useMemo(() => {
    if (!hydrated) return { result: null, error: null };

    try {
      return {
        result: calculatePayback({
          kitCost: selectedKit.cost_price,
          marginPercentage: parseNumber(form.marginPercentage),
          tariffCentsPerKwh: parseNumber(form.tariffCentsPerKwh),
          averageMonthlyBillAmount: form.averageMonthlyBillAmount?.trim()
            ? parseNumber(form.averageMonthlyBillAmount)
            : null,
          monthlyAvailabilityConsumptionKwh: CONNECTION_AVAILABILITY_KWH[connectionType],
          pisPercent: parseNumber(form.pisPercent),
          cofinsPercent: parseNumber(form.cofinsPercent),
          icmsPercent: parseNumber(form.icmsPercent),
          otherTariffsPercent: parseNumber(form.otherTariffsPercent),
          monthlyCompensableConsumptionKwh,
          monthlyGenerationKwh,
          additionalCosts: form.additionalCosts.map((cost) => ({
            description: cost.description.trim() || 'Custo adicional',
            amount: parseNumber(cost.amount || '0'),
          })),
        }),
        error: null,
      };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Não foi possível calcular o payback.',
      };
    }
  }, [
    form,
    hydrated,
    monthlyCompensableConsumptionKwh,
    monthlyGenerationKwh,
    selectedKit.cost_price,
  ]);

  useEffect(() => {
    onResultChange(calculation.result);
  }, [calculation.result, onResultChange]);

  const updateField = (field: keyof Omit<PaybackFormState, 'additionalCosts'>, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateCost = (id: string, field: 'description' | 'amount', value: string) => {
    setForm((current) => ({
      ...current,
      additionalCosts: current.additionalCosts.map((cost) => (
        cost.id === id ? { ...cost, [field]: value } : cost
      )),
    }));
  };

  const addCost = () => {
    setForm((current) => ({
      ...current,
      additionalCosts: [...current.additionalCosts, createCost()],
    }));
  };

  const removeCost = (id: string) => {
    setForm((current) => ({
      ...current,
      additionalCosts: current.additionalCosts.filter((cost) => cost.id !== id),
    }));
  };

  const result = calculation.result;
  const chartProjectionLastYear = result?.chartData[result.chartData.length - 1]?.year ?? 0;
  const paybackMarkerYear = result
    && Number.isFinite(result.paybackYears)
    && result.paybackYears <= chartProjectionLastYear
      ? Math.ceil(result.paybackYears)
      : null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-brand-dark">Payback do sistema fotovoltaico</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Calcule o investimento, a economia anual e o tempo estimado para recuperar o valor aplicado.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Kit escolhido</p>
            <h3 className="mt-2 font-bold text-brand-dark">{selectedKit.name}</h3>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Custo do kit</p>
                <p className="mt-1 text-lg font-bold text-brand-dark">{currency.format(selectedKit.cost_price)}</p>
              </div>
              {selectedKit.sale_price != null && selectedKit.sale_price > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Venda cadastrada</p>
                  <p className="mt-1 text-lg font-bold text-brand-dark">{currency.format(selectedKit.sale_price)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Tipo de ligação</p>
            <h3 className="mt-2 font-bold text-brand-dark">{CONNECTION_LABELS[connectionType]}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Custo de disponibilidade considerado no consumo: <strong>{CONNECTION_AVAILABILITY_KWH[connectionType]} kWh/mês</strong>.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
            <Calculator className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-brand-dark">Tarifa e tributos</h3>
            <p className="mt-1 text-xs text-slate-500">Informe os valores aplicáveis à unidade consumidora.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PaybackField
            label="Tarifa de energia"
            value={form.tariffCentsPerKwh}
            onChange={(value) => updateField('tariffCentsPerKwh', value)}
            suffix="centavos/kWh"
            min={0.01}
          />
          <PaybackField
  label="Valor médio mensal da fatura"
  value={form.averageMonthlyBillAmount ?? ''}
  onChange={(value) => updateField('averageMonthlyBillAmount', value)}
  prefix="R$"
  min={0.01}
  helper="Opcional. Use a média das últimas contas para comparar a fatura atual com a estimativa após a instalação."
/>
            <PaybackField label="PIS" value={form.pisPercent} onChange={(value) => updateField('pisPercent', value)} suffix="%" />
          <PaybackField label="COFINS" value={form.cofinsPercent} onChange={(value) => updateField('cofinsPercent', value)} suffix="%" />
          <PaybackField label="ICMS" value={form.icmsPercent} onChange={(value) => updateField('icmsPercent', value)} suffix="%" />
          <PaybackField label="Outros encargos" value={form.otherTariffsPercent} onChange={(value) => updateField('otherTariffsPercent', value)} suffix="%" />
          <PaybackField
            label="Margem de lucro"
            value={form.marginPercentage}
            onChange={(value) => updateField('marginPercentage', value)}
            suffix="%"
            max={99.99}
            helper="Carregada de Configurações da Conta > Preferências Comerciais e editável somente nesta proposta."
          />
        </div>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-brand-dark">Custos adicionais</h3>
            <p className="mt-1 text-xs text-slate-500">Inclua instalação, projeto, homologação, frete, estrutura ou outros custos.</p>
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={addCost}>
            <Plus className="h-4 w-4" /> Adicionar custo
          </Button>
        </div>

        {form.additionalCosts.length === 0 ? (
          <div className="mt-5 rounded-xl border border-dashed border-brand-border p-5 text-center text-sm text-slate-500">
            Nenhum custo adicional informado.
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            {form.additionalCosts.map((cost, index) => (
              <div key={cost.id} className="grid gap-3 rounded-xl border border-brand-border bg-brand-gray/30 p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Descrição do custo {index + 1}</span>
                  <Input
                    value={cost.description}
                    placeholder="Ex.: instalação e homologação"
                    onChange={(event) => updateCost(cost.id, 'description', event.target.value)}
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Valor</span>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={cost.amount}
                      onChange={(event) => updateCost(cost.id, 'amount', event.target.value)}
                      className="pl-10"
                    />
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-slate-500">R$</span>
                  </div>
                </label>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeCost(cost.id)} aria-label="Remover custo adicional">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {calculation.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {calculation.error}
        </div>
      )}

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PaybackSummary label="Investimento final" value={currency.format(result.totalInvestment)} highlight />
            <PaybackSummary label="Lucro estimado" value={currency.format(result.profitAmount)} />
            <PaybackSummary label="Economia mensal" value={currency.format(result.monthlySavings)} />
            <PaybackSummary label="Economia anual" value={currency.format(result.annualSavings)} />
          </div>

{result.averageMonthlyBillAmount != null
  && result.estimatedResidualBillAmount != null
  && result.estimatedBillReductionPercent != null && (
  <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
    <div>
      <h3 className="font-bold text-brand-dark">Comparação da fatura</h3>
      <p className="mt-1 text-xs leading-5 text-slate-500">
        Referência comercial baseada na fatura média informada. A tarifa continua sendo a base técnica do payback.
      </p>
    </div>

    <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <PaybackSummary label="Fatura média atual" value={currency.format(result.averageMonthlyBillAmount)} />
      <PaybackSummary label="Economia mensal estimada" value={currency.format(result.monthlySavings)} />
      <PaybackSummary label="Fatura residual estimada" value={currency.format(result.estimatedResidualBillAmount)} highlight />
      <PaybackSummary label="Redução estimada" value={`${decimal.format(result.estimatedBillReductionPercent)}%`} />
    </div>

    <div className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${
      result.billReferenceStatus === 'review'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
    }`}>
      {result.billReferenceStatus === 'review'
        ? <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
        : <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />}
      <div>
        <p className="font-bold">
          {result.billReferenceStatus === 'review'
            ? 'Revise a tarifa ou os dados da fatura'
            : 'Fatura coerente com o consumo e a tarifa'}
        </p>
        <p className="mt-1 text-xs leading-5">
          A conta calculada pelo consumo e pela tarifa é {currency.format(result.estimatedEnergyBillAmount)}.
          A diferença para a fatura informada é de {decimal.format(result.billReferenceDifferencePercent ?? 0)}%.
        </p>
      </div>
    </div>

    <p className="mt-4 text-xs leading-5 text-slate-500">
      A estimativa residual pode incluir custo de disponibilidade, iluminação pública, demanda, impostos e outros valores que não são eliminados pela geração solar.
    </p>
  </div>
)}

          <div className={`flex items-start gap-4 rounded-xl border p-5 ${STATUS_STYLES[result.status]}`}>
            {result.status === 'unfeasible'
              ? <TriangleAlert className="mt-0.5 h-7 w-7 shrink-0" />
              : <BadgeCheck className="mt-0.5 h-7 w-7 shrink-0" />}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-75">Status do payback</p>
              <h3 className="mt-1 text-xl font-bold">{result.statusLabel}</h3>
              <p className="mt-2 text-sm leading-6">
                Retorno estimado em <strong>{decimal.format(result.paybackYears)} anos</strong> ({result.paybackMonths} meses), com tarifa efetiva de <strong>{currency.format(result.effectiveTariffPerKwh)}/kWh</strong>.
              </p>
            </div>
          </div>

          <Card
            className="shadow-none"
            style={{
              borderColor: 'var(--color-chart-grid, var(--color-brand-border))',
              backgroundColor: 'var(--color-chart-panel, var(--color-brand-surface))',
            }}
          >
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl"
                  style={{
                    backgroundColor: 'var(--color-chart-marker-bg, var(--color-gray-100))',
                    color: 'var(--color-chart-marker, var(--color-brand-light))',
                  }}
                >
                  <CircleDollarSign className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-brand-dark">Saldo acumulado em 25 anos</h3>
                  <p className="mt-1 text-xs text-slate-500">Barras negativas representam capital ainda não recuperado; positivas representam retorno acumulado.</p>
                </div>
              </div>

              <div className="mt-5 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid
                      stroke="var(--color-chart-grid, var(--color-brand-border))"
                      strokeDasharray="3 3"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="year"
                      interval={4}
                      stroke="var(--color-chart-axis, var(--color-slate-500))"
                      tick={{ fill: 'var(--color-chart-axis, var(--color-slate-500))' }}
                      axisLine={{ stroke: 'var(--color-chart-axis, var(--color-slate-500))' }}
                      tickLine={{ stroke: 'var(--color-chart-axis, var(--color-slate-500))' }}
                      tickFormatter={(year) => `${year}`}
                    />
                    <YAxis
                      width={76}
                      stroke="var(--color-chart-axis, var(--color-slate-500))"
                      tick={{ fill: 'var(--color-chart-axis, var(--color-slate-500))' }}
                      axisLine={{ stroke: 'var(--color-chart-axis, var(--color-slate-500))' }}
                      tickLine={{ stroke: 'var(--color-chart-axis, var(--color-slate-500))' }}
                      tickFormatter={(value) => `R$ ${Math.round(Number(value) / 1000)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: 'var(--color-chart-cursor, var(--color-gray-100))' }}
                      contentStyle={{
                        backgroundColor: 'var(--color-chart-tooltip-bg, var(--color-brand-surface))',
                        borderColor: 'var(--color-chart-tooltip-border, var(--color-brand-border))',
                        color: 'var(--color-chart-tooltip-text, var(--color-brand-dark))',
                        borderRadius: '12px',
                        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.24)',
                      }}
                      labelStyle={{ color: 'var(--color-chart-tooltip-muted, var(--color-slate-500))' }}
                      itemStyle={{ color: 'var(--color-chart-tooltip-text, var(--color-brand-dark))' }}
                      labelFormatter={(year) => `Ano ${year}`}
                      formatter={(value) => [currency.format(Number(value)), 'Saldo acumulado']}
                    />
                    <ReferenceLine
                      y={0}
                      stroke="var(--color-chart-zero, var(--color-slate-500))"
                      strokeWidth={2}
                    />
                    {paybackMarkerYear != null && (
                      <ReferenceLine
                        x={paybackMarkerYear}
                        stroke="var(--color-chart-marker, var(--color-brand-light))"
                        strokeDasharray="5 4"
                        strokeWidth={2}
                        label={{
                          value: 'Payback',
                          position: 'insideTopRight',
                          fill: 'var(--color-chart-marker, var(--color-brand-light))',
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      />
                    )}
                    <Bar
                      dataKey="cumulativeBalance"
                      radius={0}
                      activeBar={{
                        fill: 'var(--color-chart-marker, var(--color-brand-light))',
                        stroke: 'var(--color-chart-tooltip-text, var(--color-brand-dark))',
                        strokeWidth: 1,
                      }}
                    >
                      {result.chartData.map((point) => (
                        <Cell
                          key={point.year}
                          fill={point.cumulativeBalance >= 0
                            ? 'var(--color-chart-positive, var(--color-brand-blue))'
                            : 'var(--color-chart-negative, var(--color-brand-yellow))'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-500">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: 'var(--color-chart-negative, var(--color-brand-yellow))' }}
                  />
                  Capital não recuperado
                </span>
                <span className="inline-flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: 'var(--color-chart-positive, var(--color-brand-blue))' }}
                  />
                  Retorno acumulado
                </span>
                {paybackMarkerYear != null && (
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="w-5 border-t-2 border-dashed"
                      style={{ borderColor: 'var(--color-chart-marker, var(--color-brand-light))' }}
                    />
                    Marco do payback
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </section>
  );
}

function PaybackSummary({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-brand-blue/30 bg-brand-blue/10' : 'border-brand-border bg-brand-gray/40'}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-brand-dark">{value}</p>
    </div>
  );
}
