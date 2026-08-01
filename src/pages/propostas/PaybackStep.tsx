import { useCallback, useRef, useState } from 'react';
import type { PaybackResult } from '../../lib/calculations/payback';
import type { ConnectionType } from '../../lib/calculations/professionalSizing';
import type { ProposalDraftPaybackForm } from '../../types/proposalDraft';
import type { SolarKit } from '../../types/solarKit';
import { PaybackStep as PaybackStepRegulatory } from './PaybackStepRegulatory';

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

function useStableInitialForm(form: ProposalDraftPaybackForm | null | undefined) {
  const value = form ?? null;
  const serialized = JSON.stringify(value);
  const reference = useRef({ serialized, value });

  if (reference.current.serialized !== serialized) {
    reference.current = { serialized, value };
  }

  return reference.current.value;
}

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
  const stableInitialForm = useStableInitialForm(initialForm);
  const [result, setResult] = useState<PaybackResult | null>(null);

  const handleResultChange = useCallback((nextResult: PaybackResult | null) => {
    setResult((current) => current === nextResult ? current : nextResult);
    onResultChange(nextResult);
  }, [onResultChange]);

  return (
    <div className="space-y-6">
      <PaybackStepRegulatory
        selectedKit={selectedKit}
        connectionType={connectionType}
        monthlyCompensableConsumptionKwh={monthlyCompensableConsumptionKwh}
        monthlyGenerationKwh={monthlyGenerationKwh}
        initialForm={stableInitialForm}
        onDraftChange={onDraftChange}
        onResultChange={handleResultChange}
      />

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
