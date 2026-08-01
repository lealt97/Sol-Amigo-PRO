import { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Calculator, CircleDollarSign, Plus, Trash2, TriangleAlert } from 'lucide-react';
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
import type { DistributedGenerationRegime } from '../../lib/calculations/distributedGeneration';
import { calculatePayback, type PaybackResult, type PaybackStatus } from '../../lib/calculations/payback';
import { resolveProposalPricing } from '../../lib/calculations/proposalPricing';
import {
  CONNECTION_AVAILABILITY_KWH,
  type ConnectionType,
} from '../../lib/calculations/professionalSizing';
import { profileService } from '../../services/profileService';
import type { ProposalDraftPaybackForm } from '../../types/proposalDraft';
import type { SolarKit } from '../../types/solarKit';
import { CommercialProfitabilityAlert } from './CommercialProfitabilityAlert';

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

const REGIME_LABELS: Record<DistributedGenerationRegime, string> = {
  gd1_grandfathered: 'GD I — direito adquirido até 2045',
  gd2_transition: 'GD II — transição do art. 27',
  gd3_special: 'GD III — minigeração especial acima de 500 kW',
};

const STORAGE_KEY = 'sol-amigo:payback:pricing-v3';
type AdditionalCostDraft = ProposalDraftPaybackForm['additionalCosts'][number];
type PaybackFormState = ProposalDraftPaybackForm;
type SimpleField = Exclude<keyof PaybackFormState, 'additionalCosts'>;

const createCost = (): AdditionalCostDraft => ({
  id: `cost-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description: '',
  amount: '',
});

const createDefaultForm = (margin = 30): PaybackFormState => {
  const now = new Date();
  return {
    tariffCentsPerKwh: '100',
    averageMonthlyBillAmount: '',
    proposalPrice: '',
    pricingMode: 'margin',
    estimatedSystemCost: '',
    analysisYears: '25',
    annualTariffEscalationPercent: '4.5',
    annualGenerationDegradationPercent: '0.5',
    annualOperationMaintenancePercent: '0.5',
    discountRatePercent: '8',
    compensationFactorPercent: '100',
    inverterReplacementYear: '12',
    inverterReplacementCost: '',
    distributedGenerationRegime: 'gd2_transition',
    projectionStartYear: String(now.getFullYear()),
    projectionStartMonth: String(now.getMonth() + 1),
    simultaneousSelfConsumptionPercent: '30',
    fioBTariffCentsPerKwh: '',
    fioATariffCentsPerKwh: '',
    sectorChargesCentsPerKwh: '',
    postTransitionFioBPercent: '100',
    postTransitionFioAPercent: '40',
    postTransitionSectorChargesPercent: '100',
    pisPercent: '0',
    cofinsPercent: '0',
    icmsPercent: '0',
    otherTariffsPercent: '0',
    marginPercentage: String(margin),
    additionalCosts: [],
  };
};

const normalizeForm = (form: ProposalDraftPaybackForm, defaultMargin = 30): PaybackFormState => {
  const defaults = createDefaultForm(defaultMargin);
  const proposalPrice = typeof form.proposalPrice === 'string'
    ? form.proposalPrice
    : typeof form.estimatedSystemCost === 'string'
      ? form.estimatedSystemCost
      : '';
  const pricingMode = form.pricingMode === 'margin' || form.pricingMode === 'manual'
    ? form.pricingMode
    : proposalPrice.trim() ? 'manual' : 'margin';

  return {
    ...defaults,
    ...form,
    proposalPrice,
    pricingMode,
    marginPercentage: form.marginPercentage?.trim() ? form.marginPercentage : String(defaultMargin),
    additionalCosts: Array.isArray(form.additionalCosts) ? form.additionalCosts : [],
  };
};

const parseNumber = (value: string | undefined) => {
  const normalized = (value ?? '').trim().replace(',', '.');
  return normalized ? Number(normalized) : Number.NaN;
};

const parseOptionalNumber = (value: string | undefined, fallback = 0) => {
  const parsed = parseNumber(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatPaybackPeriod = (months: number, analysisYears: number) => {
  if (!Number.isFinite(months)) return `Acima de ${analysisYears} anos`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
  if (remainingMonths === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
};

function Field({
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
          className={`${prefix ? 'pl-10' : ''} ${suffix ? 'pr-24' : ''}`.trim() || undefined}
        />
        {prefix && <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-semibold text-slate-500">{prefix}</span>}
        {suffix && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-semibold text-slate-500">{suffix}</span>}
      </div>
      {helper && <p className="text-xs leading-5 text-slate-500">{helper}</p>}
    </label>
  );
}

function Summary({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 ${highlight ? 'border-brand-blue/30 bg-brand-blue/10' : 'border-brand-border bg-brand-gray/40'}`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-brand-dark">{value}</p>
    </div>
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
  selectedKit: SolarKit | null;
  connectionType: ConnectionType;
  monthlyCompensableConsumptionKwh: number;
  monthlyGenerationKwh: number;
  initialForm?: ProposalDraftPaybackForm | null;
  onDraftChange?: (form: ProposalDraftPaybackForm) => void;
  onResultChange: (result: PaybackResult | null) => void;
}) {
  const { user } = useAuth();
  const [form, setForm] = useState<PaybackFormState>(() => normalizeForm(initialForm || createDefaultForm(30), 30));
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      setHydrated(false);
      let defaultMargin = 30;
      if (user?.id) {
        try {
          const profile = await profileService.getProfile(user.id);
          const configuredMargin = Number(profile.default_margin_percentage);
          if (Number.isFinite(configuredMargin) && configuredMargin >= 0 && configuredMargin < 100) {
            defaultMargin = configuredMargin;
          }
        } catch {
          defaultMargin = 30;
        }
      }

      if (initialForm) {
        if (active) setForm(normalizeForm(initialForm, defaultMargin));
      } else {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            if (active) setForm(normalizeForm(JSON.parse(saved) as PaybackFormState, defaultMargin));
          } catch {
            sessionStorage.removeItem(STORAGE_KEY);
            if (active) setForm(createDefaultForm(defaultMargin));
          }
        } else if (active) {
          setForm(createDefaultForm(defaultMargin));
        }
      }
      if (active) setHydrated(true);
    };
    void hydrate();
    return () => { active = false; };
  }, [initialForm, user?.id]);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    onDraftChange?.(form);
  }, [form, hydrated, onDraftChange]);

  const pricingMode = form.pricingMode === 'manual' ? 'manual' : 'margin';
  const regime = (form.distributedGenerationRegime ?? 'gd2_transition') as DistributedGenerationRegime;

  const calculation = useMemo(() => {
    if (!hydrated) return { result: null, error: null };
    try {
      const additionalCosts = form.additionalCosts.map((cost) => ({
        description: cost.description.trim() || 'Custo adicional',
        amount: parseOptionalNumber(cost.amount),
      }));
      const additionalCostsTotal = additionalCosts.reduce((total, cost) => total + cost.amount, 0);
      const kitCost = selectedKit ? Number(selectedKit.cost_price) : null;
      if (selectedKit && (!Number.isFinite(kitCost) || (kitCost ?? 0) <= 0)) {
        throw new Error('O kit selecionado precisa possuir um custo válido.');
      }

      const parsedManualSystemCost = parseNumber(form.estimatedSystemCost);
      const manualSystemCost = !selectedKit && Number.isFinite(parsedManualSystemCost) && parsedManualSystemCost > 0
        ? parsedManualSystemCost
        : null;
      const baseSystemCost = kitCost ?? manualSystemCost;
      const pricing = resolveProposalPricing({
        pricingMode,
        proposalPrice: pricingMode === 'manual' ? parseNumber(form.proposalPrice) : null,
        baseSystemCost,
        additionalCostsTotal,
        requestedMarginPercentage: pricingMode === 'margin'
          ? parseNumber(form.marginPercentage || '30')
          : null,
      });

      const result = calculatePayback({
        proposalPrice: pricing.proposalPrice,
        kitCost,
        manualSystemCost: selectedKit ? null : manualSystemCost,
        tariffCentsPerKwh: parseNumber(form.tariffCentsPerKwh),
        averageMonthlyBillAmount: form.averageMonthlyBillAmount?.trim()
          ? parseNumber(form.averageMonthlyBillAmount)
          : null,
        monthlyAvailabilityConsumptionKwh: CONNECTION_AVAILABILITY_KWH[connectionType],
        pisPercent: parseOptionalNumber(form.pisPercent),
        cofinsPercent: parseOptionalNumber(form.cofinsPercent),
        icmsPercent: parseOptionalNumber(form.icmsPercent),
        otherTariffsPercent: parseOptionalNumber(form.otherTariffsPercent),
        monthlyCompensableConsumptionKwh,
        monthlyGenerationKwh,
        additionalCosts,
        analysisYears: parseNumber(form.analysisYears || '25'),
        annualTariffEscalationPercent: parseNumber(form.annualTariffEscalationPercent || '4.5'),
        annualGenerationDegradationPercent: parseNumber(form.annualGenerationDegradationPercent || '0.5'),
        annualOperationMaintenancePercent: parseNumber(form.annualOperationMaintenancePercent || '0.5'),
        discountRatePercent: parseNumber(form.discountRatePercent || '8'),
        compensationFactorPercent: parseNumber(form.compensationFactorPercent || '100'),
        inverterReplacementYear: form.inverterReplacementYear?.trim()
          ? parseNumber(form.inverterReplacementYear)
          : null,
        inverterReplacementCost: parseOptionalNumber(form.inverterReplacementCost),
        distributedGenerationRegime: regime,
        projectionStartYear: parseNumber(form.projectionStartYear),
        projectionStartMonth: parseNumber(form.projectionStartMonth),
        simultaneousSelfConsumptionPercent: parseNumber(form.simultaneousSelfConsumptionPercent),
        fioBTariffCentsPerKwh: parseOptionalNumber(form.fioBTariffCentsPerKwh),
        fioATariffCentsPerKwh: parseOptionalNumber(form.fioATariffCentsPerKwh),
        sectorChargesCentsPerKwh: parseOptionalNumber(form.sectorChargesCentsPerKwh),
        postTransitionFioBPercent: parseNumber(form.postTransitionFioBPercent),
        postTransitionFioAPercent: parseNumber(form.postTransitionFioAPercent),
        postTransitionSectorChargesPercent: parseNumber(form.postTransitionSectorChargesPercent),
      });
      return { result, error: null };
    } catch (error) {
      return {
        result: null,
        error: error instanceof Error ? error.message : 'Não foi possível calcular o payback.',
      };
    }
  }, [
    connectionType,
    form,
    hydrated,
    monthlyCompensableConsumptionKwh,
    monthlyGenerationKwh,
    pricingMode,
    regime,
    selectedKit,
  ]);

  useEffect(() => {
    onResultChange(calculation.result);
  }, [calculation.result, onResultChange]);

  const updateField = <K extends SimpleField>(field: K, value: PaybackFormState[K]) => {
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
  const switchPricingMode = (mode: 'margin' | 'manual') => {
    setForm((current) => ({
      ...current,
      pricingMode: mode,
      proposalPrice: mode === 'manual' && !current.proposalPrice?.trim() && calculation.result
        ? String(calculation.result.totalInvestment)
        : current.proposalPrice,
    }));
  };

  const result = calculation.result;
  const targetMarginPercentage = parseOptionalNumber(form.marginPercentage, 30);
  const chartProjectionLastYear = result?.chartData.at(-1)?.year ?? 0;
  const paybackMarkerYear = result && Number.isFinite(result.paybackYears) && result.paybackYears <= chartProjectionLastYear
    ? Math.ceil(result.paybackYears)
    : null;
  const discountedPaybackMarkerYear = result
    && Number.isFinite(result.discountedPaybackYears)
    && result.discountedPaybackYears <= chartProjectionLastYear
      ? Math.ceil(result.discountedPaybackYears)
      : null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-brand-dark">Preço e payback do sistema fotovoltaico</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">
          O retorno é calculado mês a mês com tarifa, degradação, despesas e cobranças da geração distribuída.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Base interna de custos</p>
            {selectedKit ? (
              <>
                <h3 className="mt-2 font-bold text-brand-dark">{selectedKit.name}</h3>
                <p className="mt-2 text-xl font-bold text-brand-dark">{currency.format(selectedKit.cost_price)}</p>
              </>
            ) : (
              <div className="mt-3 space-y-4">
                <p className="text-sm leading-6 text-slate-500">
                  Sem kit cadastrado, a base interna é obrigatória apenas quando o preço for calculado pela margem.
                </p>
                <Field
                  label="Base interna de custos"
                  value={form.estimatedSystemCost || ''}
                  onChange={(value) => updateField('estimatedSystemCost', value)}
                  prefix="R$"
                  min={0.01}
                  helper={pricingMode === 'margin'
                    ? 'Obrigatória para formar o preço pela margem.'
                    : 'Opcional; não altera o preço comercial nem o payback.'}
                />
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-none">
          <CardContent className="p-5">
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Tipo de ligação</p>
            <h3 className="mt-2 font-bold text-brand-dark">{CONNECTION_LABELS[connectionType]}</h3>
            <p className="mt-2 text-sm text-slate-500">
              Disponibilidade considerada: {CONNECTION_AVAILABILITY_KWH[connectionType]} kWh/mês.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
        <h3 className="font-bold text-brand-dark">Formação do preço</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <button type="button" onClick={() => switchPricingMode('margin')} className={`rounded-xl border p-4 text-left ${pricingMode === 'margin' ? 'border-brand-blue bg-brand-blue/10' : 'border-brand-border'}`}>
            <p className="font-bold text-brand-dark">Calcular pela margem</p>
            <p className="mt-1 text-xs text-slate-500">Forma o preço a partir do custo total e da margem desejada.</p>
          </button>
          <button type="button" onClick={() => switchPricingMode('manual')} className={`rounded-xl border p-4 text-left ${pricingMode === 'manual' ? 'border-brand-blue bg-brand-blue/10' : 'border-brand-border'}`}>
            <p className="font-bold text-brand-dark">Informar preço manual</p>
            <p className="mt-1 text-xs text-slate-500">Usa diretamente o valor comercial informado para o cliente.</p>
          </button>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {pricingMode === 'margin' ? (
            <Field
              label="Margem de lucro desejada"
              value={form.marginPercentage || '30'}
              onChange={(value) => updateField('marginPercentage', value)}
              suffix="%"
              max={99.99}
              helper="Usada para formar o preço e como meta mínima da análise comercial."
            />
          ) : (
            <Field label="Preço da proposta" value={form.proposalPrice || ''} onChange={(value) => updateField('proposalPrice', value)} prefix="R$" min={0.01} />
          )}
          {result && (
            <div className="rounded-xl border border-brand-blue/20 bg-brand-blue/5 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Preço comercial</p>
              <p className="mt-2 text-2xl font-bold text-brand-dark">{currency.format(result.totalInvestment)}</p>
              <p className="mt-2 text-xs text-slate-500">
                {result.hasCostBasis
                  ? `Lucro bruto de ${currency.format(result.profitAmount)} e margem efetiva de ${decimal.format(result.marginPercentage)}%.`
                  : 'O payback está sendo calculado pelo preço comercial; a rentabilidade interna não está disponível.'}
              </p>
            </div>
          )}
        </div>
        {pricingMode === 'manual' && (
          <div className="mt-4 max-w-md">
            <Field
              label="Margem mínima esperada"
              value={form.marginPercentage || '30'}
              onChange={(value) => updateField('marginPercentage', value)}
              suffix="%"
              max={99.99}
              helper="Não altera o preço manual. Serve apenas para detectar prejuízo ou margem abaixo da meta da conta."
            />
          </div>
        )}
        {result?.hasCostBasis && (
          <CommercialProfitabilityAlert
            result={result}
            targetMarginPercentage={targetMarginPercentage}
          />
        )}
      </div>

      <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue"><Calculator className="h-5 w-5" /></span>
          <div>
            <h3 className="font-bold text-brand-dark">Tarifa e tributos</h3>
            <p className="mt-1 text-xs text-slate-500">Use os valores da unidade consumidora e da distribuidora.</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Tarifa de energia" value={form.tariffCentsPerKwh} onChange={(value) => updateField('tariffCentsPerKwh', value)} suffix="centavos/kWh" min={0.01} />
          <Field label="Valor médio mensal da fatura" value={form.averageMonthlyBillAmount || ''} onChange={(value) => updateField('averageMonthlyBillAmount', value)} prefix="R$" min={0.01} />
          <Field label="PIS" value={form.pisPercent} onChange={(value) => updateField('pisPercent', value)} suffix="%" />
          <Field label="COFINS" value={form.cofinsPercent} onChange={(value) => updateField('cofinsPercent', value)} suffix="%" />
          <Field label="ICMS" value={form.icmsPercent} onChange={(value) => updateField('icmsPercent', value)} suffix="%" />
          <Field label="Outros encargos" value={form.otherTariffsPercent} onChange={(value) => updateField('otherTariffsPercent', value)} suffix="%" />
        </div>
      </div>

      <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Lei nº 14.300/2022</p>
          <h3 className="mt-1 font-bold text-brand-dark">Enquadramento da geração distribuída e Fio B</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            O encargo incide somente sobre a energia compensada pela rede. O autoconsumo instantâneo permanece separado.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2">
            <span className="text-sm font-semibold text-brand-dark">Enquadramento regulatório</span>
            <select
              value={regime}
              onChange={(event) => updateField('distributedGenerationRegime', event.target.value as DistributedGenerationRegime)}
              className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 text-sm text-brand-dark"
            >
              {Object.entries(REGIME_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <Field label="Ano inicial da projeção" value={form.projectionStartYear || ''} onChange={(value) => updateField('projectionStartYear', value)} min={2020} max={2100} />
          <Field label="Mês inicial da projeção" value={form.projectionStartMonth || ''} onChange={(value) => updateField('projectionStartMonth', value)} min={1} max={12} />
          <Field
            label="Autoconsumo instantâneo"
            value={form.simultaneousSelfConsumptionPercent || '30'}
            onChange={(value) => updateField('simultaneousSelfConsumptionPercent', value)}
            suffix="%"
            max={100}
            helper="Parcela consumida no mesmo instante, sem compensação pela rede."
          />
          <Field
            label="Componente tarifária Fio B"
            value={form.fioBTariffCentsPerKwh || ''}
            onChange={(value) => updateField('fioBTariffCentsPerKwh', value)}
            suffix="centavos/kWh"
            min={0.0001}
            helper="Informe a componente TUSD Fio B da distribuidora, sem usar a tarifa total como substituta."
          />
          <Field
            label="Fio B após a transição"
            value={form.postTransitionFioBPercent || '100'}
            onChange={(value) => updateField('postTransitionFioBPercent', value)}
            suffix="%"
            max={100}
            helper="Premissa editável para períodos posteriores a 2028 ou ao fim do direito adquirido."
          />
          {regime === 'gd3_special' && (
            <>
              <Field label="Componente tarifária Fio A" value={form.fioATariffCentsPerKwh || ''} onChange={(value) => updateField('fioATariffCentsPerKwh', value)} suffix="centavos/kWh" min={0.0001} />
              <Field label="Encargos P&D, EE e TFSEE" value={form.sectorChargesCentsPerKwh || ''} onChange={(value) => updateField('sectorChargesCentsPerKwh', value)} suffix="centavos/kWh" min={0.0001} />
              <Field label="Fio A após a transição" value={form.postTransitionFioAPercent || '40'} onChange={(value) => updateField('postTransitionFioAPercent', value)} suffix="%" max={100} />
              <Field label="Encargos após a transição" value={form.postTransitionSectorChargesPercent || '100'} onChange={(value) => updateField('postTransitionSectorChargesPercent', value)} suffix="%" max={100} />
            </>
          )}
        </div>

        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
          Em 2026, a transição comum aplica 60% do Fio B; em 2027, 75%; e em 2028, 90%. Para períodos posteriores, o cálculo usa a premissa editável e sinaliza a necessidade de revisão conforme a regulamentação da ANEEL.
        </div>
      </div>

      <details className="rounded-xl border border-brand-border bg-brand-gray/20 p-5">
        <summary className="cursor-pointer font-bold text-brand-dark">Premissas financeiras avançadas</summary>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Horizonte de análise" value={form.analysisYears || '25'} onChange={(value) => updateField('analysisYears', value)} suffix="anos" min={1} max={40} />
          <Field label="Reajuste anual da tarifa" value={form.annualTariffEscalationPercent || '4.5'} onChange={(value) => updateField('annualTariffEscalationPercent', value)} suffix="% a.a." min={-20} max={100} />
          <Field label="Degradação anual da geração" value={form.annualGenerationDegradationPercent || '0.5'} onChange={(value) => updateField('annualGenerationDegradationPercent', value)} suffix="% a.a." max={10} />
          <Field label="Operação e manutenção anual" value={form.annualOperationMaintenancePercent || '0.5'} onChange={(value) => updateField('annualOperationMaintenancePercent', value)} suffix="% a.a." max={20} />
          <Field label="Taxa de desconto / TMA" value={form.discountRatePercent || '8'} onChange={(value) => updateField('discountRatePercent', value)} suffix="% a.a." max={100} />
          <Field label="Fator efetivo de compensação" value={form.compensationFactorPercent || '100'} onChange={(value) => updateField('compensationFactorPercent', value)} suffix="%" max={100} />
          <Field label="Ano de troca do inversor" value={form.inverterReplacementYear || ''} onChange={(value) => updateField('inverterReplacementYear', value)} suffix="ano" min={1} max={40} />
          <Field label="Custo de substituição do inversor" value={form.inverterReplacementCost || ''} onChange={(value) => updateField('inverterReplacementCost', value)} prefix="R$" />
        </div>
      </details>

      <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-bold text-brand-dark">Custos adicionais internos</h3>
            <p className="mt-1 text-xs text-slate-500">Usados na formação do preço por margem e na rentabilidade interna.</p>
          </div>
          <Button type="button" variant="outline" className="gap-2" onClick={() => setForm((current) => ({ ...current, additionalCosts: [...current.additionalCosts, createCost()] }))}>
            <Plus className="h-4 w-4" /> Adicionar custo
          </Button>
        </div>
        {form.additionalCosts.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-brand-border p-5 text-center text-sm text-slate-500">Nenhum custo adicional informado.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {form.additionalCosts.map((cost, index) => (
              <div key={cost.id} className="grid gap-3 rounded-xl border border-brand-border bg-brand-gray/30 p-4 sm:grid-cols-[minmax(0,1fr)_220px_auto] sm:items-end">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-brand-dark">Descrição do custo {index + 1}</span>
                  <Input value={cost.description} onChange={(event) => updateCost(cost.id, 'description', event.target.value)} />
                </label>
                <Field label="Valor" value={cost.amount} onChange={(value) => updateCost(cost.id, 'amount', value)} prefix="R$" />
                <Button type="button" variant="ghost" size="icon" onClick={() => setForm((current) => ({ ...current, additionalCosts: current.additionalCosts.filter((item) => item.id !== cost.id) }))} aria-label="Remover custo adicional">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {calculation.error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{calculation.error}</div>}

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Summary label="Payback simples — Prazo de retorno projetado" value={formatPaybackPeriod(result.paybackMonths, result.analysisYears)} highlight />
            <Summary label="Payback descontado" value={formatPaybackPeriod(result.discountedPaybackMonths, result.analysisYears)} />
            <Summary label={`VPL em ${result.analysisYears} anos`} value={currency.format(result.netPresentValue)} />
            <Summary label="TIR estimada" value={result.internalRateOfReturnPercent == null ? 'Não calculável' : `${decimal.format(result.internalRateOfReturnPercent)}% a.a.`} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Summary label="Economia líquida no 1º ano" value={currency.format(result.annualSavings)} />
            <Summary label="Cobranças GD no 1º ano" value={currency.format(result.firstYearDistributedGenerationCharges)} />
            <Summary label="Autoconsumo médio" value={`${decimal.format(result.selfConsumedEnergyKwhPerMonth)} kWh/mês`} />
            <Summary label="Compensação pela rede" value={`${decimal.format(result.gridCompensatedEnergyKwhPerMonth)} kWh/mês`} />
          </div>

          <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
            <h3 className="font-bold text-brand-dark">Premissas regulatórias aplicadas</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Summary label="Enquadramento" value={REGIME_LABELS[result.distributedGenerationRegime ?? regime]} />
              <Summary label="Fio B informado" value={`${decimal.format(result.fioBTariffCentsPerKwh)} centavos/kWh`} />
              <Summary label="Autoconsumo instantâneo" value={`${decimal.format(result.simultaneousSelfConsumptionPercent)}%`} />
              <Summary label={`Encargos GD em ${result.analysisYears} anos`} value={currency.format(result.lifetimeDistributedGenerationCharges)} />
            </div>
            {result.regulatoryWarnings.map((warning) => (
              <div key={warning} className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" /><p>{warning}</p>
              </div>
            ))}
          </div>

          {result.hasCostBasis ? (
            <div className="rounded-xl border border-brand-border bg-brand-surface p-5">
              <h3 className="font-bold text-brand-dark">Rentabilidade interna</h3>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                <Summary label="Custo direto" value={currency.format(result.directCost)} />
                <Summary label="Lucro bruto estimado" value={currency.format(result.profitAmount)} />
                <Summary label="Margem efetiva" value={`${decimal.format(result.marginPercentage)}%`} />
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-brand-border bg-brand-gray/30 p-4 text-sm text-slate-500">
              O payback está sendo calculado pelo preço comercial. Informe uma base interna somente para calcular lucro e margem.
            </div>
          )}

          <div className={`flex items-start gap-4 rounded-xl border p-5 ${STATUS_STYLES[result.status]}`}>
            {result.status === 'unfeasible' ? <TriangleAlert className="mt-0.5 h-7 w-7 shrink-0" /> : <BadgeCheck className="mt-0.5 h-7 w-7 shrink-0" />}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-75">Viabilidade financeira projetada</p>
              <h3 className="mt-1 text-xl font-bold">{result.statusLabel}</h3>
              <p className="mt-2 text-sm leading-6">
                Prazo de retorno projetado de <strong>{formatPaybackPeriod(result.paybackMonths, result.analysisYears)}</strong>, calculado mês a mês após as cobranças regulatórias.
              </p>
            </div>
          </div>

          <Card className="shadow-none">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-gray/60 text-brand-blue"><CircleDollarSign className="h-5 w-5" /></span>
                <div>
                  <h3 className="font-bold text-brand-dark">Fluxo de caixa acumulado em {result.analysisYears} anos</h3>
                  <p className="mt-1 text-xs text-slate-500">O cálculo ocorre mês a mês; o gráfico consolida os resultados por ano.</p>
                </div>
              </div>
              <div className="mt-5 h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.chartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="year" interval={4} />
                    <YAxis width={76} tickFormatter={(value) => `R$ ${Math.round(Number(value) / 1000)}k`} />
                    <Tooltip formatter={(value, name) => [currency.format(Number(value)), name === 'discountedCumulativeBalance' ? 'Saldo descontado' : 'Saldo nominal']} />
                    <ReferenceLine y={0} strokeWidth={2} />
                    {paybackMarkerYear != null && <ReferenceLine x={paybackMarkerYear} strokeDasharray="5 4" />}
                    {discountedPaybackMarkerYear != null && <ReferenceLine x={discountedPaybackMarkerYear} strokeDasharray="2 4" />}
                    <Bar dataKey="cumulativeBalance" radius={0}>
                      {result.chartData.map((point) => <Cell key={point.year} fill={point.cumulativeBalance >= 0 ? 'var(--color-chart-positive, var(--color-brand-blue))' : 'var(--color-chart-negative, var(--color-brand-yellow))'} />)}
                    </Bar>
                    <Bar dataKey="discountedCumulativeBalance" radius={0} opacity={0.72} />
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
