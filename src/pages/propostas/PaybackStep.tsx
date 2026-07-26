import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { Select } from '../../components/ui/Select';
import { useAuth } from '../../contexts/AuthContext';
import {
  calculatePayback,
  type PaybackResult,
  type PaybackStatus,
  type RegulatoryFramework,
  type TariffTaxMode,
} from '../../lib/calculations/payback';
import {
  CONNECTION_AVAILABILITY_KWH,
  type ConnectionType,
} from '../../lib/calculations/professionalSizing';
import { profileService } from '../../services/profileService';
import type {
  ProposalDraftPaybackCalculationSnapshot,
  ProposalDraftPaybackForm,
} from '../../types/proposalDraft';
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
type EditablePaybackField = keyof Omit<PaybackFormState, 'additionalCosts' | 'calculationSnapshot'>;

const createCost = (): AdditionalCostDraft => ({
  id: `cost-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description: '',
  amount: '',
});

const createDefaultForm = (margin = 20): PaybackFormState => ({
  tariffCentsPerKwh: '100',
  tariffTaxMode: 'already_included',
  averageMonthlyBillAmount: '',
  pisPercent: '0',
  cofinsPercent: '0',
  icmsPercent: '0',
  otherTariffsPercent: '0',
  marginPercentage: String(margin),
  regulatoryFramework: 'transition',
  projectionStartYear: String(new Date().getFullYear()),
  fioBComponentsCentsPerKwh: '',
  customRegulatoryChargePercent: '60',
  postTransitionChargePercent: '100',
  selfConsumptionPercent: '30',
  annualTariffEscalationPercent: '4.5',
  annualDegradationPercent: '0.5',
  annualMaintenancePercent: '0.5',
  annualDiscountRatePercent: '8',
  inverterReplacementYear: '12',
  inverterReplacementCost: '0',
  projectionYears: '25',
  additionalCosts: [],
});

const normalizeForm = (form: ProposalDraftPaybackForm): PaybackFormState => {
  const defaults = createDefaultForm(Number(form.marginPercentage) || 20);
  const isLegacyForm = form.tariffTaxMode == null;

  return {
    ...defaults,
    ...form,
    tariffTaxMode: form.tariffTaxMode ?? 'add_percentages',
    regulatoryFramework: form.regulatoryFramework ?? 'gd1',
    averageMonthlyBillAmount: typeof form.averageMonthlyBillAmount === 'string'
      ? form.averageMonthlyBillAmount
      : '',
    selfConsumptionPercent: form.selfConsumptionPercent ?? (isLegacyForm ? '0' : defaults.selfConsumptionPercent),
    annualTariffEscalationPercent: form.annualTariffEscalationPercent ?? (isLegacyForm ? '0' : defaults.annualTariffEscalationPercent),
    annualDegradationPercent: form.annualDegradationPercent ?? (isLegacyForm ? '0' : defaults.annualDegradationPercent),
    annualMaintenancePercent: form.annualMaintenancePercent ?? (isLegacyForm ? '0' : defaults.annualMaintenancePercent),
    annualDiscountRatePercent: form.annualDiscountRatePercent ?? (isLegacyForm ? '0' : defaults.annualDiscountRatePercent),
    inverterReplacementCost: form.inverterReplacementCost ?? '0',
    additionalCosts: Array.isArray(form.additionalCosts) ? form.additionalCosts : [],
  };
};

const parseNumber = (value: string) => {
  const normalized = value.trim().replace(',', '.');
  return normalized ? Number(normalized) : Number.NaN;
};

const parseOptionalNumber = (value: string | undefined, fallback: number) => {
  if (value == null || value.trim() === '') return fallback;
  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const nullableFinite = (value: number) => (Number.isFinite(value) ? value : null);

const buildCalculationSnapshot = (result: PaybackResult): ProposalDraftPaybackCalculationSnapshot => ({
  calculationVersion: result.calculationVersion,
  monthlySavings: result.monthlySavings,
  annualSavings: result.annualSavings,
  firstYearNetCashFlow: result.firstYearNetCashFlow,
  paybackYears: nullableFinite(result.paybackYears),
  paybackMonths: nullableFinite(result.paybackMonths),
  discountedPaybackYears: nullableFinite(result.discountedPaybackYears),
  discountedPaybackMonths: nullableFinite(result.discountedPaybackMonths),
  netPresentValue: result.netPresentValue,
  internalRateOfReturnPercent: result.internalRateOfReturnPercent,
  projectedGrossSavings: result.projectedGrossSavings,
  projectedNetSavings: result.projectedNetSavings,
  projectionYears: result.projectionYears,
  effectiveTariffPerKwh: result.effectiveTariffPerKwh,
  regulatoryFramework: result.regulatoryFramework,
  status: result.status,
  statusLabel: result.statusLabel,
});

function PaybackField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  helper,
  min = 0,
  max,
  step = '0.01',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  prefix?: string;
  suffix?: string;
  helper?: string;
  min?: number;
  max?: number;
  step?: string;
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
          step={step}
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

function PaybackSelectField({
  label,
  value,
  onChange,
  helper,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helper?: string;
  children: ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-brand-dark">{label}</span>
      <Select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </Select>
      {helper && <p className="text-xs leading-5 text-slate-500">{helper}</p>}
    </label>
  );
}

function formatPayback(months: number, projectionYears: number) {
  if (!Number.isFinite(months)) return `Não recuperado em ${projectionYears} anos`;
  const wholeMonths = Math.ceil(months);
  const years = Math.floor(wholeMonths / 12);
  const remainingMonths = wholeMonths % 12;
  if (years === 0) return `${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
  if (remainingMonths === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
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
  const hydratedStorageKeyRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      if (hydratedStorageKeyRef.current === storageKey) return;
      hydratedStorageKeyRef.current = storageKey;
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

  const calculation = useMemo(() => {
    if (!hydrated) return { result: null, error: null };

    try {
      return {
        result: calculatePayback({
          kitCost: selectedKit.cost_price,
          marginPercentage: parseNumber(form.marginPercentage),
          tariffCentsPerKwh: parseNumber(form.tariffCentsPerKwh),
          tariffTaxMode: form.tariffTaxMode as TariffTaxMode,
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
          regulatoryFramework: form.regulatoryFramework as RegulatoryFramework,
          projectionStartYear: parseOptionalNumber(form.projectionStartYear, new Date().getFullYear()),
          fioBComponentsCentsPerKwh: parseOptionalNumber(form.fioBComponentsCentsPerKwh, 0),
          customRegulatoryChargePercent: parseOptionalNumber(form.customRegulatoryChargePercent, 0),
          postTransitionChargePercent: parseOptionalNumber(form.postTransitionChargePercent, 100),
          selfConsumptionPercent: parseOptionalNumber(form.selfConsumptionPercent, 0),
          annualTariffEscalationPercent: parseOptionalNumber(form.annualTariffEscalationPercent, 0),
          annualDegradationPercent: parseOptionalNumber(form.annualDegradationPercent, 0),
          annualMaintenancePercent: parseOptionalNumber(form.annualMaintenancePercent, 0),
          annualDiscountRatePercent: parseOptionalNumber(form.annualDiscountRatePercent, 0),
          inverterReplacementYear: form.inverterReplacementYear?.trim()
            ? parseNumber(form.inverterReplacementYear)
            : null,
          inverterReplacementCost: parseOptionalNumber(form.inverterReplacementCost, 0),
          projectionYears: parseOptionalNumber(form.projectionYears, 25),
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
    connectionType,
    form.additionalCosts,
    form.annualDegradationPercent,
    form.annualDiscountRatePercent,
    form.annualMaintenancePercent,
    form.annualTariffEscalationPercent,
    form.averageMonthlyBillAmount,
    form.cofinsPercent,
    form.customRegulatoryChargePercent,
    form.fioBComponentsCentsPerKwh,
    form.icmsPercent,
    form.inverterReplacementCost,
    form.inverterReplacementYear,
    form.marginPercentage,
    form.otherTariffsPercent,
    form.pisPercent,
    form.postTransitionChargePercent,
    form.projectionStartYear,
    form.projectionYears,
    form.regulatoryFramework,
    form.selfConsumptionPercent,
    form.tariffCentsPerKwh,
    form.tariffTaxMode,
    hydrated,
    monthlyCompensableConsumptionKwh,
    monthlyGenerationKwh,
    selectedKit.cost_price,
  ]);

  useEffect(() => {
    onResultChange(calculation.result);
  }, [calculation.result, onResultChange]);

  useEffect(() => {
    if (!hydrated) return;
    const nextSnapshot = calculation.result ? buildCalculationSnapshot(calculation.result) : undefined;
    const currentSnapshot = form.calculationSnapshot;
    if (JSON.stringify(currentSnapshot) === JSON.stringify(nextSnapshot)) return;
    setForm((current) => ({ ...current, calculationSnapshot: nextSnapshot }));
  }, [calculation.result, form.calculationSnapshot, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(storageKey, JSON.stringify(form));
    onDraftChange?.(form);
  }, [form, hydrated, onDraftChange, storageKey]);

  const updateField = (field: EditablePaybackField, value: string) => {
    setForm((current) => ({ ...current, [field]: value, calculationSnapshot: undefined }));
  };

  const updateCost = (id: string, field: 'description' | 'amount', value: string) => {
    setForm((current) => ({
      ...current,
      calculationSnapshot: undefined,
      additionalCosts: current.additionalCosts.map((cost) => (
        cost.id === id ? { ...cost, [field]: value } : cost
      )),
    }));
  };

  const addCost = () => {
    setForm((current) => ({
      ...current,
      calculationSnapshot: undefined,
      additionalCosts: [...current.additionalCosts, createCost()],
    }));
  };

  const removeCost = (id: string) => {
    setForm((current) => ({
      ...current,
      calculationSnapshot: undefined,
      additionalCosts: current.additionalCosts.filter((cost) => cost.id !== id),
    }));
  };

  const result = calculation.result;
  const chartProjectionLastYear = result?.chartData[result.chartData.length - 1]?.year ?? 0;
  const paybackMarkerYear = result
    && Number.isFinite(result.discountedPaybackYears)
    && result.discountedPaybackYears <= chartProjectionLastYear
      ? Math.ceil(result.discountedPaybackYears)
      : null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-brand-dark">Análise econômica do sistema fotovoltaico</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          Compare o payback simples com o fluxo de caixa mensal, o valor do dinheiro no tempo e as regras de compensação adotadas.
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
              Custo de disponibilidade considerado: <strong>{CONNECTION_AVAILABILITY_KWH[connectionType]} kWh/mês</strong>.
              Este modelo é destinado ao Grupo B.
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
            <h3 className="font-bold text-brand-dark">Tarifa, tributos e preço de venda</h3>
            <p className="mt-1 text-xs text-slate-500">Defina se a tarifa informada já é o preço final da conta.</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PaybackSelectField
            label="Composição da tarifa"
            value={form.tariffTaxMode ?? 'add_percentages'}
            onChange={(value) => updateField('tariffTaxMode', value as TariffTaxMode)}
            helper="Evita somar tributos duas vezes quando o valor foi obtido diretamente da fatura."
          >
            <option value="already_included">Tarifa final — tributos já incluídos</option>
            <option value="add_percentages">Tarifa base — adicionar tributos abaixo</option>
          </PaybackSelectField>
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
            helper="Opcional. Usado somente para validar a coerência e estimar a fatura residual."
          />
          {form.tariffTaxMode === 'add_percentages' && (
            <>
              <PaybackField label="PIS" value={form.pisPercent} onChange={(value) => updateField('pisPercent', value)} suffix="%" />
              <PaybackField label="COFINS" value={form.cofinsPercent} onChange={(value) => updateField('cofinsPercent', value)} suffix="%" />
              <PaybackField label="ICMS" value={form.icmsPercent} onChange={(value) => updateField('icmsPercent', value)} suffix="%" />
              <PaybackField label="Outros encargos percentuais" value={form.otherTariffsPercent} onChange={(value) => updateField('otherTariffsPercent', value)} suffix="%" />
            </>
          )}
          <PaybackField
            label="Margem sobre o preço de venda"
            value={form.marginPercentage}
            onChange={(value) => updateField('marginPercentage', value)}
            suffix="%"
            max={99.99}
            helper="Não é markup sobre o custo. O preço final é calculado para que esta seja a margem bruta da venda."
          />
        </div>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
        <div>
          <h3 className="font-bold text-brand-dark">Compensação e marco legal</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            A cobrança regulatória incide somente sobre a energia enviada à rede e posteriormente compensada. O autoconsumo instantâneo permanece valorizado pela tarifa evitada.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <PaybackSelectField
            label="Enquadramento regulatório"
            value={form.regulatoryFramework ?? 'gd1'}
            onChange={(value) => updateField('regulatoryFramework', value as RegulatoryFramework)}
          >
            <option value="gd1">GD I — regra preservada até 2045</option>
            <option value="transition">Transição da Lei 14.300</option>
            <option value="custom">Percentual personalizado</option>
          </PaybackSelectField>
          <PaybackField
            label="Ano inicial da projeção"
            value={form.projectionStartYear ?? String(new Date().getFullYear())}
            onChange={(value) => updateField('projectionStartYear', value)}
            min={2022}
            max={2100}
            step="1"
          />
          <PaybackField
            label="Componentes compensáveis do Fio B"
            value={form.fioBComponentsCentsPerKwh ?? ''}
            onChange={(value) => updateField('fioBComponentsCentsPerKwh', value)}
            suffix="centavos/kWh"
            helper="Informe a parcela da distribuidora sujeita ao percentual do enquadramento, não a tarifa total."
          />
          <PaybackField
            label="Autoconsumo instantâneo"
            value={form.selfConsumptionPercent ?? '0'}
            onChange={(value) => updateField('selfConsumptionPercent', value)}
            suffix="% da geração"
            max={100}
            helper="Parcela gerada e consumida no mesmo instante, sem passar pelo sistema de compensação."
          />
          {form.regulatoryFramework === 'custom' && (
            <PaybackField
              label="Cobrança regulatória personalizada"
              value={form.customRegulatoryChargePercent ?? '0'}
              onChange={(value) => updateField('customRegulatoryChargePercent', value)}
              suffix="% do Fio B"
              max={100}
            />
          )}
          {form.regulatoryFramework === 'transition' && (
            <PaybackField
              label="Percentual adotado a partir de 2029"
              value={form.postTransitionChargePercent ?? '100'}
              onChange={(value) => updateField('postTransitionChargePercent', value)}
              suffix="% da parcela informada"
              max={100}
              helper="Premissa editável para não tratar a regra pós-transição como certeza imutável."
            />
          )}
        </div>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-5">
        <div>
          <h3 className="font-bold text-brand-dark">Premissas econômicas da projeção</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">O cálculo é executado mês a mês durante o período informado.</p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <PaybackField label="Reajuste anual da tarifa" value={form.annualTariffEscalationPercent ?? '0'} onChange={(value) => updateField('annualTariffEscalationPercent', value)} suffix="% a.a." max={100} />
          <PaybackField label="Degradação anual dos módulos" value={form.annualDegradationPercent ?? '0'} onChange={(value) => updateField('annualDegradationPercent', value)} suffix="% a.a." max={100} />
          <PaybackField label="Operação e manutenção" value={form.annualMaintenancePercent ?? '0'} onChange={(value) => updateField('annualMaintenancePercent', value)} suffix="% do investimento/a.a." max={100} />
          <PaybackField label="Taxa de desconto / TMA" value={form.annualDiscountRatePercent ?? '0'} onChange={(value) => updateField('annualDiscountRatePercent', value)} suffix="% a.a." max={100} />
          <PaybackField label="Ano de troca do inversor" value={form.inverterReplacementYear ?? ''} onChange={(value) => updateField('inverterReplacementYear', value)} min={1} max={40} step="1" helper="Deixe vazio quando não quiser incluir a reposição." />
          <PaybackField label="Custo estimado da troca" value={form.inverterReplacementCost ?? '0'} onChange={(value) => updateField('inverterReplacementCost', value)} prefix="R$" />
          <PaybackField label="Período da análise" value={form.projectionYears ?? '25'} onChange={(value) => updateField('projectionYears', value)} suffix="anos" min={1} max={40} step="1" />
        </div>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-brand-dark">Custos adicionais do investimento</h3>
            <p className="mt-1 text-xs text-slate-500">Inclua instalação, projeto, homologação, frete, estrutura e demais custos iniciais.</p>
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
                  <Input value={cost.description} placeholder="Ex.: instalação e homologação" onChange={(event) => updateCost(cost.id, 'description', event.target.value)} />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Valor</span>
                  <div className="relative">
                    <Input type="number" min={0} step="0.01" value={cost.amount} onChange={(event) => updateCost(cost.id, 'amount', event.target.value)} className="pl-10" />
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
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{calculation.error}</div>
      )}

      {result && (
        <>
          {result.warnings.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800">
              <div className="flex items-start gap-3">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">Premissas que precisam de confirmação</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5">
                    {result.warnings.map((warning) => <li key={warning}>• {warning}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PaybackSummary label="Investimento final" value={currency.format(result.totalInvestment)} highlight />
            <PaybackSummary label="Economia no primeiro ano" value={currency.format(result.annualSavings)} />
            <PaybackSummary label="Fluxo líquido no primeiro ano" value={currency.format(result.firstYearNetCashFlow)} />
            <PaybackSummary label={`VPL em ${result.projectionYears} anos`} value={currency.format(result.netPresentValue)} highlight={result.netPresentValue >= 0} />
            <PaybackSummary label="Payback nominal" value={formatPayback(result.paybackMonths, result.projectionYears)} />
            <PaybackSummary label="Payback descontado" value={formatPayback(result.discountedPaybackMonths, result.projectionYears)} highlight />
            <PaybackSummary label="TIR estimada" value={result.internalRateOfReturnPercent == null ? 'Não calculável' : `${decimal.format(result.internalRateOfReturnPercent)}% a.a.`} />
            <PaybackSummary label="Economia líquida projetada" value={currency.format(result.projectedNetSavings)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <PaybackSummary label="Economia mensal inicial" value={currency.format(result.monthlySavings)} />
            <PaybackSummary label="Autoconsumo direto" value={`${decimal.format(result.directSelfConsumptionKwhPerMonth)} kWh/mês`} />
            <PaybackSummary label="Energia compensada na rede" value={`${decimal.format(result.gridCompensatedEnergyKwhPerMonth)} kWh/mês`} />
            <PaybackSummary label="Cobrança regulatória inicial" value={currency.format(result.regulatoryMonthlyCharge)} />
          </div>

          {result.averageMonthlyBillAmount != null
            && result.estimatedResidualBillAmount != null
            && result.estimatedBillReductionPercent != null && (
            <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
              <div>
                <h3 className="font-bold text-brand-dark">Comparação da fatura</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Referência comercial; valores fixos e cobranças não compensáveis continuam na fatura.</p>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <PaybackSummary label="Fatura média atual" value={currency.format(result.averageMonthlyBillAmount)} />
                <PaybackSummary label="Economia mensal inicial" value={currency.format(result.monthlySavings)} />
                <PaybackSummary label="Fatura residual estimada" value={currency.format(result.estimatedResidualBillAmount)} highlight />
                <PaybackSummary label="Redução estimada" value={`${decimal.format(result.estimatedBillReductionPercent)}%`} />
              </div>
              <div className={`mt-5 flex items-start gap-3 rounded-xl border p-4 ${result.billReferenceStatus === 'review' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                {result.billReferenceStatus === 'review' ? <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /> : <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />}
                <div>
                  <p className="font-bold">{result.billReferenceStatus === 'review' ? 'Revise a tarifa ou os dados da fatura' : 'Fatura coerente com o consumo e a tarifa'}</p>
                  <p className="mt-1 text-xs leading-5">A conta calculada pelo consumo e pela tarifa é {currency.format(result.estimatedEnergyBillAmount)}. A diferença para a fatura informada é de {decimal.format(result.billReferenceDifferencePercent ?? 0)}%.</p>
                </div>
              </div>
            </div>
          )}

          <div className={`flex items-start gap-4 rounded-xl border p-5 ${STATUS_STYLES[result.status]}`}>
            {result.status === 'unfeasible' ? <TriangleAlert className="mt-0.5 h-7 w-7 shrink-0" /> : <BadgeCheck className="mt-0.5 h-7 w-7 shrink-0" />}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-75">Resultado econômico</p>
              <h3 className="mt-1 text-xl font-bold">{result.statusLabel}</h3>
              <p className="mt-2 text-sm leading-6">
                Payback simples de <strong>{formatPayback(Math.ceil(result.simplePaybackYears * 12), result.projectionYears)}</strong> e payback descontado de <strong>{formatPayback(result.discountedPaybackMonths, result.projectionYears)}</strong>, com tarifa inicial evitável de <strong>{currency.format(result.effectiveTariffPerKwh)}/kWh</strong>.
              </p>
            </div>
          </div>

          <Card className="shadow-none" style={{ borderColor: 'var(--color-chart-grid, var(--color-brand-border))', backgroundColor: 'var(--color-chart-panel, var(--color-brand-surface))' }}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ backgroundColor: 'var(--color-chart-marker-bg, var(--color-gray-100))', color: 'var(--color-chart-marker, var(--color-brand-light))' }}>
                  <CircleDollarSign className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-brand-dark">Fluxo de caixa descontado em {result.projectionYears} anos</h3>
                  <p className="mt-1 text-xs text-slate-500">Inclui degradação, reajuste tarifário, operação e manutenção, reposição informada e taxa de desconto.</p>
                </div>
              </div>

              <div className="mt-5 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid stroke="var(--color-chart-grid, var(--color-brand-border))" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" interval={Math.max(0, Math.floor(result.projectionYears / 6) - 1)} stroke="var(--color-chart-axis, var(--color-slate-500))" tick={{ fill: 'var(--color-chart-axis, var(--color-slate-500))' }} axisLine={{ stroke: 'var(--color-chart-axis, var(--color-slate-500))' }} tickLine={{ stroke: 'var(--color-chart-axis, var(--color-slate-500))' }} />
                    <YAxis width={76} stroke="var(--color-chart-axis, var(--color-slate-500))" tick={{ fill: 'var(--color-chart-axis, var(--color-slate-500))' }} axisLine={{ stroke: 'var(--color-chart-axis, var(--color-slate-500))' }} tickLine={{ stroke: 'var(--color-chart-axis, var(--color-slate-500))' }} tickFormatter={(value) => `R$ ${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip cursor={{ fill: 'var(--color-chart-cursor, var(--color-gray-100))' }} contentStyle={{ backgroundColor: 'var(--color-chart-tooltip-bg, var(--color-brand-surface))', borderColor: 'var(--color-chart-tooltip-border, var(--color-brand-border))', color: 'var(--color-chart-tooltip-text, var(--color-brand-dark))', borderRadius: '12px', boxShadow: '0 12px 30px rgba(0, 0, 0, 0.24)' }} labelStyle={{ color: 'var(--color-chart-tooltip-muted, var(--color-slate-500))' }} itemStyle={{ color: 'var(--color-chart-tooltip-text, var(--color-brand-dark))' }} labelFormatter={(year) => `Ano ${year}`} formatter={(value) => [currency.format(Number(value)), 'Saldo descontado']} />
                    <ReferenceLine y={0} stroke="var(--color-chart-zero, var(--color-slate-500))" strokeWidth={2} />
                    {paybackMarkerYear != null && (
                      <ReferenceLine x={paybackMarkerYear} stroke="var(--color-chart-marker, var(--color-brand-light))" strokeDasharray="5 4" strokeWidth={2} label={{ value: 'Payback descontado', position: 'insideTopRight', fill: 'var(--color-chart-marker, var(--color-brand-light))', fontSize: 12, fontWeight: 700 }} />
                    )}
                    <Bar dataKey="discountedCumulativeBalance" radius={0} activeBar={{ fill: 'var(--color-chart-marker, var(--color-brand-light))', stroke: 'var(--color-chart-tooltip-text, var(--color-brand-dark))', strokeWidth: 1 }}>
                      {result.chartData.map((point) => (
                        <Cell key={point.year} fill={point.discountedCumulativeBalance >= 0 ? 'var(--color-chart-positive, var(--color-brand-blue))' : 'var(--color-chart-negative, var(--color-brand-yellow))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
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
