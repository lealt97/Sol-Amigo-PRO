import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import type { PaybackResult } from '../../lib/calculations/payback';
import { setActivePaybackProfiles } from '../../lib/calculations/paybackProfileContext';
import {
  CONNECTION_AVAILABILITY_KWH,
  type ConnectionType,
} from '../../lib/calculations/professionalSizing';
import { parseConsumptionKwhInput } from '../../lib/formatters/parseConsumptionKwhInput';
import { proposalService } from '../../services/proposalService';
import {
  isProposalDraftState,
  type ProposalDraftPaybackForm,
} from '../../types/proposalDraft';
import type { SolarKit } from '../../types/solarKit';
import { PaybackStep as PaybackStepRegulatory } from './PaybackStepRegulatory';

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const energy = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

type PaybackStepProps = {
  selectedKit: SolarKit | null;
  connectionType: ConnectionType;
  monthlyCompensableConsumptionKwh: number;
  monthlyGenerationKwh: number;
  initialForm?: ProposalDraftPaybackForm | null;
  onDraftChange?: (form: ProposalDraftPaybackForm) => void;
  onResultChange: (result: PaybackResult | null) => void;
};

type GenerationProfileMode = NonNullable<ProposalDraftPaybackForm['generationProfileMode']>;

function useStableInitialForm(form: ProposalDraftPaybackForm | null | undefined) {
  const value = form ?? null;
  const serialized = JSON.stringify(value);
  const reference = useRef({ serialized, value });

  if (reference.current.serialized !== serialized) {
    reference.current = { serialized, value };
  }

  return reference.current.value;
}

const createUniformGenerationProfile = (monthlyGenerationKwh: number) => (
  Array.from({ length: 12 }, () => String(Math.max(0, monthlyGenerationKwh)))
);

const resolveStoredGenerationProfile = (
  form: ProposalDraftPaybackForm | null,
  monthlyGenerationKwh: number,
) => (
  form?.monthlyGenerationProfileKwh?.length === 12
    ? [...form.monthlyGenerationProfileKwh]
    : createUniformGenerationProfile(monthlyGenerationKwh)
);

function EnergySummary({ label, value, highlight = false }: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${
      highlight ? 'border-brand-blue/30 bg-brand-blue/10' : 'border-brand-border bg-brand-gray/40'
    }`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-brand-dark">{energy.format(value)} kWh</p>
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
}: PaybackStepProps) {
  const location = useLocation();
  const { id: proposalId } = useParams<{ id?: string }>();
  const isEditMode = location.pathname.endsWith('/editar');
  const stableInitialForm = useStableInitialForm(initialForm);
  const [result, setResult] = useState<PaybackResult | null>(null);
  const [monthlyConsumptionProfile, setMonthlyConsumptionProfile] = useState<number[] | null>(null);
  const [consumptionProfileSource, setConsumptionProfileSource] = useState('Média mensal uniforme');
  const [generationProfileMode, setGenerationProfileMode] = useState<GenerationProfileMode>(
    stableInitialForm?.generationProfileMode === 'monthly' ? 'monthly' : 'uniform',
  );
  const [monthlyGenerationProfile, setMonthlyGenerationProfile] = useState<string[]>(
    () => resolveStoredGenerationProfile(stableInitialForm, monthlyGenerationKwh),
  );
  const latestDraftRef = useRef<ProposalDraftPaybackForm | null>(stableInitialForm);

  useEffect(() => {
    latestDraftRef.current = stableInitialForm;
    setGenerationProfileMode(
      stableInitialForm?.generationProfileMode === 'monthly' ? 'monthly' : 'uniform',
    );
    setMonthlyGenerationProfile(
      resolveStoredGenerationProfile(stableInitialForm, monthlyGenerationKwh),
    );
  }, [stableInitialForm, monthlyGenerationKwh]);

  useEffect(() => {
    if (generationProfileMode !== 'uniform') return;
    setMonthlyGenerationProfile(createUniformGenerationProfile(monthlyGenerationKwh));
  }, [generationProfileMode, monthlyGenerationKwh]);

  useEffect(() => {
    let active = true;
    const loadConsumptionProfile = async () => {
      if (!proposalId) {
        setMonthlyConsumptionProfile(null);
        setConsumptionProfileSource('Média mensal uniforme');
        return;
      }

      try {
        const proposal = isEditMode
          ? await proposalService.getEditableProposalById(proposalId)
          : await proposalService.getFlowDraftById(proposalId);
        if (!active || !isProposalDraftState(proposal.flow_state)) return;
        const draft = proposal.flow_state;
        if (draft.consumptionMode !== 'history' || draft.monthlyConsumption.length !== 12) {
          setMonthlyConsumptionProfile(null);
          setConsumptionProfileSource('Média mensal uniforme');
          return;
        }

        const availabilityKwh = CONNECTION_AVAILABILITY_KWH[connectionType];
        const profile = draft.monthlyConsumption.map((value) => {
          const parsed = parseConsumptionKwhInput(value);
          return Number.isFinite(parsed) ? Math.max(0, parsed - availabilityKwh) : Number.NaN;
        });
        if (!profile.every(Number.isFinite)) {
          setMonthlyConsumptionProfile(null);
          setConsumptionProfileSource('Média mensal uniforme');
          return;
        }

        setMonthlyConsumptionProfile(profile);
        setConsumptionProfileSource('Histórico real de 12 meses, descontada a disponibilidade');
      } catch {
        if (!active) return;
        setMonthlyConsumptionProfile(null);
        setConsumptionProfileSource('Média mensal uniforme');
      }
    };

    void loadConsumptionProfile();
    return () => {
      active = false;
    };
  }, [connectionType, isEditMode, proposalId]);

  const numericGenerationProfile = useMemo(() => (
    generationProfileMode === 'monthly'
      ? monthlyGenerationProfile.map((value) => {
          const normalized = value.trim().replace(',', '.');
          return normalized ? Number(normalized) : Number.NaN;
        })
      : null
  ), [generationProfileMode, monthlyGenerationProfile]);

  setActivePaybackProfiles({
    monthlyCompensableConsumptionProfileKwh: monthlyConsumptionProfile,
    monthlyGenerationProfileKwh: numericGenerationProfile,
  });

  const profileKey = JSON.stringify({
    consumption: monthlyConsumptionProfile,
    generation: numericGenerationProfile,
  });

  const enrichDraft = useCallback((form: ProposalDraftPaybackForm) => ({
    ...form,
    generationProfileMode,
    monthlyGenerationProfileKwh: generationProfileMode === 'monthly'
      ? [...monthlyGenerationProfile]
      : [],
  }), [generationProfileMode, monthlyGenerationProfile]);

  const handleDraftChange = useCallback((form: ProposalDraftPaybackForm) => {
    const enriched = enrichDraft(form);
    latestDraftRef.current = enriched;
    onDraftChange?.(enriched);
  }, [enrichDraft, onDraftChange]);

  const persistGenerationProfile = useCallback((
    mode: GenerationProfileMode,
    profile: string[],
  ) => {
    const base = latestDraftRef.current;
    if (!base) return;
    const enriched: ProposalDraftPaybackForm = {
      ...base,
      generationProfileMode: mode,
      monthlyGenerationProfileKwh: mode === 'monthly' ? [...profile] : [],
    };
    latestDraftRef.current = enriched;
    onDraftChange?.(enriched);
  }, [onDraftChange]);

  const switchGenerationProfileMode = (mode: GenerationProfileMode) => {
    const nextProfile = mode === 'monthly'
      ? monthlyGenerationProfile.length === 12
        ? monthlyGenerationProfile
        : createUniformGenerationProfile(monthlyGenerationKwh)
      : createUniformGenerationProfile(monthlyGenerationKwh);
    setGenerationProfileMode(mode);
    setMonthlyGenerationProfile(nextProfile);
    persistGenerationProfile(mode, nextProfile);
  };

  const updateGenerationMonth = (index: number, value: string) => {
    const nextProfile = monthlyGenerationProfile.map((item, itemIndex) => (
      itemIndex === index ? value : item
    ));
    setMonthlyGenerationProfile(nextProfile);
    persistGenerationProfile('monthly', nextProfile);
  };

  const handleResultChange = useCallback((nextResult: PaybackResult | null) => {
    setResult((current) => current === nextResult ? current : nextResult);
    onResultChange(nextResult);
  }, [onResultChange]);

  return (
    <div className="space-y-6">
      <PaybackStepRegulatory
        key={profileKey}
        selectedKit={selectedKit}
        connectionType={connectionType}
        monthlyCompensableConsumptionKwh={monthlyCompensableConsumptionKwh}
        monthlyGenerationKwh={monthlyGenerationKwh}
        initialForm={stableInitialForm}
        onDraftChange={handleDraftChange}
        onResultChange={handleResultChange}
      />

      <section className="rounded-xl border border-brand-border bg-brand-surface p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">Sazonalidade mensal</p>
          <h3 className="mt-1 font-bold text-brand-dark">Consumo e geração de janeiro a dezembro</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Consumo aplicado: <strong>{consumptionProfileSource}</strong>. A curva é alinhada automaticamente ao
            mês inicial da projeção financeira.
          </p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => switchGenerationProfileMode('uniform')}
            className={`rounded-xl border p-4 text-left ${
              generationProfileMode === 'uniform'
                ? 'border-brand-blue bg-brand-blue/10'
                : 'border-brand-border bg-brand-gray/20'
            }`}
          >
            <p className="font-bold text-brand-dark">Usar geração média uniforme</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Repete {energy.format(monthlyGenerationKwh)} kWh em todos os meses.
            </p>
          </button>
          <button
            type="button"
            onClick={() => switchGenerationProfileMode('monthly')}
            className={`rounded-xl border p-4 text-left ${
              generationProfileMode === 'monthly'
                ? 'border-brand-blue bg-brand-blue/10'
                : 'border-brand-border bg-brand-gray/20'
            }`}
          >
            <p className="font-bold text-brand-dark">Informar geração mensal</p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Use uma simulação técnica ou dados mensais de irradiação da localização.
            </p>
          </button>
        </div>

        {generationProfileMode === 'monthly' && (
          <div className="mt-5 grid gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {MONTHS.map((month, index) => (
              <label key={month} className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{month}</span>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={monthlyGenerationProfile[index] ?? ''}
                    onChange={(event) => updateGenerationMonth(index, event.target.value)}
                    className="h-10 w-full rounded-lg border border-brand-border bg-brand-surface px-3 pr-12 text-sm text-brand-dark"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[10px] font-semibold text-slate-500">
                    kWh
                  </span>
                </div>
              </label>
            ))}
          </div>
        )}
      </section>

      {result && (
        <section className="rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">
              Sistema de Compensação de Energia Elétrica
            </p>
            <h3 className="mt-1 font-bold text-brand-dark">Fluxo de energia e banco de créditos</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              A geração é dividida entre autoconsumo instantâneo e energia injetada. Os excedentes entram no banco,
              os créditos mais antigos são utilizados primeiro e expiram após {result.creditValidityMonths} meses.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <EnergySummary label="Autoconsumo médio mensal" value={result.selfConsumedEnergyKwhPerMonth} />
            <EnergySummary label="Injeção média mensal" value={result.injectedEnergyKwhPerMonth} />
            <EnergySummary label="Créditos usados por mês" value={result.creditsUsedKwhPerMonth} />
            <EnergySummary label="Saldo após o 1º ano" value={result.creditBalanceEndFirstYearKwh} highlight />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <EnergySummary label="Créditos gerados por mês" value={result.creditsGeneratedKwhPerMonth} />
            <EnergySummary label="Consumo ainda vindo da rede" value={result.uncompensatedGridConsumptionKwhPerMonth} />
            <EnergySummary label="Maior saldo projetado" value={result.maxCreditBalanceKwh} />
            <EnergySummary label="Créditos expirados no horizonte" value={result.lifetimeExpiredCreditsKwh} />
          </div>

          {result.lifetimeExpiredCreditsKwh > 0 && (
            <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
              <p className="font-bold">Há créditos que não serão aproveitados dentro da validade legal.</p>
              <p className="mt-1 text-xs leading-5">
                A projeção indica {energy.format(result.lifetimeExpiredCreditsKwh)} kWh expirados. Revise o
                dimensionamento, o autoconsumo ou a alocação dos excedentes para outras unidades elegíveis.
              </p>
            </div>
          )}
        </section>
      )}

      {result?.averageMonthlyBillAmount != null
        && result.estimatedResidualBillAmount != null
        && result.estimatedBillReductionPercent != null && (
        <section className="rounded-xl border border-brand-border bg-brand-surface p-5">
          <div>
            <h3 className="font-bold text-brand-dark">Preço da proposta e comparação da fatura</h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              A tarifa continua sendo a base técnica do payback; a fatura média funciona como referência comercial.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-brand-border bg-brand-gray/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Fatura média atual</p>
              <p className="mt-2 text-xl font-bold text-brand-dark">{currency.format(result.averageMonthlyBillAmount)}</p>
            </div>
            <div className="rounded-xl border border-brand-border bg-brand-gray/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Economia mensal estimada</p>
              <p className="mt-2 text-xl font-bold text-brand-dark">{currency.format(result.monthlySavings)}</p>
            </div>
            <div className="rounded-xl border border-brand-blue/30 bg-brand-blue/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Fatura residual estimada</p>
              <p className="mt-2 text-xl font-bold text-brand-dark">{currency.format(result.estimatedResidualBillAmount)}</p>
            </div>
            <div className="rounded-xl border border-brand-border bg-brand-gray/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Redução estimada</p>
              <p className="mt-2 text-xl font-bold text-brand-dark">{decimal.format(result.estimatedBillReductionPercent)}%</p>
            </div>
          </div>

          <div className={`mt-5 rounded-xl border p-4 text-sm leading-6 ${
            result.billReferenceStatus === 'review'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}>
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
        </section>
      )}
    </div>
  );
}
