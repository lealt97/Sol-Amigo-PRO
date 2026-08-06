import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  CircleDollarSign,
  FileText,
  LockKeyhole,
  Settings2,
  SunMedium,
  WalletCards,
} from 'lucide-react';
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

const formatPaybackPeriod = (months: number, analysisYears: number) => {
  if (!Number.isFinite(months)) return `Acima de ${analysisYears} anos`;
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  if (years === 0) return `${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
  if (remainingMonths === 0) return `${years} ${years === 1 ? 'ano' : 'anos'}`;
  return `${years} ${years === 1 ? 'ano' : 'anos'} e ${remainingMonths} ${remainingMonths === 1 ? 'mês' : 'meses'}`;
};

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

function ExecutiveMetric({ label, value, helper, highlight = false }: {
  label: string;
  value: string;
  helper: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${
      highlight
        ? 'border-brand-blue/30 bg-brand-blue/10'
        : 'border-brand-border bg-brand-surface'
    }`}>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-brand-dark">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{helper}</p>
    </div>
  );
}

const FLOW_LINKS = [
  {
    href: '#configuracao-comercial-regulatoria',
    label: 'Configuração comercial e regulatória',
    helper: 'Preço, custos, tarifa, tributos e Fio B',
    icon: Settings2,
  },
  {
    href: '#perfil-mensal-energia',
    label: 'Perfil mensal de energia',
    helper: 'Sazonalidade de consumo e geração',
    icon: SunMedium,
  },
  {
    href: '#banco-creditos',
    label: 'Banco de créditos',
    helper: 'Autoconsumo, injeção, uso e expiração',
    icon: WalletCards,
  },
  {
    href: '#comparacao-fatura',
    label: 'Comparação da fatura',
    helper: 'Economia, valor residual e consistência',
    icon: FileText,
  },
] as const;

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
      <section
        aria-labelledby="resumo-final-proposta"
        className="overflow-hidden rounded-2xl border border-brand-blue/30 bg-gradient-to-br from-brand-blue/10 via-brand-surface to-brand-surface"
      >
        <div className="border-b border-brand-blue/15 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-blue">Revisão executiva</p>
              <h2 id="resumo-final-proposta" className="mt-2 text-xl font-bold text-brand-dark">
                Resumo final da proposta
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Confira primeiro o que será apresentado ao cliente. Custos, lucro e margem permanecem separados em uma área identificada como uso interno.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                <FileText className="h-3.5 w-3.5" /> Visível ao cliente
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
                <LockKeyhole className="h-3.5 w-3.5" /> Dados internos separados
              </span>
            </div>
          </div>

          {result ? (
            <>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <ExecutiveMetric
                  label="Preço comercial"
                  value={currency.format(result.totalInvestment)}
                  helper="Valor usado no payback e apresentado na proposta."
                  highlight
                />
                <ExecutiveMetric
                  label="Retorno projetado"
                  value={formatPaybackPeriod(result.paybackMonths, result.analysisYears)}
                  helper="Payback simples oficial, calculado mês a mês."
                />
                <ExecutiveMetric
                  label="Economia mensal estimada"
                  value={currency.format(result.monthlySavings)}
                  helper="Após disponibilidade, encargos e premissas informadas."
                />
                <ExecutiveMetric
                  label="Economia líquida no 1º ano"
                  value={currency.format(result.annualSavings)}
                  helper="Referência comercial para o primeiro ano da projeção."
                />
              </div>

              <div className="mt-4 grid gap-4 lg:grid-cols-[1.25fr_1fr]">
                <div className={`rounded-2xl border p-4 ${
                  result.status === 'unfeasible'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}>
                  <div className="flex items-start gap-3">
                    <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider opacity-75">Leitura para o cliente</p>
                      <p className="mt-1 font-bold">{result.statusLabel}</p>
                      <p className="mt-1 text-xs leading-5">
                        O investimento projetado retorna em {formatPaybackPeriod(result.paybackMonths, result.analysisYears)}, considerando o cenário tarifário, energético e regulatório configurado.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
                  <div className="flex items-start gap-3">
                    <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Uso interno — não incluir na proposta</p>
                      {result.hasCostBasis ? (
                        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Custo</p>
                            <p className="mt-1 text-sm font-bold text-brand-dark">{currency.format(result.directCost)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lucro</p>
                            <p className="mt-1 text-sm font-bold text-brand-dark">{currency.format(result.profitAmount)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Margem</p>
                            <p className="mt-1 text-sm font-bold text-brand-dark">{decimal.format(result.marginPercentage)}%</p>
                          </div>
                        </div>
                      ) : (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                          A análise do cliente está disponível. Informe uma base de custos para liberar a segurança comercial da venda.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-2xl border border-dashed border-brand-blue/30 bg-brand-surface/80 p-5 text-sm leading-6 text-slate-600">
              Preencha ou revise a configuração abaixo. O resumo final será atualizado automaticamente quando o preço e as premissas permitirem um cálculo válido.
            </div>
          )}
        </div>

        <nav aria-label="Navegação da etapa de preço e payback" className="grid gap-px bg-brand-border sm:grid-cols-2 xl:grid-cols-4">
          {FLOW_LINKS.map(({ href, label, helper, icon: Icon }, index) => (
            <a
              key={href}
              href={href}
              className="group flex gap-3 bg-brand-surface p-4 transition hover:bg-brand-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
                <Icon className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Bloco {index + 1}</span>
                <span className="mt-0.5 block text-sm font-bold text-brand-dark group-hover:text-brand-blue">{label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{helper}</span>
              </span>
            </a>
          ))}
        </nav>
      </section>

      <div id="configuracao-comercial-regulatoria" className="scroll-mt-6" key={profileKey}>
        <PaybackStepRegulatory
          selectedKit={selectedKit}
          connectionType={connectionType}
          monthlyCompensableConsumptionKwh={monthlyCompensableConsumptionKwh}
          monthlyGenerationKwh={monthlyGenerationKwh}
          initialForm={stableInitialForm}
          onDraftChange={handleDraftChange}
          onResultChange={handleResultChange}
        />
      </div>

      <section id="perfil-mensal-energia" className="scroll-mt-6 rounded-xl border border-brand-border bg-brand-surface p-5">
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
        <section id="banco-creditos" className="scroll-mt-6 rounded-xl border border-brand-blue/30 bg-brand-blue/5 p-5">
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
        <section id="comparacao-fatura" className="scroll-mt-6 rounded-xl border border-brand-border bg-brand-surface p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-blue/10 text-brand-blue">
              <CircleDollarSign className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-bold text-brand-dark">Preço da proposta e comparação da fatura</h3>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                A tarifa continua sendo a base técnica do payback; a fatura média funciona como referência comercial.
              </p>
            </div>
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
