import { BadgeCheck, TriangleAlert } from 'lucide-react';
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

type CommercialProfitabilityAlertProps = {
  result: Pick<
    PaybackResult,
    'totalInvestment' | 'hasCostBasis' | 'directCost' | 'profitAmount' | 'marginPercentage'
  >;
  targetMarginPercentage: number;
};

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
        className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${ALERT_STYLES.danger}`}
        role="alert"
      >
        <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-xs font-bold uppercase tracking-wider opacity-75">Alerta comercial interno</p>
          <p className="mt-1 font-bold">Revise a margem mínima esperada</p>
          <p className="mt-1 text-xs leading-5">
            {error instanceof Error
              ? error.message
              : 'A meta comercial informada não pode ser usada nesta análise.'}
          </p>
        </div>
      </div>
    );
  }

  if (analysis.status === 'unavailable') {
    return (
      <div className={`mt-4 rounded-xl border p-4 text-sm leading-6 ${ALERT_STYLES.neutral}`}>
        <p className="font-bold">Rentabilidade interna não verificada</p>
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

  switch (analysis.status) {
    case 'loss':
      title = 'Venda com prejuízo';
      message = `O preço está ${currency.format(priceGapToBreakEven)} abaixo do custo direto. O preço mínimo para não perder dinheiro é ${currency.format(breakEvenPrice)}; para alcançar a meta de ${decimal.format(analysis.targetMarginPercentage)}%, use ao menos ${currency.format(targetPrice)}.`;
      break;
    case 'break_even':
      title = 'Venda sem margem de segurança';
      message = `O preço cobre apenas os custos internos e não gera lucro bruto. Para alcançar a meta de ${decimal.format(analysis.targetMarginPercentage)}%, aumente o preço em ${currency.format(priceGapToTarget)}, chegando a ${currency.format(targetPrice)}.`;
      break;
    case 'below_target':
      title = 'Margem abaixo da meta';
      message = `A margem efetiva é ${decimal.format(currentMargin)}%, abaixo da meta de ${decimal.format(analysis.targetMarginPercentage)}%. Para atingir a meta, aumente o preço em ${currency.format(priceGapToTarget)}, chegando a ${currency.format(targetPrice)}.`;
      break;
    case 'target_met':
      title = 'Margem comercial protegida';
      message = `A margem efetiva de ${decimal.format(currentMargin)}% atende à meta de ${decimal.format(analysis.targetMarginPercentage)}%. O preço cobre os custos internos e preserva o lucro bruto estimado de ${currency.format(result.profitAmount)}.`;
      break;
    default:
      return null;
  }

  return (
    <div
      className={`mt-4 flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${ALERT_STYLES[analysis.severity]}`}
      role={analysis.severity === 'success' ? 'status' : 'alert'}
    >
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        <p className="text-xs font-bold uppercase tracking-wider opacity-75">Alerta comercial interno</p>
        <p className="mt-1 font-bold">{title}</p>
        <p className="mt-1 text-xs leading-5">{message}</p>
      </div>
    </div>
  );
}
