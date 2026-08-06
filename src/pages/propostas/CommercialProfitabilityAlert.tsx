import { BadgeCheck, CircleDollarSign, LockKeyhole, TriangleAlert } from 'lucide-react';
import {
  evaluateCommercialProfitability,
  type CommercialProfitabilitySeverity,
} from '../../lib/calculations/commercialProfitability';
import type { PaybackResult } from '../../lib/calculations/payback';

const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const decimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const ALERT_STYLES: Record<CommercialProfitabilitySeverity, string> = {
  neutral: 'border-brand-border bg-brand-gray/30 text-slate-600',
  danger: 'border-red-200 bg-red-50 text-red-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
};

const STATUS_BADGE_STYLES: Record<CommercialProfitabilitySeverity, string> = {
  neutral: 'border-slate-200 bg-slate-100 text-slate-600',
  danger: 'border-red-200 bg-red-100 text-red-700',
  warning: 'border-amber-200 bg-amber-100 text-amber-800',
  success: 'border-emerald-200 bg-emerald-100 text-emerald-700',
};

type CommercialProfitabilityAlertProps = {
  result: Pick<
    PaybackResult,
    'totalInvestment' | 'hasCostBasis' | 'directCost' | 'profitAmount' | 'marginPercentage'
  >;
  targetMarginPercentage: number;
};

function InternalMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-current/10 bg-white/50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-65">{label}</p>
      <p className="mt-1 text-sm font-bold text-brand-dark">{value}</p>
    </div>
  );
}

export function CommercialProfitabilityAlert({
  result,
  targetMarginPercentage,
}: CommercialProfitabilityAlertProps) {
  let analysis: ReturnType<typeof evaluateCommercialProfitability>;

  try {
    analysis = evaluateCommercialProfitability({
      proposalPrice: result.totalInvestment,
      directCost: result.hasCostBasis ? result.directCost : null,
      targetMarginPercentage,
    });
  } catch (error) {
    return (
      <div
        className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${ALERT_STYLES.danger}`}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-75">
              <LockKeyhole className="h-3.5 w-3.5" /> Uso interno — não incluir na proposta
            </p>
            <p className="mt-1 font-bold">Revise a margem mínima esperada</p>
            <p className="mt-1 text-xs leading-5">
              {error instanceof Error
                ? error.message
                : 'A meta comercial informada não pode ser usada nesta análise.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (analysis.status === 'unavailable') {
    return (
      <div className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${ALERT_STYLES.neutral}`}>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-75">
          <LockKeyhole className="h-3.5 w-3.5" /> Uso interno — não incluir na proposta
        </p>
        <p className="mt-1 font-bold">Rentabilidade interna não verificada</p>
        <p className="mt-1 text-xs leading-5">
          Informe uma base interna de custos para detectar prejuízo e comparar a margem com a meta comercial.
        </p>
      </div>
    );
  }

  const Icon = analysis.severity === 'success' ? BadgeCheck : TriangleAlert;
  const currentMargin = analysis.effectiveMarginPercentage ?? result.marginPercentage;
  const targetPrice = analysis.targetPrice ?? result.totalInvestment;
  const priceGapToTarget = analysis.priceGapToTarget ?? 0;
  const breakEvenPrice = analysis.breakEvenPrice ?? result.directCost;
  const priceGapToBreakEven = analysis.priceGapToBreakEven ?? 0;

  let title: string;
  let message: string;
  let recommendation: string;

  switch (analysis.status) {
    case 'loss':
      title = 'Venda com prejuízo';
      message = `O preço está ${currency.format(priceGapToBreakEven)} abaixo do custo direto.`;
      recommendation = `Use no mínimo ${currency.format(breakEvenPrice)} para não perder dinheiro ou ${currency.format(targetPrice)} para alcançar a meta de ${decimal.format(analysis.targetMarginPercentage)}%.`;
      break;
    case 'break_even':
      title = 'Venda sem margem de segurança';
      message = 'O preço cobre apenas os custos internos e não gera lucro bruto.';
      recommendation = `Aumente o preço em ${currency.format(priceGapToTarget)}, chegando a ${currency.format(targetPrice)} para alcançar a meta.`;
      break;
    case 'below_target':
      title = 'Margem abaixo da meta';
      message = `A margem efetiva é ${decimal.format(currentMargin)}%, abaixo da meta de ${decimal.format(analysis.targetMarginPercentage)}%.`;
      recommendation = `Aumente o preço em ${currency.format(priceGapToTarget)}, chegando a ${currency.format(targetPrice)} para proteger a rentabilidade esperada.`;
      break;
    case 'target_met':
      title = 'Margem comercial protegida';
      message = `A margem efetiva de ${decimal.format(currentMargin)}% atende à meta de ${decimal.format(analysis.targetMarginPercentage)}%.`;
      recommendation = `O preço cobre os custos internos e preserva o lucro bruto estimado de ${currency.format(result.profitAmount)}.`;
      break;
    default:
      return null;
  }

  return (
    <section
      className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${ALERT_STYLES[analysis.severity]}`}
      role={analysis.severity === 'success' ? 'status' : 'alert'}
      aria-label="Segurança comercial da venda"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Icon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider opacity-75">
              <LockKeyhole className="h-3.5 w-3.5" /> Uso interno — não incluir na proposta
            </p>
            <p className="mt-1 font-bold">{title}</p>
            <p className="mt-1 text-xs leading-5">{message}</p>
          </div>
        </div>
        <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold ${STATUS_BADGE_STYLES[analysis.severity]}`}>
          {analysis.status === 'target_met' ? 'Venda protegida' : 'Requer revisão'}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InternalMetric label="Preço comercial" value={currency.format(result.totalInvestment)} />
        <InternalMetric label="Custo direto" value={currency.format(result.directCost)} />
        <InternalMetric label="Lucro bruto" value={currency.format(result.profitAmount)} />
        <InternalMetric label="Margem efetiva / meta" value={`${decimal.format(currentMargin)}% / ${decimal.format(analysis.targetMarginPercentage)}%`} />
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-xl border border-current/10 bg-white/45 p-3">
        <CircleDollarSign className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-70">Ação comercial recomendada</p>
          <p className="mt-1 text-xs leading-5">{recommendation}</p>
        </div>
      </div>
    </section>
  );
}
